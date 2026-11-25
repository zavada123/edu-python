/**
 * More checks of `code-check.ts`, close to those of Pyright, in words for a student: a method or a module
 * with a typo, text + number, a variable that gets a value only in an `if`, a `def` written twice,
 * a method without `self`, and the result of a function that returns nothing.
 */
import type { SyntaxNode } from "@lezer/common";
import { type Scope, type Use } from "./code-scope.ts";
import { type Context } from "./check-kit.ts";
/** `root.titel(...)`, `turtle.forwad(100)`, `math.sqr(4)`: a member that the module or the object does not have. */
export declare const checkMember: (ctx: Context, node: SyntaxNode, scope: Scope) => void;
/** `import turtl`, `from tkinter import Buton`: a module or a name that the engine does not have. */
export declare const checkImport: (ctx: Context, node: SyntaxNode) => void;
/** `"Тобі " + vik` where `vik` is a number: TypeError. */
export declare const checkTextPlusNumber: (ctx: Context, node: SyntaxNode, scope: Scope) => void;
/** A variable that gets a value only in an `if` (without `else`) and is read after it. */
export declare const checkMaybeUnbound: (ctx: Context, use: Use, reported: Set<string>) => void;
/** `def f` twice in one scope, and a method without `self`. */
export declare const checkDefinitions: (ctx: Context, scope: Scope) => void;
/** `s = suma(2, 3)` where `suma` has no `return`; `a = a.sort()`; `x = print(...)`: the value is None. */
export declare const checkNoneResult: (ctx: Context, call: SyntaxNode, scope: Scope) => void;
