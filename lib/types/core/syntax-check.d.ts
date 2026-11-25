/**
 * Checks the code while the student types: a worker of its own compiles it (`Check`), the program does not run.
 * The editor marks the line of a SyntaxError and explains it in Ukrainian, as after a run (`errors.ts`).
 */
import { Option } from "effect";
import type { WorkerFactory } from "./session.ts";
/** A syntax error found without a run: its line (from 1) and the explanation. */
export interface SyntaxProblem {
    readonly line: number;
    readonly message: string;
    readonly explanation: string;
}
export interface SyntaxChecker {
    /** The error of the code, or none. An older check gives none when a newer one was asked. */
    readonly check: (code: string) => Promise<Option.Option<SyntaxProblem>>;
    readonly dispose: () => void;
}
export declare const createSyntaxChecker: (createWorker: WorkerFactory) => SyntaxChecker;
