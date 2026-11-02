import { type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { type TkScene, type TkWidget } from "../core/tk-scene.ts";
export declare const border: (relief: string, width: number) => CSSProperties;
/** CSS alignment of a Tk anchor: n, ne, e, se, s, sw, w, nw, center. */
export declare const anchorX: (anchor: string) => string;
export declare const anchorY: (anchor: string) => string;
export declare const containerSize: (scene: TkScene, id: number, propagate: boolean, width: number, height: number) => CSSProperties;
type ViewProps = Readonly<{
    widget: TkWidget;
    layout: CSSProperties;
}>;
export declare function TkWidgetView(props: ViewProps): ReactNode;
/** The widgets inside a window or a frame. The container is a flex column with `position: relative`. */
export declare function Children(props: Readonly<{
    parent: number;
}>): import("react").JSX.Element;
/** Keys for the program: from a field (the field gets them) or from the window. */
export declare const keyTarget: (e: KeyboardEvent<HTMLElement>, windowId: number) => number;
export {};
