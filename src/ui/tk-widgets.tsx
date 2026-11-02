import { Match, Option } from "effect"
import { type CSSProperties, type KeyboardEvent, type ReactNode, useState } from "react"
import { TkIdAttribute } from "../core/tk-input.ts"
import { managedChildren, type TkManager, TkManagerKinds, type TkScene, type TkWidget, TkWidgetKinds } from "../core/tk-scene.ts"
import { useTk } from "./tk-context.ts"
import { useWidgetEvents } from "./tk-events.ts"
import { TkCanvasView } from "./tk-canvas.tsx"

// Widgets of a tkinter window and the geometry managers. Sizes follow Tk: `width` of a Label or a Button is
// in characters (CSS `ch` is the width of "0", as in Tk), `height` is in lines; padx, pady and the border
// are added outside of it (content-box).

/** Line height of Tk fonts; the fonts of `_style.py` have the same `/1.2`. */
const LineHeight = 1.2
const Light = "var(--tk-paper)"
const Shadow = "var(--tk-shadow)"

export const border = (relief: string, width: number): CSSProperties => {
  if (width <= 0) return { borderWidth: 0, borderStyle: "none" }
  const raised = { borderWidth: width, borderStyle: "solid", borderColor: `${Light} ${Shadow} ${Shadow} ${Light}` }
  return Match.value(relief).pipe(
    Match.when("raised", () => raised),
    Match.when("sunken", () => ({ ...raised, borderColor: `${Shadow} ${Light} ${Light} ${Shadow}` })),
    Match.when("groove", () => ({ borderWidth: width, borderStyle: "groove", borderColor: Shadow })),
    Match.when("ridge", () => ({ borderWidth: width, borderStyle: "ridge", borderColor: Shadow })),
    Match.when("solid", () => ({ borderWidth: width, borderStyle: "solid", borderColor: "var(--tk-text)" })),
    Match.orElse(() => ({ borderWidth: width, borderStyle: "solid", borderColor: "transparent" }))
  )
}

/** CSS alignment of a Tk anchor: n, ne, e, se, s, sw, w, nw, center. */
export const anchorX = (anchor: string): string =>
  anchor === "center" ? "center" : anchor.includes("w") ? "flex-start" : anchor.includes("e") ? "flex-end" : "center"
export const anchorY = (anchor: string): string =>
  anchor === "center" ? "center" : anchor.startsWith("n") ? "flex-start" : anchor.startsWith("s") ? "flex-end" : "center"

/** Does the container take the size of its widgets (pack and grid do it, place does not)? */
const fitsContent = (scene: TkScene, id: number, propagate: boolean): boolean =>
  propagate && scene.widgets.some((w) => w.parent === id && (w.manager.kind === TkManagerKinds.Pack || w.manager.kind === TkManagerKinds.Grid))

export const containerSize = (scene: TkScene, id: number, propagate: boolean, width: number, height: number): CSSProperties =>
  fitsContent(scene, id, propagate) ? {} : { width: Math.max(1, width), height: Math.max(1, height) }

const textBox = (w: TkWidget): CSSProperties => ({
  boxSizing: "content-box",
  font: w.font,
  color: w.fg,
  background: w.bg === "" ? "transparent" : w.bg,
  ...border(w.relief, w.bd),
  padding: `${w.pady}px ${w.padx}px`,
  margin: w.highlight,
  width: w.width > 0 ? `${w.width}ch` : undefined,
  height: w.height > 0 ? `${w.height * LineHeight}em` : undefined,
  display: "flex",
  justifyContent: anchorX(w.anchor),
  alignItems: anchorY(w.anchor),
  textAlign: w.justify === "left" ? "left" : w.justify === "right" ? "right" : "center",
  whiteSpace: w.wrap > 0 ? "pre-wrap" : "pre",
  overflow: "hidden",
  textDecoration: w.underline ? "underline" : undefined,
  userSelect: "none"
})

function Caption(props: Readonly<{ widget: TkWidget }>) {
  return <span style={{ maxWidth: props.widget.wrap > 0 ? props.widget.wrap : undefined, overflowWrap: "anywhere" }}>{props.widget.text}</span>
}

type ViewProps = Readonly<{ widget: TkWidget; layout: CSSProperties }>

function LabelView(props: ViewProps) {
  const events = useWidgetEvents(props.widget.id)
  return (
    <div {...{ [TkIdAttribute]: props.widget.id }} {...events} style={{ ...textBox(props.widget), ...props.layout }}>
      <Caption widget={props.widget} />
    </div>
  )
}

function ButtonView(props: ViewProps) {
  const tk = useTk()
  const events = useWidgetEvents(props.widget.id)
  const [pressed, setPressed] = useState(false)
  const w = props.widget
  const disabled = w.state === "disabled"
  const style = textBox(w)
  return (
    <button
      type="button"
      {...{ [TkIdAttribute]: w.id }}
      {...events}
      aria-disabled={disabled}
      onPointerDown={(e) => {
        if (!disabled) setPressed(true)
        events.onPointerDown(e)
      }}
      onPointerUp={(e) => {
        setPressed(false)
        events.onPointerUp(e)
      }}
      onPointerLeave={(e) => {
        setPressed(false)
        events.onPointerLeave(e)
      }}
      onClick={() => {
        if (!disabled && tk.active) tk.send({ _tag: "Invoke", widget: w.id })
      }}
      style={{ ...style, ...(pressed && w.relief === "raised" ? border("sunken", w.bd) : {}), cursor: disabled ? "default" : "pointer", ...props.layout }}
    >
      <Caption widget={w} />
    </button>
  )
}

/** A check box or a radio button: the mark and the text; a click anywhere on it is `invoke()`. */
function ChoiceView(props: ViewProps & Readonly<{ round: boolean }>) {
  const tk = useTk()
  const events = useWidgetEvents(props.widget.id)
  const w = props.widget
  const disabled = w.state === "disabled"
  const mark: CSSProperties = {
    boxSizing: "border-box",
    width: "1.1em",
    height: "1.1em",
    flex: "none",
    marginRight: "0.3em",
    border: "1px solid var(--tk-dark)",
    borderRadius: props.round ? "50%" : 0,
    background: w.selectcolor === "" ? "var(--tk-paper)" : w.selectcolor,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.9em",
    lineHeight: 1
  }
  return (
    <button
      type="button"
      role={props.round ? "radio" : "checkbox"}
      aria-checked={w.checked}
      aria-disabled={disabled}
      {...{ [TkIdAttribute]: w.id }}
      {...events}
      onClick={() => {
        if (!disabled && tk.active) tk.send({ _tag: "Invoke", widget: w.id })
      }}
      style={{ ...textBox(w), cursor: disabled ? "default" : "pointer", ...props.layout }}
    >
      {w.indicator && (
        <span aria-hidden style={mark}>
          {w.checked && (props.round ? <span style={{ width: "0.45em", height: "0.45em", borderRadius: "50%", background: "var(--tk-text)" }} /> : "✓")}
        </span>
      )}
      <Caption widget={w} />
    </button>
  )
}

/** Text of a field: the student types it, and the program changes it (`rev`). */
const useFieldText = (w: TkWidget): readonly [string, (value: string) => void] => {
  const [value, setValue] = useState(w.text)
  const [rev, setRev] = useState(w.rev)
  if (rev !== w.rev) {
    setRev(w.rev)
    setValue(w.text)
  }
  return [value, setValue]
}

const fieldStyle = (w: TkWidget): CSSProperties => ({
  boxSizing: "content-box",
  font: w.font,
  color: w.fg,
  background: w.bg,
  ...border(w.relief, w.bd),
  margin: w.highlight,
  padding: "1px 2px",
  outline: "none",
  textAlign: w.justify === "right" ? "right" : w.justify === "center" ? "center" : "left"
})

function EntryView(props: ViewProps) {
  const tk = useTk()
  const events = useWidgetEvents(props.widget.id)
  const w = props.widget
  const [value, setValue] = useFieldText(w)
  return (
    <input
      {...{ [TkIdAttribute]: w.id }}
      {...events}
      type={w.show === "" ? "text" : "password"}
      aria-label="Поле програми"
      value={value}
      disabled={w.state === "disabled"}
      readOnly={w.state === "readonly" || !tk.active}
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      onChange={(e) => {
        setValue(e.target.value)
        tk.send({ _tag: "Edit", widget: w.id, text: e.target.value })
      }}
      style={{ ...fieldStyle(w), width: `${Math.max(1, w.width)}ch`, ...props.layout }}
    />
  )
}

function TextView(props: ViewProps) {
  const tk = useTk()
  const events = useWidgetEvents(props.widget.id)
  const w = props.widget
  const [value, setValue] = useFieldText(w)
  return (
    <textarea
      {...{ [TkIdAttribute]: w.id }}
      {...events}
      aria-label="Текстове поле програми"
      value={value}
      readOnly={w.state === "disabled" || !tk.active}
      spellCheck={false}
      onChange={(e) => {
        setValue(e.target.value)
        tk.send({ _tag: "Edit", widget: w.id, text: e.target.value })
      }}
      style={{
        ...fieldStyle(w),
        padding: `${w.pady}px ${w.padx}px`,
        width: `${Math.max(1, w.width)}ch`,
        height: `${Math.max(1, w.height) * LineHeight}em`,
        resize: "none",
        whiteSpace: w.textwrap === "none" ? "pre" : "pre-wrap",
        wordBreak: w.textwrap === "char" ? "break-all" : "normal",
        ...props.layout
      }}
    />
  )
}

function ScaleView(props: ViewProps) {
  const tk = useTk()
  const events = useWidgetEvents(props.widget.id)
  const w = props.widget
  const [value, setValue] = useFieldText({ ...w, text: String(Option.match(w.scale, { onNone: () => 0, onSome: (s) => s.value })) })
  return Option.match(w.scale, {
    onNone: () => null,
    onSome: (scale) => {
      const vertical = scale.orient === "vertical"
      return (
        <div {...{ [TkIdAttribute]: w.id }} {...events} style={{ ...textBox(w), flexDirection: vertical ? "row" : "column", gap: 2, ...props.layout }}>
          {scale.label !== "" && <span>{scale.label}</span>}
          {scale.showvalue && <span>{value}</span>}
          <input
            type="range"
            aria-label={scale.label === "" ? "Повзунок програми" : scale.label}
            min={Math.min(scale.from, scale.to)}
            max={Math.max(scale.from, scale.to)}
            step={scale.resolution > 0 ? scale.resolution : "any"}
            value={value}
            disabled={w.state === "disabled" || !tk.active}
            onChange={(e) => {
              setValue(e.target.value)
              tk.send({ _tag: "Edit", widget: w.id, text: e.target.value })
            }}
            style={{
              width: vertical ? undefined : scale.length,
              height: vertical ? scale.length : undefined,
              writingMode: vertical ? "vertical-lr" : undefined,
              accentColor: scale.trough === "" ? undefined : "var(--tk-accent)"
            }}
          />
        </div>
      )
    }
  })
}

function FrameView(props: ViewProps) {
  const tk = useTk()
  const events = useWidgetEvents(props.widget.id)
  const w = props.widget
  const style: CSSProperties = {
    boxSizing: "content-box",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    background: w.bg === "" ? "transparent" : w.bg,
    ...border(w.relief, w.bd),
    padding: `${w.pady}px ${w.padx}px`,
    margin: w.highlight,
    ...containerSize(tk.scene, w.id, w.propagate, w.width, w.height),
    ...props.layout
  }
  if (w.kind === TkWidgetKinds.LabelFrame) {
    return (
      <fieldset {...{ [TkIdAttribute]: w.id }} {...events} style={{ ...style, minInlineSize: 0, paddingTop: Math.max(w.pady, 2) }}>
        <legend style={{ font: w.font, color: w.fg, padding: "0 2px", marginLeft: 4 }}>{w.text}</legend>
        <Children parent={w.id} />
      </fieldset>
    )
  }
  return (
    <div {...{ [TkIdAttribute]: w.id }} {...events} style={style}>
      <Children parent={w.id} />
    </div>
  )
}

export function TkWidgetView(props: ViewProps): ReactNode {
  return Match.value(props.widget.kind).pipe(
    Match.when(TkWidgetKinds.Label, () => <LabelView {...props} />),
    Match.when(TkWidgetKinds.Button, () => <ButtonView {...props} />),
    Match.when(TkWidgetKinds.Checkbutton, () => <ChoiceView {...props} round={false} />),
    Match.when(TkWidgetKinds.Radiobutton, () => <ChoiceView {...props} round />),
    Match.when(TkWidgetKinds.Entry, () => <EntryView {...props} />),
    Match.when(TkWidgetKinds.Text, () => <TextView {...props} />),
    Match.when(TkWidgetKinds.Frame, () => <FrameView {...props} />),
    Match.when(TkWidgetKinds.LabelFrame, () => <FrameView {...props} />),
    Match.when(TkWidgetKinds.Canvas, () => <TkCanvasView {...props} />),
    Match.when(TkWidgetKinds.Scale, () => <ScaleView {...props} />),
    Match.exhaustive
  )
}

// ── geometry managers ──

const isVertical = (side: string): boolean => side !== "left" && side !== "right"

const direction = (side: string): CSSProperties["flexDirection"] =>
  side === "bottom" ? "column-reverse" : side === "left" ? "row" : side === "right" ? "row-reverse" : "column"

const fills = (m: TkManager, axis: "x" | "y"): boolean => m.fill === "both" || m.fill === axis

/**
 * One packed widget: the parcel is a strip along the side of the free space; the widget sits in it by
 * `anchor` and stretches by `fill`. The parcel grows with `expand`.
 */
function Parcel(props: Readonly<{ widget: TkWidget }>) {
  const m = props.widget.manager
  const parcel: CSSProperties = {
    display: "flex",
    flex: `${m.expand ? 1 : 0} 1 auto`,
    alignSelf: "stretch",
    minWidth: 0,
    minHeight: 0,
    padding: `${m.pady[0]}px ${m.padx[1]}px ${m.pady[1]}px ${m.padx[0]}px`,
    justifyContent: anchorX(m.anchor),
    alignItems: anchorY(m.anchor)
  }
  const layout: CSSProperties = {
    flexGrow: fills(m, "x") ? 1 : 0,
    alignSelf: fills(m, "y") ? "stretch" : undefined,
    paddingInline: m.ipadx > 0 ? `calc(${m.ipadx}px + ${props.widget.padx}px)` : undefined,
    paddingBlock: m.ipady > 0 ? `calc(${m.ipady}px + ${props.widget.pady}px)` : undefined
  }
  return (
    <div style={parcel}>
      <TkWidgetView widget={props.widget} layout={layout} />
    </div>
  )
}

/**
 * The pack algorithm of Tk as nested flex boxes: each widget takes a parcel from the free space, the next
 * widgets share the rest. The rest grows by the number of later widgets that expand along the same axis.
 */
function PackChain(props: Readonly<{ items: ReadonlyArray<TkWidget>; index: number; grow: number }>) {
  const item = props.items[props.index]
  if (item === undefined) return null
  const vertical = isVertical(item.manager.side)
  const later = props.items.slice(props.index + 1)
  const restGrow = later.filter((w) => w.manager.expand && isVertical(w.manager.side) === vertical).length
  return (
    <div style={{ display: "flex", flexDirection: direction(item.manager.side), flex: `${props.grow} 1 auto`, alignSelf: "stretch", minWidth: 0, minHeight: 0 }}>
      <Parcel widget={item} />
      {later.length > 0 && <PackChain items={props.items} index={props.index + 1} grow={restGrow} />}
    </div>
  )
}

const tracks = (configs: ReadonlyArray<readonly [number, number, number]>, count: number): string =>
  Array.from({ length: count }, (_, i) => {
    const config = configs.find((c) => c[0] === i)
    const weight = config?.[1] ?? 0
    const minimum = config?.[2] ?? 0
    return weight > 0 ? `minmax(${minimum}px, ${weight}fr)` : `minmax(${minimum}px, max-content)`
  }).join(" ")

const stickyX = (sticky: string): CSSProperties["justifySelf"] =>
  sticky.includes("e") && sticky.includes("w") ? "stretch" : sticky.includes("w") ? "start" : sticky.includes("e") ? "end" : "center"
const stickyY = (sticky: string): CSSProperties["alignSelf"] =>
  sticky.includes("n") && sticky.includes("s") ? "stretch" : sticky.includes("n") ? "start" : sticky.includes("s") ? "end" : "center"

function GridBox(props: Readonly<{ items: ReadonlyArray<TkWidget>; columns: ReadonlyArray<readonly [number, number, number]>; rows: ReadonlyArray<readonly [number, number, number]> }>) {
  const columnCount = Math.max(1, ...props.items.map((w) => w.manager.column + w.manager.columnspan), ...props.columns.map((c) => c[0] + 1))
  const rowCount = Math.max(1, ...props.items.map((w) => w.manager.row + w.manager.rowspan), ...props.rows.map((r) => r[0] + 1))
  return (
    <div
      style={{
        display: "grid",
        flex: "1 1 auto",
        alignSelf: "stretch",
        gridTemplateColumns: tracks(props.columns, columnCount),
        gridTemplateRows: tracks(props.rows, rowCount),
        justifyContent: "start",
        alignContent: "start"
      }}
    >
      {props.items.map((w) => {
        const m = w.manager
        const layout: CSSProperties = {
          gridColumn: `${m.column + 1} / span ${Math.max(1, m.columnspan)}`,
          gridRow: `${m.row + 1} / span ${Math.max(1, m.rowspan)}`,
          justifySelf: stickyX(m.sticky),
          alignSelf: stickyY(m.sticky),
          marginTop: m.pady[0] + w.highlight,
          marginBottom: m.pady[1] + w.highlight,
          marginLeft: m.padx[0] + w.highlight,
          marginRight: m.padx[1] + w.highlight
        }
        return <TkWidgetView key={w.id} widget={w} layout={layout} />
      })}
    </div>
  )
}

const placeShift = (anchor: string): string => {
  const x = anchor === "center" ? "-50%" : anchor.includes("w") ? "0" : anchor.includes("e") ? "-100%" : "-50%"
  const y = anchor === "center" ? "-50%" : anchor.startsWith("n") ? "0" : anchor.startsWith("s") ? "-100%" : "-50%"
  return `translate(${x}, ${y})`
}

const placeLayout = (m: TkManager): CSSProperties => ({
  position: "absolute",
  left: `calc(${m.relx * 100}% + ${m.x}px)`,
  top: `calc(${m.rely * 100}% + ${m.y}px)`,
  width: m.width >= 0 || m.relwidth >= 0 ? `calc(${Math.max(0, m.relwidth) * 100}% + ${Math.max(0, m.width)}px)` : undefined,
  height: m.height >= 0 || m.relheight >= 0 ? `calc(${Math.max(0, m.relheight) * 100}% + ${Math.max(0, m.height)}px)` : undefined,
  boxSizing: m.width >= 0 || m.relwidth >= 0 ? "border-box" : undefined,
  transform: placeShift(m.anchor),
  margin: 0
})

/** The widgets inside a window or a frame. The container is a flex column with `position: relative`. */
export function Children(props: Readonly<{ parent: number }>) {
  const tk = useTk()
  const packed = managedChildren(tk.scene, props.parent, TkManagerKinds.Pack)
  const gridded = managedChildren(tk.scene, props.parent, TkManagerKinds.Grid)
  const placed = managedChildren(tk.scene, props.parent, TkManagerKinds.Place)
  const container = tk.scene.windows.find((w) => w.id === props.parent) ?? tk.scene.widgets.find((w) => w.id === props.parent)
  return (
    <>
      {packed.length > 0 && <PackChain items={packed} index={0} grow={1} />}
      {gridded.length > 0 && <GridBox items={gridded} columns={container?.columns ?? []} rows={container?.rows ?? []} />}
      {placed.map((w) => <TkWidgetView key={w.id} widget={w} layout={placeLayout(w.manager)} />)}
    </>
  )
}

/** Keys for the program: from a field (the field gets them) or from the window. */
export const keyTarget = (e: KeyboardEvent<HTMLElement>, windowId: number): number => {
  const target = e.target
  if (!(target instanceof Element)) return windowId
  const field = target.closest(`[${TkIdAttribute}]`)
  return field === null ? windowId : Number(field.getAttribute(TkIdAttribute) ?? windowId)
}
