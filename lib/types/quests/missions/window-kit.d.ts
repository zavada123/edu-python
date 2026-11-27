import type { ProgramStep, WindowAction, WindowCheck, WindowTrial } from "../types.ts";
/** Small builders for the steps of the missions with windows. */
export declare const type: (field: number, text: string) => WindowAction;
export declare const click: (button: string) => WindowAction;
export declare const shows: (text: string) => WindowCheck;
export declare const trial: (label: string, actions: readonly WindowAction[], expect: readonly WindowCheck[], why: string) => WindowTrial;
export declare const program: (s: Omit<ProgramStep, "kind">) => ProgramStep;
/** Clicks on the buttons of the keys, one by one: "12+3=" is 1, 2, +, 3, =. */
export declare const keys: (text: string) => readonly WindowAction[];
