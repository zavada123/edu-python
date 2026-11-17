/**
 * State of the windows of a tkinter program, as `tkinter/_core.py` sends it (JSON). The page draws the
 * windows from it (tk-window.tsx). Student code can send any text through `_mriya`, so the page decodes it.
 */
import { Option, Schema } from "effect";
export declare const TkWidgetKinds: {
    readonly Label: "Label";
    readonly Button: "Button";
    readonly Checkbutton: "Checkbutton";
    readonly Radiobutton: "Radiobutton";
    readonly Entry: "Entry";
    readonly Text: "Text";
    readonly Frame: "Frame";
    readonly LabelFrame: "LabelFrame";
    readonly Canvas: "Canvas";
    readonly Scale: "Scale";
    readonly Listbox: "Listbox";
    readonly Spinbox: "Spinbox";
    readonly Combobox: "Combobox";
    readonly Scrollbar: "Scrollbar";
    readonly Menu: "Menu";
    readonly Menubutton: "Menubutton";
};
export declare const TkWidgetKind: Schema.Literals<("Button" | "Canvas" | "Checkbutton" | "Combobox" | "Entry" | "Frame" | "Label" | "LabelFrame" | "Listbox" | "Menu" | "Menubutton" | "Radiobutton" | "Scale" | "Scrollbar" | "Spinbox" | "Text")[]>;
export type TkWidgetKind = typeof TkWidgetKind.Type;
export declare const TkManagerKinds: {
    readonly Pack: "pack";
    readonly Grid: "grid";
    readonly Place: "place";
    readonly None: "none";
};
export declare const TkManagerKind: Schema.Literals<("grid" | "none" | "pack" | "place")[]>;
export type TkManagerKind = typeof TkManagerKind.Type;
export declare const TkItemTypes: {
    readonly Line: "line";
    readonly Rectangle: "rectangle";
    readonly Oval: "oval";
    readonly Polygon: "polygon";
    readonly Arc: "arc";
    readonly Text: "text";
    readonly Image: "image";
};
export declare const TkItemType: Schema.Literals<("arc" | "image" | "line" | "oval" | "polygon" | "rectangle" | "text")[]>;
export type TkItemType = typeof TkItemType.Type;
export declare const TkDialogIcons: {
    readonly Info: "info";
    readonly Warning: "warning";
    readonly Error: "error";
};
export declare const TkDialogIcon: Schema.Literals<("error" | "info" | "warning")[]>;
export type TkDialogIcon = typeof TkDialogIcon.Type;
/** Kinds of events that the program waits for (`_events.py`): the page sends only these. */
export declare const TkBindKinds: {
    readonly Press: "Press";
    readonly Release: "Release";
    readonly Motion: "Motion";
    readonly Enter: "Enter";
    readonly Leave: "Leave";
    readonly Wheel: "Wheel";
    readonly Key: "Key";
    readonly KeyRelease: "KeyRelease";
};
export type TkBindKind = (typeof TkBindKinds)[keyof typeof TkBindKinds];
/** `width`, `height`: from `geometry`, or -1 when the window takes the size of its widgets. */
export declare const TkWindow: Schema.Struct<{
    readonly id: Schema.Number;
    readonly binds: Schema.$Array<Schema.String>;
    readonly bg: Schema.String;
    readonly bd: Schema.Number;
    readonly relief: Schema.String;
    readonly padx: Schema.Number;
    readonly pady: Schema.Number;
    readonly highlight: Schema.Number;
    readonly propagate: Schema.Boolean;
    readonly columns: Schema.$Array<Schema.Tuple<readonly [Schema.Number, Schema.Number, Schema.Number]>>;
    readonly rows: Schema.$Array<Schema.Tuple<readonly [Schema.Number, Schema.Number, Schema.Number]>>;
    readonly title: Schema.String;
    readonly width: Schema.Number;
    readonly height: Schema.Number;
    readonly minWidth: Schema.Number;
    readonly minHeight: Schema.Number;
    readonly x: Schema.Number;
    readonly y: Schema.Number;
    readonly visible: Schema.Boolean;
    readonly decorated: Schema.Boolean;
    /** The Menu of the menu bar, or 0. */
    readonly menu: Schema.Number;
}>;
export type TkWindow = typeof TkWindow.Type;
/** Options of pack, grid and place; `order` is the place in the list of the parent. -1: not set. */
export declare const TkManager: Schema.Struct<{
    readonly kind: Schema.Literals<("grid" | "none" | "pack" | "place")[]>;
    readonly order: Schema.Number;
    readonly side: Schema.String;
    readonly fill: Schema.String;
    readonly expand: Schema.Boolean;
    readonly anchor: Schema.String;
    readonly padx: Schema.Tuple<readonly [Schema.Number, Schema.Number]>;
    readonly pady: Schema.Tuple<readonly [Schema.Number, Schema.Number]>;
    readonly ipadx: Schema.Number;
    readonly ipady: Schema.Number;
    readonly row: Schema.Number;
    readonly column: Schema.Number;
    readonly rowspan: Schema.Number;
    readonly columnspan: Schema.Number;
    readonly sticky: Schema.String;
    readonly x: Schema.Number;
    readonly y: Schema.Number;
    readonly relx: Schema.Number;
    readonly rely: Schema.Number;
    readonly width: Schema.Number;
    readonly height: Schema.Number;
    readonly relwidth: Schema.Number;
    readonly relheight: Schema.Number;
}>;
export type TkManager = typeof TkManager.Type;
/** A canvas figure. Colours are CSS, "" is no colour. */
export declare const TkItem: Schema.Struct<{
    readonly id: Schema.Number;
    readonly type: Schema.Literals<("arc" | "image" | "line" | "oval" | "polygon" | "rectangle" | "text")[]>;
    readonly coords: Schema.$Array<Schema.Number>;
    readonly fill: Schema.String;
    readonly outline: Schema.String;
    readonly width: Schema.Number;
    readonly dash: Schema.$Array<Schema.Number>;
    readonly arrow: Schema.String;
    readonly arrowshape: Schema.$Array<Schema.Number>;
    readonly capstyle: Schema.String;
    readonly joinstyle: Schema.String;
    readonly smooth: Schema.Boolean;
    readonly start: Schema.Number;
    readonly extent: Schema.Number;
    readonly style: Schema.String;
    readonly text: Schema.String;
    readonly font: Schema.String;
    readonly underline: Schema.Boolean;
    readonly anchor: Schema.String;
    readonly justify: Schema.String;
    readonly wrap: Schema.Number;
    readonly angle: Schema.Number;
    readonly hidden: Schema.Boolean;
    /** The PhotoImage of an image figure, or 0. */
    readonly image: Schema.Number;
}>;
export type TkItem = typeof TkItem.Type;
export declare const TkScale: Schema.Struct<{
    readonly from: Schema.Number;
    readonly to: Schema.Number;
    readonly resolution: Schema.Number;
    readonly value: Schema.Number;
    readonly orient: Schema.String;
    readonly length: Schema.Number;
    readonly label: Schema.String;
    readonly showvalue: Schema.Boolean;
    readonly trough: Schema.String;
}>;
export type TkScale = typeof TkScale.Type;
/** A coloured part of a Text: start, end (characters), colour, background, CSS font, underline, overstrike. */
declare const TkTextPart: Schema.Tuple<readonly [Schema.Number, Schema.Number, Schema.String, Schema.String, Schema.String, Schema.Boolean, Schema.Boolean]>;
export type TkTextPart = typeof TkTextPart.Type;
/** Tags of a Text: the coloured parts and the selection that the program set (`selectionRev` grows then). */
export declare const TkTextStyle: Schema.Struct<{
    readonly parts: Schema.$Array<Schema.Tuple<readonly [Schema.Number, Schema.Number, Schema.String, Schema.String, Schema.String, Schema.Boolean, Schema.Boolean]>>;
    readonly selection: Schema.Tuple<readonly [Schema.Number, Schema.Number]>;
    readonly selectionRev: Schema.Number;
    readonly selectionColor: Schema.String;
}>;
export type TkTextStyle = typeof TkTextStyle.Type;
export declare const TkListModes: {
    readonly Single: "single";
    readonly Browse: "browse";
    readonly Multiple: "multiple";
    readonly Extended: "extended";
    readonly Spin: "spin";
    readonly Combo: "combo";
};
/** Rows of a Listbox (text, colour, background), or the values of a Spinbox or a Combobox. */
export declare const TkList: Schema.Struct<{
    readonly rows: Schema.$Array<Schema.Tuple<readonly [Schema.String, Schema.String, Schema.String]>>;
    readonly chosen: Schema.$Array<Schema.Number>;
    readonly active: Schema.Number;
    readonly mode: Schema.String;
    readonly selectBg: Schema.String;
    readonly selectFg: Schema.String;
}>;
export type TkList = typeof TkList.Type;
/** A Scrollbar: the widget that it scrolls (0: none). */
export declare const TkScroll: Schema.Struct<{
    readonly target: Schema.Number;
    readonly vertical: Schema.Boolean;
    readonly trough: Schema.String;
}>;
export type TkScroll = typeof TkScroll.Type;
export declare const TkMenuEntryTypes: {
    readonly Command: "command";
    readonly Cascade: "cascade";
    readonly Check: "checkbutton";
    readonly Radio: "radiobutton";
    readonly Separator: "separator";
};
export declare const TkMenuEntry: Schema.Struct<{
    readonly type: Schema.String;
    readonly label: Schema.String;
    readonly accelerator: Schema.String;
    readonly enabled: Schema.Boolean;
    readonly checked: Schema.Boolean;
    readonly submenu: Schema.Number;
    readonly underline: Schema.Number;
    readonly fg: Schema.String;
}>;
export type TkMenuEntry = typeof TkMenuEntry.Type;
/** A Menu; `posted`: x and y on the "screen" and the number of the post, after `tk_popup`. */
export declare const TkMenu: Schema.Struct<{
    readonly entries: Schema.$Array<Schema.Struct<{
        readonly type: Schema.String;
        readonly label: Schema.String;
        readonly accelerator: Schema.String;
        readonly enabled: Schema.Boolean;
        readonly checked: Schema.Boolean;
        readonly submenu: Schema.Number;
        readonly underline: Schema.Number;
        readonly fg: Schema.String;
    }>>;
    readonly posted: Schema.NullOr<Schema.Tuple<readonly [Schema.Number, Schema.Number, Schema.Number]>>;
}>;
export type TkMenu = typeof TkMenu.Type;
/**
 * A widget. `width` and `height` are in characters and lines for Label, Button, Entry and Text (as in Tk),
 * in pixels for Frame and Canvas. `rev` grows when the program changes the text of an Entry or a Text.
 */
export declare const TkWidget: Schema.Struct<{
    readonly id: Schema.Number;
    readonly binds: Schema.$Array<Schema.String>;
    readonly bg: Schema.String;
    readonly bd: Schema.Number;
    readonly relief: Schema.String;
    readonly padx: Schema.Number;
    readonly pady: Schema.Number;
    readonly highlight: Schema.Number;
    readonly propagate: Schema.Boolean;
    readonly columns: Schema.$Array<Schema.Tuple<readonly [Schema.Number, Schema.Number, Schema.Number]>>;
    readonly rows: Schema.$Array<Schema.Tuple<readonly [Schema.Number, Schema.Number, Schema.Number]>>;
    readonly parent: Schema.Number;
    readonly kind: Schema.Literals<("Button" | "Canvas" | "Checkbutton" | "Combobox" | "Entry" | "Frame" | "Label" | "LabelFrame" | "Listbox" | "Menu" | "Menubutton" | "Radiobutton" | "Scale" | "Scrollbar" | "Spinbox" | "Text")[]>;
    readonly manager: Schema.Struct<{
        readonly kind: Schema.Literals<("grid" | "none" | "pack" | "place")[]>;
        readonly order: Schema.Number;
        readonly side: Schema.String;
        readonly fill: Schema.String;
        readonly expand: Schema.Boolean;
        readonly anchor: Schema.String;
        readonly padx: Schema.Tuple<readonly [Schema.Number, Schema.Number]>;
        readonly pady: Schema.Tuple<readonly [Schema.Number, Schema.Number]>;
        readonly ipadx: Schema.Number;
        readonly ipady: Schema.Number;
        readonly row: Schema.Number;
        readonly column: Schema.Number;
        readonly rowspan: Schema.Number;
        readonly columnspan: Schema.Number;
        readonly sticky: Schema.String;
        readonly x: Schema.Number;
        readonly y: Schema.Number;
        readonly relx: Schema.Number;
        readonly rely: Schema.Number;
        readonly width: Schema.Number;
        readonly height: Schema.Number;
        readonly relwidth: Schema.Number;
        readonly relheight: Schema.Number;
    }>;
    readonly fg: Schema.String;
    readonly font: Schema.String;
    readonly underline: Schema.Boolean;
    readonly width: Schema.Number;
    readonly height: Schema.Number;
    readonly anchor: Schema.String;
    readonly justify: Schema.String;
    readonly wrap: Schema.Number;
    readonly state: Schema.String;
    readonly text: Schema.String;
    readonly rev: Schema.Number;
    readonly checked: Schema.Boolean;
    readonly indicator: Schema.Boolean;
    readonly selectcolor: Schema.String;
    readonly show: Schema.String;
    readonly textwrap: Schema.String;
    readonly items: Schema.$Array<Schema.Struct<{
        readonly id: Schema.Number;
        readonly type: Schema.Literals<("arc" | "image" | "line" | "oval" | "polygon" | "rectangle" | "text")[]>;
        readonly coords: Schema.$Array<Schema.Number>;
        readonly fill: Schema.String;
        readonly outline: Schema.String;
        readonly width: Schema.Number;
        readonly dash: Schema.$Array<Schema.Number>;
        readonly arrow: Schema.String;
        readonly arrowshape: Schema.$Array<Schema.Number>;
        readonly capstyle: Schema.String;
        readonly joinstyle: Schema.String;
        readonly smooth: Schema.Boolean;
        readonly start: Schema.Number;
        readonly extent: Schema.Number;
        readonly style: Schema.String;
        readonly text: Schema.String;
        readonly font: Schema.String;
        readonly underline: Schema.Boolean;
        readonly anchor: Schema.String;
        readonly justify: Schema.String;
        readonly wrap: Schema.Number;
        readonly angle: Schema.Number;
        readonly hidden: Schema.Boolean;
        /** The PhotoImage of an image figure, or 0. */
        readonly image: Schema.Number;
    }>>;
    readonly scale: Schema.OptionFromNullOr<Schema.Struct<{
        readonly from: Schema.Number;
        readonly to: Schema.Number;
        readonly resolution: Schema.Number;
        readonly value: Schema.Number;
        readonly orient: Schema.String;
        readonly length: Schema.Number;
        readonly label: Schema.String;
        readonly showvalue: Schema.Boolean;
        readonly trough: Schema.String;
    }>>;
    /** The PhotoImage of a Label or a Button, or 0; `compound`: where the picture is beside the text. */
    readonly image: Schema.Number;
    readonly compound: Schema.String;
    readonly textStyle: Schema.OptionFromNullOr<Schema.Struct<{
        readonly parts: Schema.$Array<Schema.Tuple<readonly [Schema.Number, Schema.Number, Schema.String, Schema.String, Schema.String, Schema.Boolean, Schema.Boolean]>>;
        readonly selection: Schema.Tuple<readonly [Schema.Number, Schema.Number]>;
        readonly selectionRev: Schema.Number;
        readonly selectionColor: Schema.String;
    }>>;
    readonly list: Schema.OptionFromNullOr<Schema.Struct<{
        readonly rows: Schema.$Array<Schema.Tuple<readonly [Schema.String, Schema.String, Schema.String]>>;
        readonly chosen: Schema.$Array<Schema.Number>;
        readonly active: Schema.Number;
        readonly mode: Schema.String;
        readonly selectBg: Schema.String;
        readonly selectFg: Schema.String;
    }>>;
    readonly scroll: Schema.OptionFromNullOr<Schema.Struct<{
        readonly target: Schema.Number;
        readonly vertical: Schema.Boolean;
        readonly trough: Schema.String;
    }>>;
    readonly menu: Schema.OptionFromNullOr<Schema.Struct<{
        readonly entries: Schema.$Array<Schema.Struct<{
            readonly type: Schema.String;
            readonly label: Schema.String;
            readonly accelerator: Schema.String;
            readonly enabled: Schema.Boolean;
            readonly checked: Schema.Boolean;
            readonly submenu: Schema.Number;
            readonly underline: Schema.Number;
            readonly fg: Schema.String;
        }>>;
        readonly posted: Schema.NullOr<Schema.Tuple<readonly [Schema.Number, Schema.Number, Schema.Number]>>;
    }>>;
    /** The Menu that a Menubutton opens, or 0. */
    readonly opens: Schema.Number;
}>;
export type TkWidget = typeof TkWidget.Type;
/** `focus`: the widget of `focus_set()`; `focusRev` grows on each call, so the page moves the focus once. */
export declare const TkScene: Schema.Struct<{
    readonly windows: Schema.$Array<Schema.Struct<{
        readonly id: Schema.Number;
        readonly binds: Schema.$Array<Schema.String>;
        readonly bg: Schema.String;
        readonly bd: Schema.Number;
        readonly relief: Schema.String;
        readonly padx: Schema.Number;
        readonly pady: Schema.Number;
        readonly highlight: Schema.Number;
        readonly propagate: Schema.Boolean;
        readonly columns: Schema.$Array<Schema.Tuple<readonly [Schema.Number, Schema.Number, Schema.Number]>>;
        readonly rows: Schema.$Array<Schema.Tuple<readonly [Schema.Number, Schema.Number, Schema.Number]>>;
        readonly title: Schema.String;
        readonly width: Schema.Number;
        readonly height: Schema.Number;
        readonly minWidth: Schema.Number;
        readonly minHeight: Schema.Number;
        readonly x: Schema.Number;
        readonly y: Schema.Number;
        readonly visible: Schema.Boolean;
        readonly decorated: Schema.Boolean;
        /** The Menu of the menu bar, or 0. */
        readonly menu: Schema.Number;
    }>>;
    readonly widgets: Schema.$Array<Schema.Struct<{
        readonly id: Schema.Number;
        readonly binds: Schema.$Array<Schema.String>;
        readonly bg: Schema.String;
        readonly bd: Schema.Number;
        readonly relief: Schema.String;
        readonly padx: Schema.Number;
        readonly pady: Schema.Number;
        readonly highlight: Schema.Number;
        readonly propagate: Schema.Boolean;
        readonly columns: Schema.$Array<Schema.Tuple<readonly [Schema.Number, Schema.Number, Schema.Number]>>;
        readonly rows: Schema.$Array<Schema.Tuple<readonly [Schema.Number, Schema.Number, Schema.Number]>>;
        readonly parent: Schema.Number;
        readonly kind: Schema.Literals<("Button" | "Canvas" | "Checkbutton" | "Combobox" | "Entry" | "Frame" | "Label" | "LabelFrame" | "Listbox" | "Menu" | "Menubutton" | "Radiobutton" | "Scale" | "Scrollbar" | "Spinbox" | "Text")[]>;
        readonly manager: Schema.Struct<{
            readonly kind: Schema.Literals<("grid" | "none" | "pack" | "place")[]>;
            readonly order: Schema.Number;
            readonly side: Schema.String;
            readonly fill: Schema.String;
            readonly expand: Schema.Boolean;
            readonly anchor: Schema.String;
            readonly padx: Schema.Tuple<readonly [Schema.Number, Schema.Number]>;
            readonly pady: Schema.Tuple<readonly [Schema.Number, Schema.Number]>;
            readonly ipadx: Schema.Number;
            readonly ipady: Schema.Number;
            readonly row: Schema.Number;
            readonly column: Schema.Number;
            readonly rowspan: Schema.Number;
            readonly columnspan: Schema.Number;
            readonly sticky: Schema.String;
            readonly x: Schema.Number;
            readonly y: Schema.Number;
            readonly relx: Schema.Number;
            readonly rely: Schema.Number;
            readonly width: Schema.Number;
            readonly height: Schema.Number;
            readonly relwidth: Schema.Number;
            readonly relheight: Schema.Number;
        }>;
        readonly fg: Schema.String;
        readonly font: Schema.String;
        readonly underline: Schema.Boolean;
        readonly width: Schema.Number;
        readonly height: Schema.Number;
        readonly anchor: Schema.String;
        readonly justify: Schema.String;
        readonly wrap: Schema.Number;
        readonly state: Schema.String;
        readonly text: Schema.String;
        readonly rev: Schema.Number;
        readonly checked: Schema.Boolean;
        readonly indicator: Schema.Boolean;
        readonly selectcolor: Schema.String;
        readonly show: Schema.String;
        readonly textwrap: Schema.String;
        readonly items: Schema.$Array<Schema.Struct<{
            readonly id: Schema.Number;
            readonly type: Schema.Literals<("arc" | "image" | "line" | "oval" | "polygon" | "rectangle" | "text")[]>;
            readonly coords: Schema.$Array<Schema.Number>;
            readonly fill: Schema.String;
            readonly outline: Schema.String;
            readonly width: Schema.Number;
            readonly dash: Schema.$Array<Schema.Number>;
            readonly arrow: Schema.String;
            readonly arrowshape: Schema.$Array<Schema.Number>;
            readonly capstyle: Schema.String;
            readonly joinstyle: Schema.String;
            readonly smooth: Schema.Boolean;
            readonly start: Schema.Number;
            readonly extent: Schema.Number;
            readonly style: Schema.String;
            readonly text: Schema.String;
            readonly font: Schema.String;
            readonly underline: Schema.Boolean;
            readonly anchor: Schema.String;
            readonly justify: Schema.String;
            readonly wrap: Schema.Number;
            readonly angle: Schema.Number;
            readonly hidden: Schema.Boolean;
            /** The PhotoImage of an image figure, or 0. */
            readonly image: Schema.Number;
        }>>;
        readonly scale: Schema.OptionFromNullOr<Schema.Struct<{
            readonly from: Schema.Number;
            readonly to: Schema.Number;
            readonly resolution: Schema.Number;
            readonly value: Schema.Number;
            readonly orient: Schema.String;
            readonly length: Schema.Number;
            readonly label: Schema.String;
            readonly showvalue: Schema.Boolean;
            readonly trough: Schema.String;
        }>>;
        /** The PhotoImage of a Label or a Button, or 0; `compound`: where the picture is beside the text. */
        readonly image: Schema.Number;
        readonly compound: Schema.String;
        readonly textStyle: Schema.OptionFromNullOr<Schema.Struct<{
            readonly parts: Schema.$Array<Schema.Tuple<readonly [Schema.Number, Schema.Number, Schema.String, Schema.String, Schema.String, Schema.Boolean, Schema.Boolean]>>;
            readonly selection: Schema.Tuple<readonly [Schema.Number, Schema.Number]>;
            readonly selectionRev: Schema.Number;
            readonly selectionColor: Schema.String;
        }>>;
        readonly list: Schema.OptionFromNullOr<Schema.Struct<{
            readonly rows: Schema.$Array<Schema.Tuple<readonly [Schema.String, Schema.String, Schema.String]>>;
            readonly chosen: Schema.$Array<Schema.Number>;
            readonly active: Schema.Number;
            readonly mode: Schema.String;
            readonly selectBg: Schema.String;
            readonly selectFg: Schema.String;
        }>>;
        readonly scroll: Schema.OptionFromNullOr<Schema.Struct<{
            readonly target: Schema.Number;
            readonly vertical: Schema.Boolean;
            readonly trough: Schema.String;
        }>>;
        readonly menu: Schema.OptionFromNullOr<Schema.Struct<{
            readonly entries: Schema.$Array<Schema.Struct<{
                readonly type: Schema.String;
                readonly label: Schema.String;
                readonly accelerator: Schema.String;
                readonly enabled: Schema.Boolean;
                readonly checked: Schema.Boolean;
                readonly submenu: Schema.Number;
                readonly underline: Schema.Number;
                readonly fg: Schema.String;
            }>>;
            readonly posted: Schema.NullOr<Schema.Tuple<readonly [Schema.Number, Schema.Number, Schema.Number]>>;
        }>>;
        /** The Menu that a Menubutton opens, or 0. */
        readonly opens: Schema.Number;
    }>>;
    readonly focus: Schema.Number;
    readonly focusRev: Schema.Number;
    readonly bindAll: Schema.$Array<Schema.String>;
}>;
export type TkScene = typeof TkScene.Type;
export declare const TkDialog: Schema.Struct<{
    readonly icon: Schema.Literals<("error" | "info" | "warning")[]>;
    readonly title: Schema.String;
    readonly message: Schema.String;
}>;
export type TkDialog = typeof TkDialog.Type;
/**
 * A picture of `PhotoImage` (`tkinter/_images.py`): a PNG or GIF file (base64), and pixels that the program
 * painted over it (rows of runs: colour, count…). `shownWidth`, `shownHeight`: with `zoom` and `subsample`.
 */
export declare const TkImage: Schema.Struct<{
    readonly id: Schema.Number;
    readonly width: Schema.Number;
    readonly height: Schema.Number;
    readonly shownWidth: Schema.Number;
    readonly shownHeight: Schema.Number;
    readonly base: Schema.NullOr<Schema.Struct<{
        readonly mime: Schema.Literals<readonly ["image/png", "image/gif"]>;
        readonly data: Schema.String;
    }>>;
    readonly pixels: Schema.NullOr<Schema.$Array<Schema.$Array<Schema.Union<readonly [Schema.String, Schema.Number]>>>>;
}>;
export type TkImage = typeof TkImage.Type;
export declare const TkAskKinds: {
    readonly Question: "question";
    readonly Value: "value";
    readonly Color: "color";
    readonly Open: "open";
    readonly Save: "save";
};
/** A dialog that waits for the student (`tkinter/_core.py` `ask`): one shape for all kinds, fields by kind. */
export declare const TkAsk: Schema.Struct<{
    readonly kind: Schema.Literals<("color" | "open" | "question" | "save" | "value")[]>;
    readonly title: Schema.String;
    readonly message: Schema.optionalKey<Schema.String>;
    readonly icon: Schema.optionalKey<Schema.String>;
    readonly buttons: Schema.optionalKey<Schema.$Array<Schema.String>>;
    readonly default: Schema.optionalKey<Schema.String>;
    readonly number: Schema.optionalKey<Schema.String>;
    readonly initial: Schema.optionalKey<Schema.String>;
    readonly secret: Schema.optionalKey<Schema.Boolean>;
    readonly min: Schema.optionalKey<Schema.NullOr<Schema.Number>>;
    readonly max: Schema.optionalKey<Schema.NullOr<Schema.Number>>;
    readonly files: Schema.optionalKey<Schema.$Array<Schema.String>>;
    readonly filetypes: Schema.optionalKey<Schema.$Array<Schema.Tuple<readonly [Schema.String, Schema.String]>>>;
    readonly extension: Schema.optionalKey<Schema.String>;
    readonly multiple: Schema.optionalKey<Schema.Boolean>;
}>;
export type TkAsk = typeof TkAsk.Type;
export declare const decodeImage: (json: string) => Option.Option<TkImage>;
export declare const decodeAsk: (json: string) => Option.Option<TkAsk>;
export type SceneUpdate = {
    readonly _tag: "Scene";
    readonly scene: TkScene;
}
/** The program closed its windows. */
 | {
    readonly _tag: "Closed";
}
/** Not a scene: the page keeps the windows that it shows. */
 | {
    readonly _tag: "Invalid";
};
export declare const decodeScene: (json: string) => SceneUpdate;
export declare const decodeDialog: (json: string) => Option.Option<TkDialog>;
/** Widgets inside `parent` that a geometry manager shows, in the order of the manager. */
export declare const managedChildren: (scene: TkScene, parent: number, kind: TkManagerKind) => ReadonlyArray<TkWidget>;
/** The window of a widget. */
export declare const windowOf: (scene: TkScene, widget: number) => Option.Option<TkWindow>;
/**
 * Does the program wait for this kind of event on the widget? Tk sends an event to the widget, its class,
 * its window and `bind_all` (`_core.py` `_chain`).
 */
export declare const waitsFor: (scene: TkScene, widget: number, kind: TkBindKind) => boolean;
export {};
