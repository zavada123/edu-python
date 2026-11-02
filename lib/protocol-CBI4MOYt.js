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
export { MouseKinds as a, inputLines as c, MaxSceneChars as i, KeyKinds as n, TestSeed as o, MaxOutputChars as r, TimeLimitMs as s, ChunkKinds as t };
