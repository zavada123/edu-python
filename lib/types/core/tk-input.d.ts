/**
 * User actions in the windows of a tkinter program, as Tk names them (`tkinter/_page.py`): keysyms of keys,
 * mouse buttons, places of widgets for `winfo_…`.
 */
import { Option } from "effect";
import type { TkBox } from "../engine/protocol.ts";
/** Tk keysym of a DOM `KeyboardEvent.key`: "a", "Return", "space", "Left", "F5". */
export declare const keysym: (key: string) => string;
/** `event.char` of Tk: the typed character, or "" for keys like arrows and Shift. */
export declare const keyChar: (key: string) => string;
interface ModifierState {
    readonly shiftKey: boolean;
    readonly ctrlKey: boolean;
    readonly altKey: boolean;
    readonly metaKey: boolean;
}
export declare const modifiers: (e: ModifierState) => ReadonlyArray<string>;
export declare const keyCode: (key: string) => number;
/** Tk number of a DOM mouse button: 1 left, 2 middle, 3 right. */
export declare const mouseButton: (button: number) => number;
export declare const TkIdAttribute = "data-tk-id";
export declare const TkItemAttribute = "data-tk-item";
/** The canvas figure under the pointer, or 0. */
export declare const itemAt: (target: EventTarget | null) => number;
/** Places of all windows and widgets under `root`: x and y from the top left corner of the parent. */
export declare const collectLayout: (root: HTMLElement) => ReadonlyArray<TkBox>;
export interface PressMemory {
    readonly widget: number;
    readonly time: number;
    readonly x: number;
    readonly y: number;
    readonly count: number;
}
/** The press after `last`: `count` is 2 for the second press of a double click. */
export declare const nextPress: (last: Option.Option<PressMemory>, widget: number, time: number, x: number, y: number) => PressMemory;
export {};
