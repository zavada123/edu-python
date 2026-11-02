import type { TurtleOp } from "../engine/protocol.ts";
export declare function TurtleCanvas(props: Readonly<{
    ops: ReadonlyArray<TurtleOp>;
    runId: number;
}>): import("react").JSX.Element;
