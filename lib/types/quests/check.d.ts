import { type DriverFactory } from "./run.ts";
import type { AnswerStep, ProgramStep, Trial } from "./types.ts";
/** Output as the student sees it: `\r\n` is `\n`, spaces at the ends of lines and empty lines at the end do not count. */
export declare const normalizeOutput: (raw: string) => string;
/** An answer as the student may type it: letter case, ґ/г, apostrophes, spaces and the last full stop do not count. */
export declare const normalizeAnswer: (s: string) => string;
export declare const answerIsRight: (step: AnswerStep, text: string) => boolean;
/** Keywords (`for`, `while`, `elif`…) and names (`input`, `Entry`, `mainloop`…) in the code; text in strings and comments does not count. */
export declare const wordsOf: (code: string) => ReadonlySet<string>;
/** Words of `mustUse` that the code does not have. */
export declare const missingWords: (step: ProgramStep, code: string) => readonly string[];
/** The output to compare: what the program printed and what the trial wants. */
export type Compare = {
    readonly _tag: "None";
} | {
    readonly _tag: "Output";
    readonly got: string;
    readonly want: string;
};
export type TrialResult = {
    readonly _tag: "Passed";
    readonly label: string;
} | {
    readonly _tag: "Wrong";
    readonly label: string;
    readonly message: string;
    readonly compare: Compare;
};
/** True when a widget text shows the wanted value (see `WindowCheck` "Shows"). */
export declare const showsValue: (text: string, want: string) => boolean;
/** Runs one trial on a fresh engine: a program of the previous trial does not change the next one. */
export declare const runTrial: (drivers: DriverFactory, code: string, trial: Trial) => Promise<TrialResult>;
export type ProgramVerdict = {
    readonly _tag: "Solved";
    readonly trials: readonly TrialResult[];
} | {
    readonly _tag: "Failed";
    readonly trials: readonly TrialResult[];
}
/** The program does not have these words of `mustUse`: it does not run. */
 | {
    readonly _tag: "MustUse";
    readonly words: readonly string[];
} | {
    readonly _tag: "LoadFailed";
};
/** Checks a program: first the words it must use, then every trial. */
export declare const checkProgram: (drivers: DriverFactory, step: ProgramStep, code: string) => Promise<ProgramVerdict>;
/** A short message about a verdict, in Ukrainian. Words in `backticks` are code. */
export declare const verdictMessage: (verdict: ProgramVerdict) => string;
