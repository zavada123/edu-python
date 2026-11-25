/**
 * What the code creates and uses, without running it: the scopes of Python (module, `def`, `class`, `lambda`,
 * comprehensions), where each name gets a value and where it is read. The checks of the editor
 * (`code-check.ts`) and its hints (`ui/completions.ts`) are built on it.
 */
import { parser } from "@lezer/python"
import type { SyntaxNode, Tree } from "@lezer/common"

export const ScopeKinds = { Module: "module", Function: "function", Class: "class", Lambda: "lambda", Comprehension: "comprehension" } as const
export type ScopeKind = (typeof ScopeKinds)[keyof typeof ScopeKinds]

export const BindingKinds = {
  Function: "function",
  Class: "class",
  Param: "param",
  Import: "import",
  Variable: "variable",
  Loop: "loop"
} as const
export type BindingKind = (typeof BindingKinds)[keyof typeof BindingKinds]

export const ParamKinds = { Positional: "positional", Star: "star", KeywordOnly: "keyword-only", DoubleStar: "double-star" } as const
export type ParamKind = (typeof ParamKinds)[keyof typeof ParamKinds]

export interface Param {
  readonly name: string
  readonly kind: ParamKind
  readonly hasDefault: boolean
}

export interface FunctionInfo {
  readonly name: string
  /** The parameters as written: `a, b=1`. */
  readonly paramsText: string
  readonly params: ReadonlyArray<Param>
  /** `return value` somewhere in the body (not in nested functions). */
  readonly returnsValue: boolean
  readonly decorated: boolean
  /** The function is defined right in a class: a method, called with `self`. */
  readonly method: boolean
  readonly node: SyntaxNode
}

export interface Binding {
  readonly name: string
  readonly kind: BindingKind
  /** Where the name is written. */
  readonly from: number
  readonly to: number
  /** From this position the name has its value: the end of the assignment, the start of the loop body. */
  readonly at: number
  readonly scope: Scope
  /** The value of `name = value` (only with one target). */
  readonly value?: SyntaxNode
  readonly fn?: FunctionInfo
  /** For `import`: the module path (`tkinter.messagebox`) and the imported name (`showinfo`, or none for a module). */
  readonly module?: string
  readonly imported?: string
}

export interface Use {
  readonly name: string
  readonly from: number
  readonly to: number
  readonly scope: Scope
  readonly node: SyntaxNode
}

export interface Scope {
  readonly kind: ScopeKind
  readonly parent: Scope | null
  readonly from: number
  readonly to: number
  readonly bindings: Map<string, Array<Binding>>
  readonly globals: Set<string>
  readonly nonlocals: Set<string>
  /** Modules of `from m import *` in this scope. */
  readonly starImports: Array<string>
  readonly children: Array<Scope>
  readonly fn?: FunctionInfo
}

export interface CodeModel {
  readonly code: string
  readonly tree: Tree
  readonly module: Scope
  readonly uses: ReadonlyArray<Use>
  readonly functions: ReadonlyArray<FunctionInfo>
  /** The tree has parse errors: the checks wait until the code compiles. */
  readonly broken: boolean
  /** `match` and other code that the model does not follow: the check of names is off. */
  readonly unsupported: boolean
}

const newScope = (kind: ScopeKind, parent: Scope | null, node: SyntaxNode, fn?: FunctionInfo): Scope => {
  const scope: Scope = {
    kind, parent, from: node.from, to: node.to, bindings: new Map(), globals: new Set(), nonlocals: new Set(), starImports: [], children: [],
    ...(fn === undefined ? {} : { fn })
  }
  parent?.children.push(scope)
  return scope
}

const children = (node: SyntaxNode): Array<SyntaxNode> => {
  const out: Array<SyntaxNode> = []
  for (let child = node.firstChild; child !== null; child = child.nextSibling) out.push(child)
  return out
}

const ComprehensionNodes = new Set(["ArrayComprehensionExpression", "DictionaryComprehensionExpression", "SetComprehensionExpression", "ComprehensionExpression"])
const TargetGroups = new Set(["TupleExpression", "ArrayExpression", "ParenthesizedExpression"])

/** The params of a `ParamList`: names, kinds and defaults. */
const readParams = (code: string, list: SyntaxNode): ReadonlyArray<Param> => {
  const params: Array<Param> = []
  let star = false
  let pending: ParamKind | null = null
  for (const child of children(list)) {
    if (child.name === "*") {
      pending = ParamKinds.Star
      star = true
    } else if (child.name === "**") {
      pending = ParamKinds.DoubleStar
    } else if (child.name === "VariableName") {
      const kind = pending ?? (star ? ParamKinds.KeywordOnly : ParamKinds.Positional)
      params.push({ name: code.slice(child.from, child.to), kind, hasDefault: false })
      pending = null
    } else if (child.name === "AssignOp") {
      const last = params.pop()
      if (last !== undefined) params.push({ ...last, hasDefault: true })
    } else if (child.name === ",") {
      // A bare `*` (keyword-only marker) has no name after it.
      if (pending === ParamKinds.Star) pending = null
    }
  }
  return params
}

/** `return value` in the body of a function, not counting nested functions and classes. */
const returnsValue = (body: SyntaxNode): boolean => {
  const visit = (node: SyntaxNode): boolean => {
    if (node.name === "FunctionDefinition" || node.name === "ClassDefinition" || node.name === "LambdaExpression") return false
    if (node.name === "ReturnStatement" && node.lastChild !== null && node.lastChild.name !== "return") return true
    if (node.name === "YieldExpression" || node.name === "yield") return true
    return children(node).some(visit)
  }
  return visit(body)
}

/** The dotted module path of `from a.b import` / `import a.b`: names and dots from `start` up to `stop`. */
const dottedPath = (code: string, nodes: ReadonlyArray<SyntaxNode>): string => nodes.map((n) => code.slice(n.from, n.to)).join("")

export const analyze = (code: string): CodeModel => {
  const tree = parser.parse(code)
  const top = tree.topNode
  const module = newScope(ScopeKinds.Module, null, top)
  const uses: Array<Use> = []
  const functions: Array<FunctionInfo> = []
  let broken = false
  let unsupported = false

  const text = (node: SyntaxNode): string => code.slice(node.from, node.to)

  /** `nonlocal name`: the value goes to the nearest outer function that has the name. */
  const nonlocalTarget = (scope: Scope, name: string): Scope => {
    for (let current = outer(scope); current !== null; current = outer(current)) if (current.bindings.has(name)) return current
    return scope
  }

  const bind = (scope: Scope, node: SyntaxNode, kind: BindingKind, at: number, extra: Partial<Binding> = {}): void => {
    const name = text(node)
    const target = scope.globals.has(name) ? module : scope.nonlocals.has(name) ? nonlocalTarget(scope, name) : scope
    const binding: Binding = { name, kind, from: node.from, to: node.to, at, scope: target, ...extra }
    const list = target.bindings.get(name)
    if (list === undefined) target.bindings.set(name, [binding])
    else list.push(binding)
  }

  /** Targets of `=`, `for`, `as`: names get a value, `a.b` and `a[0]` read `a`. */
  const bindTarget = (scope: Scope, node: SyntaxNode, kind: BindingKind, at: number, value?: SyntaxNode): void => {
    if (node.name === "VariableName") return bind(scope, node, kind, at, value === undefined ? {} : { value })
    if (TargetGroups.has(node.name)) {
      for (const child of children(node)) bindTarget(scope, child, kind, at)
      return
    }
    if (node.name === "*" || node.name === "," || node.name === "(" || node.name === ")" || node.name === "[" || node.name === "]") return
    visit(scope, node)
  }

  const visitAll = (scope: Scope, nodes: ReadonlyArray<SyntaxNode>): void => {
    for (const node of nodes) visit(scope, node)
  }

  const visitFunction = (scope: Scope, node: SyntaxNode, decorated: boolean): void => {
    const name = node.getChild("VariableName")
    const list = node.getChild("ParamList")
    const body = node.getChild("Body")
    if (name === null || list === null || body === null) return visitAll(scope, children(node))
    const info: FunctionInfo = {
      name: text(name), paramsText: code.slice(list.from + 1, list.to - 1), params: readParams(code, list),
      returnsValue: returnsValue(body), decorated, method: scope.kind === ScopeKinds.Class, node
    }
    functions.push(info)
    // Defaults and annotations are read where the function is defined.
    for (const child of children(list)) if (child.name !== "VariableName") visit(scope, child)
    const own = newScope(ScopeKinds.Function, scope, node, info)
    for (const child of children(list)) if (child.name === "VariableName") bind(own, child, BindingKinds.Param, node.from)
    visitAll(own, children(body))
    bind(scope, name, BindingKinds.Function, node.to, { fn: info })
  }

  const visitClass = (scope: Scope, node: SyntaxNode): void => {
    const name = node.getChild("VariableName")
    const args = node.getChild("ArgList")
    const body = node.getChild("Body")
    if (args !== null) visit(scope, args)
    if (body !== null) visitAll(newScope(ScopeKinds.Class, scope, node), children(body))
    if (name !== null) bind(scope, name, BindingKinds.Class, node.to)
  }

  const visitLambda = (scope: Scope, node: SyntaxNode): void => {
    const list = node.getChild("ParamList")
    const own = newScope(ScopeKinds.Lambda, scope, node)
    if (list !== null) {
      for (const child of children(list)) {
        if (child.name === "VariableName") bind(own, child, BindingKinds.Param, node.from)
        else visit(scope, child)
      }
    }
    let afterColon = false
    for (const child of children(node)) {
      if (child.name === ":") afterColon = true
      else if (afterColon) visit(own, child)
    }
  }

  const visitComprehension = (scope: Scope, node: SyntaxNode): void => {
    const own = newScope(ScopeKinds.Comprehension, scope, node)
    let inTarget = false
    for (const child of children(node)) {
      if (child.name === "for") inTarget = true
      else if (child.name === "in") inTarget = false
      else if (inTarget) bindTarget(own, child, BindingKinds.Loop, node.from)
      else visit(own, child)
    }
  }

  const visitAssign = (scope: Scope, node: SyntaxNode): void => {
    const parts = children(node)
    const lastOp = parts.map((p) => p.name).lastIndexOf("AssignOp")
    if (lastOp < 0) return visitAll(scope, parts)
    const values = parts.slice(lastOp + 1)
    visitAll(scope, values)
    const targets = parts.slice(0, lastOp).filter((p) => p.name !== "AssignOp" && p.name !== "TypeDef")
    const single = targets.length === 1 && values.length === 1 ? values[0] : undefined
    for (const part of parts.slice(0, lastOp)) if (part.name === "TypeDef") visit(scope, part)
    for (const target of targets) bindTarget(scope, target, BindingKinds.Variable, node.to, single)
  }

  const visitFor = (scope: Scope, node: SyntaxNode): void => {
    const parts = children(node)
    const body = node.getChild("Body")
    const at = body?.from ?? node.to
    let inTarget = false
    for (const part of parts) {
      if (part.name === "for") inTarget = true
      else if (part.name === "in") inTarget = false
      else if (inTarget) bindTarget(scope, part, BindingKinds.Loop, at)
      else visit(scope, part)
    }
  }

  /** `with x as name:` and `except E as name:`: the name after `as` gets a value. */
  const visitWithAs = (scope: Scope, node: SyntaxNode): void => {
    let afterAs = false
    for (const child of children(node)) {
      if (child.name === "as") afterAs = true
      else if (afterAs && child.name !== "Body") {
        bindTarget(scope, child, BindingKinds.Variable, child.to)
        afterAs = false
      } else visit(scope, child)
    }
  }

  const visitImport = (scope: Scope, node: SyntaxNode): void => {
    const parts = children(node)
    const at = node.to
    if (parts[0]?.name === "from") {
      const importAt = parts.findIndex((p) => p.name === "import")
      const path = dottedPath(code, parts.slice(1, importAt))
      const rest = parts.slice(importAt + 1)
      if (rest.some((p) => p.name === "*")) {
        scope.starImports.push(path)
        return
      }
      for (let i = 0; i < rest.length; i++) {
        const part = rest[i]
        if (part?.name !== "VariableName") continue
        const alias = rest[i + 1]?.name === "as" ? rest[i + 2] : undefined
        bind(scope, alias ?? part, BindingKinds.Import, at, { module: path, imported: text(part) })
        if (alias !== undefined) i += 2
      }
      return
    }
    // `import a.b, c as d`: groups split by commas.
    const groups: Array<Array<SyntaxNode>> = [[]]
    for (const part of parts.slice(1)) {
      if (part.name === ",") groups.push([])
      else groups.at(-1)?.push(part)
    }
    for (const group of groups) {
      const asAt = group.findIndex((p) => p.name === "as")
      const pathNodes = asAt < 0 ? group : group.slice(0, asAt)
      const path = dottedPath(code, pathNodes)
      const alias = asAt < 0 ? undefined : group[asAt + 1]
      const first = pathNodes[0]
      if (alias !== undefined) bind(scope, alias, BindingKinds.Import, at, { module: path })
      else if (first !== undefined) bind(scope, first, BindingKinds.Import, at, { module: path.split(".")[0] ?? path })
    }
  }

  const visitArgs = (scope: Scope, node: SyntaxNode): void => {
    const parts = children(node)
    parts.forEach((part, i) => {
      // `f(name=value)`: `name` is the name of a parameter, not a variable.
      if (part.name === "VariableName" && parts[i + 1]?.name === "AssignOp") return
      visit(scope, part)
    })
  }

  const visit = (scope: Scope, node: SyntaxNode): void => {
    if (node.type.isError) broken = true
    switch (node.name) {
      case "VariableName":
        uses.push({ name: text(node), from: node.from, to: node.to, scope, node })
        return
      case "PropertyName":
      case "Comment":
      case "String":
        return
      case "FunctionDefinition":
        return visitFunction(scope, node, false)
      case "DecoratedStatement": {
        for (const child of children(node)) {
          if (child.name === "FunctionDefinition") visitFunction(scope, child, true)
          else visit(scope, child)
        }
        return
      }
      case "ClassDefinition":
        return visitClass(scope, node)
      case "LambdaExpression":
        return visitLambda(scope, node)
      case "AssignStatement":
        return visitAssign(scope, node)
      case "UpdateStatement": {
        const target = node.firstChild
        visitAll(scope, children(node))
        if (target?.name === "VariableName") bind(scope, target, BindingKinds.Variable, node.to)
        return
      }
      case "NamedExpression": {
        const target = node.firstChild
        visitAll(scope, children(node).slice(1))
        if (target?.name === "VariableName") bind(scope.kind === ScopeKinds.Comprehension ? (scope.parent ?? scope) : scope, target, BindingKinds.Variable, node.to)
        return
      }
      case "ForStatement":
        return visitFor(scope, node)
      case "WithStatement":
      case "TryStatement":
        return visitWithAs(scope, node)
      case "ImportStatement":
        return visitImport(scope, node)
      case "ScopeStatement": {
        const keyword = node.firstChild?.name
        for (const child of children(node)) {
          if (child.name !== "VariableName") continue
          if (keyword === "global") scope.globals.add(text(child))
          else scope.nonlocals.add(text(child))
        }
        return
      }
      case "ArgList":
        return visitArgs(scope, node)
      case "MatchStatement":
        unsupported = true
        return visitAll(scope, children(node))
      default:
        if (ComprehensionNodes.has(node.name)) return visitComprehension(scope, node)
        return visitAll(scope, children(node))
    }
  }

  visitAll(module, children(top))
  return { code, tree, module, uses, functions, broken, unsupported }
}

/** The scope where a name read in `scope` is looked up next: classes are skipped from inside their methods. */
const outer = (scope: Scope): Scope | null => {
  let next = scope.parent
  while (next !== null && next.kind === ScopeKinds.Class) next = next.parent
  return next
}

export interface Resolved {
  readonly scope: Scope
  readonly bindings: ReadonlyArray<Binding>
}

/** Where `name`, read in `scope`, has its value: a scope with bindings, or none (builtins, `import *`, unknown). */
export const resolve = (name: string, scope: Scope, moduleScope: Scope): Resolved | null => {
  let current: Scope | null = scope
  while (current !== null) {
    if (current.globals.has(name)) current = moduleScope
    const bindings = current.bindings.get(name)
    if (bindings !== undefined && bindings.length > 0) return { scope: current, bindings }
    current = outer(current)
  }
  return null
}

/** The innermost scope at a position: for hints at the cursor. */
export const scopeAt = (model: CodeModel, pos: number): Scope => {
  let scope = model.module
  for (;;) {
    const inner = scope.children.find((child) => child.from <= pos && pos <= child.to)
    if (inner === undefined) return scope
    scope = inner
  }
}

/** All names seen from a scope: its own and those of outer scopes (not the classes around). */
export const visibleBindings = (scope: Scope): ReadonlyArray<Binding> => {
  const seen = new Map<string, Binding>()
  let current: Scope | null = scope
  while (current !== null) {
    for (const [name, list] of current.bindings) {
      const first = list[0]
      if (!seen.has(name) && first !== undefined) seen.set(name, first)
    }
    current = outer(current)
  }
  return Array.from(seen.values())
}

/** Star imports seen from a scope. */
export const visibleStarImports = (scope: Scope): ReadonlyArray<string> => {
  const out: Array<string> = []
  let current: Scope | null = scope
  while (current !== null) {
    out.push(...current.starImports)
    current = outer(current)
  }
  return out
}

/** The nearest function around a scope (a `def`), if any. */
export const enclosingFunction = (scope: Scope): FunctionInfo | undefined => {
  let current: Scope | null = scope
  while (current !== null) {
    if (current.fn !== undefined) return current.fn
    current = current.parent
  }
  return undefined
}

/** Ancestors of a node up to (not including) a node of the given names. */
export const hasAncestor = (node: SyntaxNode, names: ReadonlySet<string>, stopAt: number): boolean => {
  for (let parent = node.parent; parent !== null && parent.from >= stopAt; parent = parent.parent) if (names.has(parent.name)) return true
  return false
}
