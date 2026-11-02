/**
 * Messages between the page and the Python worker (`worker.ts`). The worker runs student code in
 * MicroPython (WebAssembly). The page owns the run: it starts the worker, enforces the time limit,
 * and stops the worker with `terminate()`.
 *
 * `input()` cannot block the worker without `SharedArrayBuffer`. Thus a run that needs a value it does not
 * have stops with `NeedInput`. The page asks the student and runs the program again from the start with
 * one more value. The seed of `random` is the same for all replays of one run, so the output repeats.
 *
 * A window program (tkinter) stops at `mainloop()` with `Waiting`: the engine keeps the program state, and
 * the page shows the windows. Each user action is an `EventRequest`; the worker calls the handlers of the
 * program and sends the new state of the windows (a scene: JSON of `tkinter/_core.py`).
 */

/** One drawing command of the turtle (`turtle.py`). Coordinates: origin in the centre, y goes up. */
export type TurtleOp =
  | { readonly _tag: "Move"; readonly x: number; readonly y: number; readonly pen: boolean; readonly color: string; readonly width: number }
  | { readonly _tag: "Turn"; readonly heading: number }
  | { readonly _tag: "Dot"; readonly x: number; readonly y: number; readonly size: number; readonly color: string }
  /** `begin_fill()`: the fill of the next `Fill` goes under everything drawn after this command. */
  | { readonly _tag: "FillStart" }
  | { readonly _tag: "Fill"; readonly points: ReadonlyArray<number>; readonly color: string }
  | { readonly _tag: "Text"; readonly x: number; readonly y: number; readonly text: string; readonly align: string; readonly font: string; readonly color: string }
  | { readonly _tag: "Stamp"; readonly x: number; readonly y: number; readonly heading: number; readonly color: string }
  | { readonly _tag: "Background"; readonly color: string }
  | { readonly _tag: "Clear" }
  | { readonly _tag: "Visible"; readonly visible: boolean }
  | { readonly _tag: "Look"; readonly pen: string; readonly fill: string }
  | { readonly _tag: "Speed"; readonly speed: number }

/**
 * Console text: program output, the prompt of `input()`, or a value that the student typed for `input()`
 * (shown in a different style). Task tests compare only `Output`: the prompt text is free.
 */
export const ChunkKinds = { Output: "output", Prompt: "prompt", Input: "input" } as const
export type ChunkKind = (typeof ChunkKinds)[keyof typeof ChunkKinds]

export interface Chunk {
  readonly kind: ChunkKind
  readonly text: string
}

export const MouseKinds = { Press: "Press", Release: "Release", Motion: "Motion", Enter: "Enter", Leave: "Leave", Wheel: "Wheel" } as const
export type MouseKind = (typeof MouseKinds)[keyof typeof MouseKinds]

export const KeyKinds = { Press: "Press", Release: "Release" } as const
export type KeyKind = (typeof KeyKinds)[keyof typeof KeyKinds]

/** A user action in a window of the program (`tkinter/_page.py`). `widget` is the id of a window or widget. */
export type TkInput =
  /** Click on a button, a check box or a radio button: the `command` of the widget. */
  | { readonly _tag: "Invoke"; readonly widget: number }
  /**
   * `x`, `y`: from the top left corner of the widget; `rootX`, `rootY`: on the "screen". `item`: the canvas
   * figure under the pointer, or 0. `count`: 2 for a double click. `buttons`: pressed buttons, as in the DOM.
   */
  | {
    readonly _tag: "Mouse"
    readonly kind: MouseKind
    readonly widget: number
    readonly item: number
    readonly button: number
    readonly count: number
    readonly buttons: number
    readonly delta: number
    readonly x: number
    readonly y: number
    readonly rootX: number
    readonly rootY: number
    readonly modifiers: ReadonlyArray<string>
  }
  /** `widget`: the field with the focus, or the window. `keysym` and `char` as in Tk. */
  | {
    readonly _tag: "Key"
    readonly kind: KeyKind
    readonly widget: number
    readonly keysym: string
    readonly char: string
    readonly keycode: number
    readonly modifiers: ReadonlyArray<string>
  }
  /** New text of an Entry or a Text, or a new value of a Scale, after the student changed it. */
  | { readonly _tag: "Edit"; readonly widget: number; readonly text: string }
  /** The close button of a window. */
  | { readonly _tag: "Close"; readonly widget: number }
  /** The page shows a window for the first time (`<Map>`, `<Expose>`, `<Configure>`). */
  | { readonly _tag: "Shown"; readonly widget: number }
  /** A timer of `after()` (the worker sends it itself). */
  | { readonly _tag: "Timer"; readonly timer: number }

/** Place and size of a window or widget on the page, for `winfo_…`: id, x, y, width, height. */
export type TkBox = readonly [id: number, x: number, y: number, width: number, height: number]

export interface EventRequest {
  readonly _tag: "Event"
  readonly input: TkInput
  readonly layout: ReadonlyArray<TkBox>
}

export interface RunRequest {
  readonly _tag: "Run"
  readonly code: string
  readonly inputs: ReadonlyArray<string>
  readonly seed: number
}

export type WorkerRequest = RunRequest | EventRequest

export type WorkerMessage =
  /** The engine is loaded and the program starts now: the time limit counts from this message. */
  | { readonly _tag: "Started" }
  /**
   * `scenes`: new states of the windows (JSON), the last one is the current; "null" when the windows are
   * closed. `dialogs`: new message windows of `tkinter.messagebox` (JSON).
   */
  | {
    readonly _tag: "Progress"
    readonly chunks: ReadonlyArray<Chunk>
    readonly ops: ReadonlyArray<TurtleOp>
    readonly scenes: ReadonlyArray<string>
    readonly dialogs: ReadonlyArray<string>
  }
  /** The worker calls the handlers of one user action or timer: the time limit counts from this message. */
  | { readonly _tag: "Handling" }
  /** The program is at `mainloop()` or the handlers are done: the windows wait for the user. */
  | { readonly _tag: "Waiting" }
  | { readonly _tag: "Finished" }
  | { readonly _tag: "NeedInput" }
  /** Uncaught Python exception: the traceback text as MicroPython prints it. */
  | { readonly _tag: "Failed"; readonly traceback: string }
  | { readonly _tag: "OutputLimit" }
  | { readonly _tag: "LoadFailed"; readonly message: string }

/** Console limit: a loop that prints forever must not use all memory of the phone. */
export const MaxOutputChars = 200_000
/** Limit of one window state (JSON): a canvas with too many figures stops the program as too much output. */
export const MaxSceneChars = 4_000_000
/** A program that works longer than this is stopped (a loop that never ends). Waiting for input does not count. */
export const TimeLimitMs = 5_000
