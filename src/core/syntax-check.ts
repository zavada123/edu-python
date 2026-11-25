/**
 * Checks the code while the student types: a worker of its own compiles it (`Check`), the program does not run.
 * The editor marks the line of a SyntaxError and explains it in Ukrainian, as after a run (`errors.ts`).
 */
import { Option } from "effect"
import type { WorkerMessage } from "../engine/protocol.ts"
import { explainError, type ProgramError } from "./errors.ts"
import type { WorkerFactory, WorkerPort } from "./session.ts"

/** A syntax error found without a run: its line (from 1) and the explanation. */
export interface SyntaxProblem {
  readonly line: number
  readonly message: string
  readonly explanation: string
}

export interface SyntaxChecker {
  /** The error of the code, or none. An older check gives none when a newer one was asked. */
  readonly check: (code: string) => Promise<Option.Option<SyntaxProblem>>
  readonly dispose: () => void
}

const problemOf = (error: ProgramError): Option.Option<SyntaxProblem> =>
  Option.map(error.line, (line) => ({ line, message: error.message, explanation: error.explanation }))

export const createSyntaxChecker = (createWorker: WorkerFactory): SyntaxChecker => {
  let worker: WorkerPort | null = null
  let lastId = 0
  const waiting = new Map<number, { readonly code: string; readonly resolve: (found: Option.Option<SyntaxProblem>) => void }>()

  const answerAll = (): void => {
    for (const { resolve } of waiting.values()) resolve(Option.none())
    waiting.clear()
  }

  const onMessage = (message: WorkerMessage): void => {
    if (message._tag === "LoadFailed") {
      // Without the engine the editor shows no marks; the run shows the problem.
      worker?.terminate()
      worker = null
      return answerAll()
    }
    if (message._tag !== "Checked") return
    const asked = waiting.get(message.id)
    if (asked === undefined) return
    waiting.delete(message.id)
    asked.resolve(message.traceback === "" ? Option.none() : problemOf(explainError(message.traceback, asked.code)))
  }

  const check = (code: string): Promise<Option.Option<SyntaxProblem>> => {
    lastId += 1
    const id = lastId
    // Only the last check matters: the older ones get none at once.
    answerAll()
    worker ??= createWorker(onMessage)
    const port = worker
    return new Promise((resolve) => {
      waiting.set(id, { code, resolve })
      port.post({ _tag: "Check", id, code })
    })
  }

  const dispose = (): void => {
    answerAll()
    worker?.terminate()
    worker = null
  }

  return { check, dispose }
}
