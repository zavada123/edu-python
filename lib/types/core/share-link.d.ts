import { Option } from "effect";
/** Longest code that fits in a link that messengers and browsers keep whole. */
export declare const MAX_SHARED_CODE_LENGTH = 6000;
/** Fragment for the code; `None` when the code is too long for a link. */
export declare const shareFragmentOf: (code: string) => Option.Option<string>;
/** Code from the fragment of the address (`#code=…`, with or without `#`). */
export declare const sharedCodeOf: (hash: string) => Option.Option<string>;
