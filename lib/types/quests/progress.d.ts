import type { DriverFactory } from "./run.ts";
import type { Mission, Progress, Report, Step, TaskStep } from "./types.ts";
export declare const allSteps: (m: Mission) => readonly Step[];
/** Steps that the student must solve: lessons do not count. */
export declare const taskSteps: (m: Mission) => readonly TaskStep[];
export declare const emptyProgress: (m: Mission) => Progress;
export declare const isStepDone: (p: Progress, stepId: string) => boolean;
/** The first step that is not done, or `undefined` when the mission is complete. Steps open one by one. */
export declare const currentStep: (m: Mission, p: Progress) => Step | undefined;
/** The progress with one more solved step and its accepted program or answer ("" for a lesson). */
export declare const markSolved: (p: Progress, stepId: string, accepted: string) => Progress;
/** Score from 0 to 1 for the solved task steps: 1 per step, minus 0.25 per hint, but at least 0.5 per step. */
export declare const missionScore: (m: Mission, solved: readonly string[], hintsUsed: Readonly<Record<string, number>>) => number;
export declare const makeReport: (m: Mission, p: Progress, stepId: string) => Report;
/** One task step after `checkMission` checked the saved answer again. */
export interface StepCheck {
    readonly stepId: string;
    readonly passed: boolean;
}
/**
 * Checks every task step of a mission again with the saved answers, for example on a server before it gives a
 * certificate. A step without an answer does not pass.
 */
export declare const checkMission: (drivers: DriverFactory, m: Mission, answers: Readonly<Record<string, string>>) => Promise<readonly StepCheck[]>;
