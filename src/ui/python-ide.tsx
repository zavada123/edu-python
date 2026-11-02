import { Download, FileCode2, FolderOpen, Maximize2, Minimize2, Play, Square, Trash2 } from "lucide-react"
import { type ChangeEvent, type ReactNode, useEffect, useRef, useState } from "react"
import type { WorkerFactory } from "../core/session.ts"
import { Button, ButtonSizes, ButtonVariants, cn } from "./kit.tsx"
import { CodeEditor, EditorHeights, type EditorHandle } from "./code-editor.tsx"
import { canStop, Console, ConsoleLayouts, errorLineOf, Problem, statusLine, SymbolBar, usePythonRun } from "./run-output.tsx"
import { TkWindows } from "./tk-window.tsx"
import { TurtleCanvas } from "./turtle-canvas.tsx"

// Online IDE for Python, in the style of onlineide.pro: a toolbar, the file tab, the editor on the left and the
// terminal on the right (under the editor on phones). MicroPython runs in a Web Worker with `input()`, turtle and
// tkinter windows. The page owns the files: where they are kept (browser or account), the list of programs and
// the share link (`core/share-link.ts`).

/** Largest file that "Відкрити файл" reads: a program, not a data set. */
const MAX_OPEN_FILE_BYTES = 200_000

const pythonFileName = (name: string): string => (/\.py$/i.test(name) ? name : `${name.replace(/\s+/g, "_")}.py`)

/** Saves the code as a `.py` file on the device of the student. */
const downloadCode = (fileName: string, code: string): void => {
  const url = URL.createObjectURL(new Blob([code], { type: "text/x-python;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = pythonFileName(fileName)
  link.click()
  URL.revokeObjectURL(url)
}

export interface PythonIdeProps {
  readonly worker: WorkerFactory
  /** Name on the file tab and of the downloaded file. */
  readonly fileName: string
  /** Code at the start. The page gives a new `key` to open another program. */
  readonly initialCode: string
  readonly onCodeChange: (code: string) => void
  /** Text about where the code is kept ("Збережено в кабінеті"). */
  readonly saveNote: string
  /** Buttons of the page at the end of the toolbar (share, new program). */
  readonly actions: ReactNode
  /** Panel to the left of the editor (the programs of a student); `null` for a guest. */
  readonly sidebar: ReactNode
}

export function PythonIde(props: PythonIdeProps) {
  const editor = useRef<EditorHandle | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [code, setCode] = useState(props.initialCode)
  const [full, setFull] = useState(false)
  const [notice, setNotice] = useState("")
  const run = usePythonRun(props.worker)
  const onCodeChange = useRef(props.onCodeChange)

  useEffect(() => {
    onCodeChange.current = props.onCodeChange
  }, [props.onCodeChange])

  useEffect(() => {
    if (!full) return
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFull(false)
    }
    window.addEventListener("keydown", close)
    return () => window.removeEventListener("keydown", close)
  }, [full])

  const change = (next: string) => {
    setCode(next)
    onCodeChange.current(next)
  }

  const start = () => run.start(code)

  const openFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (file === undefined) return
    if (file.size > MAX_OPEN_FILE_BYTES) return setNotice("Файл завеликий: відкрий файл програми .py")
    file.text().then(
      (text) => {
        editor.current?.setCode(text)
        setNotice(`Відкрито файл ${file.name}`)
      },
      () => setNotice("Не вдалося прочитати файл")
    )
  }

  const turtle = run.view.ops.length > 0 || /\bturtle\b/.test(code)
  const status = statusLine(run.view.status)

  return (
    <section
      aria-label="Онлайн-редактор Python"
      data-python-ide
      className={cn("epy epy-ide", full && "epy-ide--full")}
    >
      <div className="epy-toolbar epy-ide__toolbar" title="Ctrl + Enter у редакторі теж запускає програму">
        <Button variant={ButtonVariants.Primary} size={ButtonSizes.Md} disabled={false} onClick={start}>
          <Play aria-hidden /> Запустити
        </Button>
        <Button variant={ButtonVariants.Outline} size={ButtonSizes.Sm} disabled={!canStop(run.view.status)} onClick={run.stop}>
          <Square aria-hidden /> Зупинити
        </Button>
        <div className="epy-toolbar__end">
          {props.actions}
          <Button variant={ButtonVariants.Ghost} size={ButtonSizes.Sm} disabled={false} onClick={() => fileInput.current?.click()}>
            <FolderOpen aria-hidden /> Відкрити файл
          </Button>
          <Button variant={ButtonVariants.Ghost} size={ButtonSizes.Sm} disabled={false} onClick={() => downloadCode(props.fileName, code)}>
            <Download aria-hidden /> Завантажити
          </Button>
          <Button variant={ButtonVariants.Ghost} size={ButtonSizes.Sm} disabled={false} onClick={() => setFull((f) => !f)}>
            {full ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />} {full ? "Звичайний вигляд" : "На весь екран"}
          </Button>
          <input ref={fileInput} type="file" accept=".py,.txt,text/plain,text/x-python" hidden aria-label="Файл програми" onChange={openFile} />
        </div>
      </div>
      <div className="epy-ide__body">
        {props.sidebar}
        <div className="epy-ide__pane epy-ide__pane--editor">
          <div className="epy-ide__tab">
            <FileCode2 aria-hidden className="epy-ide__file-icon" />
            <span className="epy-ide__file">{pythonFileName(props.fileName)}</span>
            <span className="epy-ide__note" aria-live="polite">{notice !== "" ? notice : props.saveNote}</span>
          </div>
          <div className="epy-ide__editor">
            <CodeEditor
              initialCode={props.initialCode}
              label={`Код програми ${pythonFileName(props.fileName)}`}
              height={EditorHeights.Fill}
              errorLine={errorLineOf(run.view.status)}
              onChange={change}
              onRun={start}
              onReady={(handle) => {
                editor.current = handle
              }}
            />
          </div>
          <div className="epy-ide__symbols">
            <SymbolBar editor={editor} />
          </div>
        </div>
        <div className="epy-ide__pane">
          <div className="epy-ide__tab">
            <span className="epy-ide__file">Термінал</span>
            <span className="epy-ide__note" aria-live="polite">{status}</span>
            <Button variant={ButtonVariants.Ghost} size={ButtonSizes.Sm} disabled={run.view.status._tag === "Idle"} onClick={run.clear}>
              <Trash2 aria-hidden /> Очистити
            </Button>
          </div>
          <div className="epy-ide__output">
            <Problem status={run.view.status} />
            <TkWindows
              key={run.runId}
              scene={run.view.scene}
              dialogs={run.view.dialogs}
              active={run.view.status._tag === "Window"}
              onInput={(input, layout) => run.session.current?.send(input, layout)}
              onCloseDialog={() => run.session.current?.closeDialog()}
            />
            <Console view={run.view} layout={ConsoleLayouts.Panel} onInput={run.provideInput} />
            {turtle && <TurtleCanvas ops={run.view.ops} runId={run.runId} />}
          </div>
        </div>
      </div>
    </section>
  )
}

