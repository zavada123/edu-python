/**
 * Turtle animation without the DOM: applies the commands of a run (`TurtleOp`) frame by frame. Each frame
 * has a distance budget: the turtle draws a line in parts, so the student sees how it moves.
 */
import type { TurtleOp } from "../engine/protocol.ts"

/** A finished drawing on the paper. */
export type PaperItem =
  | { readonly _tag: "Line"; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number; readonly color: string; readonly width: number }
  | { readonly _tag: "Dot"; readonly x: number; readonly y: number; readonly size: number; readonly color: string }
  | { readonly _tag: "Polygon"; readonly points: ReadonlyArray<number>; readonly color: string }
  | { readonly _tag: "Text"; readonly x: number; readonly y: number; readonly text: string; readonly align: string; readonly font: string; readonly color: string }
  | { readonly _tag: "Stamp"; readonly x: number; readonly y: number; readonly heading: number; readonly pen: string; readonly fill: string }

export interface TurtlePose {
  readonly x: number
  readonly y: number
  readonly heading: number
  readonly visible: boolean
  readonly pen: string
  readonly fill: string
}

export interface Scene {
  readonly items: ReadonlyArray<PaperItem>
  readonly background: string
  readonly turtle: TurtlePose
  readonly speed: number
  /** Index in `items` where the next fill goes (`FillStart`). */
  readonly fillStart: number
  /** Count of commands that are applied completely. */
  readonly applied: number
  /** Distance that the turtle has already gone in the current `Move` command. */
  readonly progress: number
  /** `true` when items changed not only at the end (fill, clear, background): the paper is drawn again. */
  readonly redraw: boolean
}

export const DefaultSpeed = 3

export const emptyScene: Scene = {
  items: [],
  background: "white",
  turtle: { x: 0, y: 0, heading: 0, visible: true, pen: "black", fill: "black" },
  speed: DefaultSpeed,
  fillStart: 0,
  applied: 0,
  progress: 0,
  redraw: false
}

/** Distance per frame for speed 1; speed 0 draws at once. With many commands waiting, the turtle goes faster. */
const PixelsPerSpeed = 4
const BacklogStep = 150

export const frameBudget = (speed: number, waiting: number): number => {
  if (speed <= 0) return Number.POSITIVE_INFINITY
  return Math.min(speed, 10) * PixelsPerSpeed * (1 + Math.floor(waiting / BacklogStep))
}

const finite = (n: number, fallback: number): number => (Number.isFinite(n) ? n : fallback)

/** Line of the current `Move` that is drawn only in part, for the frame. */
export interface PartialLine {
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
  readonly color: string
  readonly width: number
}

interface Working {
  items: Array<PaperItem>
  background: string
  turtle: TurtlePose
  speed: number
  fillStart: number
  redraw: boolean
}

/** Applies one command that takes no time (all except `Move`). */
const applyInstant = (w: Working, op: Exclude<TurtleOp, { readonly _tag: "Move" }>): void => {
  switch (op._tag) {
    case "Turn":
      w.turtle = { ...w.turtle, heading: finite(op.heading, w.turtle.heading) }
      return
    case "Dot":
      w.items.push({ _tag: "Dot", x: op.x, y: op.y, size: op.size, color: op.color })
      return
    case "FillStart":
      w.fillStart = w.items.length
      return
    case "Fill": {
      const at = Math.min(w.fillStart, w.items.length)
      w.items.splice(at, 0, { _tag: "Polygon", points: op.points, color: op.color })
      w.redraw = true
      return
    }
    case "Text":
      w.items.push({ _tag: "Text", x: op.x, y: op.y, text: op.text, align: op.align, font: op.font, color: op.color })
      return
    case "Stamp":
      w.items.push({ _tag: "Stamp", x: op.x, y: op.y, heading: op.heading, pen: w.turtle.pen, fill: op.color })
      return
    case "Background":
      w.background = op.color
      w.redraw = true
      return
    case "Clear":
      w.items = []
      w.fillStart = 0
      w.redraw = true
      return
    case "Visible":
      w.turtle = { ...w.turtle, visible: op.visible }
      return
    case "Look":
      w.turtle = { ...w.turtle, pen: op.pen, fill: op.fill }
      return
    case "Speed":
      w.speed = finite(op.speed, DefaultSpeed)
      return
  }
}

/** Applies commands from `scene.applied` while the frame budget lasts. */
export const advance = (scene: Scene, ops: ReadonlyArray<TurtleOp>): Scene => {
  const w: Working = {
    items: [...scene.items],
    background: scene.background,
    turtle: scene.turtle,
    speed: scene.speed,
    fillStart: scene.fillStart,
    redraw: false
  }
  let applied = scene.applied
  let progress = scene.progress
  let budget = frameBudget(scene.speed, ops.length - applied)
  while (applied < ops.length) {
    const op = ops[applied]
    if (op === undefined) break
    if (op._tag !== "Move") {
      applyInstant(w, op)
      applied++
      if (op._tag === "Speed") budget = frameBudget(w.speed, ops.length - applied)
      continue
    }
    const x = finite(op.x, w.turtle.x)
    const y = finite(op.y, w.turtle.y)
    const length = Math.hypot(x - w.turtle.x, y - w.turtle.y)
    if (length - progress > budget) {
      progress += budget
      break
    }
    budget -= length - progress
    if (op.pen) w.items.push({ _tag: "Line", x1: w.turtle.x, y1: w.turtle.y, x2: x, y2: y, color: op.color, width: op.width })
    w.turtle = { ...w.turtle, x, y }
    progress = 0
    applied++
  }
  return { items: w.items, background: w.background, turtle: w.turtle, speed: w.speed, fillStart: w.fillStart, applied, progress, redraw: w.redraw }
}

/** The turtle in the middle of a `Move`, and the part of the line that it has drawn. */
export const inMotion = (scene: Scene, ops: ReadonlyArray<TurtleOp>): { readonly pose: TurtlePose; readonly line: PartialLine | null } => {
  const op = ops[scene.applied]
  if (op?._tag !== "Move" || scene.progress === 0) return { pose: scene.turtle, line: null }
  const { x: x1, y: y1 } = scene.turtle
  const length = Math.hypot(op.x - x1, op.y - y1)
  const t = length === 0 ? 1 : scene.progress / length
  const x2 = x1 + (op.x - x1) * t
  const y2 = y1 + (op.y - y1) * t
  return {
    pose: { ...scene.turtle, x: x2, y: y2 },
    line: op.pen ? { x1, y1, x2, y2, color: op.color, width: op.width } : null
  }
}

export const isDone = (scene: Scene, ops: ReadonlyArray<TurtleOp>): boolean => scene.applied >= ops.length
