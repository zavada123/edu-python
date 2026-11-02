<h1 align="center">edu-python</h1>

<p align="center">
  <b>A Python online IDE for school: MicroPython in the browser, <code>input()</code>, turtle and tkinter windows, error explanations in Ukrainian.</b><br>
  Made for computer science lessons in grades 5–9 on <a href="https://eduprostir.com">EduProstir</a>.
</p>

<p align="center">
  <a href="https://zavada123.github.io/edu-python/"><b>Live demo</b></a> ·
  <a href="#installation">Installation</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#api">API</a>
</p>

## Why

Students write their first programs on phones and old school computers. A server sandbox for each run is slow and
expensive, and Pyodide is too heavy (about 6 MB). `edu-python` runs MicroPython (WebAssembly, about 200 KB gzip) in a
Web Worker: the first run takes less than 0.3 s on a slow phone, and the page works without network after the
first load. The same engine runs in Node, so a server can check a program with the same `turtle` and `tkinter`.

## Features

- **Online IDE** (`PythonIde`), in the style of onlineide.pro: toolbar, file tab, editor and terminal side by side
  (stacked on phones), open and download `.py` files, full screen.
- **Compact runner** (`PythonRunner`) for a lesson or a task: the editor grows with the code.
- **`input()`** in the terminal, as in IDLE.
- **turtle** with the names and geometry of CPython `turtle`, animated on a canvas.
- **tkinter**: windows, buttons, labels, entries, canvas, `after()`, `messagebox`, drawn as Windows windows.
- **Errors in Ukrainian**: "Рядок 3: після `if` потрібна двокрапка `:`", with the original message under a fold.
- **Limits**: 5 s of work (waiting for `input()` does not count), 200 000 characters of output, a Stop button.
- **Phones**: a symbol bar (`( ) : " ' = Tab`) on touch screens; smart quotes become plain quotes.
- **Share link**: the code in the fragment of the address (`#code=…`), which does not go to the server.

## Installation

Install straight from GitHub and pin a commit. The built package is committed in `lib/`, so nothing is compiled on
install.

```bash
npm install github:zavada123/edu-python#<commit>
```

Peer dependencies: `react` and `react-dom` 19, `effect` 4.0.0-rc.117.

## Usage

The page makes its own worker file, so its bundler finds the `.wasm` of MicroPython:

```ts
// python-worker.ts
import wasmUrl from "@micropython/micropython-webassembly-pyscript/micropython.wasm?url"
import { startPythonWorker } from "edu-python/worker"

startPythonWorker(wasmUrl)
```

```tsx
import { browserWorker } from "edu-python/core"
import { PythonIde } from "edu-python/react"
import "edu-python/style.css"

const worker = browserWorker(() => new Worker(new URL("./python-worker.ts", import.meta.url), { type: "module" }))

<PythonIde
  worker={worker}
  fileName="main.py"
  initialCode={'print("Привіт!")'}
  onCodeChange={(code) => localStorage.setItem("main.py", code)}
  saveNote="Код зберігається в цьому браузері"
  actions={null}
  sidebar={null}
/>
```

With Vite, keep MicroPython out of dependency pre-bundling: `optimizeDeps: { exclude: ["@micropython/micropython-webassembly-pyscript"] }`.

### Theme

All colors are CSS variables on `.epy`: `--epy-primary`, `--epy-text`, `--epy-muted`, `--epy-card`, `--epy-border`,
`--epy-code-keyword`… Set them on the page to use its own theme.

### Node (server checks)

```ts
import { loadNodeEngine, runProgram } from "edu-python/engine"

const engine = await loadNodeEngine()
const result = runProgram(engine, "print(int(input()) * 2)", "21\n")
```

## API

| Entry | What |
| --- | --- |
| `edu-python/engine` | `loadEngine`, `loadNodeEngine`, `runProgram`, the protocol, the Python texts of `turtle` and `tkinter` |
| `edu-python/core` | `browserWorker`, `createRunSession`, `explainError`, `shareFragmentOf` / `sharedCodeOf`, scenes |
| `edu-python/worker` | `startPythonWorker(wasmUrl)` for the worker file of the page |
| `edu-python/react` | `PythonIde`, `PythonRunner`, `CodeEditor`, `Console`, `TkWindows`, `TurtleCanvas` |
| `edu-python/style.css` | Styles of the components |

## Development

```bash
npm install
npm run dev        # demo
npm test           # engine, tkinter, errors, session
npm run build:lib  # lib/ for the pages that use the package
```

## License

MIT
