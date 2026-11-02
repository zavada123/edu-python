/**
 * Python modules of the engine. The engine writes them to `/lib` of MicroPython, so `import turtle` and
 * `from tkinter import *` find them. The browser build imports the texts (`worker.ts`), Node reads the
 * files next to this one (`node.ts`).
 */
export const LibraryFiles = {
  Turtle: "turtle.py",
  Tkinter: "tkinter/__init__.py",
  TkConstants: "tkinter/constants.py",
  TkMessagebox: "tkinter/messagebox.py",
  TkThemed: "tkinter/ttk.py",
  TkCanvas: "tkinter/_canvas.py",
  TkCore: "tkinter/_core.py",
  TkEvents: "tkinter/_events.py",
  TkFields: "tkinter/_fields.py",
  TkPage: "tkinter/_page.py",
  TkStyle: "tkinter/_style.py",
  TkVariables: "tkinter/_vars.py",
  TkWidgets: "tkinter/_widgets.py",
  TkWindows: "tkinter/_windows.py"
} as const
export type LibraryFile = (typeof LibraryFiles)[keyof typeof LibraryFiles]

/** The text of each module. */
export type Library = Readonly<Record<LibraryFile, string>>

/** The library from a function that reads one module. */
export const readLibrary = (text: (path: LibraryFile) => string): Library => ({
  [LibraryFiles.Turtle]: text(LibraryFiles.Turtle),
  [LibraryFiles.Tkinter]: text(LibraryFiles.Tkinter),
  [LibraryFiles.TkConstants]: text(LibraryFiles.TkConstants),
  [LibraryFiles.TkMessagebox]: text(LibraryFiles.TkMessagebox),
  [LibraryFiles.TkThemed]: text(LibraryFiles.TkThemed),
  [LibraryFiles.TkCanvas]: text(LibraryFiles.TkCanvas),
  [LibraryFiles.TkCore]: text(LibraryFiles.TkCore),
  [LibraryFiles.TkEvents]: text(LibraryFiles.TkEvents),
  [LibraryFiles.TkFields]: text(LibraryFiles.TkFields),
  [LibraryFiles.TkPage]: text(LibraryFiles.TkPage),
  [LibraryFiles.TkStyle]: text(LibraryFiles.TkStyle),
  [LibraryFiles.TkVariables]: text(LibraryFiles.TkVariables),
  [LibraryFiles.TkWidgets]: text(LibraryFiles.TkWidgets),
  [LibraryFiles.TkWindows]: text(LibraryFiles.TkWindows)
})
