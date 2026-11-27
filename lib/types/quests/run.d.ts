/**
 * Runs a program for the trials of a step. A `Driver` is one fresh engine for one trial: the Web Worker in the
 * browser (`workerDriver`) or the engine itself in Node (`engineDriver` of `edu-python/engine`). The trial logic
 * (`runTrial`) is the same for both, so the tests in Node check what the student gets in the browser.
 */
import type { WorkerFactory } from "../core/session.ts";
import { type TkInput } from "../engine/protocol.ts";
export declare const TurnEnds: {
    /** The program ended. */
    readonly Finished: "Finished";
    /** The program is at `mainloop()`: its windows wait for user actions. */
    readonly Waiting: "Waiting";
    /** The program asks for more values with `input()` (or a dialog asks) than the trial gives. */
    readonly NeedInput: "NeedInput";
    readonly Failed: "Failed";
    readonly OutputLimit: "OutputLimit";
    readonly TimeLimit: "TimeLimit";
    /** The engine did not load (no network on the first run). */
    readonly LoadFailed: "LoadFailed";
};
export type TurnEnd = (typeof TurnEnds)[keyof typeof TurnEnds];
/** The result of a run or of one user action. */
export interface Turn {
    readonly end: TurnEnd;
    /** Text that the program printed in this turn (not the prompts of `input()`). */
    readonly output: string;
    /** The last state of the windows in this turn (JSON), or "" when the turn sent none. */
    readonly scene: string;
    /** For `Failed`: the traceback. "" otherwise. */
    readonly traceback: string;
}
export interface Driver {
    readonly run: (code: string, input: string) => Promise<Turn>;
    /** One user action in a window of a program that is `Waiting`. */
    readonly event: (input: TkInput) => Promise<Turn>;
    readonly close: () => void;
}
export type DriverFactory = () => Driver;
/** A driver on a new Web Worker. The time limit counts from `Started` and from `Handling`, as in the IDE. */
export declare const workerDriver: (createWorker: WorkerFactory) => DriverFactory;
