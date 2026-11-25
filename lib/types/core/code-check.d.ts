import { type CodeWarning } from "./check-kit.ts";
export { CheckSeverities, type CheckSeverity, type CodeWarning, valuesWord } from "./check-kit.ts";
/** Mistakes of the code that compiles; nothing for code with a syntax error (the syntax check marks it). */
export declare const checkCode: (code: string) => ReadonlyArray<CodeWarning>;
