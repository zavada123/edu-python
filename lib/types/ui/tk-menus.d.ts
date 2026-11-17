import { type CSSProperties } from "react";
import { type TkWidget } from "../core/tk-scene.ts";
/** A place on the page for a drop-down menu: `left` and `top` of the viewport. */
interface Place {
    readonly left: number;
    readonly top: number;
}
/** A drop-down menu. Cascades open to the right; the menu closes after a click outside or Escape. */
export declare function MenuList(props: Readonly<{
    menu: number;
    place: Place;
    onClose: () => void;
    depth?: number;
}>): import("react").JSX.Element;
/** The menu bar under the title of a window. */
export declare function MenuBar(props: Readonly<{
    menu: number;
}>): import("react").JSX.Element;
/** Menus that the program opened with `tk_popup(x, y)`: at the place on the "screen" of their window. */
export declare function PopupMenus(props: Readonly<{
    root: HTMLElement | null;
}>): import("react").JSX.Element;
export declare function MenubuttonView(props: Readonly<{
    widget: TkWidget;
    layout: CSSProperties;
}>): import("react").JSX.Element;
export {};
