import { type Completion, type CompletionContext, type CompletionResult, snippetCompletion } from "@codemirror/autocomplete"
import { syntaxTree } from "@codemirror/language"
import { analyze, BindingKinds, type CodeModel, scopeAt, visibleBindings, visibleStarImports } from "../core/code-scope.ts"
import type { ApiItem } from "../core/python-api.ts"
import {
  builtinDocs, builtinNames, classMembers, dictMethods, keywordSnippets, listMethods, type MethodDoc, moduleMembers, plainKeywords,
  strMethods, typer, TypeKinds, type ValueType
} from "../core/python-names.ts"

// Hints while the student types, as in a desktop IDE: keywords, builtins with a description in Ukrainian,
// the names of the program, names of `from tkinter import *`, and members after a dot (`root.`, `turtle.`, `"text".`).

/** Code without the line at the cursor: the line being typed is often unfinished and breaks the tree. */
let cached: { readonly code: string; readonly model: CodeModel } | null = null
const modelOf = (code: string): CodeModel => {
  if (cached?.code !== code) cached = { code, model: analyze(code) }
  return cached.model
}

const KindTypes: Readonly<Record<string, string>> = { f: "function", c: "class", m: "namespace", v: "constant" }

/** A function is inserted with brackets and the cursor inside them; without parameters, after them. */
const callable = (label: string, params: string | undefined, info: string | undefined, type: string, boost = 0): Completion => {
  const empty = params !== undefined && params.trim() === ""
  const base = { label, type, boost, detail: params === undefined ? "(…)" : `(${params})`, ...(info === undefined ? {} : { info }) }
  return snippetCompletion(empty ? `${label}()` : `${label}(\${})`, base)
}

const apiCompletion = (name: string, item: ApiItem, boost = 0): Completion => {
  const [kind, , params] = item
  if (kind === "f" || kind === "c") return callable(name, params, undefined, KindTypes[kind] ?? "function", boost)
  return { label: name, type: KindTypes[kind] ?? "variable", boost }
}

const methodCompletions = (methods: ReadonlyArray<MethodDoc>): ReadonlyArray<Completion> =>
  methods.map((m) => callable(m.name, m.params, m.info, "method"))

/** Members of a value after a dot. */
const membersOf = (type: ValueType): ReadonlyArray<Completion> => {
  switch (type.kind) {
    case TypeKinds.Module:
      return Array.from(moduleMembers(type.path), ([name, item]) => apiCompletion(name, item))
    case TypeKinds.Instance:
      return Array.from(classMembers(type.cls), ([name, item]) => apiCompletion(name, item))
    case TypeKinds.Str:
      return methodCompletions(strMethods)
    case TypeKinds.List:
      return methodCompletions(listMethods)
    case TypeKinds.Dict:
      return methodCompletions(dictMethods)
    default:
      return []
  }
}

const SkipNodes = new Set(["String", "FormatString", "Comment"])

/** The code with the unfinished word at the cursor removed: the tree of the rest is whole. */
const withoutWord = (code: string, from: number, to: number): string => code.slice(0, from) + code.slice(to)

const memberHints = (context: CompletionContext): CompletionResult | null => {
  const before = context.matchBefore(/[\w.()[\]"']+\.\w*$/)
  if (before === null) return null
  const dot = before.text.lastIndexOf(".")
  const wordFrom = before.from + dot + 1
  const code = context.state.doc.toString()
  // The object is parsed in the code where the member after the dot is a placeholder name.
  const patched = `${code.slice(0, wordFrom)}_${code.slice(context.pos)}`
  const model = modelOf(patched)
  const node = model.tree.resolveInner(wordFrom, 1)
  const member = node.name === "PropertyName" ? node.parent : null
  const object = member?.firstChild
  if (object === null || object === undefined) return null
  const type = typer(model).typeOf(object, scopeAt(model, wordFrom))
  const options = membersOf(type)
  return options.length === 0 ? null : { from: wordFrom, options, validFor: /^\w*$/ }
}

const nameHints = (context: CompletionContext): CompletionResult | null => {
  const word = context.matchBefore(/\w+$/)
  if (word === null && !context.explicit) return null
  const from = word?.from ?? context.pos
  const model = modelOf(withoutWord(context.state.doc.toString(), from, context.pos))
  const scope = scopeAt(model, from)
  const options: Array<Completion> = []
  const seen = new Set<string>()
  const add = (option: Completion): void => {
    if (seen.has(option.label)) return
    seen.add(option.label)
    options.push(option)
  }
  for (const binding of visibleBindings(scope)) {
    if (binding.kind === BindingKinds.Function && binding.fn !== undefined) add(callable(binding.name, binding.fn.paramsText, "Твоя функція", "function", 3))
    else if (binding.kind === BindingKinds.Class) add(callable(binding.name, undefined, "Твій клас", "class", 3))
    else if (binding.kind === BindingKinds.Import) add({ label: binding.name, type: binding.imported === undefined ? "namespace" : "variable", boost: 2 })
    else add({ label: binding.name, type: "variable", boost: 3 })
  }
  for (const [name, item] of visibleStarImports(scope).flatMap((path) => Array.from(moduleMembers(path)))) add(apiCompletion(name, item, 1))
  for (const keyword of keywordSnippets) {
    add(snippetCompletion(keyword.snippet, { label: keyword.label, type: "keyword", info: keyword.info, boost: 1 }))
  }
  for (const name of plainKeywords) add({ label: name, type: "keyword" })
  for (const [name, doc] of Object.entries(builtinDocs)) add(callable(name, doc.params, doc.info, "function", 2))
  for (const name of builtinNames) add({ label: name, type: /^[A-Z]/.test(name) ? "class" : "function", boost: -1 })
  return { from, options, validFor: /^\w*$/ }
}

/** The completion source of the editor. */
export const pythonHints = (context: CompletionContext): CompletionResult | null => {
  const node = syntaxTree(context.state).resolveInner(context.pos, -1)
  if (SkipNodes.has(node.name) && !(node.name === "FormatString" && context.matchBefore(/\{[\w.]*$/) !== null)) return null
  return memberHints(context) ?? nameHints(context)
}
