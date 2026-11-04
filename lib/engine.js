import { a as LibraryFiles, c as silentSink, i as pythonPrelude, n as loadNodeEngine, o as readLibrary, r as pythonLibrary, s as loadEngine, t as engineSources } from "./sources-0mh7heBg.js";
import { a as MouseKinds, c as ValueKinds, i as MaxSceneChars, l as appendChunk, n as KeyKinds, o as TestSeed, r as MaxOutputChars, s as TimeLimitMs, t as ChunkKinds, u as inputLines } from "./protocol-DAGhTCk5.js";
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
export { ChunkKinds, KeyKinds, LibraryFiles, MaxOutputChars, MaxSceneChars, MouseKinds, TestSeed, TimeLimitMs, ValueKinds, appendChunk, engineSources, inputLines, loadEngine, loadNodeEngine, pythonLibrary, pythonPrelude, readLibrary, runProgram, silentSink };
