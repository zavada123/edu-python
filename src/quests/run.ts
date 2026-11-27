/**
 * Runs a program for the trials of a step. A `Driver` is one fresh engine for one trial: the Web Worker in the
 * browser (`workerDriver`) or the engine itself in Node (`engineDriver` of `edu-python/engine`). The trial logic
 * (`runTrial`) is the same for both, so the tests in Node check what the student gets in the browser.
 */
import type { WorkerFactory } from "../core/session.ts"
import { ChunkKinds, TestSeed, TimeLimitMs, type TkInput, type WorkerMessage, inputLines } from "../engine/protocol.ts"

export const TurnEnds = {
  /** The program ended. */
  Finished: "Finished",
  /** The program is at `mainloop()`: its windows wait for user actions. */
  Waiting: "Waiting",
  /** The program asks for more values with `input()` (or a dialog asks) than the trial gives. */
  NeedInput: "NeedInput",
  Failed: "Failed",
  OutputLimit: "OutputLimit",
  TimeLimit: "TimeLimit",
  /** The engine did not load (no network on the first run). */
  LoadFailed: "LoadFailed"
} as const
export type TurnEnd = (typeof TurnEnds)[keyof typeof TurnEnds]

/** The result of a run or of one user action. */
export interface Turn {
  readonly end: TurnEnd
  /** Text that the program printed in this turn (not the prompts of `input()`). */
  readonly output: string
  /** The last state of the windows in this turn (JSON), or "" when the turn sent none. */
  readonly scene: string
  /** For `Failed`: the traceback. "" otherwise. */
  readonly traceback: string
}

export interface Driver {
  readonly run: (code: string, input: string) => Promise<Turn>
  /** One user action in a window of a program that is `Waiting`. */
  readonly event: (input: TkInput) => Promise<Turn>
  readonly close: () => void
}

export type DriverFactory = () => Driver

interface Pending {
  output: string
  scene: string
  resolve: (turn: Turn) => void
}

/** A driver on a new Web Worker. The time limit counts from `Started` and from `Handling`, as in the IDE. */
export const workerDriver = (createWorker: WorkerFactory): DriverFactory => () => {
  const state: { pending: Pending | null; timer: ReturnType<typeof setTimeout> | null } = { pending: null, timer: null }
  const stopTimer = () => {
    if (state.timer !== null) clearTimeout(state.timer)
    state.timer = null
  }
  const finish = (end: TurnEnd, traceback: string) => {
    stopTimer()
    const p = state.pending
    if (p === null) return
    state.pending = null
    p.resolve({ end, output: p.output, scene: p.scene, traceback })
  }
  const startTimer = () => {
    stopTimer()
    state.timer = setTimeout(() => {
      port.terminate()
      finish(TurnEnds.TimeLimit, "")
    }, TimeLimitMs)
  }
  const onMessage = (message: WorkerMessage): void => {
    const p = state.pending
    switch (message._tag) {
      case "Started":
      case "Handling":
        return startTimer()
      case "Progress":
        if (p === null) return
        p.output += message.chunks.filter((c) => c.kind === ChunkKinds.Output).map((c) => c.text).join("")
        p.scene = message.scenes.at(-1) ?? p.scene
        return
      case "Checked":
        return
      case "Waiting":
      case "Finished":
      case "NeedInput":
      case "OutputLimit":
        return finish(message._tag, "")
      case "Asking":
        return finish(TurnEnds.NeedInput, "")
      case "Failed":
        return finish(TurnEnds.Failed, message.traceback)
      case "LoadFailed":
        return finish(TurnEnds.LoadFailed, "")
    }
  }
  const port = createWorker(onMessage)
  const turn = (send: () => void): Promise<Turn> =>
    new Promise((resolve) => {
      state.pending = { output: "", scene: "", resolve }
      send()
    })
  return {
    run: (code, input) => turn(() => port.post({ _tag: "Run", code, inputs: inputLines(input), seed: TestSeed })),
    event: (input) => turn(() => port.post({ _tag: "Event", input, layout: [] })),
    close: () => {
      stopTimer()
      port.terminate()
    }
  }
}
