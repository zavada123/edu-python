/**
 * The wall between student code and JavaScript. MicroPython of PyScript gives Python the globals of
 * JavaScript (`import js`) and any JS function as an object. In a Web Worker of a site, `js.fetch` sends the
 * cookies of the person that runs the program, so a shared program could act as that person (read messages,
 * send data out). Two parts:
 *
 * - `hideJavaScript`: `import js` gives an empty object (the engine calls it after load).
 * - `stopCodeGeneration`: the constructor of a JS function (`f.constructor('return fetch')`) no longer makes
 *   code from text. The worker calls it: the worker belongs to the engine only. Do not call it in a page or a
 *   server process that runs other code.
 */

/** `import js` reads index 0 of the proxy table of the engine (`globalThis`). */
export const hideJavaScript = (): boolean => {
  const table: unknown = Reflect.get(globalThis, "proxy_js_ref")
  if (!Array.isArray(table)) return false
  const empty = {}
  Reflect.setPrototypeOf(empty, null)
  table[0] = Object.freeze(empty)
  return true
}

/**
 * A constructor that makes no code. It keeps the name of the original (`AsyncFunction`, ...): the engine of
 * MicroPython reads `f.constructor.name` to tell the kinds of functions apart.
 */
const blockedLike = (original: unknown): ((...args: ReadonlyArray<unknown>) => never) => {
  const blocked = (): never => {
    throw new EvalError("code generation is off in the Python engine")
  }
  const name: unknown = typeof original === "function" ? Reflect.get(original, "name") : "Function"
  Object.defineProperty(blocked, "name", { value: typeof name === "string" ? name : "Function" })
  return blocked
}

/** Kinds of JS functions: each one has its own constructor that makes code from text. */
const functionPrototypes = (): ReadonlyArray<object> => {
  const kinds: ReadonlyArray<unknown> = [
    function() {},
    async function() {},
    function*() {},
    async function*() {}
  ]
  return kinds.flatMap((f) => {
    const proto: unknown = Reflect.getPrototypeOf(Object(f))
    // `Function.prototype` is itself a function; the other prototypes are plain objects.
    return (typeof proto === "object" || typeof proto === "function") && proto !== null ? [proto] : []
  })
}

/** Takes the text-to-code constructor away from every JS function object of this realm, for good. */
export const stopCodeGeneration = (): void => {
  for (const proto of functionPrototypes()) {
    const original: unknown = Reflect.get(proto, "constructor")
    Object.defineProperty(proto, "constructor", { value: blockedLike(original), writable: false, enumerable: false, configurable: false })
  }
}
