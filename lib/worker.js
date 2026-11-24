import { l as stopCodeGeneration, s as loadEngine, t as engineSources } from "./sources-Cm_xzF1v.js";
import { u as appendChunk } from "./protocol-CTCLMVi9.js";
// src/core/worker.ts
/**
* Web Worker that runs student programs (`protocol.ts`). The page stops the worker with `terminate()`:
* a loop that never ends does not stop the page. A tkinter program stays here after `mainloop()`: the
* worker calls its handlers for user actions (`Event`) and for its timers (`after`).
*
* The page makes its own worker file, so its bundler finds the `.wasm` of MicroPython:
*
*     import wasmUrl from "@micropython/micropython-webassembly-pyscript/micropython.wasm?url"
*     import { startPythonWorker } from "edu-python/worker"
*     startPythonWorker(wasmUrl)
*/
/** While the program works, the page gets new output at most this often. */
var ProgressIntervalMs = 50;
var post = (message) => {
	postMessage(message);
};
var engine = null;
/** Timers of `after()` of the current program. */
var timers = /* @__PURE__ */ new Map();
var clearTimers = () => {
	for (const timer of timers.values()) clearTimeout(timer);
	timers.clear();
	held = [];
};
/**
* A dialog of a handler waits for the student: timers that come now wait too. The page sends the action
* again with the answer, then the held timers run.
*/
var asking = false;
var held = [];
var fireTimer = (ready, id) => {
	if (asking) {
		held.push(id);
		return;
	}
	handle(ready, {
		_tag: "Event",
		input: {
			_tag: "Timer",
			timer: id
		},
		layout: []
	});
};
var releaseTimers = (ready) => {
	const waiting = held;
	held = [];
	for (const id of waiting) fireTimer(ready, id);
};
/** An error of the engine itself (not of the program) is shown as a program error. */
var runSafely = (call, sink) => {
	try {
		return call(sink);
	} catch (error) {
		return {
			_tag: "Failed",
			traceback: `SystemError: ${error instanceof Error ? error.message : String(error)}`
		};
	}
};
/** Runs the program or one of its handlers, sends its output while it works, then the result. */
var execute = (ready, start, call, event) => {
	let chunks = [];
	let ops = [];
	let scenes = [];
	let dialogs = [];
	let images = [];
	let downloads = [];
	let lastPost = performance.now();
	const send = () => {
		if (chunks.length === 0 && ops.length === 0 && scenes.length === 0 && dialogs.length === 0 && images.length === 0 && downloads.length === 0) return;
		post({
			_tag: "Progress",
			chunks,
			ops,
			scenes,
			dialogs,
			images,
			downloads
		});
		chunks = [];
		ops = [];
		scenes = [];
		dialogs = [];
		images = [];
		downloads = [];
		lastPost = performance.now();
	};
	const sendSoon = () => {
		if (performance.now() - lastPost >= ProgressIntervalMs) send();
	};
	post(start);
	const result = runSafely(call, {
		chunk: (c) => {
			appendChunk(chunks, c);
			sendSoon();
		},
		op: (o) => {
			ops.push(o);
			sendSoon();
		},
		scene: (json) => {
			scenes = [json];
			sendSoon();
		},
		dialog: (json) => {
			dialogs.push(json);
			sendSoon();
		},
		timer: (id, ms) => {
			timers.set(id, setTimeout(() => {
				timers.delete(id);
				fireTimer(ready, id);
			}, ms));
		},
		cancelTimer: (id) => {
			clearTimeout(timers.get(id));
			timers.delete(id);
		},
		image: (json) => {
			images.push(json);
			sendSoon();
		},
		download: (file) => {
			downloads.push(file);
			sendSoon();
		},
		overflow: () => {
			send();
			post({ _tag: "OutputLimit" });
		}
	});
	send();
	asking = result._tag === "Asking";
	post(result._tag === "Asking" ? {
		...result,
		event
	} : result);
	if (result._tag !== "Waiting" && result._tag !== "Asking") clearTimers();
};
var handle = (ready, request) => {
	execute(ready, { _tag: "Handling" }, (sink) => ready.event(request, sink), request);
};
/** Starts the worker: call it once at the top of the worker file of the page. */
var startPythonWorker = (wasmUrl) => {
	stopCodeGeneration();
	addEventListener("message", (event) => {
		engine ??= loadEngine(engineSources(wasmUrl));
		const request = event.data;
		engine.then((ready) => {
			switch (request._tag) {
				case "Run":
					clearTimers();
					asking = false;
					return execute(ready, { _tag: "Started" }, (sink) => ready.run(request, sink), null);
				case "Event":
					asking = false;
					handle(ready, request);
					return releaseTimers(ready);
			}
		}, (error) => {
			engine = null;
			post({
				_tag: "LoadFailed",
				message: error instanceof Error ? error.message : String(error)
			});
		});
	});
};
export { startPythonWorker };
