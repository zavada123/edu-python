import type { SyntaxNode, Tree } from "@lezer/common";
export declare const ScopeKinds: {
    readonly Module: "module";
    readonly Function: "function";
    readonly Class: "class";
    readonly Lambda: "lambda";
    readonly Comprehension: "comprehension";
};
export type ScopeKind = (typeof ScopeKinds)[keyof typeof ScopeKinds];
export declare const BindingKinds: {
    readonly Function: "function";
    readonly Class: "class";
    readonly Param: "param";
    readonly Import: "import";
    readonly Variable: "variable";
    readonly Loop: "loop";
};
export type BindingKind = (typeof BindingKinds)[keyof typeof BindingKinds];
export declare const ParamKinds: {
    readonly Positional: "positional";
    readonly Star: "star";
    readonly KeywordOnly: "keyword-only";
    readonly DoubleStar: "double-star";
};
export type ParamKind = (typeof ParamKinds)[keyof typeof ParamKinds];
export interface Param {
    readonly name: string;
    readonly kind: ParamKind;
    readonly hasDefault: boolean;
}
export interface FunctionInfo {
    readonly name: string;
    /** The parameters as written: `a, b=1`. */
    readonly paramsText: string;
    readonly params: ReadonlyArray<Param>;
    /** `return value` somewhere in the body (not in nested functions). */
    readonly returnsValue: boolean;
    readonly decorated: boolean;
    /** The function is defined right in a class: a method, called with `self`. */
    readonly method: boolean;
    readonly node: SyntaxNode;
}
export interface Binding {
    readonly name: string;
    readonly kind: BindingKind;
    /** Where the name is written. */
    readonly from: number;
    readonly to: number;
    /** From this position the name has its value: the end of the assignment, the start of the loop body. */
    readonly at: number;
    readonly scope: Scope;
    /** The value of `name = value` (only with one target). */
    readonly value?: SyntaxNode;
    readonly fn?: FunctionInfo;
    /** For `import`: the module path (`tkinter.messagebox`) and the imported name (`showinfo`, or none for a module). */
    readonly module?: string;
    readonly imported?: string;
}
export interface Use {
    readonly name: string;
    readonly from: number;
    readonly to: number;
    readonly scope: Scope;
    readonly node: SyntaxNode;
}
export interface Scope {
    readonly kind: ScopeKind;
    readonly parent: Scope | null;
    readonly from: number;
    readonly to: number;
    readonly bindings: Map<string, Array<Binding>>;
    readonly globals: Set<string>;
    readonly nonlocals: Set<string>;
    /** Modules of `from m import *` in this scope. */
    readonly starImports: Array<string>;
    readonly children: Array<Scope>;
    readonly fn?: FunctionInfo;
}
export interface CodeModel {
    readonly code: string;
    readonly tree: Tree;
    readonly module: Scope;
    readonly uses: ReadonlyArray<Use>;
    readonly functions: ReadonlyArray<FunctionInfo>;
    /** The tree has parse errors: the checks wait until the code compiles. */
    readonly broken: boolean;
    /** `match` and other code that the model does not follow: the check of names is off. */
    readonly unsupported: boolean;
}
export declare const analyze: (code: string) => CodeModel;
export interface Resolved {
    readonly scope: Scope;
    readonly bindings: ReadonlyArray<Binding>;
}
/** Where `name`, read in `scope`, has its value: a scope with bindings, or none (builtins, `import *`, unknown). */
export declare const resolve: (name: string, scope: Scope, moduleScope: Scope) => Resolved | null;
/** The innermost scope at a position: for hints at the cursor. */
export declare const scopeAt: (model: CodeModel, pos: number) => Scope;
/** All names seen from a scope: its own and those of outer scopes (not the classes around). */
export declare const visibleBindings: (scope: Scope) => ReadonlyArray<Binding>;
/** Star imports seen from a scope. */
export declare const visibleStarImports: (scope: Scope) => ReadonlyArray<string>;
/** The nearest function around a scope (a `def`), if any. */
export declare const enclosingFunction: (scope: Scope) => FunctionInfo | undefined;
/** Ancestors of a node up to (not including) a node of the given names. */
export declare const hasAncestor: (node: SyntaxNode, names: ReadonlySet<string>, stopAt: number) => boolean;
