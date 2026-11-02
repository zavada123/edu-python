/**
 * Python engine: MicroPython (WebAssembly) with our `input()`, `turtle` and `tkinter`. Runs in the worker in
 * the browser, in a worker thread on the server (task checks), and directly in Node in tests. One engine
 * runs many programs: each run gets a new `__main__` scope, a new turtle and new windows (`prelude.py`).
 * A window program stays in the engine after `mainloop()`: `event` calls its handlers.
 */
import { hideJavaScript } from "./wall.ts"
import { loadMicroPython, type MicroPython } from "@micropython/micropython-webassembly-pyscript"
import type { Library } from "./library.ts"
import { type Chunk, ChunkKinds, type EventRequest, MaxOutputChars, MaxSceneChars, type RunRequest, type TurtleOp } from "./protocol.ts"

/** Receives the output of a run while the program works. */
export interface EngineSink {
  readonly chunk: (chunk: Chunk) => void
  readonly op: (op: TurtleOp) => void
  /** New state of the windows (JSON), or "null" when they are closed. */
  readonly scene: (json: string) => void
  /** A message window of `tkinter.messagebox` (JSON). */
  readonly dialog: (json: string) => void
  /** `after(ms, ...)`: the caller sends `Timer` with this id after `ms`, while the program waits for events. */
  readonly timer: (id: number, ms: number) => void
  readonly cancelTimer: (id: number) => void
  /** Called once when the output gets to `MaxOutputChars`. The program can still work: the caller stops it. */
  readonly overflow: () => void
}

export type RunResult =
  | { readonly _tag: "Finished" }
  | { readonly _tag: "NeedInput" }
  /** The program is at `mainloop()`: its windows wait for user actions (`event`). */
  | { readonly _tag: "Waiting" }
  | { readonly _tag: "Failed"; readonly traceback: string }

export interface Engine {
  readonly run: (request: RunRequest, sink: EngineSink) => RunResult
  /** One user action in a window of the program that is `Waiting`. */
  readonly event: (request: EventRequest, sink: EngineSink) => RunResult
}

const NewLine = 10
const MaxPendingBytes = 4096
const HeapBytes = 8 * 1024 * 1024

/** A sink that drops everything: start of a sink in tests and checks. */
export const silentSink: EngineSink = {
  chunk: () => undefined,
  op: () => undefined,
  scene: () => undefined,
  dialog: () => undefined,
  timer: () => undefined,
  cancelTimer: () => undefined,
  overflow: () => undefined
}

const num = (value: unknown): number => (typeof value === "number" ? value : Number.NaN)
const text = (value: unknown): string => (typeof value === "string" ? value : "")

/** `"x y x y ..."` from `turtle.py` (a Python list does not convert to a JS array). */
const points = (value: unknown): ReadonlyArray<number> => text(value).split(" ").filter((s) => s !== "").map(Number)

/**
 * What the engine loads. `wasmUrl` is the address of `micropython.wasm` in the browser build; `undefined` in
 * Node, where the package finds the file next to itself. `prelude` and `library` are the texts of
 * `prelude.py` and the modules (`library.ts`): the browser build imports them as text, Node reads the files
 * (`node.ts`).
 */
export interface EngineSources {
  readonly wasmUrl: string | undefined
  readonly prelude: string
  readonly library: Library
}

const directory = (path: string): string => path.slice(0, Math.max(0, path.lastIndexOf("/")))

export const loadEngine = async (sources: EngineSources): Promise<Engine> => {
  let sink = silentSink
  let source = ""
  let inputs: Array<string> = []
  /** Set by `next_input` during a run. */
  const input = { needed: false }
  let pending: Array<number> = []
  let written = 0
  let decoder = new TextDecoder()

  const emit = (chunk: Chunk): void => {
    if (written >= MaxOutputChars) return
    written += chunk.text.length
    sink.chunk(chunk)
    if (written >= MaxOutputChars) sink.overflow()
  }

  const flush = (): void => {
    if (pending.length === 0) return
    const decoded = decoder.decode(new Uint8Array(pending), { stream: true })
    pending = []
    if (decoded !== "") emit({ kind: ChunkKinds.Output, text: decoded })
  }

  const write = (bytes: Uint8Array): void => {
    for (const byte of bytes) {
      pending.push(byte)
      if (byte === NewLine || pending.length >= MaxPendingBytes) flush()
    }
  }

  const op = (value: TurtleOp): void => {
    sink.op(value)
  }

  const python: MicroPython = await loadMicroPython({ url: sources.wasmUrl, heapsize: HeapBytes, linebuffer: false, stdout: write, stderr: write })

  python.registerJsModule("_mriya", {
    source: (): string => source,
    next_input: (prompt: unknown): string | null => {
      flush()
      const shown = text(prompt)
      if (shown !== "") emit({ kind: ChunkKinds.Prompt, text: shown })
      const value = inputs.shift()
      if (value === undefined) {
        input.needed = true
        return null
      }
      emit({ kind: ChunkKinds.Input, text: `${value}\n` })
      return value
    },
    move: (x: unknown, y: unknown, pen: unknown, color: unknown, width: unknown) =>
      op({ _tag: "Move", x: num(x), y: num(y), pen: pen === true, color: text(color), width: num(width) }),
    turn: (heading: unknown) => op({ _tag: "Turn", heading: num(heading) }),
    dot: (x: unknown, y: unknown, size: unknown, color: unknown) => op({ _tag: "Dot", x: num(x), y: num(y), size: num(size), color: text(color) }),
    fill_start: () => op({ _tag: "FillStart" }),
    fill: (coordinates: unknown, color: unknown) => op({ _tag: "Fill", points: points(coordinates), color: text(color) }),
    text: (x: unknown, y: unknown, value: unknown, align: unknown, font: unknown, color: unknown) =>
      op({ _tag: "Text", x: num(x), y: num(y), text: text(value), align: text(align), font: text(font), color: text(color) }),
    stamp: (x: unknown, y: unknown, heading: unknown, color: unknown) =>
      op({ _tag: "Stamp", x: num(x), y: num(y), heading: num(heading), color: text(color) }),
    background: (color: unknown) => op({ _tag: "Background", color: text(color) }),
    clear: () => op({ _tag: "Clear" }),
    visible: (visible: unknown) => op({ _tag: "Visible", visible: visible === true }),
    look: (pen: unknown, fill: unknown) => op({ _tag: "Look", pen: text(pen), fill: text(fill) }),
    speed: (speed: unknown) => op({ _tag: "Speed", speed: num(speed) }),
    tk_scene: (json: unknown) => {
      const value = text(json)
      if (value.length > MaxSceneChars) {
        sink.overflow()
        return
      }
      sink.scene(value)
    },
    tk_dialog: (json: unknown) => {
      flush()
      sink.dialog(text(json))
    },
    tk_after: (id: unknown, ms: unknown) => {
      sink.timer(num(id), num(ms))
    },
    tk_cancel: (id: unknown) => {
      sink.cancelTimer(num(id))
    }
  })
  for (const [path, module] of Object.entries(sources.library)) {
    python.FS.mkdirTree(`/lib/${directory(path)}`)
    python.FS.writeFile(`/lib/${path}`, module)
  }
  python.runPython(sources.prelude)
  // Student code gets no JavaScript globals (`wall.ts`). Without the wall the engine does not run programs.
  if (!hideJavaScript()) throw new Error("the engine cannot hide JavaScript from Python")

  const prepare = (request: RunRequest, runSink: EngineSink): void => {
    sink = runSink
    source = request.code
    inputs = [...request.inputs]
    input.needed = false
    pending = []
    written = 0
    decoder = new TextDecoder()
  }

  /** Runs `statement` that sets `_mriya_result` (a traceback or ""), and reads the result. */
  const finish = (statement: string): RunResult => {
    python.runPython(`${statement}\n_mriya_waits = _mriya_waiting()`)
    flush()
    const traceback = text(python.globals.get("_mriya_result"))
    const waits = python.globals.get("_mriya_waits") === true
    sink = silentSink
    if (input.needed) return { _tag: "NeedInput" }
    if (traceback !== "") return { _tag: "Failed", traceback }
    return waits ? { _tag: "Waiting" } : { _tag: "Finished" }
  }

  const run = (request: RunRequest, runSink: EngineSink): RunResult => {
    prepare(request, runSink)
    return finish(`_mriya_result = _mriya_run(_mriya.source(), ${Math.trunc(request.seed)})`)
  }

  const event = (request: EventRequest, eventSink: EngineSink): RunResult => {
    // The output limit counts for the whole run of the program, with all its events.
    sink = eventSink
    source = JSON.stringify({ input: request.input, layout: request.layout })
    inputs = []
    input.needed = false
    return finish("_mriya_result = _mriya_event(_mriya.source())")
  }

  return { run, event }
}
