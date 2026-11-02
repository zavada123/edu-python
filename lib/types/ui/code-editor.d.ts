import { Option } from "effect";
/** `Grow`: the editor grows with the code (tasks, topics). `Fill`: it fills the parent and scrolls (Online IDE). */
export declare const EditorHeights: {
    readonly Grow: "grow";
    readonly Fill: "fill";
};
export type EditorHeight = (typeof EditorHeights)[keyof typeof EditorHeights];
export interface EditorHandle {
    /** Inserts text at the cursor (symbol buttons for phones). */
    readonly insert: (text: string) => void;
    readonly moveCursor: (by: number) => void;
    readonly setCode: (code: string) => void;
    readonly focus: () => void;
}
export declare function CodeEditor(props: Readonly<{
    initialCode: string;
    label: string;
    height: EditorHeight;
    errorLine: Option.Option<number>;
    onChange: (code: string) => void;
    onRun: () => void;
    onReady: (handle: EditorHandle) => void;
}>): import("react").JSX.Element;
