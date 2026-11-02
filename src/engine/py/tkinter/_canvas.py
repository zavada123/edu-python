# Canvas of the browser tkinter: figures with numbers (id) and tags. The page draws them as SVG
# (tk-canvas.tsx). The coordinate system is as in Tk: (0; 0) is the top left corner, y goes down.
from tkinter import _events, _style
from tkinter._core import BASE_OPTIONS, TclError, touch
from tkinter._events import Bindings
from tkinter._widgets import Widget

_COMMON = {"state": "", "tags": (), "dash": "", "dashoffset": 0, "width": 1, "activewidth": 0, "stipple": "", "offset": "", "activedash": "", "disableddash": "", "disabledwidth": 0}
_SHAPE = dict(_COMMON)
_SHAPE.update({"fill": "", "outline": "black", "activefill": "", "activeoutline": "", "disabledfill": "", "disabledoutline": "", "outlinestipple": "", "outlineoffset": "", "activestipple": "", "activeoutlinestipple": "", "disabledstipple": "", "disabledoutlinestipple": ""})
_LINE = dict(_COMMON)
_LINE.update({"fill": "black", "activefill": "", "disabledfill": "", "arrow": "none", "arrowshape": (8, 10, 3), "capstyle": "butt", "joinstyle": "round", "smooth": 0, "splinesteps": 12, "activestipple": "", "disabledstipple": ""})
_POLYGON = dict(_SHAPE)
_POLYGON.update({"fill": "black", "outline": "", "joinstyle": "round", "smooth": 0, "splinesteps": 12})
_ARC = dict(_SHAPE)
_ARC.update({"start": 0, "extent": 90, "style": "pieslice"})
_TEXT = {"state": "", "tags": (), "text": "", "fill": "black", "activefill": "", "disabledfill": "", "font": "TkDefaultFont", "anchor": "center", "justify": "left", "width": 0, "angle": 0, "stipple": "", "activestipple": "", "disabledstipple": "", "offset": "", "underline": -1}

_SPECS = {"line": _LINE, "rectangle": _SHAPE, "oval": _SHAPE, "polygon": _POLYGON, "arc": _ARC, "text": _TEXT}
_COLOR_KEYS = ("fill", "outline", "activefill", "activeoutline", "disabledfill", "disabledoutline")

_DASHES = {"-": [6, 4], ".": [2, 4], "-.": [6, 4, 2, 4], "-..": [6, 4, 2, 4, 2, 4], ",": [4, 4], "_": [8, 4]}


def _flat(args):
    found = []
    for arg in args:
        if isinstance(arg, (tuple, list)):
            found.extend(_flat(arg))
        else:
            found.append(_style.number(arg))
    return found


def _count(kind, coords):
    n = len(coords)
    if kind == "text":
        if n != 2:
            raise TclError("wrong # coordinates: expected 2, got %d" % n)
    elif kind in ("rectangle", "oval", "arc"):
        if n != 4:
            raise TclError("wrong # coordinates: expected 4, got %d" % n)
    elif n % 2 != 0:
        raise TclError("wrong # coordinates: expected an even number, got %d" % n)
    elif kind == "line" and n < 4:
        raise TclError("wrong # coordinates: expected at least 4, got %d" % n)
    elif kind == "polygon" and n < 6:
        raise TclError("wrong # coordinates: expected at least 6, got %d" % n)


def _dash(value):
    if value is None or value == "" or value == ():
        return []
    if isinstance(value, (tuple, list)):
        return [_style.number(v) for v in value]
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return [value, value]
    text = str(value).strip()
    if text in _DASHES:
        return _DASHES[text]
    return [_style.number(v) for v in text.split()]


def _tags(value):
    if value is None or value == "":
        return []
    if isinstance(value, (tuple, list)):
        return [str(v) for v in value]
    return str(value).split()


def _check(kind, name, value):
    if name in _COLOR_KEYS:
        _style.color(value)
    elif name == "font":
        _style.font(value)
    elif name == "dash":
        _dash(value)
    elif name == "width" or name in ("start", "extent", "angle"):
        _style.number(value)
    elif name == "arrow":
        _style.one_of("arrow", value, ("none", "first", "last", "both"))
    elif name == "style":
        _style.one_of("style", value, ("pieslice", "chord", "arc"))
    elif name == "anchor":
        _style.one_of("anchor", value, ("n", "ne", "e", "se", "s", "sw", "w", "nw", "center"))
    elif name == "capstyle":
        _style.one_of("cap style", value, ("butt", "projecting", "round"))
    elif name == "joinstyle":
        _style.one_of("join style", value, ("bevel", "miter", "round"))
    elif name == "state":
        if value != "":
            _style.one_of("state", value, ("disabled", "hidden", "normal"))


class _Item:
    def __init__(self, number, kind, coords, options):
        self.id = number
        self.kind = kind
        self.coords = coords
        self.opts = options
        self.tags = []


def _bbox(item):
    xs = item.coords[0::2]
    ys = item.coords[1::2]
    if item.kind == "text":
        css, _ = _style.font(item.opts["font"])
        size = int(css.split("px")[0].split()[-1])
        lines = _style.tcl_text(item.opts["text"]).split("\n")
        width = max(len(line) for line in lines) * size * 0.6
        height = len(lines) * size * 1.2
        anchor = str(item.opts["anchor"])
        x = xs[0] - (0 if "w" in anchor else width if "e" in anchor else width / 2)
        y = ys[0] - (0 if "n" in anchor else height if "s" in anchor else height / 2)
        return (int(x), int(y), int(x + width) + 1, int(y + height) + 1)
    half = float(_style.number(item.opts.get("width", 1))) / 2
    return (int(min(xs) - half), int(min(ys) - half), int(max(xs) + half + 0.999), int(max(ys) + half + 0.999))


_CANVAS_OPTIONS = dict(BASE_OPTIONS)
_CANVAS_OPTIONS.update(
    {
        "closeenough": 1,
        "confine": 1,
        "height": 265,
        "highlightthickness": 2,
        "insertbackground": "SystemButtonText",
        "insertborderwidth": 0,
        "insertofftime": 300,
        "insertontime": 600,
        "insertwidth": 2,
        "offset": "0,0",
        "scrollregion": "",
        "selectbackground": "SystemHighlight",
        "selectborderwidth": 1,
        "selectforeground": "SystemHighlightText",
        "state": "normal",
        "width": 378,
        "xscrollcommand": "",
        "xscrollincrement": 0,
        "yscrollcommand": "",
        "yscrollincrement": 0,
    }
)


class Canvas(Widget):
    """A field for drawing: lines, rectangles, ovals, polygons, arcs and text."""

    _kind = "Canvas"
    _class = "Canvas"
    _defaults = _CANVAS_OPTIONS
    _states = ("disabled", "normal")

    def _init(self):
        self._items = []
        self._next_item = 1
        self._item_binds = {}
        self._current = 0

    # ── figures ──

    def _create(self, kind, args, kw):
        if args and isinstance(args[-1], dict):
            merged = dict(args[-1])
            merged.update(kw)
            kw = merged
            args = args[:-1]
        coords = _flat(args)
        _count(kind, coords)
        spec = _SPECS[kind]
        options = dict(spec)
        item = _Item(self._next_item, kind, coords, options)
        self._set_options(item, kw)
        self._next_item += 1
        self._items.append(item)
        touch()
        return item.id

    def _set_options(self, item, kw):
        spec = _SPECS[item.kind]
        checked = []
        for key in kw:
            name = key.rstrip("_")
            if name not in spec:
                raise TclError('unknown option "-%s"' % name)
            _check(item.kind, name, kw[key])
            checked.append((name, kw[key]))
        for name, value in checked:
            if name == "tags":
                item.tags = _tags(value)
            else:
                item.opts[name] = value

    def create_line(self, *args, **kw):
        return self._create("line", args, kw)

    def create_rectangle(self, *args, **kw):
        return self._create("rectangle", args, kw)

    def create_oval(self, *args, **kw):
        return self._create("oval", args, kw)

    def create_polygon(self, *args, **kw):
        return self._create("polygon", args, kw)

    def create_arc(self, *args, **kw):
        return self._create("arc", args, kw)

    def create_text(self, *args, **kw):
        return self._create("text", args, kw)

    def create_image(self, *args, **kw):
        raise NotImplementedError("create_image isn't available in the browser yet: run the program in IDLE")

    def create_bitmap(self, *args, **kw):
        raise NotImplementedError("create_bitmap isn't available in the browser yet: run the program in IDLE")

    def create_window(self, *args, **kw):
        raise NotImplementedError("create_window isn't available in the browser yet: run the program in IDLE")

    # ── find figures ──

    def _find(self, tag):
        if isinstance(tag, int) and not isinstance(tag, bool):
            return [item for item in self._items if item.id == tag]
        name = str(tag)
        if name.isdigit():
            return [item for item in self._items if item.id == int(name)]
        if name == "all":
            return list(self._items)
        if name == "current":
            return [item for item in self._items if item.id == self._current]
        return [item for item in self._items if name in item.tags]

    def find_all(self):
        return tuple(item.id for item in self._items)

    def find_withtag(self, tagOrId):
        return tuple(item.id for item in self._find(tagOrId))

    def find_overlapping(self, x1, y1, x2, y2):
        found = []
        for item in self._items:
            left, top, right, bottom = _bbox(item)
            if left <= x2 and right >= x1 and top <= y2 and bottom >= y1:
                found.append(item.id)
        return tuple(found)

    def find_enclosed(self, x1, y1, x2, y2):
        found = []
        for item in self._items:
            left, top, right, bottom = _bbox(item)
            if left >= x1 and right <= x2 and top >= y1 and bottom <= y2:
                found.append(item.id)
        return tuple(found)

    def find_closest(self, x, y, halo=None, start=None):
        best = None
        best_distance = None
        for item in self._items:
            left, top, right, bottom = _bbox(item)
            dx = max(left - x, 0, x - right)
            dy = max(top - y, 0, y - bottom)
            distance = dx * dx + dy * dy
            if best_distance is None or distance <= best_distance:
                best = item.id
                best_distance = distance
        return () if best is None else (best,)

    def bbox(self, *args):
        boxes = [_bbox(item) for tag in args for item in self._find(tag)]
        if not boxes:
            return None
        return (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))

    def type(self, tagOrId):
        found = self._find(tagOrId)
        return found[0].kind if found else None

    def gettags(self, tagOrId):
        found = self._find(tagOrId)
        return tuple(found[0].tags) if found else ()

    # ── change figures ──

    def delete(self, *args):
        for tag in args:
            for item in self._find(tag):
                self._items.remove(item)
        touch()

    def coords(self, tagOrId, *args):
        found = self._find(tagOrId)
        if not args:
            return [float(c) for c in found[0].coords] if found else []
        coords = _flat(args)
        if found:
            _count(found[0].kind, coords)
            found[0].coords = coords
            touch()

    def move(self, tagOrId, xAmount, yAmount):
        dx = _style.number(xAmount)
        dy = _style.number(yAmount)
        for item in self._find(tagOrId):
            item.coords = [c + (dx if i % 2 == 0 else dy) for i, c in enumerate(item.coords)]
        touch()

    def moveto(self, tagOrId, x="", y=""):
        found = self._find(tagOrId)
        if not found:
            return
        box = self.bbox(tagOrId)
        dx = 0 if x == "" else _style.number(x) - box[0]
        dy = 0 if y == "" else _style.number(y) - box[1]
        self.move(tagOrId, dx, dy)

    def scale(self, tagOrId, xOrigin, yOrigin, xScale, yScale):
        x0 = _style.number(xOrigin)
        y0 = _style.number(yOrigin)
        sx = _style.number(xScale)
        sy = _style.number(yScale)
        for item in self._find(tagOrId):
            item.coords = [(x0 + (c - x0) * sx) if i % 2 == 0 else (y0 + (c - y0) * sy) for i, c in enumerate(item.coords)]
        touch()

    def itemconfigure(self, tagOrId, cnf=None, **kw):
        found = self._find(tagOrId)
        options = dict(cnf) if isinstance(cnf, dict) else {}
        options.update(kw)
        if isinstance(cnf, str):
            return (cnf, "", "", "", found[0].opts.get(cnf, "")) if found else None
        if not options:
            if not found:
                return {}
            shown = dict(found[0].opts)
            shown["tags"] = " ".join(found[0].tags)
            return shown
        for item in found:
            self._set_options(item, options)
        touch()

    itemconfig = itemconfigure

    def itemcget(self, tagOrId, option):
        found = self._find(tagOrId)
        if not found:
            return ""
        name = str(option).lstrip("-")
        if name == "tags":
            return " ".join(found[0].tags)
        if name not in found[0].opts:
            raise TclError('unknown option "-%s"' % name)
        return found[0].opts[name]

    def tag_raise(self, tagOrId, aboveThis=None):
        moved = self._find(tagOrId)
        rest = [item for item in self._items if item not in moved]
        at = len(rest)
        if aboveThis is not None:
            above = self._find(aboveThis)
            if above:
                at = rest.index(above[-1]) + 1 if above[-1] in rest else len(rest)
        self._items = rest[:at] + moved + rest[at:]
        touch()

    def tag_lower(self, tagOrId, belowThis=None):
        moved = self._find(tagOrId)
        rest = [item for item in self._items if item not in moved]
        at = 0
        if belowThis is not None:
            below = self._find(belowThis)
            if below and below[0] in rest:
                at = rest.index(below[0])
        self._items = rest[:at] + moved + rest[at:]
        touch()

    lift = tag_raise
    tkraise = tag_raise
    lower = tag_lower

    def addtag_withtag(self, newtag, tagOrId):
        for item in self._find(tagOrId):
            if str(newtag) not in item.tags:
                item.tags.append(str(newtag))

    def addtag_all(self, newtag):
        self.addtag_withtag(newtag, "all")

    def dtag(self, tagOrId, tagToDelete=None):
        name = str(tagOrId if tagToDelete is None else tagToDelete)
        for item in self._find(tagOrId):
            if name in item.tags:
                item.tags.remove(name)

    def canvasx(self, screenx, gridspacing=None):
        return float(screenx)

    def canvasy(self, screeny, gridspacing=None):
        return float(screeny)

    def xview(self, *args):
        pass

    yview = xview

    def postscript(self, cnf={}, **kw):
        raise NotImplementedError("postscript isn't available in the browser")

    # ── events of figures ──

    def tag_bind(self, tagOrId, sequence=None, func=None, add=None):
        name = str(tagOrId)
        bindings = self._item_binds.get(name)
        if bindings is None:
            bindings = Bindings()
            self._item_binds[name] = bindings
        return self._bind(bindings, sequence, func, add)

    def tag_unbind(self, tagOrId, sequence, funcid=None):
        bindings = self._item_binds.get(str(tagOrId))
        if bindings is not None:
            bindings.unbind(sequence)
            touch()

    def _fire_item(self, number, event):
        found = self._find(number)
        if not found:
            return
        self._current = number
        item = found[0]
        stop = False
        for tag in ["all"] + item.tags + [str(item.id)]:
            bindings = self._item_binds.get(tag)
            if bindings is None:
                continue
            functions = bindings.best(event)
            if functions is not None and _events.call(functions, event):
                stop = True
        return stop

    def _page_binds(self):
        kinds = Widget._page_binds(self)
        for bindings in self._item_binds.values():
            kinds = kinds + [k for k in bindings.page_kinds() if k not in kinds]
        return kinds

    def _scene(self):
        scene = Widget._scene(self)
        scene["items"] = [self._item_scene(item) for item in self._items]
        return scene

    def _item_scene(self, item):
        opts = item.opts
        font, underline = _style.font(opts.get("font", "TkDefaultFont"))
        arrowshape = opts.get("arrowshape", (8, 10, 3))
        return {
            "id": item.id,
            "type": item.kind,
            "coords": item.coords,
            "fill": _style.color(opts.get("fill", "")),
            "outline": _style.color(opts.get("outline", "")),
            "width": _style.number(opts.get("width", 1)),
            "dash": _dash(opts.get("dash", "")),
            "arrow": str(opts.get("arrow", "none")),
            "arrowshape": [_style.number(v) for v in arrowshape],
            "capstyle": str(opts.get("capstyle", "butt")),
            "joinstyle": str(opts.get("joinstyle", "round")),
            "smooth": _style.flag(opts.get("smooth", 0)),
            "start": _style.number(opts.get("start", 0)),
            "extent": _style.number(opts.get("extent", 90)),
            "style": str(opts.get("style", "pieslice")),
            "text": _style.tcl_text(opts.get("text", "")),
            "font": font,
            "underline": underline,
            "anchor": str(opts.get("anchor", "center")),
            "justify": str(opts.get("justify", "left")),
            "wrap": _style.number(opts.get("width", 0)) if item.kind == "text" else 0,
            "angle": _style.number(opts.get("angle", 0)),
            "hidden": str(opts.get("state", "")) == "hidden",
        }
