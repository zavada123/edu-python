import { a as MaxSceneChars, c as TimeLimitMs, d as inputLines, f as safeFileName, i as MaxOutputChars, l as ValueKinds, n as KeyKinds, o as MouseKinds, r as MaxFileBytes, s as TestSeed, t as ChunkKinds, u as appendChunk } from "./protocol-CTCLMVi9.js";
import { L as explainError, b as checkCode, i as idleView, m as decodeScene, n as browserWorker, p as decodeDialog, r as createRunSession, t as StopReasons, v as plainPunctuation, y as CheckSeverities } from "./session-CHLQ5N_z.js";
import { Option } from "effect";
// src/core/share-link.ts
/** Longest code that fits in a link that messengers and browsers keep whole. */
var MAX_SHARED_CODE_LENGTH = 6e3;
var toBase64Url = (bytes) => {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
var fromBase64Url = (text) => {
	try {
		const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
		return Option.some(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
	} catch {
		return Option.none();
	}
};
/** Fragment for the code; `None` when the code is too long for a link. */
var shareFragmentOf = (code) => code.length > 6e3 ? Option.none() : Option.some(`code=${toBase64Url(new TextEncoder().encode(code))}`);
/** Code from the fragment of the address (`#code=…`, with or without `#`). */
var sharedCodeOf = (hash) => {
	const match = /(?:^#?|&)code=([A-Za-z0-9_-]+)(?:&|$)/.exec(hash);
	if (match === null) return Option.none();
	return Option.flatMap(fromBase64Url(match[1] ?? ""), (bytes) => {
		try {
			return Option.some(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
		} catch {
			return Option.none();
		}
	});
};
export { CheckSeverities, ChunkKinds, KeyKinds, MAX_SHARED_CODE_LENGTH, MaxFileBytes, MaxOutputChars, MaxSceneChars, MouseKinds, StopReasons, TestSeed, TimeLimitMs, ValueKinds, appendChunk, browserWorker, checkCode, createRunSession, decodeDialog, decodeScene, explainError, idleView, inputLines, plainPunctuation, safeFileName, shareFragmentOf, sharedCodeOf };
