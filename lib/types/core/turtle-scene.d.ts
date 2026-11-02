/**
 * Turtle animation without the DOM: applies the commands of a run (`TurtleOp`) frame by frame. Each frame
 * has a distance budget: the turtle draws a line in parts, so the student sees how it moves.
 */
import type { TurtleOp } from "../engine/protocol.ts";
/** A finished drawing on the paper. */
export type PaperItem = {
    readonly _tag: "Line";
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
    readonly color: string;
    readonly width: number;
} | {
    readonly _tag: "Dot";
    readonly x: number;
    readonly y: number;
    readonly size: number;
    readonly color: string;
} | {
    readonly _tag: "Polygon";
    readonly points: ReadonlyArray<number>;
    readonly color: string;
} | {
    readonly _tag: "Text";
    readonly x: number;
    readonly y: number;
    readonly text: string;
    readonly align: string;
    readonly font: string;
    readonly color: string;
} | {
    readonly _tag: "Stamp";
    readonly x: number;
    readonly y: number;
    readonly heading: number;
    readonly pen: string;
    readonly fill: string;
};
export interface TurtlePose {
    readonly x: number;
    readonly y: number;
    readonly heading: number;
    readonly visible: boolean;
    readonly pen: string;
    readonly fill: string;
}
export interface Scene {
    readonly items: ReadonlyArray<PaperItem>;
    readonly background: string;
    readonly turtle: TurtlePose;
    readonly speed: number;
    /** Index in `items` where the next fill goes (`FillStart`). */
    readonly fillStart: number;
    /** Count of commands that are applied completely. */
    readonly applied: number;
    /** Distance that the turtle has already gone in the current `Move` command. */
    readonly progress: number;
    /** `true` when items changed not only at the end (fill, clear, background): the paper is drawn again. */
    readonly redraw: boolean;
}
export declare const DefaultSpeed = 3;
export declare const emptyScene: Scene;
export declare const frameBudget: (speed: number, waiting: number) => number;
/** Line of the current `Move` that is drawn only in part, for the frame. */
export interface PartialLine {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
    readonly color: string;
    readonly width: number;
}
/** Applies commands from `scene.applied` while the frame budget lasts. */
export declare const advance: (scene: Scene, ops: ReadonlyArray<TurtleOp>) => Scene;
/** The turtle in the middle of a `Move`, and the part of the line that it has drawn. */
export declare const inMotion: (scene: Scene, ops: ReadonlyArray<TurtleOp>) => {
    readonly pose: TurtlePose;
    readonly line: PartialLine | null;
};
export declare const isDone: (scene: Scene, ops: ReadonlyArray<TurtleOp>) => boolean;
