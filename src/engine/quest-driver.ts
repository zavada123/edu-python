/**
 * The driver of the Python tasks (`edu-python/quests`) on an engine in the same thread: tests in Node and checks
 * on a server. It has no time limit: the caller runs it where a long program can be stopped (a worker thread).
 */
import type { Driver, DriverFactory, Turn, TurnEnd } from "../quests/run.ts"
import { type Engine, type EngineSink, type RunResult, silentSink } from "./engine.ts"
import { ChunkKinds, inputLines, TestSeed } from "./protocol.ts"

const endOf = (result: RunResult): TurnEnd => {
  switch (result._tag) {
    case "Finished":
    case "Waiting":
    case "NeedInput":
    case "Failed":
      return result._tag
    case "Asking":
      return "NeedInput"
  }
}

export const engineDriver = (engine: Engine): DriverFactory => (): Driver => {
  const turn = (act: (sink: EngineSink) => RunResult): Promise<Turn> => {
    const out = { output: "", scene: "", overflow: false }
    const result = act({
      ...silentSink,
      chunk: (c) => {
        if (c.kind === ChunkKinds.Output) out.output += c.text
      },
      scene: (s) => {
        out.scene = s
      },
      overflow: () => {
        out.overflow = true
      }
    })
    const end: TurnEnd = out.overflow ? "OutputLimit" : endOf(result)
    return Promise.resolve({ end, output: out.output, scene: out.scene, traceback: result._tag === "Failed" ? result.traceback : "" })
  }
  return {
    run: (code, input) => turn((sink) => engine.run({ _tag: "Run", code, inputs: inputLines(input), seed: TestSeed }, sink)),
    event: (input) => turn((sink) => engine.event({ _tag: "Event", input, layout: [] }, sink)),
    close: () => undefined
  }
}
