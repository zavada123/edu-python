/**
 * Parts shared by the checks of the code (`code-check.ts`, `code-check-more.ts`): the context of a check, the
 * values of a call, the own function of a name, words for the messages.
 */
import type { SyntaxNode } from "@lezer/common"
import { type CodeModel, type FunctionInfo, resolve, type Scope, ScopeKinds } from "./code-scope.ts"
import type { Typer } from "./python-names.ts"

export const CheckSeverities = { Error: "error", Warning: "warning" } as const
export type CheckSeverity = (typeof CheckSeverities)[keyof typeof CheckSeverities]

export interface CodeWarning {
  readonly from: number
  readonly to: number
  readonly severity: CheckSeverity
  readonly message: string
}

/** At most this many marks: the student fixes the first ones and sees the next. */
export const MaxWarnings = 12

/** `1 значення`, `5 значень`. */
export const valuesWord = (count: number): string => {
  const tens = count % 100
  const ones = count % 10
  if (tens >= 11 && tens <= 14) return `${count} значень`
  if (ones === 1) return `${count} значення`
  if (ones >= 2 && ones <= 4) return `${count} значення`
  return `${count} значень`
}

/** Edits between two words; two neighbour letters swapped (`titel`, `title`) count as one. */
export const levenshtein = (a: string, b: string): number => {
  const d: Array<Array<number>> = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const row = d[i] ?? []
      row[j] = Math.min((d[i - 1]?.[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (d[i - 1]?.[j - 1] ?? 0) + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) row[j] = Math.min(row[j] ?? 0, (d[i - 2]?.[j - 2] ?? 0) + 1)
    }
  }
  return d[a.length]?.[b.length] ?? 0
}

/** A known name that differs only in letter case or in 1–2 letters. */
export const similarName = (name: string, candidates: ReadonlyArray<string>): string | undefined => {
  const sameCase = candidates.find((c) => c !== name && c.toLowerCase() === name.toLowerCase())
  if (sameCase !== undefined) return sameCase
  const limit = name.length <= 3 ? 0 : name.length <= 5 ? 1 : 2
  return candidates
    .filter((c) => c !== name && Math.abs(c.length - name.length) <= limit)
    .map((c) => ({ c, d: levenshtein(name.toLowerCase(), c.toLowerCase()) }))
    .filter((x) => x.d <= limit)
    .sort((a, b) => a.d - b.d)[0]?.c
}

export interface Context {
  readonly model: CodeModel
  readonly types: Typer
  readonly text: (node: SyntaxNode) => string
  readonly line: (pos: number) => number
  readonly add: (from: number, to: number, severity: CheckSeverity, message: string) => void
  readonly warningsCount: () => number
}

export interface CallArgs {
  readonly positional: number
  readonly keywords: ReadonlyArray<{ readonly name: string; readonly node: SyntaxNode }>
  /** `*args` or `**kwargs` in the call: the count is not known. */
  readonly spread: boolean
  readonly values: ReadonlyArray<SyntaxNode>
  readonly keywordValues: ReadonlyMap<string, SyntaxNode>
}

export const readArgs = (ctx: Context, list: SyntaxNode): CallArgs => {
  const parts: Array<SyntaxNode> = []
  for (let child = list.firstChild; child !== null; child = child.nextSibling) parts.push(child)
  let positional = 0
  let spread = false
  const keywords: Array<{ name: string; node: SyntaxNode }> = []
  const values: Array<SyntaxNode> = []
  const keywordValues = new Map<string, SyntaxNode>()
  let i = 0
  while (i < parts.length) {
    const part = parts[i]
    if (part === undefined) break
    if (part.name === "(" || part.name === ")" || part.name === ",") {
      i += 1
      continue
    }
    if (part.name === "*" || part.name === "**") {
      spread = true
      i += 2
      continue
    }
    if (part.name === "VariableName" && parts[i + 1]?.name === "AssignOp") {
      const value = parts[i + 2]
      keywords.push({ name: ctx.text(part), node: part })
      if (value !== undefined) keywordValues.set(ctx.text(part), value)
      i += 3
      continue
    }
    if (part.name === "for") {
      // `f(x for x in y)`: one generator.
      return { positional: 1, keywords, spread: true, values, keywordValues }
    }
    positional += 1
    values.push(part)
    i += 1
  }
  return { positional, keywords, spread, values, keywordValues }
}

/** The one `def` of a name: not changed by other assignments, not decorated. */
export const ownFunction = (ctx: Context, node: SyntaxNode, scope: Scope): FunctionInfo | undefined => {
  if (node.name !== "VariableName") return undefined
  const found = resolve(ctx.text(node), scope, ctx.model.module)
  if (found === null || found.bindings.length !== 1) return undefined
  const fn = found.bindings[0]?.fn
  return fn === undefined || fn.decorated || fn.method ? undefined : fn
}

/** The scope of a node: the innermost scope that contains it. */
export const scopeOf = (model: CodeModel, pos: number): Scope => {
  let scope = model.module
  for (;;) {
    const inner = scope.children.find((child) => child.from <= pos && pos < child.to && !(child.kind === ScopeKinds.Function && pos < (child.fn?.node.getChild("Body")?.from ?? child.from)))
    if (inner === undefined) return scope
    scope = inner
  }
}

/** The variable has text from `input()` in every assignment. */
export const fromInput = (ctx: Context, node: SyntaxNode, scope: Scope): boolean => {
  const found = resolve(ctx.text(node), scope, ctx.model.module)
  if (found === null) return false
  return found.bindings.every((b) => {
    const value = b.value
    if (value?.name !== "CallExpression") return false
    const callee = value.firstChild
    return callee?.name === "VariableName" && ctx.text(callee) === "input"
  })
}

export const inputMessage = (name: string): string =>
  `У \`${name}\` — текст, який ввели в \`input()\`, а не число. Щоб рахувати, перетвори його: \`${name} = int(input(...))\` або \`float(input(...))\`.`
