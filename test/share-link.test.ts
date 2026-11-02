import { Option } from "effect"
import { describe, expect, it } from "vitest"
import { MAX_SHARED_CODE_LENGTH, shareFragmentOf, sharedCodeOf } from "../src/core/share-link.ts"

describe("share link of the Online IDE", () => {
  it("keeps Ukrainian text, quotes and new lines", () => {
    const code = 'name = input("Як тебе звати? ")\nprint(f"Привіт, {name}! 👋")'
    const fragment = Option.getOrThrow(shareFragmentOf(code))
    expect(fragment).toMatch(/^code=[A-Za-z0-9_-]+$/)
    expect(sharedCodeOf(`#${fragment}`)).toEqual(Option.some(code))
    expect(sharedCodeOf(fragment)).toEqual(Option.some(code))
  })

  it("gives no link for a code that is too long", () => {
    expect(shareFragmentOf("x".repeat(MAX_SHARED_CODE_LENGTH + 1))).toEqual(Option.none())
  })

  it("ignores an address without code or with broken code", () => {
    expect(sharedCodeOf("")).toEqual(Option.none())
    expect(sharedCodeOf("#top")).toEqual(Option.none())
    expect(sharedCodeOf("#code=%%%")).toEqual(Option.none())
    expect(sharedCodeOf("#code=_w")).toEqual(Option.none())
  })
})
