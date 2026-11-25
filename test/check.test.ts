import { beforeAll, describe, expect, test } from "vitest"
import { Option } from "effect"
import type { Engine } from "../src/engine/engine.ts"
import { loadNodeEngine } from "../src/engine/sources.ts"
import type { WorkerMessage, WorkerRequest } from "../src/engine/protocol.ts"
import { createSyntaxChecker } from "../src/core/syntax-check.ts"
import type { WorkerFactory } from "../src/core/session.ts"

// The editor checks the code while the student types: only compiling, the program does not run.

let engine: Engine

beforeAll(async () => {
  engine = await loadNodeEngine()
})

/** A worker in the same process: it answers `Check` with the engine, as `core/worker.ts` does. */
const localWorker = (posted: Array<WorkerRequest>): WorkerFactory => (onMessage) => ({
  post: (request) => {
    posted.push(request)
    if (request._tag !== "Check") return
    const answer: WorkerMessage = { _tag: "Checked", id: request.id, traceback: engine.check(request.code) }
    queueMicrotask(() => onMessage(answer))
  },
  terminate: () => undefined
})

describe("engine.check", () => {
  test("gives nothing for code without syntax errors", () => {
    // Act
    const traceback = engine.check("from tkinter import *\nroot = Tk()\nroot.mainloop()\n")

    // Assert
    expect(traceback).toBe("")
  })

  test("gives the SyntaxError with its line and does not run the code", () => {
    // Act
    const traceback = engine.check("print('ran')\nvikno.bind('<1>' click67)\n")

    // Assert
    expect(traceback).toContain("line 2")
    expect(traceback).toContain("SyntaxError")
  })

  test("gives nothing for errors that only a run finds", () => {
    // Act
    const traceback = engine.check("print(undefined_name)\n1 / 0\n")

    // Assert
    expect(traceback).toBe("")
  })
})

describe("createSyntaxChecker", () => {
  test("explains the error in Ukrainian at its line", async () => {
    // Arrange
    const checker = createSyntaxChecker(localWorker([]))

    // Act
    const found = await checker.check("if 2 > 1\n    print('так')\n")

    // Assert
    expect(Option.map(found, (f) => f.line)).toEqual(Option.some(1))
    expect(Option.getOrThrow(found).explanation).toContain("двокрап")
  })

  test("finds nothing in correct code", async () => {
    // Arrange
    const checker = createSyntaxChecker(localWorker([]))

    // Act
    const found = await checker.check("print('Привіт')\n")

    // Assert
    expect(found).toEqual(Option.none())
  })

  test("answers an older check with nothing when a newer one is asked", async () => {
    // Arrange
    const checker = createSyntaxChecker(localWorker([]))

    // Act
    const [older, newer] = await Promise.all([checker.check("if x\n"), checker.check("print(1\n")])

    // Assert
    expect(older).toEqual(Option.none())
    expect(Option.isSome(newer)).toBe(true)
  })

  test("starts one worker for all checks", async () => {
    // Arrange
    let started = 0
    const posted: Array<WorkerRequest> = []
    const factory: WorkerFactory = (onMessage) => {
      started += 1
      return localWorker(posted)(onMessage)
    }
    const checker = createSyntaxChecker(factory)

    // Act
    await checker.check("a = 1\n")
    await checker.check("b = 2\n")
    checker.dispose()

    // Assert
    expect(started).toBe(1)
    expect(posted.map((r) => r._tag)).toEqual(["Check", "Check"])
  })
})
