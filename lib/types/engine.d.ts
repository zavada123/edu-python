/**
 * `edu-python/engine`: MicroPython (WebAssembly) with `input()`, `turtle` and `tkinter`, for a Web Worker and for
 * Node (server checks, tests). The Python texts are built in; MicroPython is a dependency of the package.
 */
export { type Engine, type EngineSink, type EngineSources, loadEngine, type RunResult, silentSink } from "./engine/engine.ts";
export { type Library, type LibraryFile, LibraryFiles, readLibrary } from "./engine/library.ts";
export { type ProgramResult, runProgram } from "./engine/program.ts";
export * from "./engine/protocol.ts";
export { engineSources, loadNodeEngine, pythonLibrary, pythonPrelude } from "./engine/sources.ts";
