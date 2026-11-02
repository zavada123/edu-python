import { beforeAll, describe, expect, test } from "vitest"
import { type Engine, type EngineSink, silentSink } from "../src/engine/engine.ts"
import { loadNodeEngine } from "../src/engine/sources.ts"
import type { Chunk, TkInput } from "../src/engine/protocol.ts"

// Window programs: `mainloop()` stops the run with Waiting, then each user action is an event.

let engine: Engine

beforeAll(async () => {
  engine = await loadNodeEngine()
})

interface SceneWidget {
  readonly id: number
  readonly kind: string
  readonly text: string
}

interface Scene {
  readonly windows: ReadonlyArray<{ readonly id: number; readonly title: string }>
  readonly widgets: ReadonlyArray<SceneWidget>
}

interface Captured {
  readonly chunks: Array<Chunk>
  readonly scenes: Array<string>
  readonly dialogs: Array<string>
  readonly timers: Array<readonly [number, number]>
  readonly sink: EngineSink
}

const capture = (): Captured => {
  const chunks: Array<Chunk> = []
  const scenes: Array<string> = []
  const dialogs: Array<string> = []
  const timers: Array<readonly [number, number]> = []
  return {
    chunks,
    scenes,
    dialogs,
    timers,
    sink: {
      ...silentSink,
      chunk: (c) => chunks.push(c),
      scene: (s) => scenes.push(s),
      dialog: (d) => dialogs.push(d),
      timer: (id, ms) => timers.push([id, ms])
    }
  }
}

const start = (code: string) => {
  const captured = capture()
  const result = engine.run({ _tag: "Run", code, inputs: [], seed: 1 }, captured.sink)
  return { result, ...captured }
}

const send = (input: TkInput) => {
  const captured = capture()
  const result = engine.event({ _tag: "Event", input, layout: [] }, captured.sink)
  return { result, ...captured }
}

const isScene = (value: unknown): value is Scene =>
  typeof value === "object" && value !== null && "windows" in value && Array.isArray(value.windows) &&
  "widgets" in value && Array.isArray(value.widgets)

const sceneOf = (scenes: ReadonlyArray<string>): Scene => {
  const parsed: unknown = JSON.parse(scenes.at(-1) ?? "null")
  if (!isScene(parsed)) throw new Error("no scene")
  return parsed
}

const widgetOf = (scene: Scene, kind: string, text: string): SceneWidget => {
  const widget = scene.widgets.find((w) => w.kind === kind && w.text === text)
  if (widget === undefined) throw new Error(`no ${kind} "${text}"`)
  return widget
}

const outputOf = (chunks: ReadonlyArray<Chunk>): string => chunks.map((c) => c.text).join("")

const press = (widget: number): TkInput => ({
  _tag: "Mouse",
  kind: "Press",
  widget,
  item: 0,
  button: 1,
  count: 1,
  buttons: 1,
  delta: 0,
  x: 5,
  y: 5,
  rootX: 5,
  rootY: 5,
  modifiers: []
})

const SumProgram = `from tkinter import *
w = Tk()
w.title("Похід")
a = Entry(w)
a.pack()
b = Entry(w)
b.pack()
result = Label(w, text="")
result.pack()
def count():
    result["text"] = "Разом: " + str(float(a.get()) + float(b.get())) + " км"
Button(w, text="Порахувати", command=count).pack()
w.mainloop()
`

describe("tkinter", () => {
  test("shows the window after mainloop() and waits for user actions", () => {
    // Act
    const r = start(SumProgram)

    // Assert
    expect(r.result).toEqual({ _tag: "Waiting" })
    const scene = sceneOf(r.scenes)
    expect(scene.windows.map((w) => w.title)).toEqual(["Похід"])
    expect(widgetOf(scene, "Button", "Порахувати").id).toBeGreaterThan(0)
  })

  test("reads the fields and calls the command of a button", () => {
    // Arrange
    const scene = sceneOf(start(SumProgram).scenes)
    const fields = scene.widgets.filter((w) => w.kind === "Entry")
    const button = widgetOf(scene, "Button", "Порахувати")

    // Act
    send({ _tag: "Edit", widget: fields[0]?.id ?? 0, text: "12.5" })
    send({ _tag: "Edit", widget: fields[1]?.id ?? 0, text: "7" })
    const r = send({ _tag: "Invoke", widget: button.id })

    // Assert
    expect(r.result).toEqual({ _tag: "Waiting" })
    expect(widgetOf(sceneOf(r.scenes), "Label", "Разом: 19.5 км").kind).toBe("Label")
  })

  test("calls a bind handler with the event", () => {
    // Arrange
    const code = `from tkinter import *
w = Tk()
c = Canvas(w, width=100, height=100)
c.pack()
def click(event):
    print("клік", event.x, event.y, event.num)
c.bind("<Button-1>", click)
mainloop()
`
    const scene = sceneOf(start(code).scenes)
    const canvas = scene.widgets.find((w) => w.kind === "Canvas")

    // Act
    const r = send(press(canvas?.id ?? 0))

    // Assert
    expect(r.result).toEqual({ _tag: "Waiting" })
    expect(outputOf(r.chunks)).toBe("клік 5 5 1\n")
  })

  test("sends message windows of messagebox", () => {
    // Arrange
    const code = `from tkinter import *
from tkinter import messagebox
w = Tk()
Button(w, text="Привіт", command=lambda: messagebox.showinfo("Вітання", "Привіт!")).pack()
mainloop()
`
    const button = widgetOf(sceneOf(start(code).scenes), "Button", "Привіт")

    // Act
    const r = send({ _tag: "Invoke", widget: button.id })

    // Assert
    expect(r.dialogs.map((d): unknown => JSON.parse(d))).toEqual([{ icon: "info", title: "Вітання", message: "Привіт!" }])
  })

  test("asks the worker for timers of after() and calls them", () => {
    // Arrange
    const r = start(`from tkinter import *
w = Tk()
def tick():
    print("тік")
w.after(500, tick)
mainloop()
`)
    const timer = r.timers[0]

    // Act
    const fired = send({ _tag: "Timer", timer: timer?.[0] ?? 0 })

    // Assert
    expect(timer?.[1]).toBe(500)
    expect(outputOf(fired.chunks)).toBe("тік\n")
  })

  test("finishes when the student closes the main window", () => {
    // Arrange
    const scene = sceneOf(start("from tkinter import *\nw = Tk()\nmainloop()\n").scenes)

    // Act
    const r = send({ _tag: "Close", widget: scene.windows[0]?.id ?? 0 })

    // Assert
    expect(r.result).toEqual({ _tag: "Finished" })
    expect(r.scenes).toEqual(["null"])
  })

  test("fails with the message of Tk for a wrong window size", () => {
    // Act
    const r = start('from tkinter import *\nw = Tk()\nw.geometry("500 x 300")\n')

    // Assert
    expect(r.result._tag).toBe("Failed")
    expect(r.result._tag === "Failed" && r.result.traceback).toContain('TclError: bad geometry specifier "500 x 300"')
  })

  test("fails when a handler fails", () => {
    // Arrange
    const code = "from tkinter import *\nw = Tk()\nButton(w, text=\"a\", command=lambda: 1 / 0).pack()\nmainloop()\n"
    const button = widgetOf(sceneOf(start(code).scenes), "Button", "a")

    // Act
    const r = send({ _tag: "Invoke", widget: button.id })

    // Assert
    expect(r.result._tag).toBe("Failed")
    expect(r.result._tag === "Failed" && r.result.traceback).toContain("ZeroDivisionError")
  })

  test("finishes a program without mainloop() without a window", () => {
    // Act
    const r = start("from tkinter import *\nw = Tk()\nprint(w.title())\n")

    // Assert
    expect(r.result).toEqual({ _tag: "Finished" })
  })
})
