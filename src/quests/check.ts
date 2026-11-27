/**
 * Checks of the Python tasks: the words a program must use (on the syntax tree, the program does not run),
 * the trials (the program runs), and the answers. Every message is in Ukrainian, in the words of a teacher.
 */
import { parser } from "@lezer/python"
import { explainError } from "../core/errors.ts"
import { decodeScene, TkManagerKinds, type TkScene, type TkWidget } from "../core/tk-scene.ts"
import type { TkInput } from "../engine/protocol.ts"
import { type Driver, type DriverFactory, type Turn, TurnEnds } from "./run.ts"
import type { AnswerStep, ConsoleTrial, ProgramStep, Trial, WindowAction, WindowCheck, WindowTrial } from "./types.ts"

/** Output as the student sees it: `\r\n` is `\n`, spaces at the ends of lines and empty lines at the end do not count. */
export const normalizeOutput = (raw: string): string =>
  raw
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t ]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "")

/** An answer as the student may type it: letter case, ґ/г, apostrophes, spaces and the last full stop do not count. */
export const normalizeAnswer = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .replace(/ґ/g, "г")
    .replace(/[’ʼ`]/g, "'")
    .replace(/[.,!]+$/g, "")
    .replace(/\s+/g, " ")

export const answerIsRight = (step: AnswerStep, text: string): boolean => {
  const a = normalizeAnswer(text)
  return a !== "" && step.accepted.some((x) => normalizeAnswer(x) === a)
}

/** Keywords (`for`, `while`, `elif`…) and names (`input`, `Entry`, `mainloop`…) in the code; text in strings and comments does not count. */
export const wordsOf = (code: string): ReadonlySet<string> => {
  const words = new Set<string>()
  parser.parse(code).iterate({
    enter: (node) => {
      if (node.name === "VariableName" || node.name === "PropertyName") words.add(code.slice(node.from, node.to))
      else if (/^[a-z]+$/.test(node.name)) words.add(node.name)
    }
  })
  return words
}

/** Words of `mustUse` that the code does not have. */
export const missingWords = (step: ProgramStep, code: string): readonly string[] => {
  const words = wordsOf(code)
  return step.mustUse.filter((w) => !words.has(w))
}

/** The output to compare: what the program printed and what the trial wants. */
export type Compare = { readonly _tag: "None" } | { readonly _tag: "Output"; readonly got: string; readonly want: string }

export type TrialResult =
  | { readonly _tag: "Passed"; readonly label: string }
  | { readonly _tag: "Wrong"; readonly label: string; readonly message: string; readonly compare: Compare }

const noCompare: Compare = { _tag: "None" }

/** A message about a turn that did not end as the trial needs, or "" when the turn is fine. */
const turnProblem = (turn: Turn, code: string): string => {
  switch (turn.end) {
    case TurnEnds.Finished:
    case TurnEnds.Waiting:
      return ""
    case TurnEnds.NeedInput:
      return "Програма чекає більше значень, ніж дає це випробування. Перевір, скільки разів у ній викликається `input()`."
    case TurnEnds.Failed: {
      const error = explainError(turn.traceback, code)
      const line = error.line._tag === "Some" ? ` у рядку ${error.line.value}` : ""
      return `Програма зупинилася з помилкою${line}: ${error.explanation}`
    }
    case TurnEnds.OutputLimit:
      return "Програма вивела забагато тексту. Можливо, цикл ніколи не закінчується."
    case TurnEnds.TimeLimit:
      return "Програма працювала понад 5 секунд. Можливо, цикл `while` ніколи не закінчується."
    case TurnEnds.LoadFailed:
      return "Не вдалося завантажити Python. Перевір інтернет і спробуй ще раз."
  }
}

const runConsole = async (driver: Driver, code: string, trial: ConsoleTrial): Promise<TrialResult> => {
  const turn = await driver.run(code, trial.input)
  const problem = turnProblem(turn, code)
  const got = normalizeOutput(turn.output)
  const want = normalizeOutput(trial.output)
  const compare: Compare = { _tag: "Output", got, want }
  if (problem !== "") return { _tag: "Wrong", label: trial.label, message: problem, compare }
  if (got === want) return { _tag: "Passed", label: trial.label }
  const known = trial.mistakes.find((m) => normalizeOutput(m.output) === got)
  return { _tag: "Wrong", label: trial.label, message: known === undefined ? trial.why : known.why, compare }
}

const sceneOf = (json: string): TkScene | null => {
  const update = decodeScene(json)
  return update._tag === "Scene" && update.scene.windows.some((w) => w.visible) ? update.scene : null
}

const byId = (a: TkWidget, b: TkWidget): number => a.id - b.id

/** Widgets that a geometry manager shows: a `Label` without `.pack()` is not in the window. */
const shownWidgets = (scene: TkScene): readonly TkWidget[] => scene.widgets.filter((w) => w.manager.kind !== TkManagerKinds.None)

/** The user action for a trial action, or a message when the window has no such field or button. */
const inputFor = (scene: TkScene, action: WindowAction): TkInput | string => {
  switch (action._tag) {
    case "Type": {
      const field = shownWidgets(scene).filter((w) => w.kind === "Entry").sort(byId)[action.field - 1]
      return field === undefined
        ? `У вікні немає ${action.field}-го поля для введення (\`Entry\`).`
        : { _tag: "Edit", widget: field.id, text: action.text }
    }
    case "Click": {
      const button = shownWidgets(scene).find((w) => w.kind === "Button" && w.text.trim() === action.button)
      return button === undefined ? `У вікні немає кнопки з написом «${action.button}».` : { _tag: "Invoke", widget: button.id }
    }
  }
}

const NUMBER = /-?\d+(?:[.,]\d+)?(?:e[+-]?\d+)?/gi
const EPSILON = 1e-9

const lastNumber = (text: string): number => {
  const found = text.match(NUMBER)
  const last = found === null ? undefined : found.at(-1)
  return last === undefined ? Number.NaN : Number(last.replace(",", "."))
}

const isNumber = (text: string): boolean => /^-?\d+(?:[.,]\d+)?$/.test(text.trim())

/** True when a widget text shows the wanted value (see `WindowCheck` "Shows"). */
export const showsValue = (text: string, want: string): boolean =>
  isNumber(want)
    ? Math.abs(lastNumber(text) - Number(want.trim().replace(",", "."))) < EPSILON
    : text.toLowerCase().includes(want.trim().toLowerCase())

const quoted = (texts: readonly string[]): string => texts.filter((t) => t.trim() !== "").map((t) => `«${t.trim()}»`).join(", ")

/** A message when the window does not meet the check, or "". `typed`: ids of the fields that the trial filled. */
const windowProblem = (scene: TkScene, check: WindowCheck, typed: ReadonlySet<number>, why: string): string => {
  switch (check._tag) {
    case "Title": {
      const titles = scene.windows.map((w) => w.title)
      return titles.includes(check.text) ? "" : `Заголовок вікна ${quoted(titles) || "порожній"}, а треба «${check.text}». ${why}`
    }
    case "Widget":
      return shownWidgets(scene).some((w) => w.kind === check.kind && (check.text === "" || w.text.trim() === check.text))
        ? ""
        : why
    case "Shows": {
      const shown = shownWidgets(scene).filter((w) => (w.kind === "Label" || w.kind === "Entry") && !typed.has(w.id))
      if (shown.some((w) => showsValue(w.text, check.text))) return ""
      const now = quoted(shown.map((w) => w.text))
      return `${why} Треба, щоб вікно показало ${check.text}${now === "" ? "." : `, а воно показує: ${now}.`}`
    }
  }
}

const NO_WINDOW = "Вікно не відкрилося або закрилося. Перевір, що програма створює вікно `Tk()` і закінчується рядком `root.mainloop()` (з назвою твого вікна)."

const runWindow = async (driver: Driver, code: string, trial: WindowTrial): Promise<TrialResult> => {
  const wrong = (message: string): TrialResult => ({ _tag: "Wrong", label: trial.label, message, compare: noCompare })
  const first = await driver.run(code, "")
  const problem = turnProblem(first, code)
  if (problem !== "") return wrong(problem)
  let scene = first.end === TurnEnds.Waiting ? sceneOf(first.scene) : null
  const typed = new Set<number>()
  for (const action of trial.actions) {
    if (scene === null) return wrong(NO_WINDOW)
    const input = inputFor(scene, action)
    if (typeof input === "string") return wrong(input)
    if (input._tag === "Edit") typed.add(input.widget)
    const turn = await driver.event(input)
    const failed = turnProblem(turn, code)
    if (failed !== "") return wrong(failed)
    scene = turn.end !== TurnEnds.Waiting ? null : turn.scene === "" ? scene : sceneOf(turn.scene)
  }
  if (scene === null) return wrong(NO_WINDOW)
  const current = scene
  const message = trial.expect.map((c) => windowProblem(current, c, typed, trial.why)).find((m) => m !== "")
  return message === undefined ? { _tag: "Passed", label: trial.label } : wrong(message)
}

/** Runs one trial on a fresh engine: a program of the previous trial does not change the next one. */
export const runTrial = async (drivers: DriverFactory, code: string, trial: Trial): Promise<TrialResult> => {
  const driver = drivers()
  try {
    return trial._tag === "Console" ? await runConsole(driver, code, trial) : await runWindow(driver, code, trial)
  } finally {
    driver.close()
  }
}

export type ProgramVerdict =
  | { readonly _tag: "Solved"; readonly trials: readonly TrialResult[] }
  | { readonly _tag: "Failed"; readonly trials: readonly TrialResult[] }
  /** The program does not have these words of `mustUse`: it does not run. */
  | { readonly _tag: "MustUse"; readonly words: readonly string[] }
  | { readonly _tag: "LoadFailed" }

const LOAD_FAILED = "Не вдалося завантажити Python. Перевір інтернет і спробуй ще раз."

/** Checks a program: first the words it must use, then every trial. */
export const checkProgram = async (drivers: DriverFactory, step: ProgramStep, code: string): Promise<ProgramVerdict> => {
  const missing = missingWords(step, code)
  if (missing.length > 0) return { _tag: "MustUse", words: missing }
  const trials: TrialResult[] = []
  for (const trial of step.trials) trials.push(await runTrial(drivers, code, trial))
  if (trials.some((t) => t._tag === "Wrong" && t.message === LOAD_FAILED)) return { _tag: "LoadFailed" }
  return trials.every((t) => t._tag === "Passed") ? { _tag: "Solved", trials } : { _tag: "Failed", trials }
}

/** A short message about a verdict, in Ukrainian. Words in `backticks` are code. */
export const verdictMessage = (verdict: ProgramVerdict): string => {
  switch (verdict._tag) {
    case "Solved":
      return "Усі випробування пройдено!"
    case "Failed": {
      const passed = verdict.trials.filter((t) => t._tag === "Passed").length
      return `Пройдено ${passed} з ${verdict.trials.length} випробувань. Подивись, що пішло не так, виправ програму й перевір ще раз.`
    }
    case "MustUse":
      return `У цьому завданні програма має використати ${verdict.words.map((w) => `\`${w}\``).join(", ")}.`
    case "LoadFailed":
      return LOAD_FAILED
  }
}
