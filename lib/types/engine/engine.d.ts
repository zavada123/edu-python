import type { Library } from "./library.ts";
import { type Chunk, type EventRequest, type RunRequest, type TurtleOp } from "./protocol.ts";
/** Receives the output of a run while the program works. */
export interface EngineSink {
    readonly chunk: (chunk: Chunk) => void;
    readonly op: (op: TurtleOp) => void;
    /** New state of the windows (JSON), or "null" when they are closed. */
    readonly scene: (json: string) => void;
    /** A message window of `tkinter.messagebox` (JSON). */
    readonly dialog: (json: string) => void;
    /** `after(ms, ...)`: the caller sends `Timer` with this id after `ms`, while the program waits for events. */
    readonly timer: (id: number, ms: number) => void;
    readonly cancelTimer: (id: number) => void;
    /** Called once when the output gets to `MaxOutputChars`. The program can still work: the caller stops it. */
    readonly overflow: () => void;
}
export type RunResult = {
    readonly _tag: "Finished";
} | {
    readonly _tag: "NeedInput";
}
/** The program is at `mainloop()`: its windows wait for user actions (`event`). */
 | {
    readonly _tag: "Waiting";
} | {
    readonly _tag: "Failed";
    readonly traceback: string;
};
export interface Engine {
    readonly run: (request: RunRequest, sink: EngineSink) => RunResult;
    /** One user action in a window of the program that is `Waiting`. */
    readonly event: (request: EventRequest, sink: EngineSink) => RunResult;
}
/** A sink that drops everything: start of a sink in tests and checks. */
export declare const silentSink: EngineSink;
/**
 * What the engine loads. `wasmUrl` is the address of `micropython.wasm` in the browser build; `undefined` in
 * Node, where the package finds the file next to itself. `prelude` and `library` are the texts of
 * `prelude.py` and the modules (`library.ts`): the browser build imports them as text, Node reads the files
 * (`node.ts`).
 */
export interface EngineSources {
    readonly wasmUrl: string | undefined;
    readonly prelude: string;
    readonly library: Library;
}
export declare const loadEngine: (sources: EngineSources) => Promise<Engine>;
