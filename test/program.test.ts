import { beforeAll, describe, expect, test } from "vitest"
import type { Engine } from "../src/engine/engine.ts"
import { loadNodeEngine } from "../src/engine/sources.ts"
import { inputLines, runProgram } from "../src/engine/program.ts"

let engine: Engine

beforeAll(async () => {
  engine = await loadNodeEngine()
})

const ignore = () => undefined

describe("inputLines", () => {
  test.each([
    ["", []],
    ["5", ["5"]],
    ["5\n3\n", ["5", "3"]],
    ["a\r\n\r\nb", ["a", "", "b"]]
  ])("splits %j into values", (input, lines) => {
    // Act & Assert
    expect(inputLines(input)).toEqual(lines)
  })
})

describe("runProgram", () => {
  test("gives only the printed text, without the prompt and the typed values", () => {
    // Act
    const result = runProgram(engine, 'a = int(input("Перше число: "))\nb = int(input())\nprint(a + b)', "2\n3", ignore)

    // Assert
    expect(result).toEqual({ _tag: "Finished", output: "5\n" })
  })

  test("reports a program that asks for more values than the test has", () => {
    // Act
    const result = runProgram(engine, 'print("старт")\nx = input()\ny = input()', "1", ignore)

    // Assert
    expect(result).toEqual({ _tag: "NeedsInput", output: "старт\n" })
  })

  test("keeps the output before an error and the traceback", () => {
    // Act
    const result = runProgram(engine, 'print("до")\nprint(1 / 0)', "", ignore)

    // Assert
    expect(result._tag).toBe("Crashed")
    expect(result._tag === "Crashed" && result.output).toBe("до\n")
    expect(result._tag === "Crashed" && result.traceback).toContain("ZeroDivisionError")
  })

  test("reports the output limit", () => {
    // Arrange
    let overflows = 0

    // Act
    const result = runProgram(engine, 'for i in range(100000):\n    print("рядок", i)', "", () => {
      overflows++
    })

    // Assert
    expect(result).toEqual({ _tag: "OutputLimit" })
    expect(overflows).toBe(1)
  })
})
