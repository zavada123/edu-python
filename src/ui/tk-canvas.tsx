import { Match } from "effect"
import type { CSSProperties, ReactNode } from "react"
import { TkIdAttribute, TkItemAttribute } from "../core/tk-input.ts"
import { TkBindKinds, type TkItem, TkItemTypes, type TkWidget, waitsFor } from "../core/tk-scene.ts"
import { useTk } from "./tk-context.ts"
import { useWidgetEvents } from "./tk-events.ts"

// Canvas of tkinter as SVG. Coordinates are the same as in Tk: (0; 0) is the top left corner of the
// canvas, y goes down. Figures are drawn in the order of the canvas: later figures are on top.

type Point = readonly [number, number]

const pointsOf = (coords: ReadonlyArray<number>): ReadonlyArray<Point> =>
  Array.from({ length: Math.floor(coords.length / 2) }, (_, i): Point => [coords[2 * i] ?? 0, coords[2 * i + 1] ?? 0])

const middle = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]

const at = (p: Point): string => `${p[0]} ${p[1]}`

/** Path through the points; with `smooth` a quadratic B-spline, as Tk draws it. */
const pathOf = (points: ReadonlyArray<Point>, smooth: boolean, closed: boolean): string => {
  const first = points[0]
  if (first === undefined) return ""
  if (!smooth || points.length < 3) return `M ${points.map(at).join(" L ")}${closed ? " Z" : ""}`
  const all = closed ? [...points, first, points[1] ?? first] : points
  const start = closed ? middle(first, points[1] ?? first) : first
  const parts = [`M ${at(start)}`]
  for (let i = 1; i < all.length - 1; i++) {
    const control = all[i] ?? first
    const next = all[i + 1] ?? first
    const end = !closed && i === all.length - 2 ? next : middle(control, next)
    parts.push(`Q ${at(control)} ${at(end)}`)
  }
  return parts.join(" ") + (closed ? " Z" : "")
}

/** The arrow head of Tk at `tip`, for a line that comes from `from`; returns the head and the new line end. */
const arrowHead = (tip: Point, from: Point, shape: ReadonlyArray<number>, width: number): readonly [string, Point] => {
  const dx = tip[0] - from[0]
  const dy = tip[1] - from[1]
  const length = Math.hypot(dx, dy) || 1
  const ux = dx / length
  const uy = dy / length
  const neck = shape[0] ?? 8
  const back = shape[1] ?? 10
  const side = (shape[2] ?? 3) + width / 2
  const base: Point = [tip[0] - ux * back, tip[1] - uy * back]
  const head = [tip, [base[0] - uy * side, base[1] + ux * side], [tip[0] - ux * neck, tip[1] - uy * neck], [base[0] + uy * side, base[1] - ux * side]]
    .map((p) => `${p[0]},${p[1]}`)
    .join(" ")
  return [head, [tip[0] - ux * neck, tip[1] - uy * neck]]
}

const cap = (style: string): "butt" | "round" | "square" => (style === "round" ? "round" : style === "projecting" ? "square" : "butt")
const join = (style: string): "bevel" | "miter" | "round" => (style === "bevel" ? "bevel" : style === "miter" ? "miter" : "round")
const paint = (color: string): string => (color === "" ? "none" : color)

const stroke = (item: TkItem, color: string) => ({
  stroke: paint(color),
  strokeWidth: item.width,
  strokeDasharray: item.dash.length > 0 ? item.dash.join(" ") : undefined
})

function LineItem(props: Readonly<{ item: TkItem }>) {
  const item = props.item
  const points = [...pointsOf(item.coords)]
  const heads: Array<string> = []
  const first = points[0]
  const second = points[1]
  const last = points.at(-1)
  const beforeLast = points.at(-2)
  if (first !== undefined && second !== undefined && (item.arrow === "first" || item.arrow === "both")) {
    const [head, end] = arrowHead(first, second, item.arrowshape, item.width)
    heads.push(head)
    points[0] = end
  }
  if (last !== undefined && beforeLast !== undefined && (item.arrow === "last" || item.arrow === "both")) {
    const [head, end] = arrowHead(last, beforeLast, item.arrowshape, item.width)
    heads.push(head)
    points[points.length - 1] = end
  }
  return (
    <g {...{ [TkItemAttribute]: item.id }}>
      <path d={pathOf(points, item.smooth, false)} fill="none" {...stroke(item, item.fill)} strokeLinecap={cap(item.capstyle)} strokeLinejoin={join(item.joinstyle)} />
      {heads.map((head, i) => <polygon key={i} points={head} fill={paint(item.fill)} />)}
    </g>
  )
}

const box = (coords: ReadonlyArray<number>) => {
  const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = coords
  return { left: Math.min(x1, x2), top: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) }
}

const FullCircle = 360

const arcPath = (item: TkItem): string => {
  const b = box(item.coords)
  const rx = b.width / 2
  const ry = b.height / 2
  const cx = b.left + rx
  const cy = b.top + ry
  const extent = Math.max(-FullCircle, Math.min(FullCircle, item.extent))
  const pointAt = (degrees: number): Point => [cx + rx * Math.cos((degrees * Math.PI) / 180), cy - ry * Math.sin((degrees * Math.PI) / 180)]
  if (Math.abs(extent) >= FullCircle) {
    const left = pointAt(180)
    const right = pointAt(0)
    return `M ${at(right)} A ${rx} ${ry} 0 1 0 ${at(left)} A ${rx} ${ry} 0 1 0 ${at(right)}`
  }
  const start = pointAt(item.start)
  const end = pointAt(item.start + extent)
  const large = Math.abs(extent) > 180 ? 1 : 0
  const sweep = extent > 0 ? 0 : 1
  const curve = `A ${rx} ${ry} 0 ${large} ${sweep} ${at(end)}`
  return Match.value(item.style).pipe(
    Match.when("arc", () => `M ${at(start)} ${curve}`),
    Match.when("chord", () => `M ${at(start)} ${curve} Z`),
    Match.orElse(() => `M ${cx} ${cy} L ${at(start)} ${curve} Z`)
  )
}

const fontPixels = (font: string): number => Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? "12")

function TextItem(props: Readonly<{ item: TkItem }>) {
  const item = props.item
  const [x = 0, y = 0] = item.coords
  const lines = item.text.split("\n")
  const lineHeight = fontPixels(item.font) * 1.2
  const height = lines.length * lineHeight
  const anchor = item.anchor
  const top = anchor === "center" || !(anchor.startsWith("n") || anchor.startsWith("s")) ? y - height / 2 : anchor.startsWith("n") ? y : y - height
  const textAnchor = anchor === "center" ? "middle" : anchor.includes("w") ? "start" : anchor.includes("e") ? "end" : "middle"
  return (
    <text
      {...{ [TkItemAttribute]: item.id }}
      x={x}
      y={top}
      fill={paint(item.fill)}
      textAnchor={textAnchor}
      dominantBaseline="text-before-edge"
      transform={item.angle !== 0 ? `rotate(${-item.angle} ${x} ${y})` : undefined}
      style={{ font: item.font, textDecoration: item.underline ? "underline" : undefined, whiteSpace: "pre", userSelect: "none" }}
    >
      {lines.map((line, i) => <tspan key={i} x={x} y={top + i * lineHeight}>{line}</tspan>)}
    </text>
  )
}

function CanvasItem(props: Readonly<{ item: TkItem }>): ReactNode {
  const item = props.item
  if (item.hidden) return null
  const id = { [TkItemAttribute]: item.id }
  return Match.value(item.type).pipe(
    Match.when(TkItemTypes.Line, () => <LineItem item={item} />),
    Match.when(TkItemTypes.Rectangle, () => {
      const b = box(item.coords)
      return <rect {...id} x={b.left} y={b.top} width={b.width} height={b.height} fill={paint(item.fill)} {...stroke(item, item.outline)} />
    }),
    Match.when(TkItemTypes.Oval, () => {
      const b = box(item.coords)
      return <ellipse {...id} cx={b.left + b.width / 2} cy={b.top + b.height / 2} rx={b.width / 2} ry={b.height / 2} fill={paint(item.fill)} {...stroke(item, item.outline)} />
    }),
    Match.when(TkItemTypes.Polygon, () => (
      <path {...id} d={pathOf(pointsOf(item.coords), item.smooth, true)} fill={paint(item.fill)} {...stroke(item, item.outline)} strokeLinejoin={join(item.joinstyle)} />
    )),
    Match.when(TkItemTypes.Arc, () => (
      <path {...id} d={arcPath(item)} fill={item.style === "arc" ? "none" : paint(item.fill)} {...stroke(item, item.outline)} />
    )),
    Match.when(TkItemTypes.Text, () => <TextItem item={item} />),
    Match.exhaustive
  )
}

export function TkCanvasView(props: Readonly<{ widget: TkWidget; layout: CSSProperties }>) {
  const tk = useTk()
  const events = useWidgetEvents(props.widget.id)
  const w = props.widget
  const edge = w.highlight + w.bd
  const width = Math.max(1, w.width + 2 * edge)
  const height = Math.max(1, w.height + 2 * edge)
  // A drawing program gets the moves of a finger; otherwise the finger scrolls the page.
  const drags = waitsFor(tk.scene, w.id, TkBindKinds.Motion)
  return (
    <svg
      {...{ [TkIdAttribute]: w.id }}
      {...events}
      role="img"
      aria-label="Полотно програми"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", flex: "none", background: w.bg === "" ? "transparent" : w.bg, overflow: "hidden", touchAction: drags ? "none" : undefined, ...props.layout }}
    >
      {w.items.map((item) => <CanvasItem key={item.id} item={item} />)}
    </svg>
  )
}
