import { useEffect, useRef } from "react"
import type { TurtleOp } from "../engine/protocol.ts"
import { advance, emptyScene, inMotion, isDone, type PaperItem, type PartialLine, type Scene, type TurtlePose } from "../core/turtle-scene.ts"

// Turtle canvas: 600 × 600 turtle units (origin in the centre, y goes up), the same as the textbook
// window. Finished drawings are kept on an offscreen "paper" canvas; each frame copies the paper and
// draws the line in progress and the turtle.

const Size = 600
const MaxPixelRatio = 2

const arrow = (ctx: CanvasRenderingContext2D, x: number, y: number, heading: number, pen: string, fill: string): void => {
  ctx.save()
  ctx.translate(x, -y)
  ctx.rotate((-heading * Math.PI) / 180)
  ctx.beginPath()
  ctx.moveTo(10, 0)
  ctx.lineTo(-6, 6)
  ctx.lineTo(-3, 0)
  ctx.lineTo(-6, -6)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.strokeStyle = pen
  ctx.lineWidth = 1
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

const line = (ctx: CanvasRenderingContext2D, l: PartialLine): void => {
  ctx.beginPath()
  ctx.moveTo(l.x1, -l.y1)
  ctx.lineTo(l.x2, -l.y2)
  ctx.strokeStyle = l.color
  ctx.lineWidth = Math.max(1, l.width)
  ctx.stroke()
}

const drawItem = (ctx: CanvasRenderingContext2D, item: PaperItem): void => {
  switch (item._tag) {
    case "Line":
      return line(ctx, item)
    case "Dot":
      ctx.beginPath()
      ctx.arc(item.x, -item.y, Math.max(0.5, item.size / 2), 0, 2 * Math.PI)
      ctx.fillStyle = item.color
      ctx.fill()
      return
    case "Polygon": {
      ctx.beginPath()
      for (let i = 0; i + 1 < item.points.length; i += 2) {
        const x = item.points[i] ?? 0
        const y = -(item.points[i + 1] ?? 0)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fillStyle = item.color
      ctx.fill()
      return
    }
    case "Text":
      ctx.font = item.font
      ctx.fillStyle = item.color
      ctx.textAlign = item.align === "center" || item.align === "right" ? item.align : "left"
      ctx.textBaseline = "alphabetic"
      ctx.fillText(item.text, item.x, -item.y)
      return
    case "Stamp":
      return arrow(ctx, item.x, item.y, item.heading, item.pen, item.fill)
  }
}

const prepare = (canvas: HTMLCanvasElement, ratio: number): CanvasRenderingContext2D | null => {
  const ctx = canvas.getContext("2d")
  if (ctx === null) return null
  ctx.setTransform(ratio, 0, 0, ratio, (Size / 2) * ratio, (Size / 2) * ratio)
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  return ctx
}

const drawTurtle = (ctx: CanvasRenderingContext2D, pose: TurtlePose): void => {
  if (pose.visible) arrow(ctx, pose.x, pose.y, pose.heading, pose.pen, pose.fill)
}

interface Player {
  /** A new run: empty paper, turtle in the centre. */
  readonly reset: () => void
  /** All commands of the run so far (the list only grows during a run). */
  readonly update: (ops: ReadonlyArray<TurtleOp>) => void
  readonly dispose: () => void
}

const createPlayer = (visible: HTMLCanvasElement, ratio: number): Player => {
  const paper = document.createElement("canvas")
  paper.width = Size * ratio
  paper.height = Size * ratio
  let scene: Scene = emptyScene
  let ops: ReadonlyArray<TurtleOp> = []
  /** Count of scene items already on the paper canvas. */
  let drawn = 0
  let frame: number | null = null

  const render = (): void => {
    const paperCtx = prepare(paper, ratio)
    const ctx = visible.getContext("2d")
    if (paperCtx === null || ctx === null) return
    if (scene.redraw || drawn > scene.items.length) {
      paperCtx.save()
      paperCtx.setTransform(1, 0, 0, 1, 0, 0)
      paperCtx.clearRect(0, 0, paper.width, paper.height)
      paperCtx.restore()
      drawn = 0
    }
    for (const item of scene.items.slice(drawn)) drawItem(paperCtx, item)
    drawn = scene.items.length
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = scene.background
    ctx.fillRect(0, 0, visible.width, visible.height)
    ctx.drawImage(paper, 0, 0)
    const view = prepare(visible, ratio)
    if (view === null) return
    const motion = inMotion(scene, ops)
    if (motion.line !== null) line(view, motion.line)
    drawTurtle(view, motion.pose)
  }

  const tick = (): void => {
    scene = advance(scene, ops)
    render()
    frame = isDone(scene, ops) ? null : requestAnimationFrame(tick)
  }

  return {
    reset: () => {
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
      scene = emptyScene
      ops = []
      drawn = Number.POSITIVE_INFINITY
      render()
    },
    update: (next) => {
      ops = next
      if (frame === null && !isDone(scene, ops)) frame = requestAnimationFrame(tick)
    },
    dispose: () => {
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
    }
  }
}

export function TurtleCanvas(props: Readonly<{ ops: ReadonlyArray<TurtleOp>; runId: number }>) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const player = useRef<Player | null>(null)
  const ratio = typeof window === "undefined" ? 1 : Math.min(MaxPixelRatio, Math.max(1, window.devicePixelRatio))

  useEffect(() => {
    if (canvas.current === null) return
    const created = createPlayer(canvas.current, ratio)
    player.current = created
    return () => {
      created.dispose()
      player.current = null
    }
  }, [ratio])

  useEffect(() => {
    player.current?.reset()
  }, [props.runId])

  useEffect(() => {
    player.current?.update(props.ops)
  }, [props.ops])

  return (
    <canvas
      ref={canvas}
      width={Size * ratio}
      height={Size * ratio}
      role="img"
      aria-label="Малюнок Черепашки"
      className="epy-turtle"
    />
  )
}
