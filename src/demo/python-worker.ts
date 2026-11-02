// The worker file of the demo page: the bundler finds the `.wasm` of MicroPython from this import.
import wasmUrl from "@micropython/micropython-webassembly-pyscript/micropython.wasm?url"
import { startPythonWorker } from "../worker.ts"

startPythonWorker(wasmUrl)
