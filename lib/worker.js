import { s as loadEngine, t as engineSources } from "./sources-By1KS8wg.js";
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
var execute = (ready, start, call) => {
	let chunks = [];
	let ops = [];
	let scenes = [];
	let dialogs = [];
	let lastPost = performance.now();
	const send = () => {
		if (chunks.length === 0 && ops.length === 0 && scenes.length === 0 && dialogs.length === 0) return;
		post({
			_tag: "Progress",
			chunks,
			ops,
			scenes,
			dialogs
		});
		chunks = [];
		ops = [];
		scenes = [];
		dialogs = [];
		lastPost = performance.now();
	};
	const sendSoon = () => {
		if (performance.now() - lastPost >= ProgressIntervalMs) send();
	};
	post(start);
	const result = runSafely(call, {
		chunk: (c) => {
			chunks.push(c);
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
				handle(ready, {
					_tag: "Event",
					input: {
						_tag: "Timer",
						timer: id
					},
					layout: []
				});
			}, ms));
		},
		cancelTimer: (id) => {
			clearTimeout(timers.get(id));
			timers.delete(id);
		},
		overflow: () => {
			send();
			post({ _tag: "OutputLimit" });
		}
	});
	send();
	post(result);
	if (result._tag !== "Waiting") clearTimers();
};
var handle = (ready, request) => {
	execute(ready, { _tag: "Handling" }, (sink) => ready.event(request, sink));
};
/** Starts the worker: call it once at the top of the worker file of the page. */
var startPythonWorker = (wasmUrl) => {
	addEventListener("message", (event) => {
		engine ??= loadEngine(engineSources(wasmUrl));
		const request = event.data;
		engine.then((ready) => {
			switch (request._tag) {
				case "Run":
					clearTimers();
					return execute(ready, { _tag: "Started" }, (sink) => ready.run(request, sink));
				case "Event": return handle(ready, request);
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
