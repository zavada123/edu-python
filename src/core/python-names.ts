/**
 * What the editor knows about the names of Python: builtins with descriptions in Ukrainian, keywords, methods
 * of strings and lists, and the modules of the engine (`python-api.ts`). Also simple types of expressions
 * (`typeOf`): a string from `input()`, a window from `Tk()`, a module from `import`.
 */
import type { SyntaxNode } from "@lezer/common"
import { type ApiItem, apiBuiltins, apiClasses, apiModules } from "./python-api.ts"
import { BindingKinds, type CodeModel, resolve, type Scope, visibleStarImports } from "./code-scope.ts"

export interface BuiltinDoc {
  /** Parameters as in the hint: `prompt`. */
  readonly params: string
  readonly info: string
  /** How many values a call takes; `max` is `Infinity` for `print`. */
  readonly min: number
  readonly max: number
}

/** `a, b=(1, 2), *c` → its parameters: commas inside brackets and strings do not split. */
export const splitParams = (params: string): ReadonlyArray<string> => {
  const parts: Array<string> = []
  let depth = 0
  let quote = ""
  let current = ""
  for (const char of params) {
    if (quote !== "") {
      if (char === quote) quote = ""
    } else if (char === "'" || char === "\"") quote = char
    else if ("([{".includes(char)) depth += 1
    else if (")]}".includes(char)) depth -= 1
    else if (char === "," && depth === 0) {
      parts.push(current.trim())
      current = ""
      continue
    }
    current += char
  }
  parts.push(current.trim())
  return parts.filter((p) => p !== "")
}

const doc = (params: string, info: string, min: number, max: number): BuiltinDoc => ({ params, info, min, max })

/** The builtins that students use, with a short description. */
export const builtinDocs: Readonly<Record<string, BuiltinDoc>> = {
  print: doc("*values, sep=' ', end='\\n'", "Виводить значення в консоль.", 0, Infinity),
  input: doc("prompt=''", "Чекає, поки користувач введе текст, і повертає його як рядок (str).", 0, 1),
  int: doc("x=0, base=10", "Перетворює значення на ціле число: int('5') дає 5.", 0, 2),
  float: doc("x=0", "Перетворює значення на дробове число: float('2.5') дає 2.5.", 0, 1),
  str: doc("object=''", "Перетворює значення на рядок (текст).", 0, 3),
  bool: doc("x=False", "Перетворює значення на True або False.", 0, 1),
  len: doc("obj", "Кількість елементів: символів у рядку, елементів у списку.", 1, 1),
  range: doc("start, stop, step=1", "Послідовність цілих чисел для циклу for: range(5) дає 0, 1, 2, 3, 4.", 1, 3),
  abs: doc("x", "Модуль числа: abs(-3) дає 3.", 1, 1),
  round: doc("number, ndigits=None", "Округлює число: round(2.567, 1) дає 2.6.", 1, 2),
  max: doc("*values", "Найбільше зі значень або найбільший елемент списку.", 1, Infinity),
  min: doc("*values", "Найменше зі значень або найменший елемент списку.", 1, Infinity),
  sum: doc("iterable, start=0", "Сума елементів списку.", 1, 2),
  sorted: doc("iterable, key=None, reverse=False", "Новий список з елементами в порядку зростання.", 1, 1),
  list: doc("iterable=()", "Створює список.", 0, 1),
  dict: doc("**pairs", "Створює словник.", 0, Infinity),
  set: doc("iterable=()", "Створює множину: значення без повторів.", 0, 1),
  tuple: doc("iterable=()", "Створює кортеж: список, який не можна змінити.", 0, 1),
  type: doc("object", "Тип значення: int, str, list…", 1, 3),
  chr: doc("code", "Символ за його кодом: chr(65) дає 'A'.", 1, 1),
  ord: doc("char", "Код символу: ord('A') дає 65.", 1, 1),
  pow: doc("base, exp", "Степінь: pow(2, 3) дає 8.", 2, 3),
  divmod: doc("a, b", "Частка й остача ділення разом: divmod(7, 2) дає (3, 1).", 2, 2),
  enumerate: doc("iterable, start=0", "Номери разом з елементами: for i, x in enumerate(список).", 1, 2),
  zip: doc("*iterables", "Пари елементів з кількох списків.", 0, Infinity),
  reversed: doc("sequence", "Елементи у зворотному порядку.", 1, 1),
  isinstance: doc("object, classinfo", "Чи має значення такий тип: isinstance(5, int) дає True.", 2, 2),
  open: doc("file, mode='r'", "Відкриває файл для читання або запису.", 1, 7),
  any: doc("iterable", "True, якщо хоч один елемент істинний.", 1, 1),
  all: doc("iterable", "True, якщо всі елементи істинні.", 1, 1),
  map: doc("function, iterable", "Застосовує функцію до кожного елемента.", 2, Infinity),
  filter: doc("function, iterable", "Елементи, для яких функція дає True.", 2, 2),
  hex: doc("x", "Число в шістнадцятковому записі: hex(255) дає '0xff'.", 1, 1),
  bin: doc("x", "Число в двійковому записі: bin(5) дає '0b101'.", 1, 1)
}

/** Names that Python has without import, besides the builtins of the engine. */
const ExtraNames = ["__name__", "__file__", "__doc__", "__builtins__", "True", "False", "None"]

const builtinSet: ReadonlySet<string> = new Set([...apiBuiltins, ...ExtraNames])

export const isBuiltin = (name: string): boolean => builtinSet.has(name)

export const builtinNames: ReadonlyArray<string> = apiBuiltins

/** Keywords; `snippet` adds the usual form of the statement. */
export const keywordSnippets: ReadonlyArray<{ readonly label: string; readonly snippet: string; readonly info: string }> = [
  { label: "if", snippet: "if ${умова}:\n\t${}", info: "Умова: код усередині виконується, лише якщо умова істинна." },
  { label: "elif", snippet: "elif ${умова}:\n\t${}", info: "Ще одна умова після if." },
  { label: "else", snippet: "else:\n\t${}", info: "Що робити, коли умови не справдилися." },
  { label: "for", snippet: "for ${i} in range(${10}):\n\t${}", info: "Цикл: повторює код для кожного числа або елемента." },
  { label: "while", snippet: "while ${умова}:\n\t${}", info: "Цикл, що повторює код, поки умова істинна." },
  { label: "def", snippet: "def ${name}(${}):\n\t${}", info: "Створює власну функцію." },
  { label: "class", snippet: "class ${Name}:\n\tdef __init__(self${}):\n\t\t${}", info: "Створює клас." },
  { label: "return", snippet: "return ${}", info: "Повертає значення з функції." },
  { label: "import", snippet: "import ${}", info: "Підключає модуль: import turtle." },
  { label: "from", snippet: "from ${tkinter} import ${*}", info: "Підключає імена з модуля: from tkinter import *." },
  { label: "try", snippet: "try:\n\t${}\nexcept ${ValueError}:\n\t${}", info: "Перехоплює помилку, щоб програма не зупинилася." },
  { label: "with", snippet: "with ${open('файл.txt')} as ${f}:\n\t${}", info: "Відкриває файл і сам закриває його." },
  { label: "lambda", snippet: "lambda: ${}", info: "Коротка функція в один вираз: command=lambda: f(1)." }
]

export const plainKeywords: ReadonlyArray<string> = [
  "and", "or", "not", "in", "is", "True", "False", "None", "break", "continue", "pass", "global", "nonlocal", "del", "assert",
  "except", "finally", "as", "yield", "raise"
]

export interface MethodDoc {
  readonly name: string
  readonly params: string
  readonly info: string
}

const method = (name: string, params: string, info: string): MethodDoc => ({ name, params, info })

/** Methods of a string: they give a new string, the old one stays. */
export const strMethods: ReadonlyArray<MethodDoc> = [
  method("upper", "", "Рядок великими літерами."),
  method("lower", "", "Рядок малими літерами."),
  method("capitalize", "", "Перша літера велика, решта малі."),
  method("title", "", "Кожне слово з великої літери."),
  method("strip", "chars=None", "Рядок без пробілів на початку й у кінці."),
  method("split", "sep=None", "Ділить рядок на список слів."),
  method("replace", "old, new", "Замінює частину рядка на іншу."),
  method("find", "sub", "Де вперше трапляється частина рядка (-1, якщо немає)."),
  method("count", "sub", "Скільки разів трапляється частина рядка."),
  method("startswith", "prefix", "Чи починається рядок з цього тексту."),
  method("endswith", "suffix", "Чи закінчується рядок цим текстом."),
  method("isdigit", "", "Чи складається рядок лише з цифр."),
  method("isalpha", "", "Чи складається рядок лише з літер."),
  method("join", "iterable", "Склеює елементи списку через цей рядок."),
  method("format", "*args", "Підставляє значення замість {}."),
  method("center", "width", "Рядок посередині поля заданої ширини.")
]

/** Methods of a list: they change the list itself. */
export const listMethods: ReadonlyArray<MethodDoc> = [
  method("append", "x", "Додає елемент у кінець списку."),
  method("insert", "i, x", "Вставляє елемент на місце i."),
  method("pop", "i=-1", "Забирає й повертає елемент (останній, якщо без числа)."),
  method("remove", "x", "Видаляє перший такий елемент."),
  method("index", "x", "Номер першого такого елемента."),
  method("count", "x", "Скільки разів елемент є в списку."),
  method("sort", "reverse=False", "Сортує сам список."),
  method("reverse", "", "Перевертає сам список."),
  method("clear", "", "Видаляє всі елементи."),
  method("copy", "", "Копія списку."),
  method("extend", "iterable", "Додає всі елементи іншого списку.")
]

export const dictMethods: ReadonlyArray<MethodDoc> = [
  method("keys", "", "Ключі словника."),
  method("values", "", "Значення словника."),
  method("items", "", "Пари ключ-значення: for k, v in d.items()."),
  method("get", "key, default=None", "Значення за ключем або default, якщо ключа немає."),
  method("pop", "key", "Забирає значення за ключем."),
  method("update", "other", "Додає пари з іншого словника.")
]

/** What a function of a module returns, when it is not a class: `turtle.Screen()` gives the screen. */
const FactoryResults: Readonly<Record<string, string>> = { "turtle.Screen": "turtle._Screen", "turtle.getscreen": "turtle._Screen", "turtle.getturtle": "turtle.Turtle" }

export const TypeKinds = {
  Str: "str", Int: "int", Float: "float", Bool: "bool", List: "list", Dict: "dict",
  Module: "module", Instance: "instance", ApiClass: "api-class", ApiFunction: "api-function", OwnFunction: "own-function", Unknown: "unknown"
} as const

export type ValueType =
  | { readonly kind: "str" | "int" | "float" | "bool" | "list" | "dict" | "unknown" }
  | { readonly kind: "module"; readonly path: string }
  /** An object of a class of the engine (`tkinter._windows.Tk`). */
  | { readonly kind: "instance"; readonly cls: string }
  | { readonly kind: "api-class"; readonly cls: string; readonly name: string; readonly params?: string }
  | { readonly kind: "api-function"; readonly path: string; readonly name: string; readonly params?: string }
  | { readonly kind: "own-function"; readonly name: string }

const unknown: ValueType = { kind: TypeKinds.Unknown }
const simple = (kind: "str" | "int" | "float" | "bool" | "list" | "dict"): ValueType => ({ kind })

/** Members of a class of the engine with those of its bases, without the names that start with `_`. */
export const classMembers = (key: string): ReadonlyMap<string, ApiItem> => {
  const out = new Map<string, ApiItem>()
  const add = (k: string, depth: number): void => {
    const cls = apiClasses[k]
    if (cls === undefined || depth > 12) return
    for (const [name, item] of Object.entries(cls.members)) if (!out.has(name) && !name.startsWith("_")) out.set(name, item)
    for (const base of cls.bases) add(base, depth + 1)
  }
  add(key, 0)
  return out
}

export const moduleMembers = (path: string): ReadonlyMap<string, ApiItem> => new Map(Object.entries(apiModules[path] ?? {}))

export const isKnownModule = (path: string): boolean => path in apiModules

/** The type of a name of a module of the engine. */
const itemType = (path: string, name: string, item: ApiItem | undefined): ValueType => {
  if (item === undefined) return isKnownModule(`${path}.${name}`) ? { kind: TypeKinds.Module, path: `${path}.${name}` } : unknown
  const [kind, cls, params] = item
  if (kind === "c") return { kind: TypeKinds.ApiClass, cls, name, ...(params === undefined ? {} : { params }) }
  if (kind === "f") return { kind: TypeKinds.ApiFunction, path, name, ...(params === undefined ? {} : { params }) }
  if (kind === "m") return { kind: TypeKinds.Module, path: `${path}.${name}` }
  return unknown
}

/** The type of a member: `tkinter.Tk`, `root.title`, `turtle.forward`. */
export const memberType = (owner: ValueType, name: string): ValueType => {
  if (owner.kind === TypeKinds.Module) return itemType(owner.path, name, apiModules[owner.path]?.[name])
  if (owner.kind === TypeKinds.Instance) {
    const item = classMembers(owner.cls).get(name)
    if (item === undefined) return unknown
    const [kind, cls, params] = item
    if (kind === "f") return { kind: TypeKinds.ApiFunction, path: owner.cls, name, ...(params === undefined ? {} : { params }) }
    if (kind === "c") return { kind: TypeKinds.ApiClass, cls, name, ...(params === undefined ? {} : { params }) }
    return unknown
  }
  return unknown
}

const StrResults = new Set(["input", "str", "repr", "chr", "hex", "bin", "oct"])
const IntResults = new Set(["int", "len", "ord", "round"])
const StrMethodsToStr = new Set(["upper", "lower", "capitalize", "title", "strip", "lstrip", "rstrip", "replace", "format", "center", "join"])
const MaxDepth = 8

/** The type of the result of a call. */
const callResult = (callee: ValueType, calleeName: string): ValueType => {
  if (callee.kind === TypeKinds.ApiClass) return { kind: TypeKinds.Instance, cls: callee.cls }
  if (callee.kind === TypeKinds.ApiFunction) {
    const factory = FactoryResults[`${callee.path}.${callee.name}`]
    return factory === undefined ? unknown : { kind: TypeKinds.Instance, cls: factory }
  }
  if (callee.kind !== TypeKinds.Unknown || !isBuiltin(calleeName)) return unknown
  if (StrResults.has(calleeName)) return simple("str")
  if (IntResults.has(calleeName)) return simple("int")
  if (calleeName === "float") return simple("float")
  if (calleeName === "bool") return simple("bool")
  if (calleeName === "list" || calleeName === "sorted") return simple("list")
  if (calleeName === "dict") return simple("dict")
  return unknown
}

export interface Typer {
  readonly typeOf: (node: SyntaxNode, scope: Scope) => ValueType
  /** The type of a name as read in a scope. */
  readonly typeOfName: (name: string, scope: Scope) => ValueType
}

/** Types in one model of the code. */
export const typer = (model: CodeModel): Typer => {
  const text = (node: SyntaxNode): string => model.code.slice(node.from, node.to)

  const typeOfName = (name: string, scope: Scope, depth: number): ValueType => {
    if (depth > MaxDepth) return unknown
    const found = resolve(name, scope, model.module)
    if (found === null) {
      for (const path of visibleStarImports(scope)) {
        const item = apiModules[path]?.[name]
        if (item !== undefined) return itemType(path, name, item)
      }
      return unknown
    }
    const types = found.bindings.map((binding): ValueType => {
      if (binding.kind === BindingKinds.Import) {
        if (binding.module === undefined) return unknown
        if (binding.imported === undefined) return { kind: TypeKinds.Module, path: binding.module }
        return itemType(binding.module, binding.imported, apiModules[binding.module]?.[binding.imported])
      }
      if (binding.kind === BindingKinds.Function) return { kind: TypeKinds.OwnFunction, name }
      if (binding.kind === BindingKinds.Variable && binding.value !== undefined) return typeOf(binding.value, binding.scope, depth + 1)
      return unknown
    })
    const first = types[0] ?? unknown
    const same = types.every((t) => JSON.stringify(t) === JSON.stringify(first))
    return same ? first : unknown
  }

  const typeOf = (node: SyntaxNode, scope: Scope, depth: number): ValueType => {
    if (depth > MaxDepth) return unknown
    switch (node.name) {
      case "Number":
        return /[.eE]/.test(text(node)) && !/^0[xX]/.test(text(node)) ? simple("float") : simple("int")
      case "String":
      case "FormatString":
      case "ContinuedString":
        return simple("str")
      case "Boolean":
        return simple("bool")
      case "ArrayExpression":
      case "ArrayComprehensionExpression":
        return simple("list")
      case "DictionaryExpression":
      case "DictionaryComprehensionExpression":
        return simple("dict")
      case "ParenthesizedExpression": {
        const inner = node.firstChild?.nextSibling
        return inner === null || inner === undefined ? unknown : typeOf(inner, scope, depth + 1)
      }
      case "VariableName":
        return typeOfName(text(node), scope, depth + 1)
      case "MemberExpression": {
        const object = node.firstChild
        const property = node.getChild("PropertyName")
        if (object === null || property === null) return unknown
        return memberType(typeOf(object, scope, depth + 1), text(property))
      }
      case "CallExpression": {
        const callee = node.firstChild
        if (callee === null) return unknown
        if (callee.name === "MemberExpression") {
          const object = callee.firstChild
          const property = callee.getChild("PropertyName")
          if (object !== null && property !== null && typeOf(object, scope, depth + 1).kind === TypeKinds.Str) {
            if (StrMethodsToStr.has(text(property))) return simple("str")
            if (text(property) === "split") return simple("list")
          }
        }
        return callResult(typeOf(callee, scope, depth + 1), callee.name === "VariableName" ? text(callee) : "")
      }
      case "BinaryExpression": {
        const left = node.firstChild
        const right = node.lastChild
        const op = left?.nextSibling
        if (left === null || right === null || op === null || op === undefined || op.name !== "ArithOp") return unknown
        const a = typeOf(left, scope, depth + 1).kind
        const b = typeOf(right, scope, depth + 1).kind
        if (a === TypeKinds.Str && b === TypeKinds.Str && text(op) === "+") return simple("str")
        const numbers = new Set<string>([TypeKinds.Int, TypeKinds.Float])
        if (numbers.has(a) && numbers.has(b)) return text(op) === "/" || a === TypeKinds.Float || b === TypeKinds.Float ? simple("float") : simple("int")
        return unknown
      }
      default:
        return unknown
    }
  }

  return { typeOf: (node, scope) => typeOf(node, scope, 0), typeOfName: (name, scope) => typeOfName(name, scope, 0) }
}
