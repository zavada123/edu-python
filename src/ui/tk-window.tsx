import { Match, Option } from "effect"
import { CircleX, Feather, Info, TriangleAlert, X } from "lucide-react"
import { type CSSProperties, type KeyboardEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { cn } from "./kit.tsx"
import { KeyKinds, type TkBox, type TkInput } from "../engine/protocol.ts"
import { collectLayout, keyChar, keyCode, keysym, modifiers, TkIdAttribute } from "../core/tk-input.ts"
import { TkBindKinds, type TkDialog, type TkDialogIcon, TkDialogIcons, type TkScene, type TkWindow, waitsFor } from "../core/tk-scene.ts"
import { PressTracker, TkContext, type TkContextValue, TkWindowAttribute, TkWindowContext, useTk } from "./tk-context.ts"
import { useWidgetEvents } from "./tk-events.ts"
import { Children, containerSize, keyTarget } from "./tk-widgets.tsx"

// Windows of a tkinter program on the page: each window has a title bar with the close button, and the
// widgets inside. Message windows (`showinfo`) cover the windows until the student clicks "OK".

/** A new Tk window without widgets and without `geometry` is 200 × 200, as in Tk. */
const EmptyWindowSize = 200

/** Keys that the page uses for itself when the program does not wait for them. */
const PageKeys = new Set([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End", "Tab"])

function ClientArea(props: Readonly<{ window: TkWindow }>) {
  const tk = useTk()
  const events = useWidgetEvents(props.window.id)
  const w = props.window
  const fixed = w.width >= 0 && w.height >= 0
  const size: CSSProperties = fixed
    ? { width: w.width, height: w.height }
    : containerSize(tk.scene, w.id, w.propagate, w.minWidth > 0 ? w.minWidth : EmptyWindowSize, w.minHeight > 0 ? w.minHeight : EmptyWindowSize)

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
        // A window without size takes at least its widgets.
        minWidth: fixed ? undefined : "max-content",
        ...size
      }}
    >
      <Children parent={w.id} />
    </div>
  )
}

function WindowFrame(props: Readonly<{ window: TkWindow }>) {
  const tk = useTk()
  const w = props.window
  return (
    <TkWindowContext.Provider value={Option.some(w)}>
      <figure className="epy-tk-figure">
        <div className="epy-tk-scroll">
          <div className="epy-tk-window">
            {w.decorated && (
              <div className="epy-tk-title">
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
            <ClientArea window={w} />
          </div>
        </div>
        {(w.x !== 0 || w.y !== 0) && (
          <figcaption className="epy-tk-place">
            Місце на екрані: x = {w.x}, y = {w.y}
          </figcaption>
        )}
      </figure>
    </TkWindowContext.Provider>
  )
}

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
      const field = root?.querySelector(`[${TkIdAttribute}="${scene.focus}"]`)
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) field.focus({ preventScroll: true })
    })
  }, [props.scene, root])

  const dialog = props.dialogs[0]
  if (Option.isNone(props.scene) && dialog === undefined) return null

  return (
    <section ref={setRoot} className="epy-tk-area" aria-label="Вікна програми">
      <p className="epy-caption">Вікно програми</p>
      {Option.match(props.scene, {
        onNone: () => null,
        onSome: (scene) => {
          const value: TkContextValue = { scene, active: props.active, send, press }
          return (
            <TkContext.Provider value={Option.some(value)}>
              <div className={cn("epy-tk-windows", !props.active && "epy-tk-windows--idle")}>
                {visible.map((w) => <WindowFrame key={w.id} window={w} />)}
              </div>
            </TkContext.Provider>
          )
        }
      })}
      {dialog !== undefined && <MessageDialog dialog={dialog} onClose={props.onCloseDialog} />}
    </section>
  )
}
