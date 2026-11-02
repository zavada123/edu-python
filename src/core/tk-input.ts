/**
 * User actions in the windows of a tkinter program, as Tk names them (`tkinter/_page.py`): keysyms of keys,
 * mouse buttons, places of widgets for `winfo_…`.
 */
import { Option } from "effect"
import type { TkBox } from "../engine/protocol.ts"

const NamedKeys: Readonly<Record<string, string>> = {
  Enter: "Return",
  Escape: "Escape",
  Tab: "Tab",
  Backspace: "BackSpace",
  Delete: "Delete",
  Insert: "Insert",
  Home: "Home",
  End: "End",
  PageUp: "Prior",
  PageDown: "Next",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  ArrowUp: "Up",
  ArrowDown: "Down",
  Shift: "Shift_L",
  Control: "Control_L",
  Alt: "Alt_L",
  AltGraph: "Alt_R",
  Meta: "Win_L",
  CapsLock: "Caps_Lock",
  NumLock: "Num_Lock",
  ScrollLock: "Scroll_Lock",
  Pause: "Pause",
  PrintScreen: "Print",
  ContextMenu: "Menu"
}

/** The same names as `CHAR_KEYSYMS` of `_events.py`. */
const CharKeys: Readonly<Record<string, string>> = {
  " ": "space",
  ",": "comma",
  ".": "period",
  "-": "minus",
  "+": "plus",
  "=": "equal",
  "/": "slash",
  "\\": "backslash",
  ";": "semicolon",
  "'": "apostrophe",
  "\"": "quotedbl",
  "!": "exclam",
  "?": "question",
  "*": "asterisk",
  "#": "numbersign",
  "$": "dollar",
  "%": "percent",
  "&": "ampersand",
  "(": "parenleft",
  ")": "parenright",
  "[": "bracketleft",
  "]": "bracketright",
  "{": "braceleft",
  "}": "braceright",
  ":": "colon",
  "<": "less",
  ">": "greater",
  "_": "underscore",
  "@": "at",
  "^": "asciicircum",
  "~": "asciitilde",
  "`": "grave",
  "|": "bar"
}

const ControlChars: Readonly<Record<string, string>> = { Enter: "\r", Backspace: "\b", Tab: "\t", Escape: "\u001b", Delete: "\u007f" }

const isOneChar = (key: string): boolean => Array.from(key).length === 1

/** Tk keysym of a DOM `KeyboardEvent.key`: "a", "Return", "space", "Left", "F5". */
export const keysym = (key: string): string => {
  if (isOneChar(key)) return CharKeys[key] ?? key
  if (/^F\d{1,2}$/.test(key)) return key
  return NamedKeys[key] ?? key
}

/** `event.char` of Tk: the typed character, or "" for keys like arrows and Shift. */
export const keyChar = (key: string): string => (isOneChar(key) ? key : ControlChars[key] ?? "")

interface ModifierState {
  readonly shiftKey: boolean
  readonly ctrlKey: boolean
  readonly altKey: boolean
  readonly metaKey: boolean
}

export const modifiers = (e: ModifierState): ReadonlyArray<string> => [
  ...(e.shiftKey ? ["Shift"] : []),
  ...(e.ctrlKey || e.metaKey ? ["Control"] : []),
  ...(e.altKey ? ["Alt"] : [])
]

/** Windows key code (`event.keycode` of Tk on Windows) for letters, digits and the usual keys. */
const KeyCodes: Readonly<Record<string, number>> = {
  Backspace: 8, Tab: 9, Enter: 13, Shift: 16, Control: 17, Alt: 18, Escape: 27, " ": 32, PageUp: 33, PageDown: 34,
  End: 35, Home: 36, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Insert: 45, Delete: 46
}

export const keyCode = (key: string): number => {
  const named = KeyCodes[key]
  if (named !== undefined) return named
  if (/^[a-zA-Z0-9]$/.test(key)) return key.toUpperCase().charCodeAt(0)
  const f = /^F(\d{1,2})$/.exec(key)
  return f === null ? 0 : 111 + Number(f[1])
}

/** Tk number of a DOM mouse button: 1 left, 2 middle, 3 right. */
export const mouseButton = (button: number): number => (button === 1 ? 2 : button === 2 ? 3 : 1)

export const TkIdAttribute = "data-tk-id"
export const TkItemAttribute = "data-tk-item"

const idOf = (element: Element, attribute: string): number => Number(element.getAttribute(attribute) ?? "0")

/** The canvas figure under the pointer, or 0. */
export const itemAt = (target: EventTarget | null): number => {
  if (!(target instanceof Element)) return 0
  const item = target.closest(`[${TkItemAttribute}]`)
  return item === null ? 0 : idOf(item, TkItemAttribute)
}

/** Places of all windows and widgets under `root`: x and y from the top left corner of the parent. */
export const collectLayout = (root: HTMLElement): ReadonlyArray<TkBox> =>
  Array.from(root.querySelectorAll(`[${TkIdAttribute}]`), (element): TkBox => {
    const box = element.getBoundingClientRect()
    const parent = element.parentElement?.closest(`[${TkIdAttribute}]`)
    const origin = parent === null || parent === undefined ? box : parent.getBoundingClientRect()
    return [idOf(element, TkIdAttribute), Math.round(box.left - origin.left), Math.round(box.top - origin.top), Math.round(box.width), Math.round(box.height)]
  })

/** A double click: the second press is near the first one and soon after it. */
const DoubleClickMs = 500
const DoubleClickPx = 6

export interface PressMemory {
  readonly widget: number
  readonly time: number
  readonly x: number
  readonly y: number
  readonly count: number
}

/** The press after `last`: `count` is 2 for the second press of a double click. */
export const nextPress = (last: Option.Option<PressMemory>, widget: number, time: number, x: number, y: number): PressMemory => {
  const count = Option.match(last, {
    onNone: () => 1,
    onSome: (l) => {
      const near = l.widget === widget && time - l.time <= DoubleClickMs && Math.abs(l.x - x) <= DoubleClickPx && Math.abs(l.y - y) <= DoubleClickPx
      return near ? l.count + 1 : 1
    }
  })
  return { widget, time, x, y, count }
}
