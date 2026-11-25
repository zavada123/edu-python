import { describe, expect, test } from "vitest"
import { CompletionContext, type CompletionResult } from "@codemirror/autocomplete"
import { python } from "@codemirror/lang-python"
import { EditorState } from "@codemirror/state"
import { pythonHints } from "../src/ui/completions.ts"

// Hints while the student types: the cursor is at `|`.

const hints = (withCursor: string, explicit = false): CompletionResult | null => {
  const pos = withCursor.indexOf("|")
  const doc = withCursor.replace("|", "")
  const state = EditorState.create({ doc, extensions: [python()] })
  return pythonHints(new CompletionContext(state, pos, explicit))
}

const labels = (result: CompletionResult | null): ReadonlyArray<string> => result?.options.map((o) => o.label) ?? []

describe("pythonHints", () => {
  test("suggests input with its description when the student types inp", () => {
    // Act
    const result = hints("name = inp|")
    const input = result?.options.find((o) => o.label === "input")

    // Assert
    expect(result?.from).toBe(7)
    expect(input?.detail).toBe("(prompt='')")
    expect(input?.info).toContain("рядок")
  })

  test("suggests the functions and variables of the program", () => {
    // Act
    const found = labels(hints("def dodavania(a, b):\n    return a + b\nchislo = 5\ndo|"))

    // Assert
    expect(found).toContain("dodavania")
    expect(found).toContain("chislo")
  })

  test("suggests names of from tkinter import *", () => {
    expect(labels(hints("from tkinter import *\nroot = T|"))).toContain("Tk")
  })

  test("suggests methods of a window after root.", () => {
    // Act
    const found = labels(hints("from tkinter import *\nroot = Tk()\nroot.|"))

    // Assert
    expect(found).toContain("geometry")
    expect(found).toContain("mainloop")
    expect(found).not.toContain("_scene")
  })

  test("suggests functions of a module after turtle.", () => {
    expect(labels(hints("import turtle\nturtle.fo|"))).toContain("forward")
  })

  test("suggests methods of a turtle object", () => {
    expect(labels(hints("import turtle as t\npen = t.Turtle()\npen.|"))).toContain("circle")
  })

  test("suggests string methods for text from input()", () => {
    expect(labels(hints("name = input()\nname.|"))).toContain("upper")
  })

  test("suggests nothing inside a string", () => {
    expect(hints("print('inp|')")).toBeNull()
  })

  test("suggests keywords with their usual form", () => {
    // Act
    const forHint = hints("fo|")?.options.find((o) => o.label === "for")

    // Assert
    expect(forHint?.type).toBe("keyword")
  })
})
