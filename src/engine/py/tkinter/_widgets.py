# Widgets of the browser tkinter and the geometry managers pack, grid and place. The page draws each widget
# (tk-widgets.tsx) from its options; sizes in characters and lines (Label, Button, Entry) are as in Tk.
from tkinter import _core, _style
from tkinter._core import BASE_OPTIONS, Misc, TclError, app, touch
from tkinter._vars import StringVar, Variable

_SIDES = ("top", "bottom", "left", "right")
_FILLS = ("none", "x", "y", "both")

_PACK_DEFAULTS = {"side": "top", "fill": "none", "expand": False, "anchor": "center", "padx": [0, 0], "pady": [0, 0], "ipadx": 0, "ipady": 0}
_GRID_DEFAULTS = {"row": 0, "column": 0, "rowspan": 1, "columnspan": 1, "sticky": "", "padx": [0, 0], "pady": [0, 0], "ipadx": 0, "ipady": 0}
_PLACE_DEFAULTS = {"x": 0, "y": 0, "relx": 0, "rely": 0, "anchor": "nw", "width": -1, "height": -1, "relwidth": -1, "relheight": -1}


def _sticky(value):
    text = "".join(value) if isinstance(value, (tuple, list)) else str(value)
    found = ""
    for char in text.lower():
        if char in "nsew":
            if char not in found:
                found += char
        elif char not in " ,":
            raise TclError('bad stickyness value "%s": must be a string containing n, e, s, and/or w' % text)
    return found


def _options(cnf, kw):
    options = dict(cnf) if cnf else {}
    options.update(kw)
    return options


class Widget(Misc):
    """A widget inside a window or a frame."""

    def __init__(self, master=None, cnf={}, **kw):
        if master is None:
            master = _core.default_root(None)
        options = _options(cnf, kw)
        name = options.pop("name", None)
        if name is None:
            key = self._class.lower()
            count = master._name_counts.get(key, 0) + 1
            master._name_counts[key] = count
            name = "!" + key + ("" if count == 1 else str(count))
        base = "" if master._w == "." else master._w
        self._setup(master, "%s.%s" % (base, name), self._defaults, None, {})
        master._kids.append(self)
        master.children[name] = self
        self._init()
        self._configure(options)

    _defaults = BASE_OPTIONS

    def _init(self):
        pass

    def destroy(self):
        if self._alive:
            self._destroy_tree()

    # ── geometry managers ──

    def _manage(self, kind, info):
        parent = self.master
        for other in ("pack", "grid"):
            if kind != "place" and other != kind and parent._slaves[other]:
                raise TclError("cannot use geometry manager %s inside %s which already has slaves managed by %s" % (kind, parent._w, other))
        if self._manager is not None and self._manager != kind:
            parent._slaves[self._manager].remove(self)
        if self not in parent._slaves[kind]:
            parent._slaves[kind].append(self)
        self._manager = kind
        self._info = info
        touch()

    def _start(self, kind, defaults):
        info = dict(defaults)
        if self._manager == kind:
            info.update(self._info)
        return info

    def pack_configure(self, cnf={}, **kw):
        info = self._start("pack", _PACK_DEFAULTS)
        for key, value in _options(cnf, kw).items():
            key = key.rstrip("_")
            if key == "side":
                info["side"] = _style.one_of("side", value, _SIDES)
            elif key == "fill":
                info["fill"] = _style.one_of("fill style", value, _FILLS)
            elif key == "expand":
                info["expand"] = _style.flag(value)
            elif key == "anchor":
                info["anchor"] = _style.one_of("anchor", value, _core._ANCHORS)
            elif key in ("padx", "pady"):
                info[key] = _style.pads(value)
            elif key in ("ipadx", "ipady"):
                info[key] = _style.number(value)
            elif key not in ("in", "before", "after"):
                raise TclError('bad option "-%s": must be -after, -anchor, -before, -expand, -fill, -in, -ipadx, -ipady, -padx, -pady, or -side' % key)
        self._manage("pack", info)

    pack = pack_configure

    def grid_configure(self, cnf={}, **kw):
        info = self._start("grid", _GRID_DEFAULTS)
        options = _options(cnf, kw)
        if self._manager != "grid" and "row" not in options:
            # Tk puts a widget without `row` on the next free row.
            rows = [w._info["row"] + w._info["rowspan"] for w in self.master._slaves["grid"]]
            info["row"] = max(rows) if rows else 0
        for key, value in options.items():
            key = key.rstrip("_")
            if key in ("row", "column", "rowspan", "columnspan"):
                info[key] = _style.integer(value)
            elif key == "sticky":
                info["sticky"] = _sticky(value)
            elif key in ("padx", "pady"):
                info[key] = _style.pads(value)
            elif key in ("ipadx", "ipady"):
                info[key] = _style.number(value)
            elif key != "in":
                raise TclError('bad option "-%s": must be -column, -columnspan, -in, -ipadx, -ipady, -padx, -pady, -row, -rowspan, or -sticky' % key)
        self._manage("grid", info)

    grid = grid_configure

    def place_configure(self, cnf={}, **kw):
        info = self._start("place", _PLACE_DEFAULTS)
        for key, value in _options(cnf, kw).items():
            key = key.rstrip("_")
            if key in ("x", "y", "width", "height"):
                info[key] = _style.number(value)
            elif key in ("relx", "rely", "relwidth", "relheight"):
                info[key] = float(_style.number(value))
            elif key == "anchor":
                info["anchor"] = _style.one_of("anchor", value, _core._ANCHORS)
            elif key not in ("in", "bordermode"):
                raise TclError('bad option "-%s": must be -anchor, -bordermode, -height, -in, -relheight, -relwidth, -relx, -rely, -width, -x, or -y' % key)
        self._manage("place", info)

    place = place_configure

    def _forget(self, kind):
        if self._manager == kind:
            self.master._slaves[kind].remove(self)
            self._manager = None
            self._box = None
            touch()

    def pack_forget(self):
        self._forget("pack")

    def grid_forget(self):
        self._forget("grid")

    grid_remove = grid_forget

    def place_forget(self):
        self._forget("place")

    forget = pack_forget

    def _manager_info(self, kind):
        if self._manager != kind:
            return {}
        info = dict(self._info)
        info["in"] = self.master
        return info

    def pack_info(self):
        return self._manager_info("pack")

    def grid_info(self):
        return self._manager_info("grid")

    def place_info(self):
        return self._manager_info("place")

    info = pack_info

    def lift(self, aboveThis=None):
        pass

    tkraise = lift

    def lower(self, belowThis=None):
        pass

    # ── page ──

    def _text(self):
        variable = self._opts.get("textvariable")
        if isinstance(variable, Variable):
            return _style.tcl_text(variable._value)
        return _style.tcl_text(self._opts.get("text", ""))

    def _changed(self, name, old, value):
        if name in ("textvariable", "variable"):
            if isinstance(old, Variable):
                old._unlink(self)
            if isinstance(value, Variable):
                value._link(self)

    def _manager_scene(self):
        scene = {"kind": self._manager or "none", "order": 0}
        scene.update(_PACK_DEFAULTS)
        scene.update(_GRID_DEFAULTS)
        scene.update(_PLACE_DEFAULTS)
        if self._manager == "pack":
            scene["anchor"] = "center"
        if self._manager is not None:
            scene.update(self._info)
            scene["order"] = self.master._slaves[self._manager].index(self)
        return scene

    def _scene(self):
        scene = self._base_scene()
        opts = self._opts
        state = str(opts.get("state", "normal"))
        disabled = state == "disabled"
        foreground = opts.get("disabledforeground", "") if disabled and "disabledforeground" in opts else opts.get("foreground", "")
        css, underline = _style.font(opts.get("font", "TkDefaultFont"))
        scene.update(
            {
                "parent": self.master._id,
                "kind": self._kind,
                "manager": self._manager_scene(),
                "fg": _style.color(foreground),
                "font": css,
                "underline": underline,
                "width": _style.number(opts.get("width", 0)),
                "height": _style.number(opts.get("height", 0)),
                "anchor": str(opts.get("anchor", "center")),
                "justify": str(opts.get("justify", "center")),
                "wrap": _style.number(opts.get("wraplength", 0)),
                "state": state,
                "text": self._text(),
                "rev": self._rev,
                "checked": False,
                "indicator": _style.flag(opts.get("indicatoron", 1)),
                "selectcolor": _style.color(opts.get("selectcolor", "")),
                "show": str(opts.get("show", "")),
                "textwrap": str(opts.get("wrap", "char")),
                "items": [],
                "scale": None,
            }
        )
        return scene


_LABEL_OPTIONS = dict(BASE_OPTIONS)
_LABEL_OPTIONS.update(
    {
        "activebackground": "SystemButtonFace",
        "activeforeground": "SystemButtonText",
        "anchor": "center",
        "bitmap": "",
        "borderwidth": 2,
        "compound": "none",
        "disabledforeground": "SystemDisabledText",
        "font": "TkDefaultFont",
        "foreground": "SystemButtonText",
        "height": 0,
        "image": "",
        "justify": "center",
        "padx": 1,
        "pady": 1,
        "state": "normal",
        "text": "",
        "textvariable": "",
        "underline": -1,
        "width": 0,
        "wraplength": 0,
    }
)


class Label(Widget):
    """A text on the window."""

    _kind = "Label"
    _class = "Label"
    _defaults = _LABEL_OPTIONS


class Message(Label):
    _kind = "Label"
    _class = "Message"


_BUTTON_OPTIONS = dict(_LABEL_OPTIONS)
_BUTTON_OPTIONS.update(
    {
        "command": "",
        "default": "disabled",
        "highlightthickness": 1,
        "overrelief": "",
        "relief": "raised",
        "repeatdelay": 0,
        "repeatinterval": 0,
    }
)


class Button(Widget):
    """A button: `command` runs after a click."""

    _kind = "Button"
    _class = "Button"
    _defaults = _BUTTON_OPTIONS

    def invoke(self):
        if str(self._opts["state"]) == "disabled":
            return ""
        command = self._opts.get("command")
        if callable(command):
            return command()
        return ""

    def _invoke(self):
        self.invoke()

    def flash(self):
        pass


_CHECK_OPTIONS = dict(_BUTTON_OPTIONS)
_CHECK_OPTIONS.update(
    {
        "relief": "flat",
        "indicatoron": 1,
        "offrelief": "raised",
        "offvalue": 0,
        "onvalue": 1,
        "selectcolor": "SystemWindow",
        "selectimage": "",
        "tristateimage": "",
        "tristatevalue": "",
        "variable": "",
    }
)


class Checkbutton(Button):
    """A check box: `variable` gets `onvalue` (1) or `offvalue` (0)."""

    _kind = "Checkbutton"
    _class = "Checkbutton"
    _defaults = _CHECK_OPTIONS

    def _init(self):
        self._own = None

    def _variable(self):
        variable = self._opts.get("variable")
        if isinstance(variable, Variable):
            return variable
        if self._own is None:
            self._own = Variable(self, 0)
            self._own._link(self)
        return self._own

    def _checked(self):
        return _style.tcl_text(self._variable()._value) == _style.tcl_text(self._opts["onvalue"])

    def select(self):
        self._variable()._store(self._opts["onvalue"], None)

    def deselect(self):
        self._variable()._store(self._opts["offvalue"], None)

    def toggle(self):
        if self._checked():
            self.deselect()
        else:
            self.select()

    def invoke(self):
        if str(self._opts["state"]) == "disabled":
            return ""
        self.toggle()
        return Button.invoke(self)

    def _scene(self):
        scene = Widget._scene(self)
        scene["checked"] = self._checked()
        return scene


_RADIO_OPTIONS = dict(_CHECK_OPTIONS)
del _RADIO_OPTIONS["offvalue"]
del _RADIO_OPTIONS["onvalue"]
_RADIO_OPTIONS["value"] = ""


class Radiobutton(Button):
    """A choice of one: all buttons with one `variable` are a group, the variable gets `value`."""

    _kind = "Radiobutton"
    _class = "Radiobutton"
    _defaults = _RADIO_OPTIONS

    def _variable(self):
        variable = self._opts.get("variable")
        if isinstance(variable, Variable):
            return variable
        if app.radio_var is None:
            app.radio_var = StringVar(self, name="selectedButton")
        app.radio_var._link(self)
        return app.radio_var

    def _checked(self):
        return _style.tcl_text(self._variable()._value) == _style.tcl_text(self._opts["value"])

    def select(self):
        self._variable()._store(self._opts["value"], None)

    def deselect(self):
        if self._checked():
            self._variable()._store("", None)

    def invoke(self):
        if str(self._opts["state"]) == "disabled":
            return ""
        self.select()
        return Button.invoke(self)

    def _scene(self):
        scene = Widget._scene(self)
        scene["checked"] = self._checked()
        return scene


_FRAME_OPTIONS = dict(BASE_OPTIONS)
_FRAME_OPTIONS.update({"class": "Frame", "colormap": "", "container": 0, "height": 0, "padx": 0, "pady": 0, "visual": "", "width": 0})


class Frame(Widget):
    """A rectangle that holds other widgets."""

    _kind = "Frame"
    _class = "Frame"
    _defaults = _FRAME_OPTIONS


_LABELFRAME_OPTIONS = dict(_FRAME_OPTIONS)
_LABELFRAME_OPTIONS.update(
    {"borderwidth": 2, "relief": "groove", "font": "TkDefaultFont", "foreground": "SystemButtonText", "labelanchor": "nw", "labelwidget": "", "text": ""}
)


class LabelFrame(Widget):
    """A frame with a name on its border."""

    _kind = "LabelFrame"
    _class = "Labelframe"
    _defaults = _LABELFRAME_OPTIONS

def _unsupported(name):
    def create(*args, **kw):
        raise NotImplementedError("%s isn't available in the browser yet: run the program in IDLE" % name)

    return create


Listbox = _unsupported("Listbox")
Spinbox = _unsupported("Spinbox")
Menu = _unsupported("Menu")
Menubutton = _unsupported("Menubutton")
OptionMenu = _unsupported("OptionMenu")
Scrollbar = _unsupported("Scrollbar")
PanedWindow = _unsupported("PanedWindow")
PhotoImage = _unsupported("PhotoImage")
BitmapImage = _unsupported("BitmapImage")
