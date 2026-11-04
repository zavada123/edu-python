import { Match, Option } from "effect"
import { type ReactNode, type RefObject, type SyntheticEvent, useEffect, useRef, useState } from "react"
import { Alert, AlertTones, cn } from "./kit.tsx"
import { ChunkKinds } from "../engine/protocol.ts"
import { createRunSession, idleView, type RunSession, type RunStatus, type RunView, type StopReason, StopReasons, type WorkerFactory } from "../core/session.ts"
import { CodeText } from "./code-text.tsx"
import type { EditorHandle } from "./code-editor.tsx"

// Parts of a Python run that the runner (`python-runner.tsx`) and the Online IDE (`python-ide.tsx`) share:
// the run session, the console with `input()`, the error with an explanation and the symbol bar for phones.

/** Symbols that are hard to find on a phone keyboard. */
const symbols: ReadonlyArray<readonly [label: string, insert: string]> = [
  ["Tab", "    "], ["(", "("], [")", ")"], [":", ":"], ["\"", "\""], ["'", "'"], ["=", "="], [",", ","],
  ["+", "+"], ["-", "-"], ["*", "*"], ["/", "/"], ["<", "<"], [">", ">"], ["[", "["], ["]", "]"], ["#", "#"], ["_", "_"]
]

export const stopText: Record<StopReason, string> = {
  [StopReasons.User]: "Програму зупинено.",
  [StopReasons.TimeLimit]: "Програма працювала надто довго, і її зупинено. Можливо, цикл ніколи не закінчується: перевір умову в `while`.",
  [StopReasons.OutputLimit]: "Програма вивела надто багато тексту, і її зупинено. Можливо, `print` стоїть у циклі, який не закінчується.",
  [StopReasons.LoadFailed]: "Не вдалося завантажити Python. Перевір інтернет і спробуй ще раз: після першого завантаження Python працює й без мережі."
}

export const statusLine = (status: RunStatus): string =>
  Match.valueTags(status, {
    Idle: () => "",
    Loading: () => "Запускаю…",
    Running: () => "Програма працює…",
    WaitingInput: () => "Програма чекає, поки ти введеш значення.",
    Window: () => "Вікно програми відкрите: клацай, вводь текст, натискай клавіші.",
    Finished: () => "Програма завершила роботу.",
    Failed: () => "У програмі помилка.",
    Stopped: () => ""
  })

export const isBusy = (status: RunStatus): boolean => status._tag === "Loading" || status._tag === "Running"

function InputLine(props: Readonly<{ onSubmit: (value: string) => void }>) {
  const [value, setValue] = useState("")
  const submit = (event: SyntheticEvent) => {
    event.preventDefault()
    props.onSubmit(value)
    setValue("")
  }
  return (
    <form onSubmit={submit} className="epy-input-line">
      <input
        // The student types right after "Run": the field gets focus as in IDLE.
        autoFocus
        aria-label="Значення для input()"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
        }}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className="epy-input-line__field"
      />
      <button type="submit" className="epy-input-line__submit">
        Ввести
      </button>
    </form>
  )
}

/** `Card`: a block under the editor with a title. `Panel`: the terminal of the Online IDE, without a title. */
export const ConsoleLayouts = { Card: "card", Panel: "panel" } as const
export type ConsoleLayout = (typeof ConsoleLayouts)[keyof typeof ConsoleLayouts]

export function Console(props: Readonly<{ view: RunView; layout: ConsoleLayout; onInput: (value: string) => void }>) {
  const end = useRef<HTMLDivElement>(null)
  const waiting = props.view.status._tag === "WaitingInput"
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" })
  }, [props.view.chunks, waiting])
  const empty = props.view.chunks.length === 0 && !waiting
  return (
    <div className="epy-console-wrap">
      {props.layout === ConsoleLayouts.Card && <p className="epy-caption">Результат</p>}
      <div
        role="log"
        aria-live="polite"
        aria-label={props.layout === ConsoleLayouts.Panel ? "Термінал" : undefined}
        className={`epy-console epy-console--${props.layout}`}
      >
        {empty
          ? <span className="epy-muted">{props.view.status._tag === "Idle" ? "Натисни «Запустити», і тут з'явиться те, що виведе програма." : ""}</span>
          : (
            <pre className="epy-console__text">
              {props.view.chunks.map((c, i) => (
                <span
                  key={i}
                  className={cn(c.kind === ChunkKinds.Input && "epy-console__input", c.value !== undefined && `epy-console__${c.value}`)}
                >
                  {c.text}
                </span>
              ))}
            </pre>
          )}
        {waiting && <InputLine onSubmit={props.onInput} />}
        <div ref={end} />
      </div>
    </div>
  )
}

export function Problem(props: Readonly<{ status: RunStatus }>): ReactNode {
  if (props.status._tag === "Stopped") {
    return (
      <Alert tone={props.status.reason === StopReasons.User ? AlertTones.Info : AlertTones.Warning}>
        <CodeText text={stopText[props.status.reason]} />
      </Alert>
    )
  }
  if (props.status._tag !== "Failed") return null
  const error = props.status.error
  return (
    <Alert tone={AlertTones.Error}>
      <div className="epy-problem">
        <p>
          {Option.match(error.line, { onNone: () => "", onSome: (n) => `Рядок ${n}: ` })}
          <CodeText text={error.explanation} />
        </p>
        <details className="epy-problem__details">
          <summary>Повідомлення Python</summary>
          <code className="epy-problem__message">{error.message}</code>
        </details>
      </div>
    </Alert>
  )
}


/** Symbol buttons for touch screens: they insert text in the editor and keep the phone keyboard open. */
export function SymbolBar(props: Readonly<{ editor: RefObject<EditorHandle | null> }>) {
  return (
    <div className="epy-symbols" role="group" aria-label="Символи для коду">
      {symbols.map(([label, insert]) => (
        <button
          key={label}
          type="button"
          // Keeps focus in the editor: the phone keyboard does not close.
          onPointerDown={(e) => {
            e.preventDefault()
          }}
          onClick={() => props.editor.current?.insert(insert)}
          className="epy-symbols__key"
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** One run session of the page: the view of the run and the actions. `runId` changes with each start. */
export interface PythonRun {
  readonly view: RunView
  readonly runId: number
  readonly start: (code: string) => void
  readonly stop: () => void
  /** Stops the program and clears the output. */
  readonly clear: () => void
  readonly provideInput: (value: string) => void
  readonly session: RefObject<RunSession | null>
}

export function usePythonRun(worker: WorkerFactory): PythonRun {
  const [view, setView] = useState<RunView>(idleView)
  const [runId, setRunId] = useState(0)
  const session = useRef<RunSession | null>(null)
  // The session is made once; a new factory from the page does not restart it.
  const workerRef = useRef(worker)

  useEffect(() => {
    const created = createRunSession(workerRef.current, setView)
    session.current = created
    return () => {
      created.dispose()
      session.current = null
    }
  }, [])

  return {
    view,
    runId,
    session,
    start: (code) => {
      setRunId((n) => n + 1)
      session.current?.start(code)
    },
    stop: () => session.current?.stop(),
    clear: () => {
      session.current?.stop()
      setView(idleView)
    },
    provideInput: (value) => session.current?.provideInput(value)
  }
}

/** "Stop" works while the program runs, waits for a value or shows a window. */
export const canStop = (status: RunStatus): boolean =>
  isBusy(status) || status._tag === "WaitingInput" || status._tag === "Window"

/** The error line for the editor: only after a failed run. */
export const errorLineOf = (status: RunStatus): Option.Option<number> =>
  status._tag === "Failed" ? status.error.line : Option.none()
