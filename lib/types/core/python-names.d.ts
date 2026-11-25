/**
 * What the editor knows about the names of Python: builtins with descriptions in Ukrainian, keywords, methods
 * of strings and lists, and the modules of the engine (`python-api.ts`). Also simple types of expressions
 * (`typeOf`): a string from `input()`, a window from `Tk()`, a module from `import`.
 */
import type { SyntaxNode } from "@lezer/common";
import { type ApiItem } from "./python-api.ts";
import { type CodeModel, type Scope } from "./code-scope.ts";
export interface BuiltinDoc {
    /** Parameters as in the hint: `prompt`. */
    readonly params: string;
    readonly info: string;
    /** How many values a call takes; `max` is `Infinity` for `print`. */
    readonly min: number;
    readonly max: number;
}
/** `a, b=(1, 2), *c` → its parameters: commas inside brackets and strings do not split. */
export declare const splitParams: (params: string) => ReadonlyArray<string>;
/** The builtins that students use, with a short description. */
export declare const builtinDocs: Readonly<Record<string, BuiltinDoc>>;
export declare const isBuiltin: (name: string) => boolean;
export declare const builtinNames: ReadonlyArray<string>;
/** Keywords; `snippet` adds the usual form of the statement. */
export declare const keywordSnippets: ReadonlyArray<{
    readonly label: string;
    readonly snippet: string;
    readonly info: string;
}>;
export declare const plainKeywords: ReadonlyArray<string>;
export interface MethodDoc {
    readonly name: string;
    readonly params: string;
    readonly info: string;
}
/** Methods of a string: they give a new string, the old one stays. */
export declare const strMethods: ReadonlyArray<MethodDoc>;
/** Methods of a list: they change the list itself. */
export declare const listMethods: ReadonlyArray<MethodDoc>;
export declare const dictMethods: ReadonlyArray<MethodDoc>;
export declare const TypeKinds: {
    readonly Str: "str";
    readonly Int: "int";
    readonly Float: "float";
    readonly Bool: "bool";
    readonly List: "list";
    readonly Dict: "dict";
    readonly Module: "module";
    readonly Instance: "instance";
    readonly ApiClass: "api-class";
    readonly ApiFunction: "api-function";
    readonly OwnFunction: "own-function";
    readonly Unknown: "unknown";
};
export type ValueType = {
    readonly kind: "str" | "int" | "float" | "bool" | "list" | "dict" | "unknown";
} | {
    readonly kind: "module";
    readonly path: string;
}
/** An object of a class of the engine (`tkinter._windows.Tk`). */
 | {
    readonly kind: "instance";
    readonly cls: string;
} | {
    readonly kind: "api-class";
    readonly cls: string;
    readonly name: string;
    readonly params?: string;
} | {
    readonly kind: "api-function";
    readonly path: string;
    readonly name: string;
    readonly params?: string;
} | {
    readonly kind: "own-function";
    readonly name: string;
};
/** Members of a class of the engine with those of its bases, without the names that start with `_`. */
export declare const classMembers: (key: string) => ReadonlyMap<string, ApiItem>;
export declare const moduleMembers: (path: string) => ReadonlyMap<string, ApiItem>;
export declare const isKnownModule: (path: string) => boolean;
/** The type of a member: `tkinter.Tk`, `root.title`, `turtle.forward`. */
export declare const memberType: (owner: ValueType, name: string) => ValueType;
export interface Typer {
    readonly typeOf: (node: SyntaxNode, scope: Scope) => ValueType;
    /** The type of a name as read in a scope. */
    readonly typeOfName: (name: string, scope: Scope) => ValueType;
}
/** Types in one model of the code. */
export declare const typer: (model: CodeModel) => Typer;
