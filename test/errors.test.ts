import { Option } from "effect"
import { beforeAll, describe, expect, test } from "vitest"
import { type Engine, silentSink } from "../src/engine/engine.ts"
import { loadNodeEngine } from "../src/engine/sources.ts"
import { explainError } from "../src/core/errors.ts"

// Real MicroPython tracebacks: the tests break if a new engine version changes its messages.

let engine: Engine

beforeAll(async () => {
  engine = await loadNodeEngine()
})

const ignore = silentSink

const explain = (code: string) => {
  const result = engine.run({ _tag: "Run", code, inputs: [], seed: 1 }, ignore)
  if (result._tag !== "Failed") throw new Error(`no error in: ${code}`)
  return explainError(result.traceback, code)
}

const cases: ReadonlyArray<readonly [name: string, code: string, line: number, explanation: string]> = [
  ["missing colon after if (reported on the next line)", "x = 1\nif x == 1\n    print(2)", 2, "двокрапку `:`"],
  ["missing colon after for", "for i in range(3)\n    print(i)", 1, "двокрапку `:`"],
  ["quote that is not closed", 'print("a)', 1, "Лапки не закриті"],
  ["bracket that is not closed (reported at the end)", "print((1+2)", 1, "бракує `)`"],
  ["bracket that is not closed before the next line", "x = (1 + 2\nprint(x)", 1, "бракує `)`"],
  ["one = in a condition", "x = 5\nif x = 5:\n    pass", 2, "`==`"],
  ["typographic quotes", "print(“hi”)", 1, "прямі лапки"],
  ["long dash instead of minus", "x = 5 – 2", 1, "звичайний мінус"],
  ["no indent after colon", "if True:\nprint(1)", 2, "з відступом"],
  ["indent that is not needed", "print(1)\n    print(2)", 2, "Зайвий відступ"],
  ["print without brackets", "print 5", 1, "Після `print` треба дужки"],
  ["expression without end", "x = 5 +", 1, "Допиши вираз"],
  ["typo in print", "print(1)\npritn(2)", 2, "Можливо, мало бути `print`?"],
  ["capital letter", "Print(1)", 1, "розрізняє великі й малі літери"],
  ["Cyrillic letter in a Latin word", "рrint(1)", 1, "змішані українські й англійські літери"],
  ["Ukrainian word without quotes", "print(привіт)", 1, "візьми його в лапки"],
  ["variable before its value", "print(x)\nx = 5", 1, "ще не має значення"],
  ["int of text", 'int("abc")', 1, "лише цифри"],
  ["int of a decimal number", 'int("2.5")', 1, "`float()`"],
  ["int of empty text", 'int("")', 1, "порожній текст"],
  ["text plus number", 'a = "5"\nprint(a + 1)', 2, "`input()` завжди дає текст"],
  ["division by zero", "print(5 / 0)", 1, "Ділити на нуль не можна"],
  ["module with a typo", "import tortle", 1, "Можливо, `turtle`?"],
  ["wrong count of values", "def f(a):\n    pass\nf(1, 2)", 3, "треба 1, а є 2"],
  ["recursion without end", "def f():\n    f()\nf()", 2, "сама себе"],
  ["module name with a capital letter", "import Tkinter", 1, "Можливо, `tkinter`?"],
  ["window size with spaces", 'from tkinter import *\nw = Tk()\nw.geometry("500 x 300")', 3, "`\"500x300\"`"],
  ["unknown color", 'from tkinter import *\nw = Tk()\nw.configure(bg="yelow")', 3, "не знає кольору `yelow`"],
  ["unknown widget option", 'from tkinter import *\nw = Tk()\nLabel(w, txt="a")', 3, "немає параметра `txt`"],
  ["pack and grid in one window", 'from tkinter import *\nw = Tk()\nLabel(w).pack()\nLabel(w).grid()', 4, "не можна змішувати"],
  ["event without angle brackets", 'from tkinter import *\nw = Tk()\nw.bind("Button-1", print)', 3, "кутових дужках"],
  ["dialog that the site does not have", "from tkinter import messagebox\nmessagebox.askyesno('a', 'b')", 2, "Запусти програму в IDLE"],
  ["bind handler without event", "from tkinter import *\nw = Tk()\ndef click():\n    pass\nw.bind('<Button-1>', click)\nw.event_generate('<Button-1>')", 6, "`def click(event):`"]
]

describe("explainError", () => {
  test.each(cases)("%s", (_name, code, line, explanation) => {
    // Act
    const error = explain(code)

    // Assert
    expect(error.line).toEqual(Option.some(line))
    expect(error.explanation).toContain(explanation)
  })

  test("explains input() in a window program after mainloop()", () => {
    // Arrange
    const traceback = 'Traceback (most recent call last):\n  File "main.py", line 4, in ask\n' +
      "RuntimeError: input() doesn't work in a window program after mainloop(): use Entry\n"

    // Act
    const error = explainError(traceback, "")

    // Assert
    expect(error.line).toEqual(Option.some(4))
    expect(error.explanation).toContain("додай поле `Entry`")
  })

  test("keeps the original message of Python", () => {
    // Act
    const error = explain("print(y)")

    // Assert
    expect(error.message).toBe("NameError: name 'y' isn't defined")
  })

  test("does not count brackets and colons inside text", () => {
    // Act
    const error = explain('print("if (a")\nif 1\n    pass')

    // Assert
    expect(error.line).toEqual(Option.some(2))
    expect(error.explanation).toContain("двокрапку")
  })

  test("gives a general explanation for an unknown syntax error", () => {
    // Act
    const error = explainError('Traceback (most recent call last):\n  File "main.py", line 1\nSyntaxError: invalid syntax\n', "a b")

    // Assert
    expect(error.explanation).toContain("Python не зрозумів цей рядок")
  })

  test("has no line when the traceback has none", () => {
    // Act
    const error = explainError("MemoryError: memory allocation failed\n", "")

    // Assert
    expect(error.line).toEqual(Option.none())
    expect(error.explanation).toContain("пам'яті")
  })
})
