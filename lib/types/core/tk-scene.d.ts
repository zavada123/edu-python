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
};
export declare const TkWidgetKind: Schema.Literals<("Text" | "Label" | "Button" | "Entry" | "Canvas" | "Checkbutton" | "Radiobutton" | "Frame" | "Scale" | "LabelFrame")[]>;
export type TkWidgetKind = typeof TkWidgetKind.Type;
export declare const TkManagerKinds: {
    readonly Pack: "pack";
    readonly Grid: "grid";
    readonly Place: "place";
    readonly None: "none";
};
export declare const TkManagerKind: Schema.Literals<("pack" | "place" | "grid" | "none")[]>;
export type TkManagerKind = typeof TkManagerKind.Type;
export declare const TkItemTypes: {
    readonly Line: "line";
    readonly Rectangle: "rectangle";
    readonly Oval: "oval";
    readonly Polygon: "polygon";
    readonly Arc: "arc";
    readonly Text: "text";
};
export declare const TkItemType: Schema.Literals<("text" | "line" | "rectangle" | "oval" | "polygon" | "arc")[]>;
export type TkItemType = typeof TkItemType.Type;
export declare const TkDialogIcons: {
    readonly Info: "info";
    readonly Warning: "warning";
    readonly Error: "error";
};
export declare const TkDialogIcon: Schema.Literals<("info" | "warning" | "error")[]>;
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
    readonly title: Schema.String;
    readonly width: Schema.Number;
    readonly height: Schema.Number;
    readonly minWidth: Schema.Number;
    readonly minHeight: Schema.Number;
    readonly x: Schema.Number;
    readonly y: Schema.Number;
    readonly visible: Schema.Boolean;
    readonly decorated: Schema.Boolean;
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
}>;
export type TkWindow = typeof TkWindow.Type;
/** Options of pack, grid and place; `order` is the place in the list of the parent. -1: not set. */
export declare const TkManager: Schema.Struct<{
    readonly kind: Schema.Literals<("pack" | "place" | "grid" | "none")[]>;
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
    readonly type: Schema.Literals<("text" | "line" | "rectangle" | "oval" | "polygon" | "arc")[]>;
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
/**
 * A widget. `width` and `height` are in characters and lines for Label, Button, Entry and Text (as in Tk),
 * in pixels for Frame and Canvas. `rev` grows when the program changes the text of an Entry or a Text.
 */
export declare const TkWidget: Schema.Struct<{
    readonly parent: Schema.Number;
    readonly kind: Schema.Literals<("Text" | "Label" | "Button" | "Entry" | "Canvas" | "Checkbutton" | "Radiobutton" | "Frame" | "Scale" | "LabelFrame")[]>;
    readonly manager: Schema.Struct<{
        readonly kind: Schema.Literals<("pack" | "place" | "grid" | "none")[]>;
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
        readonly type: Schema.Literals<("text" | "line" | "rectangle" | "oval" | "polygon" | "arc")[]>;
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
}>;
export type TkWidget = typeof TkWidget.Type;
/** `focus`: the widget of `focus_set()`; `focusRev` grows on each call, so the page moves the focus once. */
export declare const TkScene: Schema.Struct<{
    readonly windows: Schema.$Array<Schema.Struct<{
        readonly title: Schema.String;
        readonly width: Schema.Number;
        readonly height: Schema.Number;
        readonly minWidth: Schema.Number;
        readonly minHeight: Schema.Number;
        readonly x: Schema.Number;
        readonly y: Schema.Number;
        readonly visible: Schema.Boolean;
        readonly decorated: Schema.Boolean;
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
    }>>;
    readonly widgets: Schema.$Array<Schema.Struct<{
        readonly parent: Schema.Number;
        readonly kind: Schema.Literals<("Text" | "Label" | "Button" | "Entry" | "Canvas" | "Checkbutton" | "Radiobutton" | "Frame" | "Scale" | "LabelFrame")[]>;
        readonly manager: Schema.Struct<{
            readonly kind: Schema.Literals<("pack" | "place" | "grid" | "none")[]>;
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
            readonly type: Schema.Literals<("text" | "line" | "rectangle" | "oval" | "polygon" | "arc")[]>;
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
    }>>;
    readonly focus: Schema.Number;
    readonly focusRev: Schema.Number;
    readonly bindAll: Schema.$Array<Schema.String>;
}>;
export type TkScene = typeof TkScene.Type;
export declare const TkDialog: Schema.Struct<{
    readonly icon: Schema.Literals<("info" | "warning" | "error")[]>;
    readonly title: Schema.String;
    readonly message: Schema.String;
}>;
export type TkDialog = typeof TkDialog.Type;
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
