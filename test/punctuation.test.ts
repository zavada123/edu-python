import { describe, expect, test } from "vitest"
import { plainPunctuation } from "../src/core/punctuation.ts"

describe("plainPunctuation", () => {
  test("changes typographic quotes and dashes to the characters of Python", () => {
    // Act
    const result = plainPunctuation("print(“Привіт”, ‘a’, 5 – 2, 7 — 1)")

    // Assert
    expect(result).toBe("print(\"Привіт\", 'a', 5 - 2, 7 - 1)")
  })

  test("keeps Ukrainian quotes «» and other text", () => {
    // Act
    const result = plainPunctuation("print(\"Книга «Кобзар»\")")

    // Assert
    expect(result).toBe("print(\"Книга «Кобзар»\")")
  })
})
