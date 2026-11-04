import { beforeAll, describe, expect, test } from "vitest"
import { type Engine, type EngineSink, silentSink } from "../src/engine/engine.ts"
import { loadNodeEngine } from "../src/engine/sources.ts"
import { appendChunk, type Chunk, ChunkKinds, type TurtleOp, ValueKinds } from "../src/engine/protocol.ts"

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

const Out = ChunkKinds.Output

describe("print shows the types of values", () => {
  test("marks a number and leaves a string with the same text plain", () => {
    // Act
    const r = run('print("10", 10)', [])

    // Assert
    expect(r.chunks).toEqual([
      { kind: Out, text: "10 " },
      { kind: Out, text: "10", value: ValueKinds.Number },
      { kind: Out, text: "\n" }
    ])
  })

  test("marks floats as numbers and True, False, None as constants", () => {
    // Act
    const r = run('print(2.5, True, None, [1])', [])

    // Assert
    expect(r.chunks).toEqual([
      { kind: Out, text: "2.5", value: ValueKinds.Number },
      { kind: Out, text: " " },
      { kind: Out, text: "True", value: ValueKinds.Constant },
      { kind: Out, text: " " },
      { kind: Out, text: "None", value: ValueKinds.Constant },
      { kind: Out, text: " [1]\n" }
    ])
  })

  test("keeps sep, end and the text of print as in Python", () => {
    // Act
    const r = run('print(1, "a", 2, sep="-", end="!")\nprint()\nprint(3, sep=None, end=None)\nprint("x", flush=True)', [])

    // Assert
    expect(r.result).toEqual({ _tag: "Finished" })
    expect(outputOf(r.chunks)).toBe("1-a-2!\n3\nx\n")
  })

  test("writes to a file object as before", () => {
    // Act
    const r = run('import io\nf = io.StringIO()\nprint(5, file=f)\nprint(repr(f.getvalue()))', [])

    // Assert
    expect(outputOf(r.chunks)).toBe("'5\\n'\n")
  })

  test("fails like Python when sep is not a string", () => {
    // Act
    const r = run('print(1, 2, sep=5)', [])

    // Assert
    expect(r.result._tag).toBe("Failed")
    expect(r.result._tag === "Failed" && r.result.traceback).toMatch(/TypeError: sep must be None or a string, not int/)
  })

  test("appendChunk joins output of one type and keeps typed input apart", () => {
    // Arrange
    const chunks: Array<Chunk> = []

    // Act
    appendChunk(chunks, { kind: Out, text: "1", value: ValueKinds.Number })
    appendChunk(chunks, { kind: Out, text: "2", value: ValueKinds.Number })
    appendChunk(chunks, { kind: Out, text: "\n" })
    appendChunk(chunks, { kind: Out, text: "a\n" })
    appendChunk(chunks, { kind: ChunkKinds.Input, text: "x\n" })
    appendChunk(chunks, { kind: ChunkKinds.Input, text: "y\n" })

    // Assert
    expect(chunks).toEqual([
      { kind: Out, text: "12", value: ValueKinds.Number },
      { kind: Out, text: "\na\n" },
      { kind: ChunkKinds.Input, text: "x\n" },
      { kind: ChunkKinds.Input, text: "y\n" }
    ])
  })
})

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
      { kind: ChunkKinds.Output, text: "5", value: ValueKinds.Number },
      { kind: ChunkKinds.Output, text: "\n" }
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
