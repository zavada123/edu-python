import { Match } from "effect"
import { CircleHelp, CircleX, Download, FileText, Info, TriangleAlert, Upload, X } from "lucide-react"
import { type ReactNode, type SyntheticEvent, useEffect, useRef, useState } from "react"
import { MaxFileBytes, type ProgramFile, safeFileName } from "../engine/protocol.ts"
import { type TkAsk, TkAskKinds } from "../core/tk-scene.ts"

// Dialogs that wait for the student (askyesno, askstring, askcolor, askopenfilename, asksaveasfilename) and
// the files that the program saved. Everything from the program is shown as text: names and messages are
// never HTML, a saved file is downloaded as bytes and never opened on the page.

export type Answer = (value: unknown, files?: ReadonlyArray<ProgramFile>) => void

const ButtonLabels: Readonly<Record<string, string>> = {
  yes: "Так",
  no: "Ні",
  ok: "OK",
  cancel: "Скасувати",
  retry: "Повторити",
  abort: "Перервати",
  ignore: "Пропустити"
}

const iconOf = (icon: string | undefined): ReactNode =>
  Match.value(icon ?? "").pipe(
    Match.when("info", () => <Info aria-hidden className="epy-tk-dialog__icon epy-tk-dialog__icon--info" />),
    Match.when("warning", () => <TriangleAlert aria-hidden className="epy-tk-dialog__icon epy-tk-dialog__icon--warning" />),
    Match.when("error", () => <CircleX aria-hidden className="epy-tk-dialog__icon epy-tk-dialog__icon--error" />),
    Match.orElse(() => <CircleHelp aria-hidden className="epy-tk-dialog__icon epy-tk-dialog__icon--info" />)
  )

function Frame(props: Readonly<{ title: string; label: string; onClose: () => void; children: ReactNode }>) {
  return (
    <div className="epy-tk-backdrop">
      <div role="dialog" aria-modal="true" aria-label={props.title === "" ? props.label : props.title} className="epy-tk-dialog epy-tk-ask">
        <div className="epy-tk-title">
          <span className="epy-tk-title__text">{props.title}</span>
          <button type="button" aria-label="Закрити" onClick={props.onClose} className="epy-tk-close">
            <X aria-hidden className="epy-tk-close__icon" />
          </button>
        </div>
        {props.children}
      </div>
    </div>
  )
}

function Buttons(props: Readonly<{ ok: string; onCancel: () => void; disabled?: boolean }>) {
  return (
    <div className="epy-tk-dialog__buttons">
      <button type="submit" disabled={props.disabled} className="epy-tk-button">
        {props.ok}
      </button>
      <button type="button" onClick={props.onCancel} className="epy-tk-button">
        Скасувати
      </button>
    </div>
  )
}

function Question(props: Readonly<{ ask: TkAsk; onAnswer: Answer }>) {
  const buttons = props.ask.buttons ?? ["ok"]
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    first.current?.focus({ preventScroll: true })
  }, [props.ask])
  return (
    <Frame title={props.ask.title} label="Питання програми" onClose={() => { props.onAnswer(null) }}>
      <div className="epy-tk-dialog__body">
        {iconOf(props.ask.icon)}
        <p className="epy-tk-dialog__message">{props.ask.message}</p>
      </div>
      <div className="epy-tk-dialog__buttons">
        {buttons.map((b) => (
          <button key={b} ref={b === (props.ask.default ?? buttons[0]) ? first : undefined} type="button" onClick={() => { props.onAnswer(b) }} className="epy-tk-button">
            {ButtonLabels[b] ?? b}
          </button>
        ))}
      </div>
    </Frame>
  )
}

/** The error of a typed value, or "" (askinteger, askfloat: a number between `min` and `max`). */
export const valueError = (ask: TkAsk, text: string): string => {
  if (ask.number !== "int" && ask.number !== "float") return ""
  const clean = text.trim()
  const valid = ask.number === "int" ? /^[+-]?\d+$/.test(clean) : clean !== "" && Number.isFinite(Number(clean))
  if (!valid) return ask.number === "int" ? "Потрібне ціле число." : "Потрібне число."
  const value = Number(clean)
  if (ask.min !== undefined && ask.min !== null && value < ask.min) return `Число має бути не менше ${ask.min}.`
  if (ask.max !== undefined && ask.max !== null && value > ask.max) return `Число має бути не більше ${ask.max}.`
  return ""
}

function Value(props: Readonly<{ ask: TkAsk; onAnswer: Answer }>) {
  const [text, setText] = useState(props.ask.initial ?? "")
  const [error, setError] = useState("")
  const submit = (e: SyntheticEvent): void => {
    e.preventDefault()
    const found = valueError(props.ask, text)
    setError(found)
    if (found === "") props.onAnswer(text)
  }
  return (
    <Frame title={props.ask.title} label="Програма питає" onClose={() => { props.onAnswer(null) }}>
      <form onSubmit={submit}>
        <label className="epy-tk-ask__body">
          <span className="epy-tk-dialog__message">{props.ask.message}</span>
          <input
            autoFocus
            type={props.ask.secret === true ? "password" : "text"}
            inputMode={props.ask.number === "int" ? "numeric" : props.ask.number === "float" ? "decimal" : undefined}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
            }}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="epy-tk-ask__field"
          />
          {error !== "" && <span role="alert" className="epy-tk-ask__error">{error}</span>}
        </label>
        <Buttons ok="OK" onCancel={() => { props.onAnswer(null) }} />
      </form>
    </Frame>
  )
}

const HexColor = /^#[0-9a-f]{6}$/i

function Color(props: Readonly<{ ask: TkAsk; onAnswer: Answer }>) {
  const initial = props.ask.initial ?? ""
  const [color, setColor] = useState(HexColor.test(initial) ? initial : "#000000")
  return (
    <Frame title={props.ask.title === "" ? "Колір" : props.ask.title} label="Вибір кольору" onClose={() => { props.onAnswer(null) }}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          props.onAnswer(color.toLowerCase())
        }}
      >
        <label className="epy-tk-ask__body epy-tk-ask__row">
          <span>Колір:</span>
          <input type="color" value={color} onChange={(e) => { setColor(e.target.value) }} className="epy-tk-ask__color" />
          <code>{color}</code>
        </label>
        <Buttons ok="OK" onCancel={() => { props.onAnswer(null) }} />
      </form>
    </Frame>
  )
}

/** "*.txt *.py" of `filetypes`: does the name fit? "*" and "*.*" fit all. */
export const fitsPattern = (name: string, patterns: string): boolean =>
  patterns.split(/\s+/).filter((p) => p !== "").some((pattern) => {
    if (pattern === "*" || pattern === "*.*") return true
    const extension = pattern.startsWith("*") ? pattern.slice(1) : pattern
    return name.toLowerCase().endsWith(extension.toLowerCase())
  })

/** The `accept` of a file field: ".txt,.py"; "" for all files. */
export const acceptOf = (patterns: string): string => {
  const extensions = patterns.split(/\s+/).filter((p) => /^\*\.[\w-]+$/.test(p)).map((p) => p.slice(1))
  return patterns.split(/\s+/).some((p) => p === "*" || p === "*.*") ? "" : extensions.join(",")
}

const readFile = (file: File): Promise<Uint8Array> => file.arrayBuffer().then((buffer) => new Uint8Array(buffer))

function ProgramFiles(props: Readonly<{ files: ReadonlyArray<string>; chosen: ReadonlyArray<string>; onChoose: (name: string) => void; onOpen?: (name: string) => void }>) {
  if (props.files.length === 0) return <p className="epy-tk-ask__empty">У папці програми ще немає файлів.</p>
  return (
    <div role="listbox" aria-label="Файли програми" className="epy-tk-ask__files">
      {props.files.map((name) => (
        <div
          key={name}
          role="option"
          aria-selected={props.chosen.includes(name)}
          tabIndex={0}
          className="epy-tk-ask__file"
          onClick={() => {
            props.onChoose(name)
          }}
          onDoubleClick={() => props.onOpen?.(name)}
          onKeyDown={(e) => {
            if (e.key === "Enter") props.onOpen?.(name)
          }}
        >
          <FileText aria-hidden size={14} />
          <span>{name}</span>
        </div>
      ))}
    </div>
  )
}

function OpenFile(props: Readonly<{ ask: TkAsk; onAnswer: Answer }>) {
  const types = props.ask.filetypes ?? []
  const [type, setType] = useState(0)
  const [chosen, setChosen] = useState<ReadonlyArray<string>>([])
  const [error, setError] = useState("")
  const upload = useRef<HTMLInputElement>(null)
  const multiple = props.ask.multiple === true
  const patterns = types[type]?.[1] ?? "*"
  const files = (props.ask.files ?? []).filter((name) => fitsPattern(name, patterns))
  const answer = (names: ReadonlyArray<string>, given: ReadonlyArray<ProgramFile> = []): void => {
    if (names.length > 0) props.onAnswer(multiple ? names : names[0], given)
  }
  const fromComputer = async (list: FileList | null): Promise<void> => {
    const picked = Array.from(list ?? [])
    if (picked.some((f) => f.size > MaxFileBytes)) {
      setError(`Файл завеликий: можна до ${MaxFileBytes / 1024 / 1024} МБ.`)
      return
    }
    const given = await Promise.all(
      picked.flatMap((f) => {
        const name = safeFileName(f.name)
        return name === null ? [] : [readFile(f).then((data): ProgramFile => ({ name, data }))]
      })
    )
    if (given.length === 0) {
      setError("Цей файл не вдалося відкрити: спробуй інший.")
      return
    }
    answer(given.map((f) => f.name), given)
  }
  return (
    <Frame title={props.ask.title === "" ? "Відкрити" : props.ask.title} label="Відкрити файл" onClose={() => { props.onAnswer(multiple ? [] : "") }}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          answer(chosen)
        }}
      >
        <div className="epy-tk-ask__body">
          <ProgramFiles
            files={files}
            chosen={chosen}
            onChoose={(name) => {
              setChosen(multiple ? (chosen.includes(name) ? chosen.filter((n) => n !== name) : [...chosen, name]) : [name])
            }}
            onOpen={(name) => {
              answer([name])
            }}
          />
          {types.length > 1 && (
            <label className="epy-tk-ask__row">
              <span>Тип файлів:</span>
              <select value={type} onChange={(e) => { setType(Number(e.target.value)) }}>
                {types.map(([label, pattern], i) => (
                  <option key={i} value={i}>{`${label} (${pattern})`}</option>
                ))}
              </select>
            </label>
          )}
          <button type="button" className="epy-tk-button epy-tk-ask__upload" onClick={() => upload.current?.click()}>
            <Upload aria-hidden size={14} /> Файл з комп'ютера…
          </button>
          <input
            ref={upload}
            type="file"
            hidden
            multiple={multiple}
            accept={acceptOf(patterns) || undefined}
            onChange={(e) => {
              void fromComputer(e.target.files)
            }}
          />
          {error !== "" && <span role="alert" className="epy-tk-ask__error">{error}</span>}
        </div>
        <Buttons ok="Відкрити" disabled={chosen.length === 0} onCancel={() => { props.onAnswer(multiple ? [] : "") }} />
      </form>
    </Frame>
  )
}

/** The name of a saved file with the default extension, or null when the name is not good. */
export const saveName = (text: string, extension: string): string | null => {
  const name = safeFileName(text)
  if (name === null) return null
  if (extension === "" || name.includes(".")) return name
  return name + (extension.startsWith(".") ? extension : `.${extension}`)
}

function SaveFile(props: Readonly<{ ask: TkAsk; onAnswer: Answer }>) {
  const [text, setText] = useState(props.ask.initial ?? "")
  const [error, setError] = useState("")
  const extension = props.ask.extension ?? ""
  return (
    <Frame title={props.ask.title === "" ? "Зберегти як" : props.ask.title} label="Зберегти файл" onClose={() => { props.onAnswer("") }}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const name = saveName(text, extension)
          if (name === null) {
            setError("Напиши назву файлу без папок, наприклад «вірш.txt».")
            return
          }
          props.onAnswer(name)
        }}
      >
        <div className="epy-tk-ask__body">
          <ProgramFiles files={props.ask.files ?? []} chosen={[text]} onChoose={setText} />
          <label className="epy-tk-ask__row">
            <span>Назва файлу:</span>
            <input
              autoFocus
              value={text}
              onChange={(e) => {
                setText(e.target.value)
              }}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="epy-tk-ask__field"
            />
          </label>
          {error !== "" && <span role="alert" className="epy-tk-ask__error">{error}</span>}
        </div>
        <Buttons ok="Зберегти" onCancel={() => { props.onAnswer("") }} />
      </form>
    </Frame>
  )
}

/** The dialog that waits for the student. The parent gives a new `key` for each question. */
export function AskDialog(props: Readonly<{ ask: TkAsk; onAnswer: Answer }>): ReactNode {
  return Match.value(props.ask.kind).pipe(
    Match.when(TkAskKinds.Question, () => <Question {...props} />),
    Match.when(TkAskKinds.Value, () => <Value {...props} />),
    Match.when(TkAskKinds.Color, () => <Color {...props} />),
    Match.when(TkAskKinds.Open, () => <OpenFile {...props} />),
    Match.when(TkAskKinds.Save, () => <SaveFile {...props} />),
    Match.exhaustive
  )
}

const RevokeAfterMs = 10_000

/** Gives the bytes of a file to the browser as a download: the page never opens the file. */
const download = (file: ProgramFile): void => {
  const blob = new Blob([new Uint8Array(file.data)], { type: "application/octet-stream" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = safeFileName(file.name) ?? "file.txt"
  link.rel = "noopener"
  link.click()
  // The browser reads the file name and the bytes after the click: the address lives a little longer.
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, RevokeAfterMs)
}

/** Files that the program saved: the student downloads them to the computer. */
export function Downloads(props: Readonly<{ files: ReadonlyArray<ProgramFile>; onDismiss: (name: string) => void }>) {
  if (props.files.length === 0) return null
  return (
    <ul className="epy-tk-downloads" aria-label="Збережені файли">
      {props.files.map((file) => (
        <li key={file.name} className="epy-tk-downloads__item">
          <FileText aria-hidden size={16} />
          <span className="epy-tk-downloads__text">
            Програма зберегла файл <b>{file.name}</b>
          </span>
          <button
            type="button"
            className="epy-tk-button epy-tk-downloads__button"
            onClick={() => {
              download(file)
            }}
          >
            <Download aria-hidden size={14} /> Завантажити
          </button>
          <button type="button" aria-label={`Сховати ${file.name}`} className="epy-tk-downloads__close" onClick={() => { props.onDismiss(file.name) }}>
            <X aria-hidden size={14} />
          </button>
        </li>
      ))}
    </ul>
  )
}
