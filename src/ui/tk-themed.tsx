import { Match, Option } from "effect"
import type { CSSProperties, ReactNode } from "react"
import { TkIdAttribute } from "../core/tk-input.ts"
import { TkListModes, type TkWidget } from "../core/tk-scene.ts"
import { useTk } from "./tk-context.ts"
import { useWidgetEvents } from "./tk-events.ts"
import { border } from "./tk-field.ts"
import { chooseRows } from "./tk-lists.tsx"
import { scrolledByBar, TkScrollAttribute } from "./tk-text.tsx"

// Themed widgets of ttk that tkinter has not: Progressbar, Separator, Notebook (tabs) and Treeview (a table or
// a tree). The tabs and the rows send Pick, the arrows of the tree send Toggle, the headings send Heading.

type ViewProps = Readonly<{ widget: TkWidget; layout: CSSProperties }>

/** Thickness of a Progressbar, as in Tk on Windows. */
const BarThickness = 18

function ProgressbarView(props: ViewProps) {
  const events = useWidgetEvents(props.widget.id)
  const w = props.widget
  return Option.match(w.progress, {
    onNone: () => null,
    onSome: (p) => {
      const vertical = w.orient === "vertical"
      const share = p.maximum > 0 ? Math.max(0, Math.min(1, p.value / p.maximum)) : 0
      const moving = p.mode === "indeterminate"
      const size: CSSProperties = vertical ? { width: BarThickness, height: p.length } : { width: p.length, height: BarThickness }
      const bar: CSSProperties = moving
        ? { position: "absolute", inset: vertical ? "0 0 auto 0" : "0 auto 0 0", [vertical ? "height" : "width"]: "30%" }
        : { position: "absolute", inset: vertical ? "auto 0 0 0" : "0 auto 0 0", [vertical ? "height" : "width"]: `${share * 100}%` }
      return (
        <div
          {...{ [TkIdAttribute]: w.id }}
          {...events}
          role="progressbar"
          aria-label="Смуга виконання"
          aria-valuemin={0}
          aria-valuemax={p.maximum}
          aria-valuenow={moving ? undefined : p.value}
          className="epy-tk-progress"
          style={{ ...size, background: p.trough === "" ? undefined : p.trough, ...props.layout }}
        >
          <div
            className={moving && p.running ? (vertical ? "epy-tk-progress__bar epy-tk-progress__bar--moving-v" : "epy-tk-progress__bar epy-tk-progress__bar--moving") : "epy-tk-progress__bar"}
            style={{ ...bar, background: p.bar === "" ? undefined : p.bar }}
          />
        </div>
      )
    }
  })
}

function SeparatorView(props: ViewProps) {
  const events = useWidgetEvents(props.widget.id)
  const w = props.widget
  const vertical = w.orient === "vertical"
  return (
    <div
      {...{ [TkIdAttribute]: w.id }}
      {...events}
      role="separator"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      className={vertical ? "epy-tk-separator epy-tk-separator--vertical" : "epy-tk-separator"}
      style={props.layout}
    />
  )
}

function NotebookView(props: ViewProps & Readonly<{ child: ChildView }>) {
  const tk = useTk()
  const events = useWidgetEvents(props.widget.id)
  const w = props.widget
  const tabs = Option.match(w.tabs, { onNone: () => ({ tabs: [], current: -1 }), onSome: (t) => t })
  const byId = new Map(tk.scene.widgets.map((widget) => [widget.id, widget]))
  return (
    <div {...{ [TkIdAttribute]: w.id }} {...events} className="epy-tk-notebook" style={{ font: w.font, ...props.layout }}>
      <div role="tablist" className="epy-tk-notebook__tabs">
        {tabs.tabs.map(([id, text, state], i) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={i === tabs.current}
            disabled={state === "disabled"}
            className={i === tabs.current ? "epy-tk-notebook__tab epy-tk-notebook__tab--current" : "epy-tk-notebook__tab"}
            onClick={() => {
              if (tk.active && i !== tabs.current) tk.send({ _tag: "Pick", widget: w.id, items: [i] })
            }}
          >
            {text}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        className="epy-tk-notebook__panel"
        style={{
          background: w.bg === "" ? undefined : w.bg,
          padding: `${w.pady}px ${w.padx}px`,
          ...(w.width > 0 ? { width: w.width } : {}),
          ...(w.height > 0 ? { height: w.height } : {})
        }}
      >
        {tabs.tabs.map(([id], i) => {
          const child = byId.get(id)
          if (child === undefined) return null
          // All tabs take place, so the notebook has the size of its biggest tab, as in Tk.
          const layout: CSSProperties = { gridArea: "1 / 1", alignSelf: "stretch", justifySelf: "stretch", visibility: i === tabs.current ? "visible" : "hidden" }
          return <div key={id} style={{ display: "contents" }}>{props.child(child, layout)}</div>
        })}
      </div>
    </div>
  )
}

/** Heights of a row and of the headings: the same numbers as `_themed.py` (`identify_row`). */
const RowHeight = 20
const HeadingHeight = 22
const Indent = 18

const cellAlign = (anchor: string): CSSProperties["textAlign"] =>
  anchor.includes("e") && !anchor.includes("w") && anchor !== "center" ? "right" : anchor === "center" || anchor === "n" || anchor === "s" ? "center" : "left"

function TreeviewView(props: ViewProps) {
  const tk = useTk()
  const events = useWidgetEvents(props.widget.id)
  const w = props.widget
  return Option.match(w.tree, {
    onNone: () => null,
    onSome: (tree) => {
      const template = tree.columns.map(([, width]) => `${Math.max(20, width)}px`).join(" ")
      const chosen = tree.rows.flatMap((row, i) => (row[6] ? [i] : []))
      const pick = (row: number, toggle: boolean, range: boolean) => {
        if (!tk.active || tree.mode === "none") return
        const mode = tree.mode === "browse" ? TkListModes.Browse : TkListModes.Extended
        tk.send({ _tag: "Pick", widget: w.id, items: chooseRows(mode, chosen, row, toggle, range, chosen.at(-1) ?? row) })
      }
      return (
        <div
          {...{ [TkIdAttribute]: w.id }}
          {...events}
          className="epy-tk-tree"
          style={{ ...border("sunken", 1), font: w.font, color: w.fg, background: w.bg === "" ? "var(--tk-paper)" : w.bg, ...props.layout }}
        >
          <div
            {...{ [TkScrollAttribute]: w.id }}
            role="treegrid"
            aria-label="Таблиця програми"
            aria-multiselectable={tree.mode === "extended"}
            className="epy-tk-tree__body"
            style={{ height: (tree.headings ? HeadingHeight : 0) + Math.max(1, tree.height) * RowHeight, scrollbarWidth: scrolledByBar(tk.scene, w.id) ? "none" : undefined }}
          >
            {tree.headings && (
              <div role="row" className="epy-tk-tree__row epy-tk-tree__head" style={{ gridTemplateColumns: template, height: HeadingHeight }}>
                {tree.columns.map(([text, , , anchor], i) => (
                  <button
                    key={i}
                    type="button"
                    role="columnheader"
                    className="epy-tk-tree__heading"
                    style={{ textAlign: cellAlign(anchor) }}
                    onClick={() => {
                      if (tk.active) tk.send({ _tag: "Heading", widget: w.id, index: i })
                    }}
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}
            {tree.rows.map(([depth, parent, open, cells, fg, bg, selected], i) => (
              <div
                key={i}
                role="row"
                aria-selected={selected}
                aria-expanded={parent ? open : undefined}
                className={selected ? "epy-tk-tree__row epy-tk-tree__row--selected" : "epy-tk-tree__row"}
                style={{ gridTemplateColumns: template, height: RowHeight, ...(selected ? {} : { color: fg === "" ? undefined : fg, background: bg === "" ? undefined : bg }) }}
                onClick={(e) => {
                  pick(i, e.ctrlKey || e.metaKey, e.shiftKey)
                }}
              >
                {cells.map((cell, c) => {
                  const first = c === 0 && tree.tree
                  return (
                    <span key={c} role="gridcell" className="epy-tk-tree__cell" style={{ textAlign: cellAlign(tree.columns[c]?.[2] ?? "w"), paddingLeft: first ? 4 + depth * Indent : undefined }}>
                      {first && (
                        <span
                          aria-hidden
                          className="epy-tk-tree__toggle"
                          onClick={(e) => {
                            if (!parent) return
                            e.stopPropagation()
                            if (tk.active) tk.send({ _tag: "Toggle", widget: w.id, index: i })
                          }}
                        >
                          {parent ? (open ? "▾" : "▸") : ""}
                        </span>
                      )}
                      {cell}
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )
    }
  })
}

type ChildView = (widget: TkWidget, layout: CSSProperties) => ReactNode

/** A themed widget of ttk; `child` draws a widget inside a tab of a Notebook. */
export function ThemedView(props: ViewProps & Readonly<{ child: ChildView }>): ReactNode {
  return Match.value(props.widget.kind).pipe(
    Match.when("Progressbar", () => <ProgressbarView {...props} />),
    Match.when("Separator", () => <SeparatorView {...props} />),
    Match.when("Notebook", () => <NotebookView {...props} />),
    Match.when("Treeview", () => <TreeviewView {...props} />),
    Match.orElse(() => null)
  )
}
