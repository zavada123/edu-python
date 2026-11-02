import { beforeAll, describe, expect, test } from "vitest"
import type { Engine } from "../src/engine/engine.ts"
import { runProgram } from "../src/engine/program.ts"
import { loadNodeEngine } from "../src/engine/sources.ts"

/**
 * Student code must not reach JavaScript. In a Web Worker of a site, `fetch` sends the cookies of the person
 * that runs the program: a shared program (`/ide#code=…`) could read the messages of a teacher.
 * The code generation part is in `wall-worker.test.ts` (it changes the process for good).
 */
let engine: Engine

beforeAll(async () => {
  engine = await loadNodeEngine()
})

const output = (code: string): string => {
  const result = runProgram(engine, code, "", () => undefined)
  return result._tag === "Finished" || result._tag === "Crashed" ? result.output : result._tag
}

describe("wall between student code and JavaScript", () => {
  test("`import js` gives no globals: no fetch, no process, no globalThis", () => {
    expect(output("import js\nprint(hasattr(js, 'fetch'), hasattr(js, 'process'), hasattr(js, 'globalThis'))")).toBe("False False False\n")
  })

  test("without the worker wall, the constructor of a JS function still makes code (`wall-worker.test.ts` closes it)", () => {
    expect(output("import sys\nm = sys.modules['_mriya']\nprint(m.constructor.constructor('return 1+1')())")).toBe("2\n")
  })

  test("a second engine in the same realm hides the globals too", async () => {
    const other = await loadNodeEngine()
    const result = runProgram(other, "import js\nprint(hasattr(js, 'fetch'))", "", () => undefined)
    expect(result).toEqual({ _tag: "Finished", output: "False\n" })
  })
})
