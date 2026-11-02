/**
 * Explains a Python error for a grade 5 student, in Ukrainian. Input: the traceback that MicroPython prints
 * and the source code. MicroPython says only "invalid syntax" for most syntax errors, so for them we look at
 * the line and find the usual cause: no colon, no closing bracket or quote, typographic quotes, no indent.
 *
 * The explanation is plain text where `...` marks code (the view shows it in a monospace font).
 * Values from the program are put in `...` only after `codeSafe`.
 */
import { Option } from "effect";
export interface ProgramError {
    /** Line in the student code, from 1. */
    readonly line: Option.Option<number>;
    /** Last line of the traceback, as Python printed it, for example `NameError: name 'x' isn't defined`. */
    readonly message: string;
    readonly explanation: string;
}
export declare const explainError: (traceback: string, code: string) => ProgramError;
