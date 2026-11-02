/**
 * Python modules of the engine. The engine writes them to `/lib` of MicroPython, so `import turtle` and
 * `from tkinter import *` find them. The browser build imports the texts (`worker.ts`), Node reads the
 * files next to this one (`node.ts`).
 */
export declare const LibraryFiles: {
    readonly Turtle: "turtle.py";
    readonly Tkinter: "tkinter/__init__.py";
    readonly TkConstants: "tkinter/constants.py";
    readonly TkMessagebox: "tkinter/messagebox.py";
    readonly TkThemed: "tkinter/ttk.py";
    readonly TkCanvas: "tkinter/_canvas.py";
    readonly TkCore: "tkinter/_core.py";
    readonly TkEvents: "tkinter/_events.py";
    readonly TkFields: "tkinter/_fields.py";
    readonly TkPage: "tkinter/_page.py";
    readonly TkStyle: "tkinter/_style.py";
    readonly TkVariables: "tkinter/_vars.py";
    readonly TkWidgets: "tkinter/_widgets.py";
    readonly TkWindows: "tkinter/_windows.py";
};
export type LibraryFile = (typeof LibraryFiles)[keyof typeof LibraryFiles];
/** The text of each module. */
export type Library = Readonly<Record<LibraryFile, string>>;
/** The library from a function that reads one module. */
export declare const readLibrary: (text: (path: LibraryFile) => string) => Library;
