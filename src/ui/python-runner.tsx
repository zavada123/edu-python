import { Option } from "effect"
import { Maximize2, Minimize2, Play, RotateCcw, Square } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { WorkerFactory } from "../core/session.ts"
import { CodeEditor, EditorHeights, type EditorHandle } from "./code-editor.tsx"
import { Button, ButtonSizes, ButtonVariants, cn } from "./kit.tsx"
import { canStop, Console, ConsoleLayouts, errorLineOf, Problem, statusLine, SymbolBar, usePythonRun } from "./run-output.tsx"
import { TkWindows } from "./tk-window.tsx"
import { TurtleCanvas } from "./turtle-canvas.tsx"

// Compact Python runner for a lesson or a task: the editor with "Run" and "Stop", the console with `input()`, the
// error with an explanation, the turtle canvas and the windows of a tkinter program. The editor grows with the code.
// «На весь екран» puts the runner over the whole browser window; Esc puts it back.
// The page keeps the drafts: it gets each change in `onCodeChange` and can replace the code with `onEditorReady`.

export interface PythonRunnerProps {
  readonly worker: WorkerFactory
  /** Code in the editor at the start (a draft or the starter code). */
  readonly initialCode: string
  /** Code that "Скинути код" puts back. */
  readonly resetCode: string
  /** Current code: on the first render and after each change. */
  readonly onCodeChange: (code: string) => void
  /** The page gets the editor, for example to put a draft from the server into it. */
  readonly onEditorReady: (editor: EditorHandle) => void
  /** Short text at the end of the toolbar (where the draft is kept); empty for none. */
  readonly note: string
}

export function PythonRunner(props: PythonRunnerProps) {
  const editor = useRef<EditorHandle | null>(null)
  const [code, setCode] = useState(props.initialCode)
  const [full, setFull] = useState(false)
  const run = usePythonRun(props.worker)
  const onCodeChange = useRef(props.onCodeChange)

  useEffect(() => {
    onCodeChange.current = props.onCodeChange
  }, [props.onCodeChange])

  useEffect(() => {
    onCodeChange.current(code)
  }, [code])

  useEffect(() => {
    if (!full) return
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFull(false)
    }
    window.addEventListener("keydown", close)
    return () => window.removeEventListener("keydown", close)
  }, [full])

  const start = () => run.start(code)
  const turtle = run.view.ops.length > 0 || /\bturtle\b/.test(code)

  return (
    <div className={cn("epy epy-runner", full && "epy-runner--full")} data-python-runner>
      <div className="epy-toolbar">
        <Button variant={ButtonVariants.Primary} size={ButtonSizes.Md} disabled={false} onClick={start}>
          <Play aria-hidden /> Запустити
        </Button>
        <Button variant={ButtonVariants.Outline} size={ButtonSizes.Sm} disabled={!canStop(run.view.status)} onClick={run.stop}>
          <Square aria-hidden /> Зупинити
        </Button>
        <Button variant={ButtonVariants.Ghost} size={ButtonSizes.Sm} disabled={code === props.resetCode} onClick={() => editor.current?.setCode(props.resetCode)}>
          <RotateCcw aria-hidden /> Скинути код
        </Button>
        {props.note !== "" && <span className="epy-toolbar__note" aria-live="polite">{props.note}</span>}
        <Button variant={ButtonVariants.Ghost} size={ButtonSizes.Sm} disabled={false} onClick={() => setFull((f) => !f)}>
          {full ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />} {full ? "Звичайний вигляд" : "На весь екран"}
        </Button>
      </div>
      <CodeEditor
        initialCode={props.initialCode}
        label="Код програми на Python"
        height={EditorHeights.Grow}
        errorLine={errorLineOf(run.view.status)}
        onChange={setCode}
        onRun={start}
        onReady={(handle) => {
          editor.current = handle
          props.onEditorReady(handle)
        }}
      />
      <SymbolBar editor={editor} />
      <p className="epy-status" aria-live="polite">{statusLine(run.view.status)}</p>
      <Problem status={run.view.status} />
      <TkWindows
        key={run.runId}
        scene={run.view.scene}
        dialogs={run.view.dialogs}
        active={run.view.status._tag === "Window"}
        onInput={(input, layout) => run.session.current?.send(input, layout)}
        onCloseDialog={() => run.session.current?.closeDialog()}
        images={run.view.images}
        ask={run.view.status._tag === "Asking" ? Option.some(run.view.status.ask) : Option.none()}
        onAnswer={(value, files) => run.session.current?.answer(value, files)}
        downloads={run.view.downloads}
        onDismissDownload={(name) => run.session.current?.dismissDownload(name)}
      />
      <Console view={run.view} layout={ConsoleLayouts.Card} onInput={run.provideInput} />
      {turtle && <TurtleCanvas ops={run.view.ops} runId={run.runId} />}
    </div>
  )
}
