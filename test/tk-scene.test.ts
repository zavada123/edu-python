import { Option } from "effect"
import { beforeAll, describe, expect, test } from "vitest"
import { type Engine, silentSink } from "../src/engine/engine.ts"
import { loadNodeEngine } from "../src/engine/sources.ts"
import { decodeDialog, decodeScene, TkBindKinds, type TkScene, waitsFor } from "../src/core/tk-scene.ts"

// The scenes come from the real tkinter module: the tests break if Python and the page stop agreeing.

let engine: Engine

beforeAll(async () => {
  engine = await loadNodeEngine()
})

const sceneOf = (code: string): TkScene => {
  const scenes: Array<string> = []
  engine.run({ _tag: "Run", code, inputs: [], seed: 1 }, { ...silentSink, scene: (s) => scenes.push(s) })
  const update = decodeScene(scenes.at(-1) ?? "")
  if (update._tag !== "Scene") throw new Error(`no scene: ${update._tag}`)
  return update.scene
}

const AllWidgets = `from tkinter import *
w = Tk()
w.title("Усе")
w.geometry("400x300+10+20")
f = Frame(w, bg="lightblue", bd=2, relief=RIDGE)
f.pack(fill=X)
Label(f, text="Ім'я", font=("Arial", 14, "bold")).grid(row=0, column=0, sticky=W)
e = Entry(f, width=20)
e.grid(row=0, column=1)
e.insert(0, "Оля")
v = IntVar(value=1)
Radiobutton(w, text="Так", variable=v, value=1).pack(side=LEFT)
Radiobutton(w, text="Ні", variable=v, value=0).pack(side=LEFT)
Checkbutton(w, text="Згода").pack()
Scale(w, from_=0, to=10, orient=HORIZONTAL).pack()
t = Text(w, height=3)
t.insert(END, "рядок")
t.place(x=10, y=200)
c = Canvas(w, width=120, height=80, bg="white")
c.pack()
c.create_line(0, 0, 50, 50, arrow=LAST, fill="red", width=3)
c.create_rectangle(10, 10, 40, 30, fill="yellow", outline="")
c.create_oval(5, 5, 25, 25, dash=(4, 2))
c.create_polygon(1, 1, 20, 1, 10, 20, smooth=True)
c.create_arc(0, 0, 60, 60, start=30, extent=120, style=PIESLICE)
c.create_text(60, 40, text="Привіт", anchor=NW, font="Times 12 italic")
c.bind("<B1-Motion>", lambda e: None)
w.bind_all("<Key>", lambda e: None)
LabelFrame(w, text="Рамка").pack()
Button(w, text="OK", state=DISABLED).pack()
mainloop()
`

describe("decodeScene", () => {
  test("decodes a scene with all widgets and canvas figures of the module", () => {
    // Act
    const scene = sceneOf(AllWidgets)

    // Assert
    expect(scene.windows.map((w) => [w.title, w.width, w.height, w.x, w.y])).toEqual([["Усе", 400, 300, 10, 20]])
    expect(new Set(scene.widgets.map((w) => w.kind))).toEqual(
      new Set(["Frame", "Label", "Entry", "Radiobutton", "Checkbutton", "Scale", "Text", "Canvas", "LabelFrame", "Button"])
    )
    const canvas = scene.widgets.find((w) => w.kind === "Canvas")
    expect(canvas?.items.map((i) => i.type)).toEqual(["line", "rectangle", "oval", "polygon", "arc", "text"])
  })

  test("gives Closed for a closed program and Invalid for other text", () => {
    // Act & Assert
    expect(decodeScene("null")).toEqual({ _tag: "Closed" })
    expect(decodeScene("{\"windows\": 5}")).toEqual({ _tag: "Invalid" })
  })

  test("decodes a message window", () => {
    // Act
    const dialog = decodeDialog("{\"icon\": \"warning\", \"title\": \"Увага\", \"message\": \"Текст\"}")

    // Assert
    expect(dialog).toEqual(Option.some({ icon: "warning", title: "Увага", message: "Текст" }))
    expect(decodeDialog("{\"icon\": \"question\"}")).toEqual(Option.none())
  })
})

describe("waitsFor", () => {
  test("knows the events of a widget, of its window and of bind_all", () => {
    // Arrange
    const scene = sceneOf(AllWidgets)
    const canvas = scene.widgets.find((w) => w.kind === "Canvas")?.id ?? 0
    const label = scene.widgets.find((w) => w.kind === "Label")?.id ?? 0

    // Act & Assert
    expect(waitsFor(scene, canvas, TkBindKinds.Motion)).toBe(true)
    expect(waitsFor(scene, canvas, TkBindKinds.Press)).toBe(false)
    expect(waitsFor(scene, label, TkBindKinds.Motion)).toBe(false)
    expect(waitsFor(scene, label, TkBindKinds.Key)).toBe(true)
  })
})
