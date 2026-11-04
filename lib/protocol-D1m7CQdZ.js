// src/engine/protocol.ts
/**
* Console text: program output, the prompt of `input()`, or a value that the student typed for `input()`
* (shown in a different style). Task tests compare only `Output`: the prompt text is free.
*/
var ChunkKinds = {
	Output: "output",
	Prompt: "prompt",
	Input: "input"
};
/**
* Type of a value that `print` shows (`prelude.py`): the console colors it, so `print("10", 10)` shows a
* string and a number in different colors. Text without a type (strings, separators, `sys.stdout.write`)
* has no `value`.
*/
var ValueKinds = {
	Number: "number",
	Constant: "constant"
};
/**
* Adds `chunk` to the end of `chunks`. Program output of the same type joins the last chunk: a loop of
* `print(i)` does not make a new chunk for every newline. Prompts and typed values stay apart.
*/
var appendChunk = (chunks, chunk) => {
	const last = chunks.at(-1);
	if (last !== void 0 && chunk.kind === ChunkKinds.Output && last.kind === ChunkKinds.Output && last.value === chunk.value) {
		chunks[chunks.length - 1] = {
			...last,
			text: last.text + chunk.text
		};
		return;
	}
	chunks.push(chunk);
};
var MouseKinds = {
	Press: "Press",
	Release: "Release",
	Motion: "Motion",
	Enter: "Enter",
	Leave: "Leave",
	Wheel: "Wheel"
};
var KeyKinds = {
	Press: "Press",
	Release: "Release"
};
/** Console limit: a loop that prints forever must not use all memory of the phone. */
var MaxOutputChars = 2e5;
/** Limit of one window state (JSON): a canvas with too many figures stops the program as too much output. */
var MaxSceneChars = 4e6;
/** A program that works longer than this is stopped (a loop that never ends). Waiting for input does not count. */
var TimeLimitMs = 5e3;
/** Values for `input()`: one per line of the test input. A newline at the end does not add an empty value. */
var inputLines = (input) => {
	const lines = input.replace(/\r\n?/g, "\n").split("\n");
	if (lines.at(-1) === "") lines.pop();
	return lines;
};
/** The seed of `random` in task tests: the same output on every check. */
var TestSeed = 1;
export { MouseKinds as a, ValueKinds as c, MaxSceneChars as i, appendChunk as l, KeyKinds as n, TestSeed as o, MaxOutputChars as r, TimeLimitMs as s, ChunkKinds as t, inputLines as u };
