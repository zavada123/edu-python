import { beforeAll, describe, expect, test } from "vitest"
import { type Engine, type EngineSink, silentSink } from "../src/engine/engine.ts"
import { loadNodeEngine } from "../src/engine/sources.ts"
import { type Chunk, ChunkKinds, type TurtleOp } from "../src/engine/protocol.ts"

let engine: Engine

beforeAll(async () => {
  engine = await loadNodeEngine()
})

interface Captured {
  readonly chunks: Array<Chunk>
  readonly ops: Array<TurtleOp>
  readonly overflows: Array<true>
  readonly sink: EngineSink
}

const capture = (): Captured => {
  const chunks: Array<Chunk> = []
  const ops: Array<TurtleOp> = []
  const overflows: Array<true> = []
  return {
    chunks,
    ops,
    overflows,
    sink: { ...silentSink, chunk: (c) => chunks.push(c), op: (o) => ops.push(o), overflow: () => overflows.push(true) }
  }
}

const outputOf = (chunks: ReadonlyArray<Chunk>): string => chunks.map((c) => c.text).join("")

const run = (code: string, inputs: ReadonlyArray<string>) => {
  const captured = capture()
  const result = engine.run({ _tag: "Run", code, inputs, seed: 7 }, captured.sink)
  return { result, ...captured }
}

describe("engine", () => {
  test("prints text with Ukrainian letters and numbers", () => {
    // Act
    const r = run('x = 7\nprint(f"Привіт, {x}!", x // 2, 10 / 4)\nprint("a", end="")\nprint("b")', [])

    // Assert
    expect(r.result).toEqual({ _tag: "Finished" })
    expect(outputOf(r.chunks)).toBe("Привіт, 7! 3 2.5\nab\n")
  })

  test("stops with NeedInput when a value for input() is missing", () => {
    // Act
    const r = run('name = input("Як тебе звати? ")\nprint("Привіт,", name)', [])

    // Assert
    expect(r.result).toEqual({ _tag: "NeedInput" })
    expect(r.chunks).toEqual([{ kind: ChunkKinds.Prompt, text: "Як тебе звати? " }])
  })

  test("uses the given values for input() and shows them as typed input", () => {
    // Act
    const r = run('a = int(input("a? "))\nb = int(input())\nprint(a + b)', ["2", "3"])

    // Assert
    expect(r.result).toEqual({ _tag: "Finished" })
    expect(r.chunks).toEqual([
      { kind: ChunkKinds.Prompt, text: "a? " },
      { kind: ChunkKinds.Input, text: "2\n" },
      { kind: ChunkKinds.Input, text: "3\n" },
      { kind: ChunkKinds.Output, text: "5\n" }
    ])
  })

  test("returns the traceback of an error with the line number", () => {
    // Act
    const r = run('print(1)\npritn("x")', [])

    // Assert
    expect(r.result._tag).toBe("Failed")
    expect(r.result._tag === "Failed" && r.result.traceback).toContain('File "main.py", line 2')
    expect(r.result._tag === "Failed" && r.result.traceback).toContain("NameError: name 'pritn' isn't defined")
  })

  test("gives the same random numbers for the same seed", () => {
    // Act
    const first = run("from random import randint\nprint(randint(1, 1000), randint(1, 1000))", [])
    const second = run("from random import randint\nprint(randint(1, 1000), randint(1, 1000))", [])

    // Assert
    expect(outputOf(first.chunks)).toBe(outputOf(second.chunks))
  })

  test("does not keep variables between runs", () => {
    // Arrange
    run("x = 5", [])

    // Act
    const r = run("print(x)", [])

    // Assert
    expect(r.result._tag).toBe("Failed")
  })

  test("calls overflow once when the output is too long", () => {
    // Act
    const r = run('for i in range(30000):\n    print("0123456789")', [])

    // Assert
    expect(r.overflows).toEqual([true])
  })

  test("draws with the turtle: square with the CPython geometry", () => {
    // Act
    const r = run("from turtle import *\nfor i in range(4):\n    forward(100)\n    left(90)\nprint(position())", [])

    // Assert
    expect(r.result).toEqual({ _tag: "Finished" })
    const moves = r.ops.filter((o) => o._tag === "Move")
    expect(moves).toHaveLength(4)
    expect(moves[0]).toMatchObject({ x: 100, y: 0, pen: true, color: "black" })
    expect(outputOf(r.chunks)).toMatch(/^\(-?0\.0, -?0\.0\)\n$/)
  })

  test("supports the textbook commands of the turtle", () => {
    // Arrange
    const code = [
      "from turtle import *",
      "bgcolor('light blue')",
      "color('red', 'blue')",
      "width(5)",
      "up()",
      "goto(-40, 50)",
      "down()",
      "begin_fill()",
      "circle(50)",
      "end_fill()",
      "dot(20, 'orange')",
      "write('Легка атлетика', font='Arial 16')",
      "stamp()",
      "shape('turtle')",
      "done()"
    ].join("\n")

    // Act
    const r = run(code, [])

    // Assert
    expect(r.result).toEqual({ _tag: "Finished" })
    const tags = new Set(r.ops.map((o) => o._tag))
    expect([...tags].sort()).toEqual(["Background", "Dot", "Fill", "FillStart", "Look", "Move", "Stamp", "Text", "Turn"])
    expect(r.ops).toContainEqual({ _tag: "Background", color: "lightblue" })
    expect(r.ops).toContainEqual(expect.objectContaining({ _tag: "Text", text: "Легка атлетика", font: "normal normal 21px Arial" }))
    const fill = r.ops.find((o) => o._tag === "Fill")
    expect(fill).toMatchObject({ color: "blue" })
  })
})
