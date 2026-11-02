import { expect, test } from "vitest"
import { runProgram } from "../src/engine/program.ts"
import { loadNodeEngine } from "../src/engine/sources.ts"
import { stopCodeGeneration } from "../src/engine/wall.ts"

/**
 * The worker closes code generation before it loads the engine (`startPythonWorker`): a JS function from
 * `_mriya` must not make code from text (`f.constructor('return fetch')()` gets the globals around the hidden
 * `js`). Vitest runs each test file in its own process, so this file can change the process for good.
 * The same attack without the wall is in `wall.test.ts`.
 */
test("behind the worker wall, code from text fails and programs still work", async () => {
  stopCodeGeneration()
  const engine = await loadNodeEngine()
  const run = (code: string, input: string) => runProgram(engine, code, input, () => undefined)
  // Programs work behind the wall.
  expect(run("print(sum(range(5)))\nasync def f():\n  pass\nprint(type(1).__name__)", "")).toEqual({ _tag: "Finished", output: "10\nint\n" })
  expect(run("import turtle\nturtle.forward(10)\nprint(input('?'))", "так")).toEqual({ _tag: "Finished", output: "так\n" })
  // The attack stops with a JS error; the worker reports it, and the page starts a new worker for the next run.
  expect(() => run("import sys\nm = sys.modules['_mriya']\nprint(m.next_input.constructor('return fetch')())", "")).toThrow(/code generation is off/)
})
