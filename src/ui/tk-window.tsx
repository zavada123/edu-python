import { Match, Option } from "effect"
import { CircleX, Feather, Info, TriangleAlert, X } from "lucide-react"
import { type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { cn } from "./kit.tsx"
import { KeyKinds, type TkBox, type TkInput } from "../engine/protocol.ts"
import { collectLayout, keyChar, keyCode, keysym, modifiers, TkIdAttribute } from "../core/tk-input.ts"
import { type TkAsk, TkBindKinds, type TkDialog, type TkDialogIcon, TkDialogIcons, type TkImage, type TkScene, type TkWindow, waitsFor } from "../core/tk-scene.ts"
import type { ProgramFile } from "../engine/protocol.ts"
import { type Answer, AskDialog, Downloads } from "./tk-dialogs.tsx"
import { MenuBar, PopupMenus } from "./tk-menus.tsx"
import { PressTracker, TkContext, type TkContextValue, TkWindowAttribute, TkWindowContext, useTk } from "./tk-context.ts"
import { useWidgetEvents } from "./tk-events.ts"
import { Children, containerSize, keyTarget } from "./tk-widgets.tsx"

// Windows of a tkinter program on the page: each window has a title bar with the close button, and the
// widgets inside. Message windows (`showinfo`) cover the windows until the student clicks "OK".

/** A new Tk window without widgets and without `geometry` is 200 × 200, as in Tk. */
const EmptyWindowSize = 200

/** Keys that the page uses for itself when the program does not wait for them. */
const PageKeys = new Set([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End", "Tab"])

/** The "screen" of the program (`ScreenWidth`, `ScreenHeight` in `tkinter/_core.py`). */
const Screen = { width: 1920, height: 1080 } as const

/** A zoomed window (`state("zoomed")`) is at least this high on the page. */
const ZoomedHeight = 360

/** The size of the client area: `geometry`, or the size of the widgets; `minsize` and `maxsize` limit it. */
const clientSize = (scene: TkScene, w: TkWindow): CSSProperties => {
  const [minWidth, minHeight] = w.minSize
  const [maxWidth, maxHeight] = w.maxSize
  const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))
  if (w.zoomed) return { width: "100%", minHeight: Math.max(ZoomedHeight, w.height), boxSizing: "border-box" }
  if (w.width >= 0 && w.height >= 0) {
    return { width: clamp(w.width, minWidth, Math.max(minWidth, maxWidth)), height: clamp(w.height, minHeight, Math.max(minHeight, maxHeight)) }
  }
  return {
    ...containerSize(scene, w.id, w.propagate, w.minWidth > 0 ? w.minWidth : EmptyWindowSize, w.minHeight > 0 ? w.minHeight : EmptyWindowSize),
    ...(minWidth > 1 ? { minWidth } : {}),
    ...(minHeight > 1 ? { minHeight } : {}),
    ...(maxWidth < Screen.width ? { maxWidth } : {}),
    ...(maxHeight < Screen.height ? { maxHeight } : {})
  }
}

function ClientArea(props: Readonly<{ window: TkWindow }>) {
  const tk = useTk()
  const events = useWidgetEvents(props.window.id)
  const w = props.window
  const fixed = w.width >= 0 && w.height >= 0
  const size = clientSize(tk.scene, w)

  const key = (e: KeyboardEvent<HTMLDivElement>, kind: typeof KeyKinds.Press | typeof KeyKinds.Release) => {
    const widget = keyTarget(e, w.id)
    if (!tk.active || !waitsFor(tk.scene, widget, kind === KeyKinds.Press ? TkBindKinds.Key : TkBindKinds.KeyRelease)) return
    // Keys on the window itself are for the program, not for scrolling the page.
    if (e.target === e.currentTarget && PageKeys.has(e.key)) e.preventDefault()
    tk.send({ _tag: "Key", kind, widget, keysym: keysym(e.key), char: keyChar(e.key), keycode: keyCode(e.key), modifiers: modifiers(e) })
  }

  return (
    <div
      {...{ [TkIdAttribute]: w.id, [TkWindowAttribute]: "" }}
      {...events}
      tabIndex={0}
      aria-label={`Вікно «${w.title}»`}
      onKeyDown={(e) => {
        key(e, KeyKinds.Press)
      }}
      onKeyUp={(e) => {
        key(e, KeyKinds.Release)
      }}
      className="epy-tk-client"
      style={{
        boxSizing: "content-box",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: w.bg === "" ? "var(--tk-face)" : w.bg,
        padding: `${w.pady}px ${w.padx}px`,
        ...(w.cursor === "" ? {} : { cursor: w.cursor }),
        // A window without size takes at least its widgets.
        minWidth: fixed || w.zoomed ? undefined : "max-content",
        ...size
      }}
    >
      <Children parent={w.id} />
    </div>
  )
}

/** Where a window is on the screen: the place from the program, or where the student dragged it. */
type Place = readonly [x: number, y: number]

/** A window that the student dragged: the new place, until the program sends its own place. */
interface Dragged {
  readonly place: Place
  /** The place of the window in the scene when the student dropped it. */
  readonly from: Place
}

/** Drags shorter than this are clicks on the title. */
const DragThreshold = 3

interface WindowFrameProps {
  readonly window: TkWindow
  /** From the top left corner of the area of the windows. */
  readonly left: number
  readonly top: number
  readonly layer: number
  readonly place: Place
  readonly onRaise: () => void
  readonly onDrop: (place: Place) => void
}

function WindowFrame(props: Readonly<WindowFrameProps>) {
  const tk = useTk()
  const w = props.window
  const [drag, setDrag] = useState<Option.Option<{ readonly startX: number; readonly startY: number; readonly dx: number; readonly dy: number }>>(Option.none())
  const shift = Option.match(drag, { onNone: () => [0, 0] as const, onSome: (d) => [d.dx, d.dy] as const })

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target instanceof Element && e.target.closest("button") !== null)) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag(Option.some({ startX: e.clientX, startY: e.clientY, dx: 0, dy: 0 }))
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    Option.map(drag, (d) => {
      setDrag(Option.some({ ...d, dx: Math.round(e.clientX - d.startX), dy: Math.round(e.clientY - d.startY) }))
    })
  }
  const onPointerUp = () => {
    Option.map(drag, (d) => {
      if (Math.abs(d.dx) + Math.abs(d.dy) >= DragThreshold) props.onDrop([props.place[0] + d.dx, props.place[1] + d.dy])
    })
    setDrag(Option.none())
  }

  return (
    <TkWindowContext.Provider value={Option.some(w)}>
      <div
        {...{ [DesktopWindowAttribute]: w.id }}
        className={cn("epy-tk-window", w.zoomed && "epy-tk-window--zoomed", Option.isSome(drag) && "epy-tk-window--dragging")}
        onPointerDownCapture={props.onRaise}
        style={{
          gridArea: "1 / 1",
          marginLeft: w.zoomed ? 0 : props.left,
          marginTop: w.zoomed ? 0 : props.top,
          zIndex: props.layer,
          opacity: w.alpha < 1 ? Math.max(0.1, w.alpha) : undefined,
          transform: shift[0] !== 0 || shift[1] !== 0 ? `translate(${shift[0]}px, ${shift[1]}px)` : undefined
        }}
      >
        {w.decorated && (
          <div
            className="epy-tk-title"
            title="Перетягни, щоб посунути вікно"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              setDrag(Option.none())
            }}
          >
            <Feather aria-hidden className="epy-tk-title__icon" />
            <span className="epy-tk-title__text">{w.title}</span>
            <button
              type="button"
              aria-label="Закрити вікно"
              disabled={!tk.active}
              onClick={() => {
                tk.send({ _tag: "Close", widget: w.id })
              }}
              className="epy-tk-close"
            >
              <X aria-hidden className="epy-tk-close__icon" />
            </button>
          </div>
        )}
        {w.menu !== 0 && <MenuBar menu={w.menu} />}
        <ClientArea window={w} />
      </div>
    </TkWindowContext.Provider>
  )
}

/** Width of the small screen under the windows, in pixels. */
const MapWidth = 192

/** The screen in small: where the windows of the program are, as `geometry("+x+y")` put them. */
function ScreenMap(props: Readonly<{ windows: ReadonlyArray<readonly [TkWindow, Place]>; sizes: ReadonlyMap<number, Place> }>) {
  const scale = MapWidth / Screen.width
  return (
    <figure className="epy-tk-map">
      <div className="epy-tk-map__screen" aria-hidden style={{ width: MapWidth, height: Math.round(Screen.height * scale) }}>
        {props.windows.map(([w, place]) => {
          const size = props.sizes.get(w.id) ?? [EmptyWindowSize, EmptyWindowSize]
          return (
            <div
              key={w.id}
              className="epy-tk-map__window"
              style={{
                left: Math.round(place[0] * scale),
                top: Math.round(place[1] * scale),
                width: Math.max(4, Math.round(size[0] * scale)),
                height: Math.max(3, Math.round(size[1] * scale))
              }}
            />
          )
        })}
      </div>
      <figcaption className="epy-tk-map__caption">
        <span>Екран {Screen.width} × {Screen.height}</span>
        {props.windows.map(([w, place]) => (
          <span key={w.id}>
            «{w.title}»: x = {place[0]}, y = {place[1]}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}

const samePlace = (a: Place, b: Place): boolean => a[0] === b[0] && a[1] === b[1]

/**
 * The windows of the program where the program put them: one beside another as on the screen. The student
 * drags a window by its title; the program gets <Configure> with the new place.
 */
function Desktop(props: Readonly<{ windows: ReadonlyArray<TkWindow> }>) {
  const tk = useTk()
  const [dragged, setDragged] = useState<ReadonlyMap<number, Dragged>>(new Map())
  const [raised, setRaised] = useState<Option.Option<{ readonly id: number; readonly topZ: number }>>(Option.none())
  const [sizes, setSizes] = useState<ReadonlyMap<number, Place>>(new Map())
  const stage = useRef<HTMLDivElement>(null)
  const origin = useRef<Option.Option<Place>>(Option.none())

  const placeOf = (w: TkWindow): Place => {
    const own: Place = [w.x, w.y]
    const moved = dragged.get(w.id)
    return moved !== undefined && samePlace(moved.from, own) ? moved.place : own
  }
  const placed = props.windows.map((w) => [w, placeOf(w)] as const)
  // The corner of the area is the place most to the left and to the top that a window had in this run: a
  // window that the program or the student moves goes there on the page too.
  const least: Place = [Math.min(...placed.map(([, p]) => p[0])), Math.min(...placed.map(([, p]) => p[1]))]
  const corner = Option.match(origin.current, { onNone: () => least, onSome: (o): Place => [Math.min(o[0], least[0]), Math.min(o[1], least[1])] })
  origin.current = Option.some(corner)
  const [left, top] = corner
  const topZ = Math.max(...props.windows.map((w) => w.z))
  const order = props.windows.toSorted((a, b) => a.z - b.z).map((w) => w.id)
  Option.map(raised, (r) => {
    // A window that the student clicked is on top, until the program lifts another one.
    if (r.topZ !== topZ || !order.includes(r.id)) return
    order.splice(order.indexOf(r.id), 1)
    order.push(r.id)
  })

  // The sizes of the windows for the small screen.
  useLayoutEffect(() => {
    const element = stage.current
    if (element === null) return
    const found = new Map<number, Place>()
    for (const child of Array.from(element.children)) {
      const id = Number(child.getAttribute(DesktopWindowAttribute))
      if (child instanceof HTMLElement) found.set(id, [child.offsetWidth, child.offsetHeight])
    }
    const changed = found.size !== sizes.size || Array.from(found).some(([id, size]) => {
      const old = sizes.get(id)
      return old === undefined || !samePlace(old, size)
    })
    if (changed) setSizes(found)
  })

  const drop = (w: TkWindow, place: Place) => {
    setDragged((old) => new Map(old).set(w.id, { place, from: [w.x, w.y] }))
    if (tk.active) tk.send({ _tag: "Move", widget: w.id, x: place[0], y: place[1] })
  }

  return (
    <>
      <div className="epy-tk-desktop">
        <div ref={stage} className="epy-tk-stage">
          {placed.map(([w, place]) => (
              <WindowFrame
                key={w.id}
                window={w}
                left={place[0] - left}
                top={place[1] - top}
                layer={order.indexOf(w.id) + 1}
                place={place}
                onRaise={() => {
                  setRaised(Option.some({ id: w.id, topZ }))
                }}
                onDrop={(next) => {
                  drop(w, next)
                }}
              />
          ))}
        </div>
      </div>
      {placed.some(([w]) => w.placed) && <ScreenMap windows={placed} sizes={sizes} />}
    </>
  )
}

/** Marks the box of each window in the area of the windows, to measure it. */
const DesktopWindowAttribute = "data-epy-tk-desktop"

const dialogIcon = (icon: TkDialogIcon): ReactNode =>
  Match.value(icon).pipe(
    Match.when(TkDialogIcons.Info, () => <Info aria-hidden className="epy-tk-dialog__icon epy-tk-dialog__icon--info" />),
    Match.when(TkDialogIcons.Warning, () => <TriangleAlert aria-hidden className="epy-tk-dialog__icon epy-tk-dialog__icon--warning" />),
    Match.when(TkDialogIcons.Error, () => <CircleX aria-hidden className="epy-tk-dialog__icon epy-tk-dialog__icon--error" />),
    Match.exhaustive
  )

function MessageDialog(props: Readonly<{ dialog: TkDialog; onClose: () => void }>) {
  const ok = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    ok.current?.focus({ preventScroll: true })
  }, [props.dialog])
  return (
    <div className="epy-tk-backdrop">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={props.dialog.title === "" ? "Повідомлення програми" : props.dialog.title}
        className="epy-tk-dialog"
      >
        <div className="epy-tk-title">
          <span className="epy-tk-title__text">{props.dialog.title}</span>
        </div>
        <div className="epy-tk-dialog__body">
          {dialogIcon(props.dialog.icon)}
          <p className="epy-tk-dialog__message">{props.dialog.message}</p>
        </div>
        <div className="epy-tk-dialog__buttons">
          <button ref={ok} type="button" onClick={props.onClose} className="epy-tk-button">
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

export interface TkWindowsProps {
  readonly scene: Option.Option<TkScene>
  readonly dialogs: ReadonlyArray<TkDialog>
  /** The program waits for user actions; otherwise the windows are frozen. */
  readonly active: boolean
  readonly onInput: (input: TkInput, layout: ReadonlyArray<TkBox>) => void
  readonly onCloseDialog: () => void
  /** Pictures of `PhotoImage` by number. */
  readonly images: ReadonlyMap<number, TkImage>
  /** A dialog that waits for the answer of the student (askyesno, askopenfilename…). */
  readonly ask: Option.Option<TkAsk>
  readonly onAnswer: Answer
  /** Files that the program saved: the student can download them. */
  readonly downloads: ReadonlyArray<ProgramFile>
  readonly onDismissDownload: (name: string) => void
}

/** The windows of the program and its message windows. The parent gives a new `key` for each run. */
export function TkWindows(props: TkWindowsProps) {
  // State, not a ref: `send` reads it in the handlers of the widgets.
  const [root, setRoot] = useState<HTMLElement | null>(null)
  const [press] = useState(() => new PressTracker())
  const announced = useRef(new Set<number>())
  const focusRev = useRef(0)
  const { onInput } = props

  const send = useCallback((input: TkInput): void => {
    if (root !== null) onInput(input, collectLayout(root))
  }, [root, onInput])

  const visibleOf = (scene: Option.Option<TkScene>): ReadonlyArray<TkWindow> =>
    Option.match(scene, { onNone: () => [], onSome: (s) => s.windows.filter((w) => w.visible) })
  const visible = visibleOf(props.scene)

  // Tk sends <Map>, <Expose> and <Configure> when a window appears; the program also learns its sizes.
  useEffect(() => {
    const element = root
    if (!props.active || element === null) return
    for (const w of visibleOf(props.scene)) {
      if (announced.current.has(w.id)) continue
      announced.current.add(w.id)
      onInput({ _tag: "Shown", widget: w.id }, collectLayout(element))
    }
  }, [props.active, props.scene, root, onInput])

  // `focus_set()` of the program puts the cursor into a field once.
  useEffect(() => {
    Option.map(props.scene, (scene) => {
      if (scene.focusRev === focusRev.current) return
      focusRev.current = scene.focusRev
      const widget = root?.querySelector(`[${TkIdAttribute}="${scene.focus}"]`)
      // A Text or a Spinbox has its field inside.
      const field = widget instanceof HTMLInputElement || widget instanceof HTMLTextAreaElement ? widget : widget?.querySelector("input, textarea")
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) field.focus({ preventScroll: true })
    })
  }, [props.scene, root])

  const dialog = props.dialogs[0]
  if (Option.isNone(props.scene) && dialog === undefined && Option.isNone(props.ask) && props.downloads.length === 0) return null

  return (
    <section ref={setRoot} className="epy-tk-area" aria-label="Вікна програми">
      <p className="epy-caption">Вікно програми</p>
      {Option.match(props.scene, {
        onNone: () => null,
        onSome: (scene) => {
          const value: TkContextValue = { scene, images: props.images, active: props.active, send, press }
          return (
            <TkContext.Provider value={Option.some(value)}>
              <div className={cn("epy-tk-windows", !props.active && "epy-tk-windows--idle")}>
                {visible.length > 0 && <Desktop windows={visible} />}
              </div>
              {props.active && <PopupMenus root={root} />}
            </TkContext.Provider>
          )
        }
      })}
      <Downloads files={props.downloads} onDismiss={props.onDismissDownload} />
      {dialog !== undefined && <MessageDialog dialog={dialog} onClose={props.onCloseDialog} />}
      {dialog === undefined && Option.match(props.ask, {
        onNone: () => null,
        onSome: (ask) => <AskDialog key={JSON.stringify(ask)} ask={ask} onAnswer={props.onAnswer} />
      })}
    </section>
  )
}
