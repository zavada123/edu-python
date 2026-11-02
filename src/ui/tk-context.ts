import { Option } from "effect"
import { createContext, useContext } from "react"
import type { TkInput } from "../engine/protocol.ts"
import type { PressMemory } from "../core/tk-input.ts"
import type { TkScene, TkWindow } from "../core/tk-scene.ts"

// What the widgets of a tkinter window need: the scene, the way to send user actions, and their window.

export interface TkContextValue {
  readonly scene: TkScene
  /** The program waits for user actions: the window is not frozen. */
  readonly active: boolean
  readonly send: (input: TkInput) => void
  /** The last mouse press, for double clicks. */
  readonly press: PressTracker
}

/** Remembers the last mouse press: event handlers change it, the view does not show it. */
export class PressTracker {
  last: Option.Option<PressMemory> = Option.none()
}

export const TkContext = createContext<Option.Option<TkContextValue>>(Option.none())

export const useTk = (): TkContextValue =>
  Option.getOrThrowWith(useContext(TkContext), () => new Error("useTk outside of TkWindows"))

export const TkWindowContext = createContext<Option.Option<TkWindow>>(Option.none())

export const useTkWindow = (): TkWindow =>
  Option.getOrThrowWith(useContext(TkWindowContext), () => new Error("useTkWindow outside of a window"))

/** The client area of a window (the element with this attribute): `x_root` and `y_root` count from it. */
export const TkWindowAttribute = "data-tk-window"

export const clientOf = (element: Element): Element | null => element.closest(`[${TkWindowAttribute}]`)
