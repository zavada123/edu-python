import type { ProgramStep, WindowAction, WindowCheck, WindowTrial } from "../types.ts"

/** Small builders for the steps of the missions with windows. */

export const type = (field: number, text: string): WindowAction => ({ _tag: "Type", field, text })
export const click = (button: string): WindowAction => ({ _tag: "Click", button })
export const shows = (text: string): WindowCheck => ({ _tag: "Shows", text })

export const trial = (label: string, actions: readonly WindowAction[], expect: readonly WindowCheck[], why: string): WindowTrial => ({
  _tag: "Window",
  label,
  actions,
  expect,
  why
})

export const program = (s: Omit<ProgramStep, "kind">): ProgramStep => ({ kind: "program", ...s })

/** Clicks on the buttons of the keys, one by one: "12+3=" is 1, 2, +, 3, =. */
export const keys = (text: string): readonly WindowAction[] => [...text].map(click)
