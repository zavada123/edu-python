import { describe, expect, test } from "vitest"
import type { TurtleOp } from "../src/engine/protocol.ts"
import { advance, emptyScene, frameBudget, inMotion, isDone, type Scene } from "../src/core/turtle-scene.ts"

const move = (x: number, y: number, pen: boolean): TurtleOp => ({ _tag: "Move", x, y, pen, color: "red", width: 2 })

const untilDone = (ops: ReadonlyArray<TurtleOp>): Scene => {
  let scene = emptyScene
  for (let frame = 0; frame < 10_000 && !isDone(scene, ops); frame++) scene = advance(scene, ops)
  return scene
}

describe("turtle scene", () => {
  test("draws a long line in parts, frame by frame", () => {
    // Arrange
    const ops = [move(100, 0, true)]

    // Act
    const first = advance(emptyScene, ops)
    const motion = inMotion(first, ops)

    // Assert
    expect(first.applied).toBe(0)
    expect(first.items).toEqual([])
    expect(motion.pose.x).toBe(frameBudget(emptyScene.speed, 1))
    expect(motion.line).toMatchObject({ x1: 0, y1: 0, x2: frameBudget(emptyScene.speed, 1), y2: 0 })
  })

  test("puts the finished line on the paper and moves the turtle", () => {
    // Act
    const scene = untilDone([move(100, 0, true), { _tag: "Turn", heading: 90 }, move(100, 100, false)])

    // Assert
    expect(scene.items).toEqual([{ _tag: "Line", x1: 0, y1: 0, x2: 100, y2: 0, color: "red", width: 2 }])
    expect(scene.turtle).toMatchObject({ x: 100, y: 100, heading: 90 })
  })

  test("speed 0 draws everything in one frame", () => {
    // Arrange
    const ops: ReadonlyArray<TurtleOp> = [{ _tag: "Speed", speed: 0 }, move(500, 0, true), move(0, 0, true)]

    // Act
    const scene = advance(emptyScene, ops)

    // Assert
    expect(isDone(scene, ops)).toBe(true)
    expect(scene.items).toHaveLength(2)
  })

  test("puts a fill under the lines drawn after begin_fill", () => {
    // Arrange
    const ops: ReadonlyArray<TurtleOp> = [
      { _tag: "Dot", x: 0, y: 0, size: 5, color: "black" },
      { _tag: "FillStart" },
      move(10, 0, true),
      move(10, 10, true),
      { _tag: "Fill", points: [0, 0, 10, 0, 10, 10], color: "blue" }
    ]

    // Act
    const scene = untilDone(ops)

    // Assert
    expect(scene.items.map((i) => i._tag)).toEqual(["Dot", "Polygon", "Line", "Line"])
  })

  test("clear removes the drawings and keeps the turtle", () => {
    // Act
    const scene = untilDone([move(10, 0, true), { _tag: "Clear" }])

    // Assert
    expect(scene.items).toEqual([])
    expect(scene.turtle.x).toBe(10)
  })

  test("goes faster when many commands wait", () => {
    // Assert
    expect(frameBudget(3, 1000)).toBeGreaterThan(frameBudget(3, 10))
    expect(frameBudget(0, 1)).toBe(Number.POSITIVE_INFINITY)
  })
})
