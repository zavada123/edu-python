import { type ReactNode } from "react";
import type { WorkerFactory } from "../core/session.ts";
export interface PythonIdeProps {
    readonly worker: WorkerFactory;
    /** Name on the file tab and of the downloaded file. */
    readonly fileName: string;
    /** Code at the start. The page gives a new `key` to open another program. */
    readonly initialCode: string;
    readonly onCodeChange: (code: string) => void;
    /** Text about where the code is kept ("Збережено в кабінеті"). */
    readonly saveNote: string;
    /** Buttons of the page at the end of the toolbar (share, new program). */
    readonly actions: ReactNode;
    /** Panel to the left of the editor (the programs of a student); `null` for a guest. */
    readonly sidebar: ReactNode;
}
export declare function PythonIde(props: PythonIdeProps): import("react").JSX.Element;
