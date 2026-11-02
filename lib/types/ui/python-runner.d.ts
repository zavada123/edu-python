import type { WorkerFactory } from "../core/session.ts";
import { type EditorHandle } from "./code-editor.tsx";
export interface PythonRunnerProps {
    readonly worker: WorkerFactory;
    /** Code in the editor at the start (a draft or the starter code). */
    readonly initialCode: string;
    /** Code that "Скинути код" puts back. */
    readonly resetCode: string;
    /** Current code: on the first render and after each change. */
    readonly onCodeChange: (code: string) => void;
    /** The page gets the editor, for example to put a draft from the server into it. */
    readonly onEditorReady: (editor: EditorHandle) => void;
    /** Short text at the end of the toolbar (where the draft is kept); empty for none. */
    readonly note: string;
}
export declare function PythonRunner(props: PythonRunnerProps): import("react").JSX.Element;
