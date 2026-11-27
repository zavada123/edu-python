import { beforeAll, describe, expect, test } from "vitest"
import { loadNodeEngine } from "../src/engine/sources.ts"
import { engineDriver } from "../src/engine/quest-driver.ts"
import { runProgram } from "../src/engine/program.ts"
import type { Engine } from "../src/engine/engine.ts"
import {
  allSteps,
  answerIsRight,
  checkProgram,
  type DriverFactory,
  missingWords,
  missions,
  normalizeAnswer,
  type ProgramStep,
  showsValue,
  type Step,
  taskSteps
} from "../src/quests.ts"

// Every mission is checked against itself: the reference programs pass every trial, the starter code does not
// solve the step, the examples of the lessons run, and the answers come from the programs.

let engine: Engine
let drivers: DriverFactory

beforeAll(async () => {
  engine = await loadNodeEngine()
  drivers = engineDriver(engine)
})

const ignore = () => undefined

const programs = missions.flatMap((m) => allSteps(m).flatMap((s): ProgramStep[] => (s.kind === "program" ? [s] : [])))
const lessons = missions.flatMap((m) => allSteps(m).flatMap((s) => (s.kind === "lesson" ? [s] : [])))

describe("missions", () => {
  test.each(missions.map((m) => [m.id, m] as const))("%s has unique step ids and at least one task", (_, m) => {
    // Act
    const ids = allSteps(m).map((s: Step) => s.id)

    // Assert
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => /^[a-z0-9-]{1,64}$/.test(id))).toBe(true)
    expect(taskSteps(m).length).toBeGreaterThan(0)
  })

  test("step ids are unique across missions, so one record of solved steps fits all", () => {
    // Act
    const ids = missions.flatMap((m) => allSteps(m).map((s) => s.id))

    // Assert
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("program steps", () => {
  test.each(programs.map((s) => [s.id, s] as const))("the solution of %s passes every trial", async (_, step) => {
    // Act
    const verdict = await checkProgram(drivers, step, step.solution)

    // Assert
    expect(verdict).toEqual({ _tag: "Solved", trials: step.trials.map((t) => ({ _tag: "Passed", label: t.label })) })
  })

  test.each(programs.map((s) => [s.id, s] as const))("the starter code of %s does not solve the step", async (_, step) => {
    // Act
    const verdict = await checkProgram(drivers, step, step.starter)

    // Assert
    expect(verdict._tag).not.toBe("Solved")
  })

  test.each(programs.flatMap((s) => s.trials.flatMap((t) => (t._tag === "Console" ? t.mistakes.map((m) => [s.id, t.label, m.output] as const) : []))))(
    "a known mistake of %s (%s) is not the right output",
    (id, label, output) => {
      // Arrange
      const step = programs.find((s) => s.id === id)
      const trial = step?.trials.find((t) => t.label === label)

      // Assert
      expect(trial?._tag === "Console" ? trial.output : "").not.toBe(output)
    }
  )
})

describe("lessons", () => {
  test.each(lessons.map((s) => [s.id, s.example] as const))("the example of %s runs without an error", (_, example) => {
    // Act: a name and a number, or only a number
    const results = ["Олена\n12\n", "42\n"].map((input) => runProgram(engine, example, input, ignore)._tag)

    // Assert
    expect(results).toContain("Finished")
  })
})

describe("answer steps", () => {
  test("the starter of the orbit question shows a different number than the answer", () => {
    // Arrange
    const step = missions.flatMap(allSteps).find((s) => s.id === "orbit")

    // Act
    const shown = step?.kind === "answer" ? runProgram(engine, step.starter, "", ignore) : null

    // Assert
    expect(shown).toEqual({ _tag: "Finished", output: "380\n" })
    expect(step?.kind === "answer" && answerIsRight(step, "340")).toBe(true)
  })

  test("the message of Earth is the reverse of the starter string", () => {
    // Arrange
    const step = missions.flatMap(allSteps).find((s) => s.id === "message")
    const mirror = programs.find((s) => s.id === "mirror")

    // Act
    const decoded = step?.kind === "answer" && mirror !== undefined
      ? runProgram(engine, step.starter.replace("print(s)", mirror.solution.replace("s = input()\n", "")), "", ignore)
      : null

    // Assert
    expect(decoded).toEqual({ _tag: "Finished", output: "Земля пишається вами!\n" })
    expect(step?.kind === "answer" && answerIsRight(step, " земля пишається вами. ")).toBe(true)
  })
})

describe("checks", () => {
  const temperature = programs.find((s) => s.id === "temperature")

  test("finds the words that the program must use, but not in strings", () => {
    // Act & Assert
    expect(temperature === undefined ? [] : missingWords(temperature, 'print("if else")')).toEqual(["if", "else"])
  })

  test("explains a known mistake: numbers glued as text", async () => {
    // Arrange
    const fuel = programs.find((s) => s.id === "fuel")
    if (fuel === undefined) throw new Error("no fuel step")

    // Act
    const verdict = await checkProgram(drivers, fuel, "a = input()\nb = input()\nprint(int(a + b))")

    // Assert
    expect(verdict._tag).toBe("Failed")
    const first = verdict._tag === "Failed" ? verdict.trials[0] : undefined
    expect(first?._tag === "Wrong" ? first.message : "").toContain("склеїла 7 і 3")
  })

  test("explains a crash in Ukrainian with its line", async () => {
    // Arrange
    if (temperature === undefined) throw new Error("no temperature step")

    // Act
    const verdict = await checkProgram(drivers, temperature, "t = int(input())\nif t > 30:\n    print(Перегрів)\nelse:\n    print(\"Норма\")")

    // Assert
    const first = verdict._tag === "Failed" ? verdict.trials[0] : undefined
    expect(first?._tag === "Wrong" ? first.message : "").toContain("у рядку 3")
  })

  test("a window program without mainloop() gets a message about the window", async () => {
    // Arrange
    const window = programs.find((s) => s.id === "window")
    if (window === undefined) throw new Error("no window step")

    // Act
    const verdict = await checkProgram(drivers, window, 'from tkinter import *\nroot = Tk()\nroot.title("Калькулятор")\nLabel(root, text="Мій калькулятор").pack()\nmainloop')

    // Assert
    const first = verdict._tag === "Failed" ? verdict.trials[0] : undefined
    expect(first?._tag === "Wrong" ? first.message : "").toContain("mainloop")
  })

  test("a label without pack() is not in the window", async () => {
    // Arrange
    const window = programs.find((s) => s.id === "window")
    if (window === undefined) throw new Error("no window step")

    // Act
    const verdict = await checkProgram(drivers, window, window.solution.replace('"Мій калькулятор").pack()', '"Мій калькулятор")'))

    // Assert
    const first = verdict._tag === "Failed" ? verdict.trials[0] : undefined
    expect(first?._tag === "Wrong" ? first.message : "").toContain("`.pack()`")
  })

  test("a calculator without the button gets the name of the missing button", async () => {
    // Arrange
    const sum = programs.find((s) => s.id === "sum")
    if (sum === undefined) throw new Error("no sum step")

    // Act
    const verdict = await checkProgram(drivers, sum, sum.solution.replace('text="+"', 'text="Додати"'))

    // Assert
    const first = verdict._tag === "Failed" ? verdict.trials[0] : undefined
    expect(first?._tag === "Wrong" ? first.message : "").toBe("У вікні немає кнопки з написом «+».")
  })

  test.each([
    ["Результат: 5", "5", true],
    ["5.0", "5", true],
    ["2 + 3 = 5", "5", true],
    ["402", "42", false],
    ["Введи число!", "введи число", true]
  ] as const)("the text %j shows %j: %s", (text, want, ok) => {
    // Act & Assert
    expect(showsValue(text, want)).toBe(ok)
  })

  test("answers ignore case, ґ and the last full stop", () => {
    // Act & Assert
    expect(normalizeAnswer("  Ґанок.  ")).toBe("ганок")
  })
})
