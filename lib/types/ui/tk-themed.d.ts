import type { CSSProperties, ReactNode } from "react";
import { type TkWidget } from "../core/tk-scene.ts";
type ViewProps = Readonly<{
    widget: TkWidget;
    layout: CSSProperties;
}>;
type ChildView = (widget: TkWidget, layout: CSSProperties) => ReactNode;
/** A themed widget of ttk; `child` draws a widget inside a tab of a Notebook. */
export declare function ThemedView(props: ViewProps & Readonly<{
    child: ChildView;
}>): ReactNode;
export {};
