import { writeFileSync } from "node:fs"
import { beforeAll, describe, expect, test } from "vitest"
import type { Engine } from "../src/engine/engine.ts"
import { loadNodeEngine } from "../src/engine/sources.ts"
import { apiBuiltins, apiClasses, apiImportable, apiModules } from "../src/core/python-api.ts"
import { apiFileText, buildApi } from "./support/python-api-source.ts"

// The names that the editor suggests and checks come from the engine. When `turtle.py` or `tkinter` change,
// run `UPDATE_API=1 npx vitest run test/python-api.test.ts` to write `src/core/python-api.ts` again.

let engine: Engine

beforeAll(async () => {
  engine = await loadNodeEngine()
})

describe("python-api.ts", () => {
  test("has the same names as the engine", () => {
    // Arrange
    const api = buildApi(engine)
    if (process.env.UPDATE_API === "1") writeFileSync(new URL("../src/core/python-api.ts", import.meta.url), apiFileText(api))

    // Assert
    expect({ importable: apiImportable, builtins: apiBuiltins, modules: apiModules, classes: apiClasses }).toEqual(api)
  })
})
