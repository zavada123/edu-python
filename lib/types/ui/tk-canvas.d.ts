import type { CSSProperties, ReactNode } from "react";
import { type TkWidget } from "../core/tk-scene.ts";
/** Draws a widget of the program: the Canvas shows the widgets of `create_window`. */
export type ChildView = (widget: TkWidget, layout: CSSProperties) => ReactNode;
export declare function TkCanvasView(props: Readonly<{
    widget: TkWidget;
    layout: CSSProperties;
    child: ChildView;
}>): import("react").JSX.Element;
