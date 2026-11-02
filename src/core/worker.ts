/**
 * Web Worker that runs student programs (`protocol.ts`). The page stops the worker with `terminate()`:
 * a loop that never ends does not stop the page. A tkinter program stays here after `mainloop()`: the
 * worker calls its handlers for user actions (`Event`) and for its timers (`after`).
 *
 * The page makes its own worker file, so its bundler finds the `.wasm` of MicroPython:
 *
 *     import wasmUrl from "@micropython/micropython-webassembly-pyscript/micropython.wasm?url"
 *     import { startPythonWorker } from "edu-python/worker"
 *     startPythonWorker(wasmUrl)
 */
import { type Engine, type EngineSink, loadEngine, type RunResult } from "../engine/engine.ts"
import type { Chunk, EventRequest, TurtleOp, WorkerMessage, WorkerRequest } from "../engine/protocol.ts"
import { engineSources } from "../engine/sources.ts"

/** While the program works, the page gets new output at most this often. */
const ProgressIntervalMs = 50

const post = (message: WorkerMessage): void => {
  postMessage(message)
}

let engine: Promise<Engine> | null = null

/** Timers of `after()` of the current program. */
const timers = new Map<number, ReturnType<typeof setTimeout>>()

const clearTimers = (): void => {
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
}

/** An error of the engine itself (not of the program) is shown as a program error. */
const runSafely = (call: (sink: EngineSink) => RunResult, sink: EngineSink): RunResult => {
  try {
    return call(sink)
  } catch (error) {
    return { _tag: "Failed", traceback: `SystemError: ${error instanceof Error ? error.message : String(error)}` }
  }
}

/** Runs the program or one of its handlers, sends its output while it works, then the result. */
const execute = (ready: Engine, start: WorkerMessage, call: (sink: EngineSink) => RunResult): void => {
  let chunks: Array<Chunk> = []
  let ops: Array<TurtleOp> = []
  let scenes: Array<string> = []
  let dialogs: Array<string> = []
  let lastPost = performance.now()
  const send = (): void => {
    if (chunks.length === 0 && ops.length === 0 && scenes.length === 0 && dialogs.length === 0) return
    post({ _tag: "Progress", chunks, ops, scenes, dialogs })
    chunks = []
    ops = []
    scenes = []
    dialogs = []
    lastPost = performance.now()
  }
  const sendSoon = (): void => {
    if (performance.now() - lastPost >= ProgressIntervalMs) send()
  }
  post(start)
  const result = runSafely(call, {
    chunk: (c) => {
      chunks.push(c)
      sendSoon()
    },
    op: (o) => {
      ops.push(o)
      sendSoon()
    },
    scene: (json) => {
      // Only the last state of the windows matters.
      scenes = [json]
      sendSoon()
    },
    dialog: (json) => {
      dialogs.push(json)
      sendSoon()
    },
    timer: (id, ms) => {
      timers.set(id, setTimeout(() => {
        timers.delete(id)
        handle(ready, { _tag: "Event", input: { _tag: "Timer", timer: id }, layout: [] })
      }, ms))
    },
    cancelTimer: (id) => {
      clearTimeout(timers.get(id))
      timers.delete(id)
    },
    overflow: () => {
      send()
      post({ _tag: "OutputLimit" })
    }
  })
  send()
  post(result)
  // Timers work only while the windows wait for the user.
  if (result._tag !== "Waiting") clearTimers()
}

const handle = (ready: Engine, request: EventRequest): void => {
  execute(ready, { _tag: "Handling" }, (sink) => ready.event(request, sink))
}

/** Starts the worker: call it once at the top of the worker file of the page. */
export const startPythonWorker = (wasmUrl: string): void => {
  addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  engine ??= loadEngine(engineSources(wasmUrl))
  const request = event.data
  engine.then(
    (ready) => {
      switch (request._tag) {
        case "Run":
          clearTimers()
          return execute(ready, { _tag: "Started" }, (sink) => ready.run(request, sink))
        case "Event":
          return handle(ready, request)
      }
    },
    (error: unknown) => {
      engine = null
      post({ _tag: "LoadFailed", message: error instanceof Error ? error.message : String(error) })
    }
  )
})
}
