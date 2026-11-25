/**
 * Mistakes that Python finds only during a run, found while the student types: a name that is never created,
 * a call with a different number of values than the `def`, a function called above its `def`, text from
 * `input()` in arithmetic, `x = input` without brackets, `command=f()` in tkinter. Each message is in Ukrainian,
 * with `code` in backticks as in `errors.ts`. The code is not run: a check works on the syntax tree only.
 */
import type { SyntaxNode } from "@lezer/common"
import {
  analyze, BindingKinds, type Binding, type CodeModel, enclosingFunction, type FunctionInfo, hasAncestor, ParamKinds, resolve,
  type Scope, ScopeKinds, type Use, visibleBindings, visibleStarImports
} from "./code-scope.ts"
import { builtinDocs, isBuiltin, isKnownModule, splitParams, type Typer, typer, TypeKinds, type ValueType } from "./python-names.ts"
import { apiModules } from "./python-api.ts"

export const CheckSeverities = { Error: "error", Warning: "warning" } as const
export type CheckSeverity = (typeof CheckSeverities)[keyof typeof CheckSeverities]

export interface CodeWarning {
  readonly from: number
  readonly to: number
  readonly severity: CheckSeverity
  readonly message: string
}

/** At most this many marks: the student fixes the first ones and sees the next. */
const MaxWarnings = 12

/** `1 значення`, `5 значень`. */
export const valuesWord = (count: number): string => {
  const tens = count % 100
  const ones = count % 10
  if (tens >= 11 && tens <= 14) return `${count} значень`
  if (ones === 1) return `${count} значення`
  if (ones >= 2 && ones <= 4) return `${count} значення`
  return `${count} значень`
}

const levenshtein = (a: string, b: string): number => {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current.push(Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, (previous[j - 1] ?? 0) + cost))
    }
    previous = current
  }
  return previous[b.length] ?? 0
}

/** A known name that differs only in letter case or in 1–2 letters. */
const similarName = (name: string, candidates: ReadonlyArray<string>): string | undefined => {
  const sameCase = candidates.find((c) => c !== name && c.toLowerCase() === name.toLowerCase())
  if (sameCase !== undefined) return sameCase
  const limit = name.length <= 3 ? 0 : name.length <= 5 ? 1 : 2
  return candidates
    .filter((c) => c !== name && Math.abs(c.length - name.length) <= limit)
    .map((c) => ({ c, d: levenshtein(name.toLowerCase(), c.toLowerCase()) }))
    .filter((x) => x.d <= limit)
    .sort((a, b) => a.d - b.d)[0]?.c
}

const LoopNodes: ReadonlySet<string> = new Set(["ForStatement", "WhileStatement"])
/** Builtins that give a value: without brackets the variable gets the function. */
const ValueFunctions: ReadonlySet<string> = new Set(["input", "int", "float", "str", "len", "abs", "round", "max", "min", "sum", "sorted"])
/** Calls whose result is the point: alone on a line they change nothing. */
const ResultFunctions: ReadonlySet<string> = new Set(["int", "float", "str", "round", "abs", "len", "sorted"])
/** Widgets whose `command` is called without values. */
const ButtonWidgets: ReadonlySet<string> = new Set(["Button", "Checkbutton", "Radiobutton"])
const StrNewValue: ReadonlySet<string> = new Set(["upper", "lower", "capitalize", "title", "strip", "lstrip", "rstrip", "replace"])

interface Context {
  readonly model: CodeModel
  readonly types: Typer
  readonly text: (node: SyntaxNode) => string
  readonly line: (pos: number) => number
  readonly add: (from: number, to: number, severity: CheckSeverity, message: string) => void
}

/** Names that can be read at a use: for "maybe you meant". */
const candidatesAt = (scope: Scope): ReadonlyArray<string> => {
  const own = visibleBindings(scope).map((b) => b.name)
  const starred = visibleStarImports(scope).flatMap((path) => Object.keys(apiModules[path] ?? {}))
  return [...own, ...starred, ...Object.keys(builtinDocs)]
}

/** A name that is never created, or created only below the place where it is read. */
const checkNames = (ctx: Context): void => {
  const { model } = ctx
  const unknownStar = (scope: Scope): boolean => visibleStarImports(scope).some((path) => !isKnownModule(path))
  const reported = new Set<string>()
  for (const use of model.uses) {
    const found = resolve(use.name, use.scope, model.module)
    if (found === null) {
      if (isBuiltin(use.name) || unknownStar(use.scope)) continue
      if (visibleStarImports(use.scope).some((path) => apiModules[path]?.[use.name] !== undefined)) continue
      const fn = enclosingFunction(use.scope)
      const key = `${use.name}@${fn?.node.from ?? -1}`
      if (reported.has(key)) continue
      reported.add(key)
      ctx.add(use.from, use.to, CheckSeverities.Error, undefinedMessage(use, fn))
      continue
    }
    checkOrder(ctx, use, found.scope, found.bindings, reported)
  }
}

const undefinedMessage = (use: Use, fn: FunctionInfo | undefined): string => {
  const head = `Ім'я \`${use.name}\` ніде не створене.`
  const similar = similarName(use.name, candidatesAt(use.scope))
  if (similar !== undefined) return `${head} Можливо, ти мав на увазі \`${similar}\`?`
  if (fn !== undefined && !fn.method) {
    const params = [...fn.params.map((p) => p.name), use.name].join(", ")
    return `${head} Якщо це значення, яке функція \`${fn.name}\` має отримати, додай параметр: \`def ${fn.name}(${params}):\`. Або створи його раніше: \`${use.name} = 0\`.`
  }
  return `${head} Спершу присвой йому значення, наприклад \`${use.name} = 0\`, або перевір, чи правильно воно написане.`
}

/** Read before it gets a value: Python runs the code from top to bottom. */
const checkOrder = (ctx: Context, use: Use, scope: Scope, bindings: ReadonlyArray<Binding>, reported: Set<string>): void => {
  // Only reads right in the scope of the names (a function body runs later, when it is called).
  if (use.scope !== scope || scope.kind === ScopeKinds.Class) return
  if (bindings.some((b) => b.at <= use.from)) return
  if (bindings.some((b) => b.kind === BindingKinds.Param || b.kind === BindingKinds.Import && scope.kind !== ScopeKinds.Module)) return
  // In a loop the value can come from the previous round.
  if (hasAncestor(use.node, LoopNodes, scope.from) && bindings.some((b) => b.from >= scope.from)) {
    const loopHasBinding = bindings.some((b) => {
      for (let p = use.node.parent; p !== null && p.from >= scope.from; p = p.parent) if (LoopNodes.has(p.name) && p.from <= b.from && b.to <= p.to) return true
      return false
    })
    if (loopHasBinding) return
  }
  if (hasAncestor(use.node, new Set(["TryStatement"]), scope.from)) return
  const key = `${use.name}@order@${scope.from}`
  if (reported.has(key)) return
  reported.add(key)
  const first = bindings.reduce((a, b) => (b.from < a.from ? b : a))
  const line = ctx.line(first.from)
  if (scope.kind === ScopeKinds.Function) {
    const global = ctx.model.module.bindings.has(use.name)
    const fn = scope.fn
    if (global && fn !== undefined) {
      return ctx.add(use.from, use.to, CheckSeverities.Error, `У функції \`${fn.name}\` змінна \`${use.name}\` змінюється, тому Python вважає її новою, своєю для функції, і тут вона ще без значення. Щоб змінювати загальну змінну, напиши на початку функції: \`global ${use.name}\`.`)
    }
    return ctx.add(use.from, use.to, CheckSeverities.Error, `Змінна \`${use.name}\` отримує значення нижче, у рядку ${line}, а тут її вже читають. Python виконує рядки згори вниз.`)
  }
  if (first.kind === BindingKinds.Function) {
    return ctx.add(use.from, use.to, CheckSeverities.Error, `Функцію \`${use.name}\` створено нижче, у рядку ${line}, а Python виконує програму згори вниз. Перенеси \`def ${use.name}\` вище за цей рядок.`)
  }
  ctx.add(use.from, use.to, CheckSeverities.Error, `Змінна \`${use.name}\` отримує значення нижче, у рядку ${line}, а тут її вже читають. Python виконує програму згори вниз: присвой значення раніше.`)
}

interface CallArgs {
  readonly positional: number
  readonly keywords: ReadonlyArray<{ readonly name: string; readonly node: SyntaxNode }>
  /** `*args` or `**kwargs` in the call: the count is not known. */
  readonly spread: boolean
  readonly values: ReadonlyArray<SyntaxNode>
  readonly keywordValues: ReadonlyMap<string, SyntaxNode>
}

const readArgs = (ctx: Context, list: SyntaxNode): CallArgs => {
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

interface Signature {
  readonly name: string
  readonly positional: ReadonlyArray<{ readonly name: string; readonly hasDefault: boolean }>
  readonly keywordOnly: ReadonlyArray<{ readonly name: string; readonly hasDefault: boolean }>
  readonly star: boolean
  readonly doubleStar: boolean
  /** `def f(a, b):` for the message, or none for a function of a module. */
  readonly def?: string
}

const ownSignature = (fn: FunctionInfo): Signature => ({
  name: fn.name,
  positional: fn.params.filter((p) => p.kind === ParamKinds.Positional),
  keywordOnly: fn.params.filter((p) => p.kind === ParamKinds.KeywordOnly),
  star: fn.params.some((p) => p.kind === ParamKinds.Star),
  doubleStar: fn.params.some((p) => p.kind === ParamKinds.DoubleStar),
  def: `def ${fn.name}(${fn.paramsText.trim()}):`
})

/** The signature of `a, b=1, *args` from `python-api.ts`. */
const apiSignature = (name: string, params: string): Signature | undefined => {
  const parts = splitParams(params)
  const positional: Array<{ name: string; hasDefault: boolean }> = []
  const keywordOnly: Array<{ name: string; hasDefault: boolean }> = []
  let star = false
  let doubleStar = false
  for (const part of parts) {
    if (part.startsWith("**")) doubleStar = true
    else if (part.startsWith("*")) star = true
    else {
      const param = { name: part.split("=")[0]?.trim() ?? part, hasDefault: part.includes("=") }
      if (star) keywordOnly.push(param)
      else positional.push(param)
    }
  }
  return { name, positional, keywordOnly, star, doubleStar }
}

/** A call with a different number of values than the function takes. */
const argsMessage = (sig: Signature, args: CallArgs): string | undefined => {
  const max = sig.positional.length
  const where = sig.def === undefined ? "" : ` (\`${sig.def}\`)`
  if (!sig.star && args.positional > max) {
    if (max === 0) return `Функція \`${sig.name}\` не приймає значень${where}, а тут їй передають ${valuesWord(args.positional)}.`
    const names = sig.positional.map((p) => p.name).join(", ")
    return `Функція \`${sig.name}\` приймає ${valuesWord(max)} (\`${names}\`), а тут їй передають ${valuesWord(args.positional)}.${sig.def === undefined ? "" : ` Додай параметр у \`${sig.def}\` або прибери зайве значення.`}`
  }
  const known = new Set([...sig.positional, ...sig.keywordOnly].map((p) => p.name))
  const strange = args.keywords.find((k) => !known.has(k.name))
  if (strange !== undefined && !sig.doubleStar) {
    const list = [...known].join(", ")
    return `У функції \`${sig.name}\` немає параметра \`${strange.name}\`.${list === "" ? "" : ` Її параметри: \`${list}\`.`}`
  }
  if (args.spread) return undefined
  const given = new Set(args.keywords.map((k) => k.name))
  const missing = [
    ...sig.positional.slice(args.positional).filter((p) => !p.hasDefault && !given.has(p.name)),
    ...sig.keywordOnly.filter((p) => !p.hasDefault && !given.has(p.name))
  ]
  if (missing.length === 0) return undefined
  const need = sig.positional.filter((p) => !p.hasDefault).length
  const names = missing.map((p) => `\`${p.name}\``).join(", ")
  return `Функція \`${sig.name}\` чекає ${valuesWord(need)}${where}, а тут їй передають ${valuesWord(args.positional + args.keywords.length)}. Бракує значення для ${names}.`
}

/** The one `def` of a name: not changed by other assignments, not decorated. */
const ownFunction = (ctx: Context, node: SyntaxNode, scope: Scope): FunctionInfo | undefined => {
  if (node.name !== "VariableName") return undefined
  const found = resolve(ctx.text(node), scope, ctx.model.module)
  if (found === null || found.bindings.length !== 1) return undefined
  const fn = found.bindings[0]?.fn
  return fn === undefined || fn.decorated || fn.method ? undefined : fn
}

/** The scope of a node: the innermost scope that contains it. */
const scopeOf = (model: CodeModel, pos: number): Scope => {
  let scope = model.module
  for (;;) {
    const inner = scope.children.find((child) => child.from <= pos && pos < child.to && !(child.kind === ScopeKinds.Function && pos < (child.fn?.node.getChild("Body")?.from ?? child.from)))
    if (inner === undefined) return scope
    scope = inner
  }
}

const signatureOf = (ctx: Context, callee: SyntaxNode, scope: Scope): Signature | undefined => {
  const own = ownFunction(ctx, callee, scope)
  if (own !== undefined) return ownSignature(own)
  const type: ValueType = ctx.types.typeOf(callee, scope)
  if ((type.kind === TypeKinds.ApiFunction || type.kind === TypeKinds.ApiClass) && type.params !== undefined) {
    // Methods of objects are left out: their parameters in tkinter differ between versions.
    if (type.kind === TypeKinds.ApiFunction && !isKnownModule(type.path)) return undefined
    return apiSignature(type.name, type.params)
  }
  return undefined
}

const checkCall = (ctx: Context, call: SyntaxNode, scope: Scope): void => {
  const callee = call.firstChild
  const list = call.getChild("ArgList")
  if (callee === null || list === null) return
  const args = readArgs(ctx, list)
  const calleeName = callee.name === "VariableName" ? ctx.text(callee) : ""
  const builtin = calleeName !== "" && resolve(calleeName, scope, ctx.model.module) === null ? builtinDocs[calleeName] : undefined
  if (builtin !== undefined && !args.spread && args.keywords.length === 0) {
    if (args.positional > builtin.max) return ctx.add(callee.from, list.to, CheckSeverities.Error, `\`${calleeName}\` приймає ${builtin.max === 0 ? "не більше 0 значень" : `не більше ${valuesWord(builtin.max)}`}, а тут їй передають ${valuesWord(args.positional)}.`)
    if (args.positional < builtin.min) return ctx.add(callee.from, list.to, CheckSeverities.Error, `\`${calleeName}\` потрібно ${valuesWord(builtin.min)} в дужках: \`${calleeName}(${builtin.params})\`.`)
  }
  const sig = signatureOf(ctx, callee, scope)
  if (sig !== undefined) {
    const message = argsMessage(sig, args)
    if (message !== undefined) ctx.add(callee.from, list.to, CheckSeverities.Error, message)
  }
  checkTkCallbacks(ctx, callee, args, scope)
  checkStrArgs(ctx, calleeName, builtin !== undefined, args, scope)
}

/** `range(a)` where `a` is text from `input()`. */
const checkStrArgs = (ctx: Context, calleeName: string, builtin: boolean, args: CallArgs, scope: Scope): void => {
  if (!builtin || calleeName !== "range") return
  for (const value of args.values) {
    if (value.name === "VariableName" && ctx.types.typeOf(value, scope).kind === TypeKinds.Str && fromInput(ctx, value, scope)) {
      ctx.add(value.from, value.to, CheckSeverities.Error, inputMessage(ctx.text(value)))
    }
  }
}

/** tkinter: `command=f()`, `bind('<1>', f)` with `def f():`, `command=f` with `def f(event):`. */
const checkTkCallbacks = (ctx: Context, callee: SyntaxNode, args: CallArgs, scope: Scope): void => {
  const method = callee.name === "MemberExpression" ? ctx.text(callee.getChild("PropertyName") ?? callee) : ""
  const calleeLast = callee.name === "VariableName" ? ctx.text(callee) : method
  const handlers: Array<{ readonly value: SyntaxNode; readonly where: string; readonly event: boolean }> = []
  const command = args.keywordValues.get("command")
  if (command !== undefined) handlers.push({ value: command, where: "command", event: false })
  if (method === "bind" || method === "bind_all" || method === "tag_bind") {
    const handler = args.values[method === "tag_bind" ? 2 : 1]
    if (handler !== undefined) handlers.push({ value: handler, where: method, event: true })
  }
  if (method === "after") {
    const handler = args.values[1]
    if (handler !== undefined) handlers.push({ value: handler, where: "after", event: false })
  }
  for (const { value, where, event } of handlers) {
    if (value.name === "CallExpression") {
      const fn = ownFunction(ctx, value.firstChild ?? value, scope)
      if (fn === undefined || fn.returnsValue) continue
      const callText = ctx.text(value)
      const target = where === "command" ? `command=${fn.name}` : fn.name
      ctx.add(value.from, value.to, CheckSeverities.Warning, `Тут \`${callText}\` з дужками: функцію буде викликано одразу, ще до ${event ? "події" : "кліку"}, а ${where === "command" ? "кнопка" : `\`${where}\``} отримає лише її результат (None). Прибери дужки: \`${target}\`.${where === "command" && callText.includes("(") && !callText.endsWith("()") ? ` Щоб передати значення, використай \`lambda\`: \`command=lambda: ${callText}\`.` : ""}`)
      continue
    }
    const fn = ownFunction(ctx, value, scope)
    if (fn === undefined) continue
    const sig = ownSignature(fn)
    const required = sig.positional.filter((p) => !p.hasDefault)
    if (event && sig.positional.length === 0 && !sig.star) {
      ctx.add(value.from, value.to, CheckSeverities.Error, `Функція для \`${where}\` отримує подію (\`event\`), а в \`${sig.def ?? ""}\` для неї немає параметра. Додай його: \`def ${fn.name}(event):\`.`)
    }
    // `Scale` and others give their `command` a value: only buttons call it without values.
    if (!event && required.length > 0 && (where !== "command" || ButtonWidgets.has(calleeLast))) {
      const first = required[0]?.name ?? "x"
      const rest = fn.params.map((p) => (p.name === first ? `${first}=None` : p.name)).join(", ")
      ctx.add(value.from, value.to, CheckSeverities.Error, `${where === "command" ? "Кнопка" : `\`${where}\``} викликає \`${fn.name}\` без значень, а \`${sig.def ?? ""}\` чекає ${required.map((p) => `\`${p.name}\``).join(", ")}. Дай параметру значення за замовчуванням: \`def ${fn.name}(${rest}):\`${where === "command" ? ` або передай значення через \`lambda\`: \`command=lambda: ${fn.name}(...)\`` : ""}.`)
    }
  }
}

/** The variable has text from `input()` in every assignment. */
const fromInput = (ctx: Context, node: SyntaxNode, scope: Scope): boolean => {
  const found = resolve(ctx.text(node), scope, ctx.model.module)
  if (found === null) return false
  return found.bindings.every((b) => {
    const value = b.value
    if (value?.name !== "CallExpression") return false
    const callee = value.firstChild
    return callee?.name === "VariableName" && ctx.text(callee) === "input"
  })
}

const inputMessage = (name: string): string =>
  `У \`${name}\` — текст, який ввели в \`input()\`, а не число. Щоб рахувати, перетвори його: \`${name} = int(input(...))\` або \`float(input(...))\`.`

/** `a - 1`, `a + 1`, `a > 5` where `a` is text from `input()`. */
const checkArithmetic = (ctx: Context, node: SyntaxNode, scope: Scope): void => {
  const left = node.firstChild
  const op = left?.nextSibling
  const right = node.lastChild
  if (left === null || op === null || op === undefined || right === null || left === right) return
  const opText = ctx.text(op)
  const sides = [left, right]
  const typeKinds = sides.map((side) => ctx.types.typeOf(side, scope).kind)
  const numeric = (kind: string): boolean => kind === TypeKinds.Int || kind === TypeKinds.Float
  sides.forEach((side, index) => {
    if (side.name !== "VariableName" || typeKinds[index] !== TypeKinds.Str || !fromInput(ctx, side, scope)) return
    const other = typeKinds[1 - index] ?? TypeKinds.Unknown
    const arithmetic = op.name === "ArithOp" && (["-", "/", "//", "**"].includes(opText) || (opText === "+" && numeric(other)) || (opText === "*" && other === TypeKinds.Float))
    const compare = op.name === "CompareOp" && ["<", ">", "<=", ">="].includes(opText) && numeric(other)
    if (arithmetic || compare) return ctx.add(side.from, side.to, CheckSeverities.Error, inputMessage(ctx.text(side)))
    if (op.name === "CompareOp" && (opText === "==" || opText === "!=") && numeric(other)) {
      ctx.add(side.from, side.to, CheckSeverities.Warning, `\`${ctx.text(side)}\` — текст з \`input()\`, а праворуч число, тому \`${opText}\` ${opText === "==" ? "завжди дає False" : "завжди дає True"}. Перетвори текст на число: \`${ctx.text(side)} = int(input(...))\`.`)
    }
  })
}

/** `x = input` and `root.mainloop` without brackets. */
const checkNoBrackets = (ctx: Context, node: SyntaxNode, scope: Scope): void => {
  if (node.name === "AssignStatement") {
    const value = node.lastChild
    const target = node.firstChild
    if (value?.name !== "VariableName" || target === null) return
    const name = ctx.text(value)
    if (!ValueFunctions.has(name) || resolve(name, scope, ctx.model.module) !== null) return
    const call = name === "input" ? "input()" : `${name}(...)`
    ctx.add(value.from, value.to, CheckSeverities.Warning, `Тут у \`${ctx.text(target)}\` потрапляє сама функція \`${name}\`, а не ${name === "input" ? "те, що ввели" : "її результат"}. Додай дужки: \`${call}\`.`)
    return
  }
  // ExpressionStatement with a name of a function alone.
  const expr = node.firstChild
  if (expr === null || (expr.name !== "VariableName" && expr.name !== "MemberExpression")) return
  const type = ctx.types.typeOf(expr, scope)
  const own = expr.name === "VariableName" ? ownFunction(ctx, expr, scope) : undefined
  const isFunction = own !== undefined || type.kind === TypeKinds.ApiFunction || (expr.name === "VariableName" && resolve(ctx.text(expr), scope, ctx.model.module) === null && builtinDocs[ctx.text(expr)] !== undefined)
  if (!isFunction) return
  ctx.add(expr.from, expr.to, CheckSeverities.Warning, `Функцію \`${ctx.text(expr)}\` тут не викликано: бракує дужок. Напиши \`${ctx.text(expr)}()\`.`)
}

/** `int(a)` or `name.upper()` alone on a line: the result is lost. */
const checkLostResult = (ctx: Context, node: SyntaxNode, scope: Scope): void => {
  const call = node.firstChild
  if (call?.name !== "CallExpression") return
  const callee = call.firstChild
  const list = call.getChild("ArgList")
  if (callee === null || list === null) return
  if (callee.name === "VariableName") {
    const name = ctx.text(callee)
    if (!ResultFunctions.has(name) || resolve(name, scope, ctx.model.module) !== null) return
    const first = readArgs(ctx, list).values[0]
    const target = first?.name === "VariableName" ? ctx.text(first) : "x"
    ctx.add(call.from, call.to, CheckSeverities.Warning, `Результат \`${ctx.text(call)}\` нікуди не записано, тому нічого не зміниться. Запиши його: \`${target} = ${ctx.text(call)}\`${name === "int" || name === "float" ? " або одразу виведи: `print(...)`" : ""}.`)
    return
  }
  if (callee.name !== "MemberExpression") return
  const object = callee.firstChild
  const property = callee.getChild("PropertyName")
  if (object?.name !== "VariableName" || property === null || !StrNewValue.has(ctx.text(property))) return
  if (ctx.types.typeOf(object, scope).kind !== TypeKinds.Str) return
  ctx.add(call.from, call.to, CheckSeverities.Warning, `Рядок у Python не змінюється: \`${ctx.text(property)}()\` дає новий рядок. Запиши його: \`${ctx.text(object)} = ${ctx.text(call)}\`.`)
}

const walk = (ctx: Context): void => {
  const visit = (node: SyntaxNode): void => {
    const scope = (): Scope => scopeOf(ctx.model, node.from)
    if (node.name === "CallExpression") checkCall(ctx, node, scope())
    else if (node.name === "BinaryExpression") checkArithmetic(ctx, node, scope())
    else if (node.name === "AssignStatement") checkNoBrackets(ctx, node, scope())
    else if (node.name === "ExpressionStatement") {
      checkNoBrackets(ctx, node, scope())
      checkLostResult(ctx, node, scope())
    }
    for (let child = node.firstChild; child !== null; child = child.nextSibling) visit(child)
  }
  visit(ctx.model.tree.topNode)
}

/** Mistakes of the code that compiles; nothing for code with a syntax error (the syntax check marks it). */
export const checkCode = (code: string): ReadonlyArray<CodeWarning> => {
  const model = analyze(code)
  if (model.broken) return []
  const warnings: Array<CodeWarning> = []
  const lineStarts = [0]
  for (let i = 0; i < code.length; i++) if (code[i] === "\n") lineStarts.push(i + 1)
  const ctx: Context = {
    model,
    types: typer(model),
    text: (node) => code.slice(node.from, node.to),
    line: (pos) => {
      let line = 0
      while (line + 1 < lineStarts.length && (lineStarts[line + 1] ?? Infinity) <= pos) line += 1
      return line + 1
    },
    add: (from, to, severity, message) => {
      if (warnings.some((w) => w.from === from && w.to === to)) return
      warnings.push({ from, to, severity, message })
    }
  }
  if (!model.unsupported && !/\b(exec|eval|globals|locals|setattr|__import__)\s*\(/.test(code)) checkNames(ctx)
  walk(ctx)
  return warnings.sort((a, b) => a.from - b.from).slice(0, MaxWarnings)
}
