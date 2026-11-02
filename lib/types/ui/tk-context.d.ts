import { Option } from "effect";
import type { TkInput } from "../engine/protocol.ts";
import type { PressMemory } from "../core/tk-input.ts";
import type { TkScene, TkWindow } from "../core/tk-scene.ts";
export interface TkContextValue {
    readonly scene: TkScene;
    /** The program waits for user actions: the window is not frozen. */
    readonly active: boolean;
    readonly send: (input: TkInput) => void;
    /** The last mouse press, for double clicks. */
    readonly press: PressTracker;
}
/** Remembers the last mouse press: event handlers change it, the view does not show it. */
export declare class PressTracker {
    last: Option.Option<PressMemory>;
}
export declare const TkContext: import("react").Context<Option.Option<TkContextValue>>;
export declare const useTk: () => TkContextValue;
export declare const TkWindowContext: import("react").Context<Option.Option<{
    readonly title: string;
    readonly width: number;
    readonly height: number;
    readonly minWidth: number;
    readonly minHeight: number;
    readonly x: number;
    readonly y: number;
    readonly visible: boolean;
    readonly decorated: boolean;
    readonly id: number;
    readonly binds: readonly string[];
    readonly bg: string;
    readonly bd: number;
    readonly relief: string;
    readonly padx: number;
    readonly pady: number;
    readonly highlight: number;
    readonly propagate: boolean;
    readonly columns: readonly (readonly [number, number, number])[];
    readonly rows: readonly (readonly [number, number, number])[];
}>>;
export declare const useTkWindow: () => TkWindow;
/** The client area of a window (the element with this attribute): `x_root` and `y_root` count from it. */
export declare const TkWindowAttribute = "data-tk-window";
export declare const clientOf: (element: Element) => Element | null;
