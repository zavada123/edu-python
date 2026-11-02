/**
 * One run of a program with all its input known in advance: the way task tests run (on the server and in
 * the task editor). The output is only the text that the program prints: the prompt of `input()` and the
 * typed values are not part of it, so a test does not depend on the prompt text.
 */
import { type Engine } from "./engine.ts";
/** The same tags as `ProgramRun` of `@mriya/domain` (the server adds `TimeLimit`). */
export type ProgramResult = {
    readonly _tag: "Finished";
    readonly output: string;
}
/** Uncaught Python exception: the traceback text as MicroPython prints it. */
 | {
    readonly _tag: "Crashed";
    readonly output: string;
    readonly traceback: string;
}
/** The program asks for more values with `input()` than the test gives. */
 | {
    readonly _tag: "NeedsInput";
    readonly output: string;
} | {
    readonly _tag: "OutputLimit";
};
/** Values for `input()`: one per line of the test input. A newline at the end does not add an empty value. */
export declare const inputLines: (input: string) => ReadonlyArray<string>;
/** The seed of `random` in task tests: the same output on every check. */
export declare const TestSeed = 1;
/** Runs `code` with the lines of `input`. `onOverflow` is called when the output gets to the limit (the program can still work). */
export declare const runProgram: (engine: Engine, code: string, input: string, onOverflow: () => void) => ProgramResult;
