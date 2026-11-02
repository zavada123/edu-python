import { Option } from "effect"
import { describe, expect, test } from "vitest"
import { keyChar, keyCode, keysym, mouseButton, nextPress } from "../src/core/tk-input.ts"

describe("keysym", () => {
  test.each([
    ["a", "a"],
    ["Я", "Я"],
    [" ", "space"],
    ["Enter", "Return"],
    ["ArrowLeft", "Left"],
    ["F5", "F5"],
    ["Backspace", "BackSpace"]
  ])("gives the Tk name of %j", (key, expected) => {
    // Act & Assert
    expect(keysym(key)).toBe(expected)
  })
})

describe("keyChar", () => {
  test("gives the typed letter, a control character or empty text", () => {
    // Act & Assert
    expect(keyChar("ї")).toBe("ї")
    expect(keyChar("Enter")).toBe("\r")
    expect(keyChar("Shift")).toBe("")
  })
})

describe("keyCode", () => {
  test("gives the Windows code of a letter and of Enter", () => {
    // Act & Assert
    expect(keyCode("a")).toBe(65)
    expect(keyCode("Enter")).toBe(13)
  })
})

describe("mouseButton", () => {
  test("gives the Tk number: 1 left, 2 middle, 3 right", () => {
    // Act & Assert
    expect([0, 1, 2].map(mouseButton)).toEqual([1, 2, 3])
  })
})

describe("nextPress", () => {
  test("counts a quick second press near the first one as a double click", () => {
    // Arrange
    const first = nextPress(Option.none(), 4, 1000, 10, 10)

    // Act
    const second = nextPress(Option.some(first), 4, 1300, 12, 11)

    // Assert
    expect([first.count, second.count]).toEqual([1, 2])
  })

  test("starts again after a pause, on another widget or far away", () => {
    // Arrange
    const first = Option.some(nextPress(Option.none(), 4, 1000, 10, 10))

    // Act & Assert
    expect(nextPress(first, 4, 2000, 10, 10).count).toBe(1)
    expect(nextPress(first, 5, 1100, 10, 10).count).toBe(1)
    expect(nextPress(first, 4, 1100, 40, 10).count).toBe(1)
  })
})
