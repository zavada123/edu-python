import { Option } from "effect"
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest"
import { type Engine, type EngineSink, silentSink } from "../src/engine/engine.ts"
import { loadNodeEngine } from "../src/engine/sources.ts"
import { ChunkKinds, TimeLimitMs, type WorkerMessage, type WorkerRequest } from "../src/engine/protocol.ts"
import { createRunSession, type RunView, StopReasons, type WorkerFactory } from "../src/core/session.ts"

let engine: Engine

beforeAll(async () => {
  engine = await loadNodeEngine()
})

afterEach(() => {
  vi.useRealTimers()
})

/** Worker that runs the real engine in this thread and sends the messages like `worker.ts` (without timers). */
const engineWorker = (log: Array<WorkerRequest>): WorkerFactory => (onMessage) => ({
  post: (request) => {
    log.push(request)
    setTimeout(() => {
      onMessage(request._tag === "Run" ? { _tag: "Started" } : { _tag: "Handling" })
      const progress: Array<WorkerMessage> = []
      const sink: EngineSink = {
        ...silentSink,
        chunk: (c) => progress.push({ _tag: "Progress", chunks: [c], ops: [], scenes: [], dialogs: [] }),
        op: (o) => progress.push({ _tag: "Progress", chunks: [], ops: [o], scenes: [], dialogs: [] }),
        scene: (json) => progress.push({ _tag: "Progress", chunks: [], ops: [], scenes: [json], dialogs: [] }),
        dialog: (json) => progress.push({ _tag: "Progress", chunks: [], ops: [], scenes: [], dialogs: [json] }),
        overflow: () => progress.push({ _tag: "OutputLimit" })
      }
      const result = request._tag === "Run" ? engine.run(request, sink) : engine.event(request, sink)
      progress.forEach(onMessage)
      onMessage(result)
    }, 0)
  },
  terminate: () => undefined
})

const settle = () => new Promise((resolve) => setTimeout(resolve, 5))

const textOf = (view: RunView): string => view.chunks.map((c) => c.text).join("")

describe("run session", () => {
  test("runs a program and shows its output", async () => {
    // Arrange
    const views: Array<RunView> = []
    const session = createRunSession(engineWorker([]), (v) => views.push(v))

    // Act
    session.start('print("Привіт!")')
    await settle()

    // Assert
    const last = views.at(-1)
    expect(last?.status).toEqual({ _tag: "Finished" })
    expect(last && textOf(last)).toBe("Привіт!\n")
  })

  test("asks for input values and runs the program again with the same seed", async () => {
    // Arrange
    const views: Array<RunView> = []
    const requests: Array<WorkerRequest> = []
    const session = createRunSession(engineWorker(requests), (v) => views.push(v))
    const code = 'from random import randint\nprint(randint(1, 100))\na = int(input("a? "))\nb = int(input("b? "))\nprint("Сума:", a + b)'

    // Act
    session.start(code)
    await settle()
    const firstStop = views.at(-1)
    session.provideInput("2")
    await settle()
    session.provideInput("3")
    await settle()

    // Assert
    expect(firstStop?.status).toEqual({ _tag: "WaitingInput" })
    const runs = requests.flatMap((r) => (r._tag === "Run" ? [r] : []))
    expect(runs.map((r) => r.inputs)).toEqual([[], ["2"], ["2", "3"]])
    expect(new Set(runs.map((r) => r.seed)).size).toBe(1)
    const last = views.at(-1)
    expect(last?.status).toEqual({ _tag: "Finished" })
    expect(last?.chunks.filter((c) => c.kind === ChunkKinds.Input).map((c) => c.text)).toEqual(["2\n", "3\n"])
    expect(last && textOf(last)).toMatch(/^\d+\na\? 2\nb\? 3\nСума: 5\n$/)
  })

  test("does not show shorter output while a replay repeats the start", async () => {
    // Arrange
    const views: Array<RunView> = []
    const session = createRunSession(engineWorker([]), (v) => views.push(v))
    session.start('print("один")\nprint("два")\nx = input()\nprint(x)')
    await settle()
    const before = views.length

    // Act
    session.provideInput("три")
    await settle()

    // Assert
    const lengths = views.slice(before).map((v) => v.chunks.length)
    expect(Math.min(...lengths)).toBeGreaterThanOrEqual(2)
  })

  test("explains an error of the program", async () => {
    // Arrange
    const views: Array<RunView> = []
    const session = createRunSession(engineWorker([]), (v) => views.push(v))

    // Act
    session.start("pritn(1)")
    await settle()

    // Assert
    const status = views.at(-1)?.status
    expect(status?._tag).toBe("Failed")
    expect(status?._tag === "Failed" && status.error.explanation).toContain("`print`")
  })

  test("stops a program that works longer than the time limit", () => {
    // Arrange
    vi.useFakeTimers()
    const views: Array<RunView> = []
    const terminate = vi.fn()
    const hanging: WorkerFactory = (onMessage) => ({
      post: () => {
        onMessage({ _tag: "Started" })
      },
      terminate
    })
    const session = createRunSession(hanging, (v) => views.push(v))

    // Act
    session.start("while True:\n    pass")
    vi.advanceTimersByTime(TimeLimitMs + 1)

    // Assert
    expect(views.at(-1)?.status).toEqual({ _tag: "Stopped", reason: StopReasons.TimeLimit })
    expect(terminate).toHaveBeenCalledOnce()
  })

  test("ignores messages of a worker that was stopped", () => {
    // Arrange
    const views: Array<RunView> = []
    const senders: Array<(m: WorkerMessage) => void> = []
    const factory: WorkerFactory = (onMessage) => {
      senders.push(onMessage)
      return { post: () => undefined, terminate: () => undefined }
    }
    const session = createRunSession(factory, (v) => views.push(v))
    session.start("print(1)")

    // Act
    session.stop()
    senders[0]?.({ _tag: "Finished" })

    // Assert
    expect(views.at(-1)?.status).toEqual({ _tag: "Stopped", reason: StopReasons.User })
  })

  test("keeps the window of a tkinter program and sends the user actions to it", async () => {
    // Arrange
    const views: Array<RunView> = []
    const log: Array<WorkerRequest> = []
    const session = createRunSession(engineWorker(log), (v) => views.push(v))
    session.start("from tkinter import *\nfrom tkinter import messagebox\nw = Tk()\nButton(w, text=\"Так\", command=lambda: messagebox.showinfo(\"\", \"Добре\")).pack()\nmainloop()")
    await settle()
    const shown = views.at(-1)
    const scene = shown?.scene ?? Option.none()
    const button = Option.getOrElse(Option.flatMap(scene, (s) => Option.fromNullishOr(s.widgets.find((w) => w.text === "Так")?.id)), () => 0)

    // Act
    session.send({ _tag: "Invoke", widget: button }, [])
    await settle()

    // Assert
    expect(shown?.status).toEqual({ _tag: "Window" })
    expect(log.map((r) => r._tag)).toEqual(["Run", "Event"])
    expect(views.at(-1)?.status).toEqual({ _tag: "Window" })
    expect(views.at(-1)?.dialogs.map((d) => d.message)).toEqual(["Добре"])
  })

  test("closes the windows when the student stops the program", async () => {
    // Arrange
    const views: Array<RunView> = []
    const session = createRunSession(engineWorker([]), (v) => views.push(v))
    session.start("from tkinter import *\nw = Tk()\nmainloop()")
    await settle()

    // Act
    session.stop()

    // Assert
    expect(views.at(-1)?.status).toEqual({ _tag: "Stopped", reason: StopReasons.User })
    expect(views.at(-1)?.scene).toEqual(Option.none())
  })
})
