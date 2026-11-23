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
  Scale: "Scale",
  Listbox: "Listbox",
  Spinbox: "Spinbox",
  Combobox: "Combobox",
  Scrollbar: "Scrollbar",
  Menu: "Menu",
  Menubutton: "Menubutton",
  Progressbar: "Progressbar",
  Separator: "Separator",
  Notebook: "Notebook",
  Treeview: "Treeview"
} as const
export const TkWidgetKind = Schema.Literals(Object.values(TkWidgetKinds))
export type TkWidgetKind = typeof TkWidgetKind.Type

export const TkManagerKinds = { Pack: "pack", Grid: "grid", Place: "place", None: "none" } as const
export const TkManagerKind = Schema.Literals(Object.values(TkManagerKinds))
export type TkManagerKind = typeof TkManagerKind.Type

export const TkItemTypes = {
  Line: "line",
  Rectangle: "rectangle",
  Oval: "oval",
  Polygon: "polygon",
  Arc: "arc",
  Text: "text",
  Image: "image",
  Window: "window"
} as const
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
  /** CSS cursor of the `cursor` option, or "". */
  cursor: Schema.String,
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
  /** The program or the student put the window on a place of the screen (`geometry("+100+50")`). */
  placed: Schema.Boolean,
  /** The order of windows: a bigger number is on top (`lift`, `-topmost`). */
  z: Schema.Number,
  /** `minsize` and `maxsize`: width, height. */
  minSize: Pad,
  maxSize: Pad,
  /** `attributes("-alpha", …)`: 0…1. */
  alpha: Schema.Number,
  /** `state("zoomed")` or `attributes("-fullscreen", True)`: the window takes the whole width. */
  zoomed: Schema.Boolean,
  visible: Schema.Boolean,
  decorated: Schema.Boolean,
  /** The Menu of the menu bar, or 0. */
  menu: Schema.Number
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
  hidden: Schema.Boolean,
  /** The PhotoImage of an image figure, or 0. */
  image: Schema.Number,
  /** The widget of a window figure (`create_window`), or 0; `width`, `height`: its size, 0 is its own size. */
  window: Schema.Number,
  height: Schema.Number
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

/** A coloured part of a Text: start, end (characters), colour, background, CSS font, underline, overstrike. */
const TkTextPart = Schema.Tuple([Schema.Number, Schema.Number, Schema.String, Schema.String, Schema.String, Schema.Boolean, Schema.Boolean])
export type TkTextPart = typeof TkTextPart.Type

/** Tags of a Text: the coloured parts and the selection that the program set (`selectionRev` grows then). */
export const TkTextStyle = Schema.Struct({
  parts: Schema.Array(TkTextPart),
  selection: Schema.Tuple([Schema.Number, Schema.Number]),
  selectionRev: Schema.Number,
  selectionColor: Schema.String
})
export type TkTextStyle = typeof TkTextStyle.Type

export const TkListModes = { Single: "single", Browse: "browse", Multiple: "multiple", Extended: "extended", Spin: "spin", Combo: "combo" } as const

/** Rows of a Listbox (text, colour, background), or the values of a Spinbox or a Combobox. */
export const TkList = Schema.Struct({
  rows: Schema.Array(Schema.Tuple([Schema.String, Schema.String, Schema.String])),
  chosen: Schema.Array(Schema.Number),
  active: Schema.Number,
  mode: Schema.String,
  selectBg: Schema.String,
  selectFg: Schema.String
})
export type TkList = typeof TkList.Type

/** A Scrollbar: the widget that it scrolls (0: none). */
export const TkScroll = Schema.Struct({ target: Schema.Number, vertical: Schema.Boolean, trough: Schema.String })
export type TkScroll = typeof TkScroll.Type

export const TkMenuEntryTypes = { Command: "command", Cascade: "cascade", Check: "checkbutton", Radio: "radiobutton", Separator: "separator" } as const

export const TkMenuEntry = Schema.Struct({
  type: Schema.String,
  label: Schema.String,
  accelerator: Schema.String,
  enabled: Schema.Boolean,
  checked: Schema.Boolean,
  submenu: Schema.Number,
  underline: Schema.Number,
  fg: Schema.String
})
export type TkMenuEntry = typeof TkMenuEntry.Type

/** A Menu; `posted`: x and y on the "screen" and the number of the post, after `tk_popup`. */
export const TkMenu = Schema.Struct({
  entries: Schema.Array(TkMenuEntry),
  posted: Schema.NullOr(Schema.Tuple([Schema.Number, Schema.Number, Schema.Number]))
})
export type TkMenu = typeof TkMenu.Type

/** A Progressbar of ttk: `value` of `maximum`; an "indeterminate" bar that `running` moves by itself. */
export const TkProgress = Schema.Struct({
  value: Schema.Number,
  maximum: Schema.Number,
  mode: Schema.String,
  running: Schema.Boolean,
  length: Schema.Number,
  /** Colours of the bar and of the trough from `ttk.Style`, or "". */
  bar: Schema.String,
  trough: Schema.String
})
export type TkProgress = typeof TkProgress.Type

/** Tabs of a Notebook: the frame of each tab, its text and state; `current` is the shown tab (-1: none). */
export const TkTabs = Schema.Struct({
  tabs: Schema.Array(Schema.Tuple([Schema.Number, Schema.String, Schema.String])),
  current: Schema.Number
})
export type TkTabs = typeof TkTabs.Type

/**
 * A Treeview: columns (heading, width, anchor of the cells, anchor of the heading) and the shown rows (depth,
 * has children, open, cells, colour, background, selected). `tree`: the first column is the tree.
 */
export const TkTree = Schema.Struct({
  columns: Schema.Array(Schema.Tuple([Schema.String, Schema.Number, Schema.String, Schema.String])),
  rows: Schema.Array(Schema.Tuple([Schema.Number, Schema.Boolean, Schema.Boolean, Schema.Array(Schema.String), Schema.String, Schema.String, Schema.Boolean])),
  tree: Schema.Boolean,
  headings: Schema.Boolean,
  height: Schema.Number,
  mode: Schema.String
})
export type TkTree = typeof TkTree.Type

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
  scale: Schema.OptionFromNullOr(TkScale),
  /** The PhotoImage of a Label or a Button, or 0; `compound`: where the picture is beside the text. */
  image: Schema.Number,
  compound: Schema.String,
  textStyle: Schema.OptionFromNullOr(TkTextStyle),
  list: Schema.OptionFromNullOr(TkList),
  scroll: Schema.OptionFromNullOr(TkScroll),
  menu: Schema.OptionFromNullOr(TkMenu),
  /** The Menu that a Menubutton opens, or 0. */
  opens: Schema.Number,
  /** Colours of a pressed button (`activebackground`, `activeforeground`), "" for the usual ones. */
  activeBg: Schema.String,
  activeFg: Schema.String,
  /** The relief under the mouse pointer (`overrelief`), or "". */
  overrelief: Schema.String,
  /** The colour of the text cursor of a field (`insertbackground`), or "". */
  caret: Schema.String,
  /** "horizontal", "vertical" or "" (Separator, Progressbar, PanedWindow). */
  orient: Schema.String,
  progress: Schema.OptionFromNullOr(TkProgress),
  tabs: Schema.OptionFromNullOr(TkTabs),
  tree: Schema.OptionFromNullOr(TkTree)
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

/**
 * A picture of `PhotoImage` (`tkinter/_images.py`): a PNG or GIF file (base64), and pixels that the program
 * painted over it (rows of runs: colour, count…). `shownWidth`, `shownHeight`: with `zoom` and `subsample`.
 */
export const TkImage = Schema.Struct({
  id: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
  shownWidth: Schema.Number,
  shownHeight: Schema.Number,
  base: Schema.NullOr(Schema.Struct({ mime: Schema.Literals(["image/png", "image/gif"]), data: Schema.String })),
  pixels: Schema.NullOr(Schema.Array(Schema.Array(Schema.Union([Schema.String, Schema.Number]))))
})
export type TkImage = typeof TkImage.Type

export const TkAskKinds = { Question: "question", Value: "value", Color: "color", Open: "open", Save: "save" } as const

/** A dialog that waits for the student (`tkinter/_core.py` `ask`): one shape for all kinds, fields by kind. */
export const TkAsk = Schema.Struct({
  kind: Schema.Literals(Object.values(TkAskKinds)),
  title: Schema.String,
  message: Schema.optionalKey(Schema.String),
  icon: Schema.optionalKey(Schema.String),
  buttons: Schema.optionalKey(Schema.Array(Schema.String)),
  default: Schema.optionalKey(Schema.String),
  number: Schema.optionalKey(Schema.String),
  initial: Schema.optionalKey(Schema.String),
  secret: Schema.optionalKey(Schema.Boolean),
  min: Schema.optionalKey(Schema.NullOr(Schema.Number)),
  max: Schema.optionalKey(Schema.NullOr(Schema.Number)),
  files: Schema.optionalKey(Schema.Array(Schema.String)),
  filetypes: Schema.optionalKey(Schema.Array(Schema.Tuple([Schema.String, Schema.String]))),
  extension: Schema.optionalKey(Schema.String),
  multiple: Schema.optionalKey(Schema.Boolean)
})
export type TkAsk = typeof TkAsk.Type

const decodeSceneJson = Schema.decodeUnknownOption(Schema.fromJsonString(TkScene))
const decodeDialogJson = Schema.decodeUnknownOption(Schema.fromJsonString(TkDialog))
const decodeImageJson = Schema.decodeUnknownOption(Schema.fromJsonString(TkImage))
const decodeAskJson = Schema.decodeUnknownOption(Schema.fromJsonString(TkAsk))

export const decodeImage = (json: string): Option.Option<TkImage> => decodeImageJson(json)
export const decodeAsk = (json: string): Option.Option<TkAsk> => decodeAskJson(json)

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
