/**
 * One "Run" of a program on the page: starts the worker, keeps the time limit, asks for `input()` values
 * and runs the program again with them (`protocol.ts`), sends the user actions in the windows of a tkinter
 * program, and builds the state that the view shows.
 */
import { Option } from "effect"
import { explainError, type ProgramError } from "./errors.ts"
import { decodeAsk, decodeDialog, decodeImage, decodeScene, type TkAsk, type TkDialog, type TkImage, type TkScene } from "./tk-scene.ts"
import {
  type Chunk,
  type EventRequest,
  MouseKinds,
  type ProgramFile,
  TimeLimitMs,
  type TkBox,
  type TkInput,
  type TurtleOp,
  type WorkerMessage,
  type WorkerRequest
} from "../engine/protocol.ts"

export const StopReasons = {
  User: "user",
  TimeLimit: "time-limit",
  OutputLimit: "output-limit",
  LoadFailed: "load-failed"
} as const
export type StopReason = (typeof StopReasons)[keyof typeof StopReasons]

export type RunStatus =
  | { readonly _tag: "Idle" }
  /** The worker loads the engine (first run on the page). */
  | { readonly _tag: "Loading" }
  | { readonly _tag: "Running" }
  | { readonly _tag: "WaitingInput" }
  /** The windows of a tkinter program wait for user actions. */
  | { readonly _tag: "Window" }
  /** A dialog of tkinter (askyesno, askopenfilename…) waits for the answer of the student. */
  | { readonly _tag: "Asking"; readonly ask: TkAsk }
  | { readonly _tag: "Finished" }
  | { readonly _tag: "Failed"; readonly error: ProgramError }
  | { readonly _tag: "Stopped"; readonly reason: StopReason }

export interface RunView {
  readonly status: RunStatus
  readonly chunks: ReadonlyArray<Chunk>
  readonly ops: ReadonlyArray<TurtleOp>
  /** Windows of a tkinter program. */
  readonly scene: Option.Option<TkScene>
  /** Message windows that wait for "OK": the first one is shown. */
  readonly dialogs: ReadonlyArray<TkDialog>
  /** Pictures of `PhotoImage` by number. */
  readonly images: ReadonlyMap<number, TkImage>
  /** Files that the program saved: the student can download them. One file for each name, the last one. */
  readonly downloads: ReadonlyArray<ProgramFile>
}

export const idleView: RunView = { status: { _tag: "Idle" }, chunks: [], ops: [], scene: Option.none(), dialogs: [], images: new Map(), downloads: [] }

/** A dialog that the engine sent but the page cannot read: the student can only close it. */
const brokenAsk: TkAsk = { kind: "question", title: "", message: "", buttons: ["ok"] }

/** The worker as the session sees it: `worker.ts` in the browser, a fake in tests. */
export interface WorkerPort {
  readonly post: (request: WorkerRequest) => void
  readonly terminate: () => void
}

export type WorkerFactory = (onMessage: (message: WorkerMessage) => void) => WorkerPort

export interface RunSession {
  readonly start: (code: string) => void
  readonly provideInput: (value: string) => void
  /** A user action in a window; `layout` gives the places of the widgets on the page. */
  readonly send: (input: TkInput, layout: ReadonlyArray<TkBox>) => void
  /** The student clicked "OK" in the first message window. */
  readonly closeDialog: () => void
  /**
   * The answer to the dialog of `Asking` (JSON value; null when the student closed it). `files`: files that
   * the student gave to the program in an "Open" dialog.
   */
  readonly answer: (value: unknown, files?: ReadonlyArray<ProgramFile>) => void
  /** The student downloaded or closed the offer of a saved file. */
  readonly dismissDownload: (name: string) => void
  readonly stop: () => void
  /** The page closes the runner: the worker is stopped, its messages are not used. */
  readonly dispose: () => void
}

const MaxSeed = 2 ** 30

const isBusy = (status: RunStatus): boolean => status._tag === "Loading" || status._tag === "Running"

export const createRunSession = (createWorker: WorkerFactory, onChange: (view: RunView) => void): RunSession => {
  let worker: WorkerPort | null = null
  /** Messages of a worker that was stopped are not used. */
  let generation = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let code = ""
  let seed = 0
  let inputs: Array<string> = []
  let view: RunView = idleView
  /** Output of the current replay. Replays repeat the output of the previous ones first. */
  let segmentChunks: Array<Chunk> = []
  let segmentOps: Array<TurtleOp> = []
  /** User actions that the worker did not finish yet. Pointer moves are dropped while it is busy. */
  let pending = 0
  /** Answers to the dialogs of the run (before `mainloop()`), sent with each replay. */
  let runAnswers: Array<string> = []
  /** The user action whose handler asks, with the answers so far; null when the run itself asks. */
  let asker: EventRequest | null = null

  const publish = (next: RunView): void => {
    view = next
    onChange(view)
  }

  const clearTimer = (): void => {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  const kill = (): void => {
    clearTimer()
    worker?.terminate()
    worker = null
    generation++
  }

  const finish = (status: RunStatus): void => {
    clearTimer()
    publish({ ...view, status })
  }

  const halt = (reason: StopReason): void => {
    kill()
    // "Stop" closes the windows, as in IDLE; after the time limit the student sees where the program stopped.
    const closed = reason === StopReasons.User ? { scene: Option.none(), dialogs: [] } : {}
    publish({ ...view, ...closed, status: { _tag: "Stopped", reason } })
  }

  const armTimer = (): void => {
    clearTimer()
    timer = setTimeout(() => {
      halt(StopReasons.TimeLimit)
    }, TimeLimitMs)
  }

  const sceneAfter = (scenes: ReadonlyArray<string>): Option.Option<TkScene> => {
    const last = scenes.at(-1)
    if (last === undefined) return view.scene
    const update = decodeScene(last)
    switch (update._tag) {
      case "Scene":
        return Option.some(update.scene)
      case "Closed":
        return Option.none()
      case "Invalid":
        return view.scene
    }
  }

  const imagesAfter = (images: ReadonlyArray<string>): ReadonlyMap<number, TkImage> => {
    if (images.length === 0) return view.images
    const next = new Map(view.images)
    for (const json of images) Option.map(decodeImage(json), (image) => next.set(image.id, image))
    return next
  }

  const downloadsAfter = (files: ReadonlyArray<ProgramFile>): ReadonlyArray<ProgramFile> =>
    files.length === 0 ? view.downloads : [...view.downloads.filter((d) => !files.some((f) => f.name === d.name)), ...files]

  const done = (): void => {
    pending = Math.max(0, pending - 1)
  }

  const onMessage = (message: WorkerMessage): void => {
    switch (message._tag) {
      case "Started":
        armTimer()
        return publish({ ...view, status: { _tag: "Running" } })
      case "Handling":
        return armTimer()
      case "Progress": {
        segmentChunks = [...segmentChunks, ...message.chunks]
        segmentOps = [...segmentOps, ...message.ops]
        const dialogs = message.dialogs.flatMap((d) => Option.toArray(decodeDialog(d)))
        return publish({
          status: view.status,
          chunks: segmentChunks.length >= view.chunks.length ? segmentChunks : view.chunks,
          ops: segmentOps.length >= view.ops.length ? segmentOps : view.ops,
          scene: sceneAfter(message.scenes),
          dialogs: dialogs.length === 0 ? view.dialogs : [...view.dialogs, ...dialogs],
          images: imagesAfter(message.images ?? []),
          downloads: downloadsAfter(message.downloads ?? [])
        })
      }
      case "Asking":
        asker = message.event
        if (asker !== null) done()
        return finish({ _tag: "Asking", ask: Option.getOrElse(decodeAsk(message.dialog), () => brokenAsk) })
      case "Waiting":
        done()
        return finish({ _tag: "Window" })
      case "Finished":
        done()
        return finish({ _tag: "Finished" })
      case "NeedInput":
        return finish({ _tag: "WaitingInput" })
      case "Failed":
        done()
        return finish({ _tag: "Failed", error: explainError(message.traceback, code) })
      case "OutputLimit":
        return halt(StopReasons.OutputLimit)
      case "LoadFailed":
        return halt(StopReasons.LoadFailed)
    }
  }

  const workerNow = (): WorkerPort => {
    if (worker !== null) return worker
    const own = generation
    const created = createWorker((message) => {
      if (own === generation) onMessage(message)
    })
    worker = created
    return created
  }

  const segment = (): void => {
    segmentChunks = []
    segmentOps = []
    publish({ ...view, status: { _tag: "Loading" } })
    workerNow().post({ _tag: "Run", code, inputs: [...inputs], seed, answers: [...runAnswers], files })
  }

  /** Files of the last answer: the engine writes them once. */
  let files: ReadonlyArray<ProgramFile> = []

  const postEvent = (request: EventRequest): void => {
    if (worker === null) return
    pending++
    worker.post(request)
  }

  return {
    start: (source) => {
      // A window program keeps its state in the worker: a new run gets a new worker.
      if (isBusy(view.status) || view.status._tag === "Window" || view.status._tag === "Asking") kill()
      pending = 0
      code = source
      seed = Math.floor(Math.random() * MaxSeed)
      inputs = []
      runAnswers = []
      files = []
      asker = null
      view = idleView
      segment()
    },
    provideInput: (value) => {
      if (view.status._tag !== "WaitingInput") return
      inputs = [...inputs, value]
      files = []
      segment()
    },
    send: (input, layout) => {
      if (view.status._tag !== "Window" || worker === null) return
      if (input._tag === "Mouse" && input.kind === MouseKinds.Motion && pending > 0) return
      postEvent({ _tag: "Event", input, layout, answers: [] })
    },
    answer: (value, given = []) => {
      if (view.status._tag !== "Asking") return
      const json = JSON.stringify(value ?? null)
      if (asker === null) {
        runAnswers = [...runAnswers, json]
        files = given
        return segment()
      }
      const request: EventRequest = { ...asker, answers: [...(asker.answers ?? []), json], files: given }
      publish({ ...view, status: { _tag: "Running" } })
      postEvent(request)
    },
    dismissDownload: (name) => {
      publish({ ...view, downloads: view.downloads.filter((d) => d.name !== name) })
    },
    closeDialog: () => {
      if (view.dialogs.length > 0) publish({ ...view, dialogs: view.dialogs.slice(1) })
    },
    stop: () => {
      if (isBusy(view.status) || view.status._tag === "Window" || view.status._tag === "Asking") return halt(StopReasons.User)
      // The worker is free while it waits for input: it is kept for the next run.
      if (view.status._tag === "WaitingInput") finish({ _tag: "Stopped", reason: StopReasons.User })
    },
    dispose: kill
  }
}

/**
 * The real worker for the browser. `create` starts the worker file of the page (see `startPythonWorker`), for example
 * `() => new Worker(new URL("./python-worker.ts", import.meta.url), { type: "module" })`. Each call starts a new
 * worker; the engine loads in it once.
 */
export const browserWorker = (create: () => Worker): WorkerFactory => (onMessage) => {
  const worker = create()
  worker.addEventListener("message", (event: MessageEvent<WorkerMessage>) => {
    onMessage(event.data)
  })
  worker.addEventListener("error", () => {
    onMessage({ _tag: "LoadFailed", message: "worker error" })
  })
  return {
    post: (request) => {
      worker.postMessage(request)
    },
    terminate: () => {
      worker.terminate()
    }
  }
}
