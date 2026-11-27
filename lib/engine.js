import { a as LibraryFiles, c as silentSink, i as pythonPrelude, n as loadNodeEngine, o as readLibrary, r as pythonLibrary, s as loadEngine, t as engineSources } from "./sources-Nzq7LdEm.js";
import { a as MaxSceneChars, c as TimeLimitMs, d as inputLines, f as safeFileName, i as MaxOutputChars, l as ValueKinds, n as KeyKinds, o as MouseKinds, r as MaxFileBytes, s as TestSeed, t as ChunkKinds, u as appendChunk } from "./protocol-CTCLMVi9.js";
// src/engine/program.ts
/**
* One run of a program with all its input known in advance: the way task tests run (on the server and in
* the task editor). The output is only the text that the program prints: the prompt of `input()` and the
* typed values are not part of it, so a test does not depend on the prompt text.
*/
/** Runs `code` with the lines of `input`. `onOverflow` is called when the output gets to the limit (the program can still work). */
var runProgram = (engine, code, input, onOverflow) => {
	const output = [];
	const limit = { reached: false };
	const result = engine.run({
		_tag: "Run",
		code,
		inputs: inputLines(input),
		seed: 1
	}, {
		...silentSink,
		chunk: (chunk) => {
			if (chunk.kind === ChunkKinds.Output) output.push(chunk.text);
		},
		overflow: () => {
			limit.reached = true;
			onOverflow();
		}
	});
	if (limit.reached) return { _tag: "OutputLimit" };
	const text = output.join("");
	switch (result._tag) {
		case "Finished": return {
			_tag: "Finished",
			output: text
		};
		case "Waiting": return {
			_tag: "Finished",
			output: text
		};
		case "Asking":
		case "NeedInput": return {
			_tag: "NeedsInput",
			output: text
		};
		case "Failed": return {
			_tag: "Crashed",
			output: text,
			traceback: result.traceback
		};
	}
};
// src/engine/quest-driver.ts
var endOf = (result) => {
	switch (result._tag) {
		case "Finished":
		case "Waiting":
		case "NeedInput":
		case "Failed": return result._tag;
		case "Asking": return "NeedInput";
	}
};
var engineDriver = (engine) => () => {
	const turn = (act) => {
		const out = {
			output: "",
			scene: "",
			overflow: false
		};
		const result = act({
			...silentSink,
			chunk: (c) => {
				if (c.kind === ChunkKinds.Output) out.output += c.text;
			},
			scene: (s) => {
				out.scene = s;
			},
			overflow: () => {
				out.overflow = true;
			}
		});
		const end = out.overflow ? "OutputLimit" : endOf(result);
		return Promise.resolve({
			end,
			output: out.output,
			scene: out.scene,
			traceback: result._tag === "Failed" ? result.traceback : ""
		});
	};
	return {
		run: (code, input) => turn((sink) => engine.run({
			_tag: "Run",
			code,
			inputs: inputLines(input),
			seed: 1
		}, sink)),
		event: (input) => turn((sink) => engine.event({
			_tag: "Event",
			input,
			layout: []
		}, sink)),
		close: () => void 0
	};
};
export { ChunkKinds, KeyKinds, LibraryFiles, MaxFileBytes, MaxOutputChars, MaxSceneChars, MouseKinds, TestSeed, TimeLimitMs, ValueKinds, appendChunk, engineDriver, engineSources, inputLines, loadEngine, loadNodeEngine, pythonLibrary, pythonPrelude, readLibrary, runProgram, safeFileName, silentSink };
