/**
 * State of the windows of a tkinter program, as `tkinter/_core.py` sends it (JSON). The page draws the
 * windows from it (tk-window.tsx). Student code can send any text through `_mriya`, so the page decodes it.
 */
import { Option, Schema } from "effect"

export const TkWidgetKinds = {
  Label: "Label",
  Button: "Button",
  Checkbutton: "Checkbutton",
  Radiobutton: "Radiobutton",
  Entry: "Entry",
  Text: "Text",
  Frame: "Frame",
  LabelFrame: "LabelFrame",
  Canvas: "Canvas",
  Scale: "Scale"
} as const
export const TkWidgetKind = Schema.Literals(Object.values(TkWidgetKinds))
export type TkWidgetKind = typeof TkWidgetKind.Type

export const TkManagerKinds = { Pack: "pack", Grid: "grid", Place: "place", None: "none" } as const
export const TkManagerKind = Schema.Literals(Object.values(TkManagerKinds))
export type TkManagerKind = typeof TkManagerKind.Type

export const TkItemTypes = { Line: "line", Rectangle: "rectangle", Oval: "oval", Polygon: "polygon", Arc: "arc", Text: "text" } as const
export const TkItemType = Schema.Literals(Object.values(TkItemTypes))
export type TkItemType = typeof TkItemType.Type

export const TkDialogIcons = { Info: "info", Warning: "warning", Error: "error" } as const
export const TkDialogIcon = Schema.Literals(Object.values(TkDialogIcons))
export type TkDialogIcon = typeof TkDialogIcon.Type

/** Kinds of events that the program waits for (`_events.py`): the page sends only these. */
export const TkBindKinds = {
  Press: "Press",
  Release: "Release",
  Motion: "Motion",
  Enter: "Enter",
  Leave: "Leave",
  Wheel: "Wheel",
  Key: "Key",
  KeyRelease: "KeyRelease"
} as const
export type TkBindKind = (typeof TkBindKinds)[keyof typeof TkBindKinds]

/** A row or column of `grid`: index, weight, minsize. */
const Track = Schema.Tuple([Schema.Number, Schema.Number, Schema.Number])
const Pad = Schema.Tuple([Schema.Number, Schema.Number])

/** What windows and widgets have in common: they hold other widgets. */
const containerFields = {
  id: Schema.Number,
  binds: Schema.Array(Schema.String),
  bg: Schema.String,
  bd: Schema.Number,
  relief: Schema.String,
  padx: Schema.Number,
  pady: Schema.Number,
  highlight: Schema.Number,
  propagate: Schema.Boolean,
  columns: Schema.Array(Track),
  rows: Schema.Array(Track)
}

/** `width`, `height`: from `geometry`, or -1 when the window takes the size of its widgets. */
export const TkWindow = Schema.Struct({
  ...containerFields,
  title: Schema.String,
  width: Schema.Number,
  height: Schema.Number,
  minWidth: Schema.Number,
  minHeight: Schema.Number,
  x: Schema.Number,
  y: Schema.Number,
  visible: Schema.Boolean,
  decorated: Schema.Boolean
})
export type TkWindow = typeof TkWindow.Type

/** Options of pack, grid and place; `order` is the place in the list of the parent. -1: not set. */
export const TkManager = Schema.Struct({
  kind: TkManagerKind,
  order: Schema.Number,
  side: Schema.String,
  fill: Schema.String,
  expand: Schema.Boolean,
  anchor: Schema.String,
  padx: Pad,
  pady: Pad,
  ipadx: Schema.Number,
  ipady: Schema.Number,
  row: Schema.Number,
  column: Schema.Number,
  rowspan: Schema.Number,
  columnspan: Schema.Number,
  sticky: Schema.String,
  x: Schema.Number,
  y: Schema.Number,
  relx: Schema.Number,
  rely: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
  relwidth: Schema.Number,
  relheight: Schema.Number
})
export type TkManager = typeof TkManager.Type

/** A canvas figure. Colours are CSS, "" is no colour. */
export const TkItem = Schema.Struct({
  id: Schema.Number,
  type: TkItemType,
  coords: Schema.Array(Schema.Number),
  fill: Schema.String,
  outline: Schema.String,
  width: Schema.Number,
  dash: Schema.Array(Schema.Number),
  arrow: Schema.String,
  arrowshape: Schema.Array(Schema.Number),
  capstyle: Schema.String,
  joinstyle: Schema.String,
  smooth: Schema.Boolean,
  start: Schema.Number,
  extent: Schema.Number,
  style: Schema.String,
  text: Schema.String,
  font: Schema.String,
  underline: Schema.Boolean,
  anchor: Schema.String,
  justify: Schema.String,
  wrap: Schema.Number,
  angle: Schema.Number,
  hidden: Schema.Boolean
})
export type TkItem = typeof TkItem.Type

export const TkScale = Schema.Struct({
  from: Schema.Number,
  to: Schema.Number,
  resolution: Schema.Number,
  value: Schema.Number,
  orient: Schema.String,
  length: Schema.Number,
  label: Schema.String,
  showvalue: Schema.Boolean,
  trough: Schema.String
})
export type TkScale = typeof TkScale.Type

/**
 * A widget. `width` and `height` are in characters and lines for Label, Button, Entry and Text (as in Tk),
 * in pixels for Frame and Canvas. `rev` grows when the program changes the text of an Entry or a Text.
 */
export const TkWidget = Schema.Struct({
  ...containerFields,
  parent: Schema.Number,
  kind: TkWidgetKind,
  manager: TkManager,
  fg: Schema.String,
  font: Schema.String,
  underline: Schema.Boolean,
  width: Schema.Number,
  height: Schema.Number,
  anchor: Schema.String,
  justify: Schema.String,
  wrap: Schema.Number,
  state: Schema.String,
  text: Schema.String,
  rev: Schema.Number,
  checked: Schema.Boolean,
  indicator: Schema.Boolean,
  selectcolor: Schema.String,
  show: Schema.String,
  textwrap: Schema.String,
  items: Schema.Array(TkItem),
  scale: Schema.OptionFromNullOr(TkScale)
})
export type TkWidget = typeof TkWidget.Type

/** `focus`: the widget of `focus_set()`; `focusRev` grows on each call, so the page moves the focus once. */
export const TkScene = Schema.Struct({
  windows: Schema.Array(TkWindow),
  widgets: Schema.Array(TkWidget),
  focus: Schema.Number,
  focusRev: Schema.Number,
  bindAll: Schema.Array(Schema.String)
})
export type TkScene = typeof TkScene.Type

export const TkDialog = Schema.Struct({ icon: TkDialogIcon, title: Schema.String, message: Schema.String })
export type TkDialog = typeof TkDialog.Type

const decodeSceneJson = Schema.decodeUnknownOption(Schema.fromJsonString(TkScene))
const decodeDialogJson = Schema.decodeUnknownOption(Schema.fromJsonString(TkDialog))

export type SceneUpdate =
  | { readonly _tag: "Scene"; readonly scene: TkScene }
  /** The program closed its windows. */
  | { readonly _tag: "Closed" }
  /** Not a scene: the page keeps the windows that it shows. */
  | { readonly _tag: "Invalid" }

export const decodeScene = (json: string): SceneUpdate => {
  if (json === "null") return { _tag: "Closed" }
  return Option.match(decodeSceneJson(json), {
    onNone: () => ({ _tag: "Invalid" }),
    onSome: (scene) => ({ _tag: "Scene", scene })
  })
}

export const decodeDialog = (json: string): Option.Option<TkDialog> => decodeDialogJson(json)

/** Widgets inside `parent` that a geometry manager shows, in the order of the manager. */
export const managedChildren = (scene: TkScene, parent: number, kind: TkManagerKind): ReadonlyArray<TkWidget> =>
  scene.widgets
    .filter((w) => w.parent === parent && w.manager.kind === kind)
    .toSorted((a, b) => a.manager.order - b.manager.order)

/** The window of a widget. */
export const windowOf = (scene: TkScene, widget: number): Option.Option<TkWindow> => {
  const byId = new Map(scene.widgets.map((w) => [w.id, w]))
  let current = widget
  for (let depth = 0; depth < 1000; depth++) {
    const window = scene.windows.find((w) => w.id === current)
    if (window !== undefined) return Option.some(window)
    const found = byId.get(current)
    if (found === undefined) return Option.none()
    current = found.parent
  }
  return Option.none()
}

/**
 * Does the program wait for this kind of event on the widget? Tk sends an event to the widget, its class,
 * its window and `bind_all` (`_core.py` `_chain`).
 */
export const waitsFor = (scene: TkScene, widget: number, kind: TkBindKind): boolean => {
  if (scene.bindAll.includes(kind)) return true
  const own = scene.widgets.find((w) => w.id === widget)
  if (own !== undefined && own.binds.includes(kind)) return true
  return Option.match(windowOf(scene, widget), { onNone: () => false, onSome: (w) => w.binds.includes(kind) })
}
