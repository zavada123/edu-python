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
* Type of a value that `print` shows (`prelude.py`): the console colors it as the editor does, so
* `print("10", 10)` shows a string and a number in different colors. Text without a type (separators,
* `sys.stdout.write`, lists and other objects) has no `value`.
*/
var ValueKinds = {
	Number: "number",
	String: "string",
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
/** Largest file that the student can give to a program, and that a program can give to the student. */
var MaxFileBytes = 2097152;
/**
* A file name for the folder of the program: no folders, no control characters, no hidden files. `null`
* when nothing is left. The same name goes to the `download` of a link on the page.
*/
var safeFileName = (name) => {
	const clean = (name.split(/[\\/]/).at(-1) ?? "").replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "").trim().slice(0, 120);
	if (clean === "" || clean === "." || clean === ".." || clean.startsWith(".")) return null;
	return clean;
};
/** The seed of `random` in task tests: the same output on every check. */
var TestSeed = 1;
export { MaxSceneChars as a, TimeLimitMs as c, inputLines as d, safeFileName as f, MaxOutputChars as i, ValueKinds as l, KeyKinds as n, MouseKinds as o, MaxFileBytes as r, TestSeed as s, ChunkKinds as t, appendChunk as u };
