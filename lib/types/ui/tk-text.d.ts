import { type CSSProperties } from "react";
import type { TkScene, TkWidget } from "../core/tk-scene.ts";
/** The attribute of the element that a Scrollbar scrolls (`tk-lists.tsx`). */
export declare const TkScrollAttribute = "data-tk-scroll";
/** Places in the text: Python counts characters (code points), the browser counts UTF-16 units. */
export declare const toUnits: (text: string, chars: number) => number;
export declare const toChars: (text: string, units: number) => number;
/** Is the widget scrolled by a Scrollbar of the program? Then its own scroll bar is hidden. */
export declare const scrolledByBar: (scene: TkScene, id: number) => boolean;
export declare function TextView(props: Readonly<{
    widget: TkWidget;
    layout: CSSProperties;
}>): import("react").JSX.Element;
