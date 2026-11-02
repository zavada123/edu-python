import { Option } from "effect"
import type { MouseEvent, PointerEvent, WheelEvent } from "react"
import { type MouseKind, MouseKinds } from "../engine/protocol.ts"
import { itemAt, modifiers, mouseButton, nextPress } from "../core/tk-input.ts"
import { type TkBindKind, TkBindKinds, waitsFor } from "../core/tk-scene.ts"
import { clientOf, useTk, useTkWindow } from "./tk-context.ts"

// Mouse events of one widget for the program (`bind`). The page sends only the events that the program
// waits for, and only to the inner widget under the pointer, as Tk does.

const WheelStep = 120

const isField = (target: EventTarget | null): boolean =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement

export interface WidgetEvents {
  readonly onPointerDown: (e: PointerEvent) => void
  readonly onPointerUp: (e: PointerEvent) => void
  readonly onPointerMove: (e: PointerEvent) => void
  readonly onPointerEnter: (e: PointerEvent) => void
  readonly onPointerLeave: (e: PointerEvent) => void
  readonly onWheel: (e: WheelEvent) => void
  readonly onContextMenu: (e: MouseEvent) => void
}

export const useWidgetEvents = (widget: number): WidgetEvents => {
  const tk = useTk()
  const tkWindow = useTkWindow()
  const waits = (kind: TkBindKind): boolean => tk.active && waitsFor(tk.scene, widget, kind)

  const send = (kind: MouseKind, e: PointerEvent | WheelEvent, button: number, count: number, delta: number): void => {
    const box = e.currentTarget.getBoundingClientRect()
    const client = clientOf(e.currentTarget)?.getBoundingClientRect() ?? box
    tk.send({
      _tag: "Mouse",
      kind,
      widget,
      item: itemAt(e.target),
      button,
      count,
      buttons: e.buttons,
      delta,
      x: Math.round(e.clientX - box.left),
      y: Math.round(e.clientY - box.top),
      rootX: Math.round(tkWindow.x + e.clientX - client.left),
      rootY: Math.round(tkWindow.y + e.clientY - client.top),
      modifiers: modifiers(e)
    })
  }

  return {
    onPointerDown: (e) => {
      e.stopPropagation()
      // Keys go to the window after a click on it (an input field keeps its own focus).
      const client = clientOf(e.currentTarget)
      if (!isField(e.target) && client instanceof HTMLElement) client.focus({ preventScroll: true })
      // As in Tk, the widget gets the moves and the release after a press, also outside of it.
      if (waits(TkBindKinds.Motion) || waits(TkBindKinds.Release)) e.currentTarget.setPointerCapture(e.pointerId)
      if (!waits(TkBindKinds.Press)) return
      const box = e.currentTarget.getBoundingClientRect()
      const press = nextPress(tk.press.last, widget, e.timeStamp, e.clientX - box.left, e.clientY - box.top)
      tk.press.last = Option.some(press)
      send(MouseKinds.Press, e, mouseButton(e.button), press.count, 0)
    },
    onPointerUp: (e) => {
      e.stopPropagation()
      if (waits(TkBindKinds.Release)) send(MouseKinds.Release, e, mouseButton(e.button), 1, 0)
    },
    onPointerMove: (e) => {
      e.stopPropagation()
      if (waits(TkBindKinds.Motion)) send(MouseKinds.Motion, e, 0, 0, 0)
    },
    onPointerEnter: (e) => {
      if (waits(TkBindKinds.Enter)) send(MouseKinds.Enter, e, 0, 0, 0)
    },
    onPointerLeave: (e) => {
      if (waits(TkBindKinds.Leave)) send(MouseKinds.Leave, e, 0, 0, 0)
    },
    onWheel: (e) => {
      e.stopPropagation()
      if (waits(TkBindKinds.Wheel)) send(MouseKinds.Wheel, e, 0, 0, e.deltaY < 0 ? WheelStep : -WheelStep)
    },
    onContextMenu: (e) => {
      if (waits(TkBindKinds.Press)) e.preventDefault()
    }
  }
}
