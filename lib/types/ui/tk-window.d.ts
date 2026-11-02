import { Option } from "effect";
import { type TkBox, type TkInput } from "../engine/protocol.ts";
import { type TkDialog, type TkScene } from "../core/tk-scene.ts";
export interface TkWindowsProps {
    readonly scene: Option.Option<TkScene>;
    readonly dialogs: ReadonlyArray<TkDialog>;
    /** The program waits for user actions; otherwise the windows are frozen. */
    readonly active: boolean;
    readonly onInput: (input: TkInput, layout: ReadonlyArray<TkBox>) => void;
    readonly onCloseDialog: () => void;
}
/** The windows of the program and its message windows. The parent gives a new `key` for each run. */
export declare function TkWindows(props: TkWindowsProps): import("react").JSX.Element | null;
