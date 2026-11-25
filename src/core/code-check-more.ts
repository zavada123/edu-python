/**
 * More checks of `code-check.ts`, close to those of Pyright, in words for a student: a method or a module
 * with a typo, text + number, a variable that gets a value only in an `if`, a `def` written twice,
 * a method without `self`, and the result of a function that returns nothing.
 */
import type { SyntaxNode } from "@lezer/common"
import { type Binding, BindingKinds, type FunctionInfo, ParamKinds, resolve, type Scope, ScopeKinds, type Use } from "./code-scope.ts"
import { apiClasses, apiImportable, apiModules } from "./python-api.ts"
import { classMembers, isKnownModule, moduleMembers, TypeKinds, type ValueType } from "./python-names.ts"
import { CheckSeverities, type Context, fromInput, ownFunction, similarName } from "./check-kit.ts"

/** Names of classes for a message: `вікно Tk`. */
const ClassWords: Readonly<Record<string, string>> = {
  Tk: "вікна", Toplevel: "вікна", Turtle: "черепашки", _Screen: "екрана", Label: "напису", Button: "кнопки", Entry: "поля",
  Canvas: "полотна", Frame: "рамки", Text: "текстового поля", Listbox: "списку", Scale: "повзунка", Checkbutton: "прапорця",
  Radiobutton: "перемикача", StringVar: "змінної StringVar", IntVar: "змінної IntVar"
}

const ownerWord = (type: ValueType, objectText: string): string | undefined => {
  if (type.kind === TypeKinds.Module) return `модуля \`${type.path}\``
  if (type.kind !== TypeKinds.Instance) return undefined
  const name = type.cls.split(".").at(-1) ?? type.cls
  return `\`${objectText}\` (${ClassWords[name] ?? `об'єкта ${name}`})`
}

/** `root.titel(...)`, `turtle.forwad(100)`, `math.sqr(4)`: a member that the module or the object does not have. */
export const checkMember = (ctx: Context, node: SyntaxNode, scope: Scope): void => {
  const object = node.firstChild
  const property = node.getChild("PropertyName")
  if (object === null || property === null) return
  const name = ctx.text(property)
  const type = ctx.types.typeOf(object, scope)
  if (type.kind === TypeKinds.Module) {
    if (moduleMembers(type.path).has(name) || isKnownModule(`${type.path}.${name}`) || !(type.path in apiModules)) return
  } else if (type.kind === TypeKinds.Instance) {
    // Attributes of objects are often set by the program (`root.score = 0`): only calls of methods are checked.
    if (node.parent?.name !== "CallExpression" || node.parent.firstChild?.from !== node.from || node.parent.firstChild.to !== node.to) return
    if (!(type.cls in apiClasses) || classMembers(type.cls).has(name) || new RegExp(`\\.${name}\\s*=`).test(ctx.model.code)) return
  } else return
  const owner = ownerWord(type, ctx.text(object))
  if (owner === undefined) return
  const names = type.kind === TypeKinds.Module ? [...moduleMembers(type.path).keys()] : [...classMembers(type.kind === TypeKinds.Instance ? type.cls : "").keys()]
  const guess = similarName(name, names)
  ctx.add(property.from, property.to, CheckSeverities.Error, `У ${owner} немає \`${name}\`.${guess === undefined ? " Перевір, чи правильно написане слово." : ` Можливо, \`${guess}\`?`}`)
}

/** `import turtl`, `from tkinter import Buton`: a module or a name that the engine does not have. */
export const checkImport = (ctx: Context, node: SyntaxNode): void => {
  const parts: Array<SyntaxNode> = []
  for (let child = node.firstChild; child !== null; child = child.nextSibling) parts.push(child)
  const isFrom = parts[0]?.name === "from"
  const importAt = parts.findIndex((p) => p.name === "import")
  const pathNodes = isFrom ? parts.slice(1, importAt) : []
  const modules: Array<{ readonly first: SyntaxNode; readonly last: SyntaxNode }> = []
  if (isFrom) {
    const first = pathNodes[0]
    const last = pathNodes.at(-1)
    if (first !== undefined && last !== undefined) modules.push({ first, last })
  } else {
    let group: Array<SyntaxNode> = []
    for (const part of [...parts.slice(1), null]) {
      if (part === null || part.name === "," || part.name === "as") {
        const first = group[0]
        const last = group.at(-1)
        if (first !== undefined && last !== undefined && group.every((g) => g.name === "VariableName" || g.name === ".")) modules.push({ first, last })
        group = []
        if (part?.name === "as") group = [part]
        continue
      }
      group.push(part)
    }
  }
  for (const { first, last } of modules) {
    if (first.name !== "VariableName") continue
    const top = ctx.text(first)
    if (!apiImportable.includes(top)) {
      const guess = similarName(top, apiImportable.filter((m) => !m.startsWith("_")))
      ctx.add(first.from, first.to, CheckSeverities.Error, `Модуля \`${top}\` немає.${guess === undefined ? " У цьому редакторі є, наприклад, `turtle`, `tkinter`, `random`, `math`, `time`." : ` Можливо, \`${guess}\`?`}`)
      return
    }
    const path = ctx.model.code.slice(first.from, last.to).replace(/\s+/g, "")
    if (path !== top && path in apiModules === false && apiModules[top] !== undefined && !isKnownModule(path)) {
      ctx.add(first.from, last.to, CheckSeverities.Error, `Модуля \`${path}\` немає.`)
      return
    }
  }
  if (!isFrom) return
  const path = ctx.model.code.slice(pathNodes[0]?.from ?? 0, pathNodes.at(-1)?.to ?? 0).replace(/\s+/g, "")
  if (!isKnownModule(path)) return
  const members = moduleMembers(path)
  parts.slice(importAt + 1).forEach((part, i, rest) => {
    if (part.name !== "VariableName" || rest[i - 1]?.name === "as") return
    const name = ctx.text(part)
    if (members.has(name) || isKnownModule(`${path}.${name}`)) return
    const guess = similarName(name, [...members.keys()])
    ctx.add(part.from, part.to, CheckSeverities.Error, `У модулі \`${path}\` немає \`${name}\`.${guess === undefined ? "" : ` Можливо, \`${guess}\`?`}`)
  })
}

/** `"Тобі " + vik` where `vik` is a number: TypeError. */
export const checkTextPlusNumber = (ctx: Context, node: SyntaxNode, scope: Scope): void => {
  const left = node.firstChild
  const op = left?.nextSibling
  const right = node.lastChild
  if (left === null || op === null || op === undefined || right === null || op.name !== "ArithOp" || ctx.text(op) !== "+") return
  const kinds = [left, right].map((side) => ctx.types.typeOf(side, scope).kind)
  const numeric = (kind: string): boolean => kind === TypeKinds.Int || kind === TypeKinds.Float
  const textSide = kinds[0] === TypeKinds.Str ? left : kinds[1] === TypeKinds.Str ? right : null
  const numberSide = textSide === left ? right : left
  const numberKind = textSide === left ? kinds[1] : kinds[0]
  if (textSide === null || numberKind === undefined || !numeric(numberKind)) return
  // Text from input() + number is explained by checkArithmetic: the fix is int(input()).
  if (textSide.name === "VariableName" && fromInput(ctx, textSide, scope)) return
  const raw = ctx.text(numberSide)
  const value = numberSide.name === "ParenthesizedExpression" ? raw.slice(1, -1).trim() : raw
  ctx.add(numberSide.from, numberSide.to, CheckSeverities.Error, `Не можна додати текст і число: \`${value}\` — число. Перетвори його на текст: \`str(${value})\`, або напиши f-рядок: \`f"... {${value}} ..."\`.`)
}

const ConditionalNodes: ReadonlySet<string> = new Set(["IfStatement"])
const BindingStatements: ReadonlySet<string> = new Set([
  "AssignStatement", "UpdateStatement", "ForStatement", "WhileStatement", "WithStatement", "TryStatement", "FunctionDefinition",
  "ClassDefinition", "DecoratedStatement", "ImportStatement", "ExpressionStatement"
])

/** The statement surely gives the name a value: an `if` only when it has `else` and every branch does. */
const surelyBinds = (statement: SyntaxNode, bindings: ReadonlyArray<Binding>): boolean => {
  const inside = (b: Binding): boolean => statement.from <= b.from && b.to <= statement.to
  if (!bindings.some(inside)) return false
  if (statement.name === "IfStatement") {
    let hasElse = false
    const bodies: Array<SyntaxNode> = []
    for (let child = statement.firstChild; child !== null; child = child.nextSibling) {
      if (child.name === "else") hasElse = true
      if (child.name === "Body") bodies.push(child)
    }
    return hasElse && bodies.every((body) => bodyBinds(body, bindings))
  }
  return BindingStatements.has(statement.name) || !ConditionalNodes.has(statement.name)
}

const bodyBinds = (body: SyntaxNode, bindings: ReadonlyArray<Binding>): boolean => {
  for (let child = body.firstChild; child !== null; child = child.nextSibling) if (surelyBinds(child, bindings)) return true
  return false
}

/** A variable that gets a value only in an `if` (without `else`) and is read after it. */
export const checkMaybeUnbound = (ctx: Context, use: Use, reported: Set<string>): void => {
  const found = resolve(use.name, use.scope, ctx.model.module)
  if (found === null || found.scope !== use.scope || use.scope.kind === ScopeKinds.Class || use.scope.kind === ScopeKinds.Comprehension) return
  const { bindings } = found
  if (bindings.some((b) => b.kind === BindingKinds.Param || b.kind === BindingKinds.Import && b.at <= use.from) || !bindings.some((b) => b.at <= use.from) || use.scope.kind === ScopeKinds.Lambda || use.scope.globals.has(use.name)) return
  const before = (b: Binding): boolean => b.at <= use.from
  const within = (node: SyntaxNode) => (b: Binding): boolean => node.from <= b.from && b.to <= node.to
  // Up from the read: a statement before it, at any level, that surely gives the value.
  for (let node: SyntaxNode | null = use.node; node !== null; node = node.parent) {
    const parent = node.parent
    if (parent === null) break
    if (parent.name !== "Body" && parent.name !== "Script") continue
    for (let prev = node.prevSibling; prev !== null; prev = prev.prevSibling) if (surelyBinds(prev, bindings)) return
    const compound = parent.parent
    if (parent.name === "Script" || compound === null || compound.name === "FunctionDefinition") break
    if (compound.name === "IfStatement") {
      // `if (n := ...)`: the value comes from the condition, before the first branch.
      const firstBody = compound.getChild("Body")
      if (bindings.some((b) => before(b) && b.from >= compound.from && b.to <= (firstBody?.from ?? compound.from))) return
      continue
    }
    // Loops, `try` and `with` are taken as running: a value inside them counts.
    if (bindings.some((b) => before(b) && within(compound)(b))) return
  }
  const key = `${use.name}@maybe@${use.scope.from}`
  if (reported.has(key)) return
  reported.add(key)
  ctx.add(use.from, use.to, CheckSeverities.Warning, `Змінна \`${use.name}\` отримує значення лише всередині \`if\`. Якщо умова не справдиться, тут буде помилка. Дай їй значення до \`if\` (наприклад, \`${use.name} = 0\`) або додай \`else\`.`)
}

/** `def f` twice in one scope, and a method without `self`. */
export const checkDefinitions = (ctx: Context, scope: Scope): void => {
  for (const [name, bindings] of scope.bindings) {
    const defs = bindings.filter((b) => b.kind === BindingKinds.Function && b.fn !== undefined && !b.fn.decorated)
    if (defs.length < 2 || bindings.some((b) => b.kind !== BindingKinds.Function)) continue
    const nested = defs.some((d) => {
      for (let p = d.fn?.node.parent ?? null; p !== null && p.from >= scope.from && p.name !== "Script"; p = p.parent) {
        if (p.name === "IfStatement" || p.name === "TryStatement") return true
        if (p.name === "Body" && p.parent?.name !== "ClassDefinition") break
      }
      return false
    })
    if (nested) continue
    const first = defs[0]
    for (const again of defs.slice(1)) {
      ctx.add(again.from, again.to, CheckSeverities.Warning, `Функцію \`${name}\` уже створено в рядку ${ctx.line(first?.from ?? 0)}. Друга \`def ${name}\` замінює першу, і перша вже не працюватиме. Дай функціям різні назви.`)
    }
  }
  for (const child of scope.children) {
    const fn: FunctionInfo | undefined = child.fn
    if (fn !== undefined && fn.method && !fn.decorated) {
      const first = fn.params[0]
      if (first === undefined || first.kind !== ParamKinds.Positional) {
        const nameNode = fn.node.getChild("VariableName")
        const params = ["self", ...fn.params.map((p) => p.name)].join(", ")
        if (nameNode !== null) ctx.add(nameNode.from, nameNode.to, CheckSeverities.Error, `Метод \`${fn.name}\` отримує сам об'єкт першим значенням, тому йому потрібен параметр \`self\`: \`def ${fn.name}(${params}):\`.`)
      }
    }
    checkDefinitions(ctx, child)
  }
}

const ListChangers: ReadonlySet<string> = new Set(["append", "sort", "reverse", "insert", "extend", "remove", "clear"])

/** `s = suma(2, 3)` where `suma` has no `return`; `a = a.sort()`; `x = print(...)`: the value is None. */
export const checkNoneResult = (ctx: Context, call: SyntaxNode, scope: Scope): void => {
  const parent = call.parent
  const assigned = parent?.name === "AssignStatement" && parent.lastChild?.from === call.from ? parent.firstChild : null
  const printed = parent?.name === "ArgList" && parent.parent?.firstChild?.name === "VariableName" && ctx.text(parent.parent.firstChild) === "print" && resolve("print", scope, ctx.model.module) === null
  if (assigned === null && !printed) return
  const where = assigned !== null ? `у \`${ctx.text(assigned)}\` буде None` : "`print` виведе None"
  const callee = call.firstChild
  if (callee === null) return
  const fn = ownFunction(ctx, callee, scope)
  if (fn !== undefined) {
    if (fn.returnsValue || fn.node.getChild("Body")?.getChild("PassStatement") !== null && bodyIsPass(ctx, fn)) return
    ctx.add(call.from, call.to, CheckSeverities.Warning, `Функція \`${fn.name}\` нічого не повертає (у ній немає \`return\`), тому ${where}. Якщо функція має дати значення, поверни його: \`return ...\`.`)
    return
  }
  if (assigned === null) return
  if (callee.name === "VariableName" && ctx.text(callee) === "print" && resolve("print", scope, ctx.model.module) === null) {
    ctx.add(call.from, call.to, CheckSeverities.Warning, `\`print\` лише виводить текст і повертає None, тому в \`${ctx.text(assigned)}\` буде None.`)
    return
  }
  if (callee.name !== "MemberExpression") return
  const object = callee.firstChild
  const property = callee.getChild("PropertyName")
  if (object === null || property === null || !ListChangers.has(ctx.text(property))) return
  // `a = a.sort()`: `a` has two values, the list and None; the list is the one before.
  const found = object.name === "VariableName" ? resolve(ctx.text(object), scope, ctx.model.module) : null
  const isList = ctx.types.typeOf(object, scope).kind === TypeKinds.List ||
    (found?.bindings.some((b) => b.value !== undefined && b.value.from !== call.from && ctx.types.typeOf(b.value, b.scope).kind === TypeKinds.List) ?? false)
  if (!isList) return
  ctx.add(call.from, call.to, CheckSeverities.Error, `\`${ctx.text(property)}()\` змінює сам список і повертає None, тому в \`${ctx.text(assigned)}\` буде None. Напиши просто \`${ctx.text(call)}\` окремим рядком.`)
}

/** A function whose body is only `pass`: a stub that the student fills later. */
const bodyIsPass = (ctx: Context, fn: FunctionInfo): boolean => {
  const body = fn.node.getChild("Body")
  return body !== null && ctx.text(body).replace(/^:\s*/, "").trim() === "pass"
}
