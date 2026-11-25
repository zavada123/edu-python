export declare const CheckSeverities: {
    readonly Error: "error";
    readonly Warning: "warning";
};
export type CheckSeverity = (typeof CheckSeverities)[keyof typeof CheckSeverities];
export interface CodeWarning {
    readonly from: number;
    readonly to: number;
    readonly severity: CheckSeverity;
    readonly message: string;
}
/** `1 значення`, `5 значень`. */
export declare const valuesWord: (count: number) => string;
/** Mistakes of the code that compiles; nothing for code with a syntax error (the syntax check marks it). */
export declare const checkCode: (code: string) => ReadonlyArray<CodeWarning>;
