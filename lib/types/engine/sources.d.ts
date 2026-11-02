import { type Engine, type EngineSources } from "./engine.ts";
import { type Library } from "./library.ts";
export declare const pythonLibrary: Library;
export declare const pythonPrelude: string;
/** Sources for `loadEngine`. `wasmUrl`: the address of `micropython.wasm` in a browser build; `undefined` in Node. */
export declare const engineSources: (wasmUrl: string | undefined) => EngineSources;
/** The engine in Node (tests, server checks): MicroPython finds its `.wasm` next to its own module. */
export declare const loadNodeEngine: () => Promise<Engine>;
