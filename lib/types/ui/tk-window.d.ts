import { Option } from "effect";
import { type TkBox, type TkInput } from "../engine/protocol.ts";
import { type TkAsk, type TkDialog, type TkImage, type TkScene } from "../core/tk-scene.ts";
import type { ProgramFile } from "../engine/protocol.ts";
import { type Answer } from "./tk-dialogs.tsx";
export interface TkWindowsProps {
    readonly scene: Option.Option<TkScene>;
    readonly dialogs: ReadonlyArray<TkDialog>;
    /** The program waits for user actions; otherwise the windows are frozen. */
    readonly active: boolean;
    readonly onInput: (input: TkInput, layout: ReadonlyArray<TkBox>) => void;
    readonly onCloseDialog: () => void;
    /** Pictures of `PhotoImage` by number. */
    readonly images: ReadonlyMap<number, TkImage>;
    /** A dialog that waits for the answer of the student (askyesno, askopenfilename…). */
    readonly ask: Option.Option<TkAsk>;
    readonly onAnswer: Answer;
    /** Files that the program saved: the student can download them. */
    readonly downloads: ReadonlyArray<ProgramFile>;
    readonly onDismissDownload: (name: string) => void;
}
/** The windows of the program and its message windows. The parent gives a new `key` for each run. */
export declare function TkWindows(props: TkWindowsProps): import("react").JSX.Element | null;
