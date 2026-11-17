/**
 * One "Run" of a program on the page: starts the worker, keeps the time limit, asks for `input()` values
 * and runs the program again with them (`protocol.ts`), sends the user actions in the windows of a tkinter
 * program, and builds the state that the view shows.
 */
import { Option } from "effect";
import { type ProgramError } from "./errors.ts";
import { type TkAsk, type TkDialog, type TkImage, type TkScene } from "./tk-scene.ts";
import { type Chunk, type ProgramFile, type TkBox, type TkInput, type TurtleOp, type WorkerMessage, type WorkerRequest } from "../engine/protocol.ts";
export declare const StopReasons: {
    readonly User: "user";
    readonly TimeLimit: "time-limit";
    readonly OutputLimit: "output-limit";
    readonly LoadFailed: "load-failed";
};
export type StopReason = (typeof StopReasons)[keyof typeof StopReasons];
export type RunStatus = {
    readonly _tag: "Idle";
}
/** The worker loads the engine (first run on the page). */
 | {
    readonly _tag: "Loading";
} | {
    readonly _tag: "Running";
} | {
    readonly _tag: "WaitingInput";
}
/** The windows of a tkinter program wait for user actions. */
 | {
    readonly _tag: "Window";
}
/** A dialog of tkinter (askyesno, askopenfilename…) waits for the answer of the student. */
 | {
    readonly _tag: "Asking";
    readonly ask: TkAsk;
} | {
    readonly _tag: "Finished";
} | {
    readonly _tag: "Failed";
    readonly error: ProgramError;
} | {
    readonly _tag: "Stopped";
    readonly reason: StopReason;
};
export interface RunView {
    readonly status: RunStatus;
    readonly chunks: ReadonlyArray<Chunk>;
    readonly ops: ReadonlyArray<TurtleOp>;
    /** Windows of a tkinter program. */
    readonly scene: Option.Option<TkScene>;
    /** Message windows that wait for "OK": the first one is shown. */
    readonly dialogs: ReadonlyArray<TkDialog>;
    /** Pictures of `PhotoImage` by number. */
    readonly images: ReadonlyMap<number, TkImage>;
    /** Files that the program saved: the student can download them. One file for each name, the last one. */
    readonly downloads: ReadonlyArray<ProgramFile>;
}
export declare const idleView: RunView;
/** The worker as the session sees it: `worker.ts` in the browser, a fake in tests. */
export interface WorkerPort {
    readonly post: (request: WorkerRequest) => void;
    readonly terminate: () => void;
}
export type WorkerFactory = (onMessage: (message: WorkerMessage) => void) => WorkerPort;
export interface RunSession {
    readonly start: (code: string) => void;
    readonly provideInput: (value: string) => void;
    /** A user action in a window; `layout` gives the places of the widgets on the page. */
    readonly send: (input: TkInput, layout: ReadonlyArray<TkBox>) => void;
    /** The student clicked "OK" in the first message window. */
    readonly closeDialog: () => void;
    /**
     * The answer to the dialog of `Asking` (JSON value; null when the student closed it). `files`: files that
     * the student gave to the program in an "Open" dialog.
     */
    readonly answer: (value: unknown, files?: ReadonlyArray<ProgramFile>) => void;
    /** The student downloaded or closed the offer of a saved file. */
    readonly dismissDownload: (name: string) => void;
    readonly stop: () => void;
    /** The page closes the runner: the worker is stopped, its messages are not used. */
    readonly dispose: () => void;
}
export declare const createRunSession: (createWorker: WorkerFactory, onChange: (view: RunView) => void) => RunSession;
/**
 * The real worker for the browser. `create` starts the worker file of the page (see `startPythonWorker`), for example
 * `() => new Worker(new URL("./python-worker.ts", import.meta.url), { type: "module" })`. Each call starts a new
 * worker; the engine loads in it once.
 */
export declare const browserWorker: (create: () => Worker) => WorkerFactory;
