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
export { MouseKinds as a, MaxSceneChars as i, KeyKinds as n, TimeLimitMs as o, MaxOutputChars as r, ChunkKinds as t };
