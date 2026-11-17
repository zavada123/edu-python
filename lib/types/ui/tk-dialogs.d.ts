import { type ReactNode } from "react";
import { type ProgramFile } from "../engine/protocol.ts";
import { type TkAsk } from "../core/tk-scene.ts";
export type Answer = (value: unknown, files?: ReadonlyArray<ProgramFile>) => void;
/** The error of a typed value, or "" (askinteger, askfloat: a number between `min` and `max`). */
export declare const valueError: (ask: TkAsk, text: string) => string;
/** "*.txt *.py" of `filetypes`: does the name fit? "*" and "*.*" fit all. */
export declare const fitsPattern: (name: string, patterns: string) => boolean;
/** The `accept` of a file field: ".txt,.py"; "" for all files. */
export declare const acceptOf: (patterns: string) => string;
/** The name of a saved file with the default extension, or null when the name is not good. */
export declare const saveName: (text: string, extension: string) => string | null;
/** The dialog that waits for the student. The parent gives a new `key` for each question. */
export declare function AskDialog(props: Readonly<{
    ask: TkAsk;
    onAnswer: Answer;
}>): ReactNode;
/** Files that the program saved: the student downloads them to the computer. */
export declare function Downloads(props: Readonly<{
    files: ReadonlyArray<ProgramFile>;
    onDismiss: (name: string) => void;
}>): import("react").JSX.Element | null;
