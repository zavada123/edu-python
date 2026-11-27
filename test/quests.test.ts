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
  Levels,
  type Mission,
  showsValue,
  type Step,
  taskSteps,
  topicById,
  topics,
  unknownWords
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
    expect(temperature === undefined ? [] : missingWords(temperature, 'print("if else")')).toEqual(["if"])
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

/** The code of a step that students read or run: the reference program, the starter, the example of a lesson. */
const codesOf = (step: Step): readonly string[] => {
  switch (step.kind) {
    case "program":
      return [step.solution, step.starter]
    case "answer":
      return [step.starter]
    case "lesson":
      return [step.example]
  }
}

/** Each code of the mission with the words that students do not know at its place. */
const untaught = (mission: Mission): readonly string[] => {
  const taught: string[] = []
  return mission.chapters.flatMap((chapter) =>
    chapter.steps.flatMap((step) => {
      if (step.kind === "lesson") taught.push(...step.teaches)
      return codesOf(step).flatMap((code) => {
        const words = unknownWords(code, chapter.after, taught)
        return words.length === 0 ? [] : [`${step.id}: ${words.join(", ")}`]
      })
    })
  )
}

describe("curriculum", () => {
  test("topics go in the order of the course and have unique ids", () => {
    // Act
    const order = topics.map((t) => t.grade * 100 + t.paragraph)

    // Assert
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(new Set(topics.map((t) => t.id)).size).toBe(topics.length)
  })

  test.each(missions.map((m) => [m.id, m] as const))("chapters of %s name known topics in the order of the course", (_, m) => {
    // Act
    const places = m.chapters.map((c) => topics.findIndex((t) => t.id === c.after))

    // Assert
    expect(m.chapters.filter((c) => topicById(c.after) === undefined).map((c) => c.id)).toEqual([])
    expect(places).toEqual([...places].sort((a, b) => a - b))
  })

  test.each(missions.map((m) => [m.id, m] as const))("%s uses only what students know at each step", (_, m) => {
    // Act & Assert
    expect(untaught(m)).toEqual([])
  })

  test.each(missions.filter((m) => m.level === Levels.Base).map((m) => [m.id, m] as const))(
    "lessons of the base mission %s teach nothing beyond the school topics",
    (_, m) => {
      // Act
      const teaching = allSteps(m).flatMap((s) => (s.kind === "lesson" && s.teaches.length > 0 ? [s.id] : []))

      // Assert
      expect(teaching).toEqual([])
    }
  )

  test("finds a word from a later topic and a word that the course does not teach", () => {
    // Act & Assert
    expect(unknownWords("n = 3\nwhile n > 0:\n    n = n - 1", "5-29", [])).toEqual(["while"])
    expect(unknownWords("x = eval(input())", "9-13", [])).toEqual(["eval"])
    expect(unknownWords("s = input()\nprint(s[1:3], len(s))", "7-10", [])).toEqual(["<slice>"])
    expect(unknownWords("label.title = 1\ntitle = 2", "5-29", [])).toEqual([".title"])
    expect(unknownWords("while True:\n    break", "5-29", ["while"])).toEqual(["break"])
  })
})
