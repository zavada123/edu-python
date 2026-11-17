import { type CSSProperties } from "react";
import type { TkWidget } from "../core/tk-scene.ts";
/** Line height of Tk fonts; the fonts of `_style.py` have the same `/1.2`. */
export declare const LineHeight = 1.2;
export declare const border: (relief: string, width: number) => CSSProperties;
/** CSS alignment of a Tk anchor: n, ne, e, se, s, sw, w, nw, center. */
export declare const anchorX: (anchor: string) => string;
export declare const anchorY: (anchor: string) => string;
export declare const textBox: (w: TkWidget) => CSSProperties;
/** Text of a field: the student types it, and the program changes it (`rev`). */
export declare const useFieldText: (w: TkWidget) => readonly [string, (value: string) => void];
export declare const fieldStyle: (w: TkWidget) => CSSProperties;
