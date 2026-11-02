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
export declare const hideJavaScript: () => boolean;
/** Takes the text-to-code constructor away from every JS function object of this realm, for good. */
export declare const stopCodeGeneration: () => void;
