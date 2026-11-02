/**
 * The Python texts of the engine (`prelude.py`, `turtle.py`, `tkinter`), built into the package as strings. The
 * browser worker and Node use the same texts, so the server checks a program with the same `turtle` and `tkinter`.
 */
import prelude from "./py/prelude.py?raw"
import tkinter from "./py/tkinter/__init__.py?raw"
import tkCanvas from "./py/tkinter/_canvas.py?raw"
import tkCore from "./py/tkinter/_core.py?raw"
import tkEvents from "./py/tkinter/_events.py?raw"
import tkFields from "./py/tkinter/_fields.py?raw"
import tkPage from "./py/tkinter/_page.py?raw"
import tkStyle from "./py/tkinter/_style.py?raw"
import tkVariables from "./py/tkinter/_vars.py?raw"
import tkWidgets from "./py/tkinter/_widgets.py?raw"
import tkWindows from "./py/tkinter/_windows.py?raw"
import tkConstants from "./py/tkinter/constants.py?raw"
import tkMessagebox from "./py/tkinter/messagebox.py?raw"
import tkThemed from "./py/tkinter/ttk.py?raw"
import turtle from "./py/turtle.py?raw"
import { type Engine, type EngineSources, loadEngine } from "./engine.ts"
import { type Library, LibraryFiles } from "./library.ts"

export const pythonLibrary: Library = {
  [LibraryFiles.Turtle]: turtle,
  [LibraryFiles.Tkinter]: tkinter,
  [LibraryFiles.TkConstants]: tkConstants,
  [LibraryFiles.TkMessagebox]: tkMessagebox,
  [LibraryFiles.TkThemed]: tkThemed,
  [LibraryFiles.TkCanvas]: tkCanvas,
  [LibraryFiles.TkCore]: tkCore,
  [LibraryFiles.TkEvents]: tkEvents,
  [LibraryFiles.TkPage]: tkPage,
  [LibraryFiles.TkStyle]: tkStyle,
  [LibraryFiles.TkVariables]: tkVariables,
  [LibraryFiles.TkFields]: tkFields,
  [LibraryFiles.TkWidgets]: tkWidgets,
  [LibraryFiles.TkWindows]: tkWindows
}

export const pythonPrelude: string = prelude

/** Sources for `loadEngine`. `wasmUrl`: the address of `micropython.wasm` in a browser build; `undefined` in Node. */
export const engineSources = (wasmUrl: string | undefined): EngineSources => ({ wasmUrl, prelude, library: pythonLibrary })

/** The engine in Node (tests, server checks): MicroPython finds its `.wasm` next to its own module. */
export const loadNodeEngine = (): Promise<Engine> => loadEngine(engineSources(undefined))
