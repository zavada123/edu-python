import { type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
/** The completion source of the editor. */
export declare const pythonHints: (context: CompletionContext) => CompletionResult | null;
