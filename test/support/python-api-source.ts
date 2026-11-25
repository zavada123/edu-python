/**
 * Builds `src/core/python-api.ts`: the names of the builtins and of the modules that the engine has, with the
 * parameters of the functions written in Python (`turtle.py`, `tkinter`). The engine gives the names and kinds;
 * the parameters come from the Python texts, because MicroPython has no `inspect.signature`.
 */
import { parser } from "@lezer/python"
import type { SyntaxNode } from "@lezer/common"
import { type Engine, silentSink } from "../../src/engine/engine.ts"
import { pythonLibrary } from "../../src/engine/sources.ts"
import { splitParams } from "../../src/core/python-names.ts"

/** Modules for the hints of the editor: what students import. */
export const ApiModules = [
  "tkinter", "tkinter.messagebox", "tkinter.ttk", "tkinter.filedialog", "tkinter.simpledialog",
  "tkinter.colorchooser", "tkinter.scrolledtext", "tkinter.font", "turtle", "math", "random", "time"
] as const

const introspect = (modules: ReadonlyArray<string>): string => `
import json, builtins
def _kind(v):
    if isinstance(v, type): return 'c'
    if type(v).__name__ == 'module': return 'm'
    if callable(v): return 'f'
    return 'v'
_classes = {}
def _key(c):
    return getattr(c, '__module__', 'builtins') + '.' + c.__name__
def _ref(v, module):
    k = _kind(v)
    if k == 'c':
        _add_class(v)
        return _key(v)
    if k != 'f': return ''
    if type(v).__name__ == 'bound_method':
        for c in _module_classes(module):
            for b in _mro(c):
                if v.__name__ in b.__dict__:
                    _add_class(b)
                    return _key(b) + ':' + v.__name__
        return ''
    g = getattr(v, '__globals__', None)
    if g is not None: return g.get('__name__', module) + ':' + v.__name__
    return ''
def _mro(c):
    out = [c]
    for b in getattr(c, '__bases__', ()):
        for x in _mro(b):
            if x not in out: out.append(x)
    return out
def _module_classes(module):
    m = __import__(module, None, None, ['x'])
    return [getattr(m, n) for n in dir(m) if isinstance(getattr(m, n), type)]
def _add_class(c):
    key = _key(c)
    if key in _classes or getattr(c, '__module__', 'builtins') == 'builtins': return
    _classes[key] = None
    members = {}
    for n, v in c.__dict__.items():
        if n.startswith('_') and n != '__init__': continue
        k = _kind(v)
        if k == 'f' and getattr(v, '__globals__', None) is not None: members[n] = ['f', _key(c) + ':' + n]
        elif k == 'c': members[n] = ['c', _ref(v, c.__module__)]
        else: members[n] = [k, '']
    bases = []
    for b in getattr(c, '__bases__', ()):
        if getattr(b, '__module__', 'builtins') != 'builtins':
            _add_class(b)
            bases.append(_key(b))
    _classes[key] = {'bases': bases, 'members': members}
_modules = {}
for _name in ${JSON.stringify(modules)}:
    _m = __import__(_name, None, None, ['x'])
    _items = {}
    for _n in dir(_m):
        if _n.startswith('_'): continue
        _v = getattr(_m, _n)
        _items[_n] = [_kind(_v), _ref(_v, _name)]
    _modules[_name] = _items
print(json.dumps({'builtins': [n for n in dir(builtins) if not n.startswith('_')], 'modules': _modules, 'classes': _classes}))
`

type Kind = "c" | "m" | "f" | "v"
interface Raw {
  readonly builtins: ReadonlyArray<string>
  readonly modules: Record<string, Record<string, readonly [Kind, string]>>
  readonly classes: Record<string, { readonly bases: ReadonlyArray<string>; readonly members: Record<string, readonly [Kind, string]> }>
}

/** `tkinter._widgets` → `tkinter/_widgets.py` (a key of `pythonLibrary`). */
const fileOf = (module: string): string => {
  const path = module.replaceAll(".", "/")
  const own = `${path}.py`
  return own in pythonLibrary ? own : `${path}/__init__.py`
}

/** `a, b=1, *c` of each `def` in a Python text: `func` and `Class.method` → the parameters. */
const signatures = (text: string): Map<string, string> => {
  const found = new Map<string, string>()
  const visit = (node: SyntaxNode, prefix: string): void => {
    for (let child = node.firstChild; child !== null; child = child.nextSibling) {
      if (child.name === "DecoratedStatement") visit(child, prefix)
      if (child.name === "FunctionDefinition") {
        const name = child.getChild("VariableName")
        const params = child.getChild("ParamList")
        if (name !== null && params !== null) found.set(prefix + text.slice(name.from, name.to), text.slice(params.from + 1, params.to - 1))
      }
      if (child.name === "ClassDefinition") {
        const name = child.getChild("VariableName")
        const body = child.getChild("Body")
        if (name !== null && body !== null) visit(body, `${prefix}${text.slice(name.from, name.to)}.`)
      }
    }
  }
  visit(parser.parse(text).topNode, "")
  return found
}

/** The parameters as the student writes them: without `self`, one space after each comma. */
const cleanParams = (params: string, method: boolean): string => {
  const parts = splitParams(params.replace(/\s+/g, " ")).map((p) => p.replace(/\s*=\s*/, "="))
  return (method ? parts.slice(1) : parts).join(", ")
}

export interface GeneratedApi {
  readonly builtins: ReadonlyArray<string>
  readonly modules: Record<string, Record<string, ReadonlyArray<string>>>
  readonly classes: Record<string, { readonly bases: ReadonlyArray<string>; readonly members: Record<string, ReadonlyArray<string>> }>
}

/** The API from the engine: each item is `[kind, class key or ""]` or `[kind, class key or "", params]`. */
export const buildApi = (engine: Engine): GeneratedApi => {
  let out = ""
  const result = engine.run({ _tag: "Run", code: introspect(ApiModules), inputs: [], seed: 1 }, { ...silentSink, chunk: (c) => { out += c.text } })
  if (result._tag !== "Finished") throw new Error(`introspection failed: ${JSON.stringify(result)}`)
  const raw = JSON.parse(out) as Raw
  const sigCache = new Map<string, Map<string, string>>()
  const sigsOf = (module: string): Map<string, string> => {
    const file = fileOf(module)
    const cached = sigCache.get(file)
    if (cached !== undefined) return cached
    const text = (pythonLibrary as Record<string, string | undefined>)[file]
    const made = text === undefined ? new Map<string, string>() : signatures(text)
    sigCache.set(file, made)
    return made
  }
  /** `tkinter._widgets.Button:invoke` or `turtle:forward` → its parameters, if written in Python. */
  const paramsOf = (ref: string): string | undefined => {
    const [owner = "", name = ""] = ref.split(":")
    if (owner in raw.classes) {
      const dot = owner.lastIndexOf(".")
      const params = sigsOf(owner.slice(0, dot)).get(`${owner.slice(dot + 1)}.${name}`)
      return params === undefined ? undefined : cleanParams(params, true)
    }
    const params = sigsOf(owner).get(name)
    return params === undefined ? undefined : cleanParams(params, false)
  }
  /** `__init__` of the class or of its first base that has one. */
  const initOf = (key: string): string | undefined => {
    const cls = raw.classes[key]
    if (cls === undefined) return undefined
    const own = cls.members.__init__
    if (own !== undefined) return paramsOf(own[1])
    for (const base of cls.bases) {
      const found = initOf(base)
      if (found !== undefined) return found
    }
    return undefined
  }
  const item = ([kind, ref]: readonly [Kind, string]): ReadonlyArray<string> => {
    if (kind === "f") {
      const params = ref === "" ? undefined : paramsOf(ref)
      return params === undefined ? ["f", ""] : ["f", "", params]
    }
    if (kind === "c") {
      const params = initOf(ref)
      return params === undefined ? ["c", ref] : ["c", ref, params]
    }
    return [kind, ""]
  }
  const mapItems = (items: Record<string, readonly [Kind, string]>): Record<string, ReadonlyArray<string>> =>
    Object.fromEntries(Object.entries(items).filter(([name]) => name !== "__init__").sort(([a], [b]) => a.localeCompare(b)).map(([name, it]) => [name, item(it)]))
  return {
    builtins: [...raw.builtins].sort(),
    modules: Object.fromEntries(Object.entries(raw.modules).map(([name, items]) => [name, mapItems(items)])),
    classes: Object.fromEntries(Object.entries(raw.classes).sort(([a], [b]) => a.localeCompare(b)).map(([key, cls]) => [key, { bases: cls.bases, members: mapItems(cls.members) }]))
  }
}

/** JSON with one item per line: short arrays stay on their line. */
const pretty = (value: unknown): string => JSON.stringify(value, null, 1).replace(/\[\n\s*([^\][{}]*?)\n\s*\]/g, (_, inner: string) => `[${inner.replace(/\n\s*/g, " ")}]`)

/** The text of `src/core/python-api.ts`. */
export const apiFileText = (api: GeneratedApi): string => `/**
 * GENERATED by \`UPDATE_API=1 npx vitest run test/python-api.test.ts\` from the engine: do not edit by hand.
 * Names of the builtins and of the modules for the hints and checks of the editor (\`code-assist.ts\`).
 * An item is \`[kind, class, params]\`: kind \`f\` function, \`c\` class, \`m\` module, \`v\` value; \`class\` is the key
 * of a class in \`apiClasses\`; \`params\` are the parameters when the function is written in Python.
 */
export type ApiItem = readonly [kind: string, cls: string, params?: string]

export const apiBuiltins: ReadonlyArray<string> = ${JSON.stringify(api.builtins)}

export const apiModules: Readonly<Record<string, Readonly<Record<string, ApiItem>>>> = ${pretty(api.modules)}

export const apiClasses: Readonly<Record<string, { readonly bases: ReadonlyArray<string>; readonly members: Readonly<Record<string, ApiItem>> }>> = ${pretty(api.classes)}
`
