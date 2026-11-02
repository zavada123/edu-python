import { Option } from "effect";
import { type ReactNode, type RefObject } from "react";
import { type RunSession, type RunStatus, type RunView, type StopReason, type WorkerFactory } from "../core/session.ts";
import type { EditorHandle } from "./code-editor.tsx";
export declare const stopText: Record<StopReason, string>;
export declare const statusLine: (status: RunStatus) => string;
export declare const isBusy: (status: RunStatus) => boolean;
/** `Card`: a block under the editor with a title. `Panel`: the terminal of the Online IDE, without a title. */
export declare const ConsoleLayouts: {
    readonly Card: "card";
    readonly Panel: "panel";
};
export type ConsoleLayout = (typeof ConsoleLayouts)[keyof typeof ConsoleLayouts];
export declare function Console(props: Readonly<{
    view: RunView;
    layout: ConsoleLayout;
    onInput: (value: string) => void;
}>): import("react").JSX.Element;
export declare function Problem(props: Readonly<{
    status: RunStatus;
}>): ReactNode;
/** Symbol buttons for touch screens: they insert text in the editor and keep the phone keyboard open. */
export declare function SymbolBar(props: Readonly<{
    editor: RefObject<EditorHandle | null>;
}>): import("react").JSX.Element;
/** One run session of the page: the view of the run and the actions. `runId` changes with each start. */
export interface PythonRun {
    readonly view: RunView;
    readonly runId: number;
    readonly start: (code: string) => void;
    readonly stop: () => void;
    /** Stops the program and clears the output. */
    readonly clear: () => void;
    readonly provideInput: (value: string) => void;
    readonly session: RefObject<RunSession | null>;
}
export declare function usePythonRun(worker: WorkerFactory): PythonRun;
/** "Stop" works while the program runs, waits for a value or shows a window. */
export declare const canStop: (status: RunStatus) => boolean;
/** The error line for the editor: only after a failed run. */
export declare const errorLineOf: (status: RunStatus) => Option.Option<number>;
