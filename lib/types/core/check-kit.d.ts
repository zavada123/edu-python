/**
 * Parts shared by the checks of the code (`code-check.ts`, `code-check-more.ts`): the context of a check, the
 * values of a call, the own function of a name, words for the messages.
 */
import type { SyntaxNode } from "@lezer/common";
import { type CodeModel, type FunctionInfo, type Scope } from "./code-scope.ts";
import type { Typer } from "./python-names.ts";
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
/** At most this many marks: the student fixes the first ones and sees the next. */
export declare const MaxWarnings = 12;
/** `1 значення`, `5 значень`. */
export declare const valuesWord: (count: number) => string;
/** Edits between two words; two neighbour letters swapped (`titel`, `title`) count as one. */
export declare const levenshtein: (a: string, b: string) => number;
/** A known name that differs only in letter case or in 1–2 letters. */
export declare const similarName: (name: string, candidates: ReadonlyArray<string>) => string | undefined;
export interface Context {
    readonly model: CodeModel;
    readonly types: Typer;
    readonly text: (node: SyntaxNode) => string;
    readonly line: (pos: number) => number;
    readonly add: (from: number, to: number, severity: CheckSeverity, message: string) => void;
    readonly warningsCount: () => number;
}
export interface CallArgs {
    readonly positional: number;
    readonly keywords: ReadonlyArray<{
        readonly name: string;
        readonly node: SyntaxNode;
    }>;
    /** `*args` or `**kwargs` in the call: the count is not known. */
    readonly spread: boolean;
    readonly values: ReadonlyArray<SyntaxNode>;
    readonly keywordValues: ReadonlyMap<string, SyntaxNode>;
}
export declare const readArgs: (ctx: Context, list: SyntaxNode) => CallArgs;
/** The one `def` of a name: not changed by other assignments, not decorated. */
export declare const ownFunction: (ctx: Context, node: SyntaxNode, scope: Scope) => FunctionInfo | undefined;
/** The scope of a node: the innermost scope that contains it. */
export declare const scopeOf: (model: CodeModel, pos: number) => Scope;
/** The variable has text from `input()` in every assignment. */
export declare const fromInput: (ctx: Context, node: SyntaxNode, scope: Scope) => boolean;
export declare const inputMessage: (name: string) => string;
