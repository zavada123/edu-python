import { type CSSProperties } from "react";
import { type TkWidget } from "../core/tk-scene.ts";
type ViewProps = Readonly<{
    widget: TkWidget;
    layout: CSSProperties;
}>;
/** The rows chosen after a click on `row`, as Tk chooses them in each `selectmode`. */
export declare const chooseRows: (mode: string, chosen: ReadonlyArray<number>, row: number, toggle: boolean, range: boolean, anchor: number) => ReadonlyArray<number>;
export declare function ListboxView(props: ViewProps): import("react").JSX.Element;
export declare function SpinboxView(props: ViewProps): import("react").JSX.Element;
/** Closes a drop-down list after a click outside of it or Escape. */
export declare const useOutsideClose: (open: boolean, close: () => void, inside: () => ReadonlyArray<Element | null>) => void;
export declare function ComboboxView(props: ViewProps): import("react").JSX.Element;
export declare function ScrollbarView(props: ViewProps): import("react").JSX.Element;
export {};
