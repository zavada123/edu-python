import { Option } from "effect"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react"
import { type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react"
import { TkIdAttribute } from "../core/tk-input.ts"
import { TkListModes, type TkWidget } from "../core/tk-scene.ts"
import { useTk } from "./tk-context.ts"
import { useWidgetEvents } from "./tk-events.ts"
import { border, fieldStyle, LineHeight, useFieldText } from "./tk-field.ts"
import { scrolledByBar, TkScrollAttribute } from "./tk-text.tsx"

// Lists of a window: Listbox, Spinbox, Combobox (ttk) and Scrollbar. The page sends the chosen rows (Pick),
// the arrows of a Spinbox (Spin) and the typed text (Edit). A Scrollbar scrolls its widget here, on the page.

type ViewProps = Readonly<{ widget: TkWidget; layout: CSSProperties }>

/** The rows chosen after a click on `row`, as Tk chooses them in each `selectmode`. */
export const chooseRows = (mode: string, chosen: ReadonlyArray<number>, row: number, toggle: boolean, range: boolean, anchor: number): ReadonlyArray<number> => {
  if (mode === TkListModes.Multiple) return chosen.includes(row) ? chosen.filter((r) => r !== row) : [...chosen, row].toSorted((a, b) => a - b)
  if (mode === TkListModes.Extended && range) {
    const from = Math.min(anchor, row)
    return Array.from({ length: Math.abs(row - anchor) + 1 }, (_, i) => from + i)
  }
  if (mode === TkListModes.Extended && toggle) return chosen.includes(row) ? chosen.filter((r) => r !== row) : [...chosen, row].toSorted((a, b) => a - b)
  return [row]
}

export function ListboxView(props: ViewProps) {
  const tk = useTk()
  const events = useWidgetEvents(props.widget.id)
  const w = props.widget
  const list = Option.getOrNull(w.list)
  const rows = list?.rows ?? []
  const chosen = list?.chosen ?? []
  const disabled = w.state === "disabled"
  const pick = (items: ReadonlyArray<number>): void => {
    if (!disabled && tk.active) tk.send({ _tag: "Pick", widget: w.id, items })
  }
  const click = (row: number, e: MouseEvent): void => {
    pick(chooseRows(list?.mode ?? TkListModes.Browse, chosen, row, e.ctrlKey || e.metaKey, e.shiftKey, list?.active ?? 0))
  }
  const key = (e: KeyboardEvent): void => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
    e.preventDefault()
    const now = chosen.at(-1) ?? list?.active ?? -1
    const next = Math.max(0, Math.min(rows.length - 1, now + (e.key === "ArrowDown" ? 1 : -1)))
    if (rows.length > 0 && next !== now) pick([next])
  }
  return (
    <div {...{ [TkIdAttribute]: w.id }} {...events} style={{ display: "flex", ...border(w.relief, w.bd), margin: w.highlight, background: w.bg, ...props.layout }}>
      <div
        {...{ [TkScrollAttribute]: w.id }}
        role="listbox"
        tabIndex={disabled ? -1 : 0}
        aria-label="Список програми"
        aria-multiselectable={list?.mode === TkListModes.Multiple || list?.mode === TkListModes.Extended}
        aria-disabled={disabled}
        onKeyDown={key}
        style={{
          boxSizing: "content-box",
          flex: "1 1 auto",
          width: `${Math.max(1, w.width)}ch`,
          height: `${Math.max(1, w.height) * LineHeight}em`,
          overflow: "auto",
          font: w.font,
          color: disabled ? "var(--tk-shadow)" : w.fg,
          scrollbarWidth: scrolledByBar(tk.scene, w.id) ? "none" : undefined,
          outline: "none",
          userSelect: "none"
        }}
      >
        {rows.map(([text, fg, bg], i) => {
          const on = chosen.includes(i)
          return (
            <div
              key={i}
              role="option"
              aria-selected={on}
              onClick={(e) => {
                click(i, e)
              }}
              style={{
                padding: "0 2px",
                whiteSpace: "pre",
                lineHeight: LineHeight,
                cursor: disabled ? "default" : "pointer",
                background: on ? list?.selectBg : bg === "" ? undefined : bg,
                color: on ? list?.selectFg : fg === "" ? undefined : fg
              }}
            >
              {text === "" ? " " : text}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const arrowButton: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 16,
  padding: 0,
  border: "1px solid var(--tk-shadow)",
  background: "var(--tk-face)",
  color: "var(--tk-text)"
}

/** Entry of a Spinbox or a Combobox. */
function FieldInput(props: Readonly<{ widget: TkWidget; readOnly: boolean }>) {
  const tk = useTk()
  const w = props.widget
  const [value, setValue] = useFieldText(w)
  return (
    <input
      aria-label="Поле програми"
      value={value}
      disabled={w.state === "disabled"}
      readOnly={props.readOnly || !tk.active}
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      onChange={(e) => {
        setValue(e.target.value)
        tk.send({ _tag: "Edit", widget: w.id, text: e.target.value })
      }}
      style={{ ...fieldStyle(w), border: 0, margin: 0, width: `${Math.max(1, w.width)}ch`, minWidth: 0, flex: "1 1 auto" }}
    />
  )
}

export function SpinboxView(props: ViewProps) {
  const tk = useTk()
  const events = useWidgetEvents(props.widget.id)
  const w = props.widget
  const spin = (up: boolean): void => {
    if (w.state !== "disabled" && tk.active) tk.send({ _tag: "Spin", widget: w.id, up })
  }
  return (
    <div {...{ [TkIdAttribute]: w.id }} {...events} style={{ display: "flex", ...border(w.relief, w.bd), margin: w.highlight, background: w.bg, ...props.layout }}>
      <FieldInput widget={w} readOnly={w.state === "readonly"} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <button type="button" aria-label="Більше" onClick={() => { spin(true) }} style={{ ...arrowButton, flex: 1 }}>
          <ChevronUp aria-hidden size={10} />
        </button>
        <button type="button" aria-label="Менше" onClick={() => { spin(false) }} style={{ ...arrowButton, flex: 1 }}>
          <ChevronDown aria-hidden size={10} />
        </button>
      </div>
    </div>
  )
}

/** Closes a drop-down list after a click outside of it or Escape. */
export const useOutsideClose = (open: boolean, close: () => void, inside: () => ReadonlyArray<Element | null>): void => {
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent): void => {
      const target = e.target
      if (target instanceof Node && inside().some((el) => el?.contains(target) === true)) return
      close()
    }
    const key = (e: globalThis.KeyboardEvent): void => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("pointerdown", down, true)
    document.addEventListener("keydown", key)
    return () => {
      document.removeEventListener("pointerdown", down, true)
      document.removeEventListener("keydown", key)
    }
  }, [open, close, inside])
}

export function ComboboxView(props: ViewProps) {
  const tk = useTk()
  const events = useWidgetEvents(props.widget.id)
  const w = props.widget
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const list = Option.getOrNull(w.list)
  const close = useRef(() => {
    setOpen(false)
  }).current
  const inside = useRef(() => [box.current]).current
  useOutsideClose(open, close, inside)
  const disabled = w.state === "disabled" || !tk.active
  return (
    <div ref={box} {...{ [TkIdAttribute]: w.id }} {...events} style={{ position: "relative", display: "flex", ...border(w.relief, w.bd), margin: w.highlight, background: w.bg, ...props.layout }}>
      <FieldInput widget={w} readOnly={w.state === "readonly"} />
      <button
        type="button"
        aria-label="Відкрити список"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          setOpen(!open)
        }}
        style={{ ...arrowButton, border: 0 }}
      >
        <ChevronDown aria-hidden size={12} />
      </button>
      {open && (
        <div role="listbox" aria-label="Значення" className="epy-tk-popup" style={{ position: "absolute", top: "100%", left: 0, right: 0, maxHeight: "12em", overflow: "auto" }}>
          {(list?.rows ?? []).map(([text], i) => (
            <div
              key={i}
              role="option"
              aria-selected={list?.chosen.includes(i) === true}
              className="epy-tk-popup__item"
              onClick={() => {
                setOpen(false)
                tk.send({ _tag: "Pick", widget: w.id, items: [i] })
              }}
            >
              {text === "" ? " " : text}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Line of a scroll arrow, in pixels. */
const ScrollStep = 16
const RefreshMs = 250
const MinThumb = 0.05

interface View {
  readonly first: number
  readonly last: number
}

const viewOf = (el: HTMLElement, vertical: boolean): View => {
  const size = vertical ? el.scrollHeight : el.scrollWidth
  const shown = vertical ? el.clientHeight : el.clientWidth
  const at = vertical ? el.scrollTop : el.scrollLeft
  if (size <= 0 || shown >= size) return { first: 0, last: 1 }
  return { first: at / size, last: (at + shown) / size }
}

export function ScrollbarView(props: ViewProps) {
  const events = useWidgetEvents(props.widget.id)
  const w = props.widget
  const scroll = Option.getOrNull(w.scroll)
  const vertical = scroll?.vertical ?? true
  const target = scroll?.target ?? 0
  const self = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>({ first: 0, last: 1 })

  const element = (): HTMLElement | null => {
    const root = self.current?.closest(".epy-tk-windows")
    const found = root?.querySelector(`[${TkScrollAttribute}="${target}"]`)
    return found instanceof HTMLElement ? found : null
  }

  useEffect(() => {
    const el = element()
    if (el === null) return
    const update = (): void => {
      const next = viewOf(el, vertical)
      setView((old) => (old.first === next.first && old.last === next.last ? old : next))
    }
    update()
    el.addEventListener("scroll", update)
    // The text grows without a scroll event: the bar looks again from time to time.
    const timer = setInterval(update, RefreshMs)
    return () => {
      el.removeEventListener("scroll", update)
      clearInterval(timer)
    }
  }, [target, vertical])

  const by = (pixels: number): void => {
    const el = element()
    if (el !== null) el.scrollBy(vertical ? { top: pixels } : { left: pixels })
  }
  const drag = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const el = element()
    const track = e.currentTarget.parentElement
    if (el === null || track === null) return
    e.preventDefault()
    e.stopPropagation()
    const start = vertical ? e.clientY : e.clientX
    const from = vertical ? el.scrollTop : el.scrollLeft
    const trackSize = vertical ? track.clientHeight : track.clientWidth
    const size = vertical ? el.scrollHeight : el.scrollWidth
    const move = (m: PointerEvent): void => {
      const delta = ((vertical ? m.clientY : m.clientX) - start) * (size / Math.max(1, trackSize))
      if (vertical) el.scrollTop = from + delta
      else el.scrollLeft = from + delta
    }
    const up = (): void => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  const thickness = Math.max(8, w.width)
  const length = Math.max(MinThumb, view.last - view.first)
  const thumb: CSSProperties = vertical
    ? { position: "absolute", left: 1, right: 1, top: `${view.first * 100}%`, height: `${length * 100}%` }
    : { position: "absolute", top: 1, bottom: 1, left: `${view.first * 100}%`, width: `${length * 100}%` }
  const Back = vertical ? ChevronUp : ChevronLeft
  const Forward = vertical ? ChevronDown : ChevronRight
  return (
    <div
      ref={self}
      {...{ [TkIdAttribute]: w.id }}
      {...events}
      role="scrollbar"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      aria-valuenow={Math.round(view.first * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        display: "flex",
        flexDirection: vertical ? "column" : "row",
        [vertical ? "width" : "height"]: thickness,
        [vertical ? "minHeight" : "minWidth"]: thickness * 3,
        background: scroll?.trough === "" || scroll === null ? "var(--tk-face)" : scroll.trough,
        margin: w.highlight,
        ...props.layout
      }}
    >
      <button type="button" aria-label="Назад" tabIndex={-1} onClick={() => { by(-ScrollStep) }} style={{ ...arrowButton, width: thickness, height: thickness, flex: "none" }}>
        <Back aria-hidden size={10} />
      </button>
      <div
        style={{ position: "relative", flex: "1 1 auto" }}
        onPointerDown={(e) => {
          const el = element()
          if (el === null || e.target !== e.currentTarget) return
          const box = e.currentTarget.getBoundingClientRect()
          const at = vertical ? (e.clientY - box.top) / box.height : (e.clientX - box.left) / box.width
          const page = vertical ? el.clientHeight : el.clientWidth
          by(at < view.first ? -page : page)
        }}
      >
        {view.last - view.first < 1 && <div onPointerDown={drag} style={{ ...thumb, background: "var(--tk-shadow)", borderRadius: 2, touchAction: "none" }} />}
      </div>
      <button type="button" aria-label="Вперед" tabIndex={-1} onClick={() => { by(ScrollStep) }} style={{ ...arrowButton, width: thickness, height: thickness, flex: "none" }}>
        <Forward aria-hidden size={10} />
      </button>
    </div>
  )
}
