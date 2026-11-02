import type { MouseEvent, PointerEvent, WheelEvent } from "react";
export interface WidgetEvents {
    readonly onPointerDown: (e: PointerEvent) => void;
    readonly onPointerUp: (e: PointerEvent) => void;
    readonly onPointerMove: (e: PointerEvent) => void;
    readonly onPointerEnter: (e: PointerEvent) => void;
    readonly onPointerLeave: (e: PointerEvent) => void;
    readonly onWheel: (e: WheelEvent) => void;
    readonly onContextMenu: (e: MouseEvent) => void;
}
export declare const useWidgetEvents: (widget: number) => WidgetEvents;
