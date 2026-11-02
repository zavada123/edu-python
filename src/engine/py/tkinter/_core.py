# Core of the browser tkinter: the state of the program windows, options of widgets, geometry managers and
# the link to the page. The program runs until `mainloop()`: then the page shows the windows (tk-window.tsx)
# and sends each user action to `dispatch` (prelude.py), which calls the handlers of the program.
import json

import _mriya
from tkinter import _events, _style
from tkinter._events import Bindings, Event
from tkinter._style import TclError

ScreenWidth = 1920
ScreenHeight = 1080


class _MainLoop(BaseException):
    # `mainloop()` stops the program here (prelude.py catches it): the page shows the windows.
    # BaseException: `except Exception` in student code does not catch it.
    pass


class _App:
    def __init__(self):
        self.widgets = []  # live windows and widgets, in creation order
        self.by_id = {}
        self.next_id = 1
        self.root = None
        self.waiting = False
        self.closed = False
        self.dirty = True
        self.timers = {}
        self.next_timer = 1
        self.class_binds = {}
        self.all_binds = Bindings()
        self.focus = 0
        self.focus_rev = 0
        self.pointer = (0, 0)
        self.radio_var = None
        self.next_var = 0


app = _App()


def touch():
    app.dirty = True


def flush():
    """Sends the windows to the page if something changed."""
    if not app.dirty:
        return
    app.dirty = False
    _mriya.tk_scene("null" if app.closed else json.dumps(_scene()))


def default_root(what):
    if app.root is not None and app.root._alive:
        return app.root
    if what is not None:
        raise RuntimeError("Too early to %s: no default root window" % what)
    from tkinter._windows import Tk

    return Tk()


def _close():
    app.closed = True
    app.timers = {}
    touch()


# ── options ──

ALIASES = {"bg": "background", "fg": "foreground", "bd": "borderwidth", "invcmd": "invalidcommand", "vcmd": "validatecommand"}

_COLORS = set(
    (
        "background foreground activebackground activeforeground disabledforeground highlightbackground "
        "highlightcolor insertbackground selectbackground selectforeground selectcolor troughcolor "
        "disabledbackground readonlybackground inactiveselectbackground"
    ).split()
)

_NUMBERS = set(
    "borderwidth width height padx pady highlightthickness wraplength length sliderlength insertwidth from to resolution tickinterval bigincrement".split()
)

_RELIEFS = ("flat", "groove", "raised", "ridge", "solid", "sunken")
_ANCHORS = ("n", "ne", "e", "se", "s", "sw", "w", "nw", "center")
_JUSTIFY = ("left", "right", "center")

BASE_OPTIONS = {
    "background": "SystemButtonFace",
    "borderwidth": 0,
    "cursor": "",
    "highlightbackground": "SystemButtonFace",
    "highlightcolor": "SystemWindowFrame",
    "highlightthickness": 0,
    "relief": "flat",
    "takefocus": "",
}


def _check(name, value, states):
    if value is None:
        return
    if name in _COLORS:
        _style.color(value)
    elif name == "font":
        _style.font(value)
    elif name == "relief" or name == "overrelief" and value != "":
        _style.one_of("relief", value, _RELIEFS)
    elif name == "anchor":
        _style.one_of("anchor", value, _ANCHORS)
    elif name == "justify":
        _style.one_of("justification", value, _JUSTIFY)
    elif name == "state":
        _style.one_of("state", value, states)
    elif name in _NUMBERS:
        _style.number(value)


class Misc:
    """What windows and widgets have in common: options, events, timers, `winfo_…`."""

    _kind = ""
    _class = ""
    _states = ("active", "disabled", "normal")

    def _setup(self, master, path, options, cnf, kw):
        self.master = master
        self.children = {}
        self.tk = self
        self._id = app.next_id
        app.next_id += 1
        self._w = path
        self._name_counts = {}
        self._kids = []
        self._binds = Bindings()
        self._opts = dict(options)
        self._box = None
        self._manager = None
        self._info = None
        self._slaves = {"pack": [], "grid": [], "place": []}
        self._columns = {}
        self._rows = {}
        self._propagate = True
        self._rev = 0
        self._alive = True
        app.widgets.append(self)
        app.by_id[self._id] = self
        touch()
        merged = {}
        if cnf:
            merged.update(cnf)
        merged.update(kw)
        self._configure(merged)

    def __str__(self):
        return self._w

    def __repr__(self):
        return "<tkinter.%s object %s>" % (self._class, self._w)

    # ── options ──

    def _canonical(self, key):
        name = str(key)
        if name.startswith("-"):
            name = name[1:]
        if name.endswith("_"):
            name = name[:-1]
        name = ALIASES.get(name, name)
        if name not in self._opts:
            raise TclError('unknown option "-%s"' % name)
        return name

    def _configure(self, options):
        checked = []
        for key in options:
            name = self._canonical(key)
            value = options[key]
            _check(name, value, self._states)
            checked.append((name, value))
        for name, value in checked:
            old = self._opts.get(name)
            self._opts[name] = value
            self._changed(name, old, value)
        touch()

    def _changed(self, name, old, value):
        pass

    def configure(self, cnf=None, **kw):
        if isinstance(cnf, str) and not kw:
            name = self._canonical(cnf)
            return (name, name, name.capitalize(), "", self._opts[name])
        if cnf is None and not kw:
            return {name: self._opts[name] for name in self._opts}
        options = dict(cnf) if cnf else {}
        options.update(kw)
        self._configure(options)

    config = configure

    def cget(self, key):
        return self._opts[self._canonical(key)]

    def __getitem__(self, key):
        return self.cget(key)

    def __setitem__(self, key, value):
        self._configure({key: value})

    def keys(self):
        return sorted(self._opts)

    # ── events ──

    def bind(self, sequence=None, func=None, add=None):
        return self._bind(self._binds, sequence, func, add)

    def _bind(self, bindings, sequence, func, add):
        if sequence is None:
            return bindings.sequences()
        if func is None:
            return ""
        if not callable(func):
            raise TypeError("bind() needs a function, not %s" % type(func).__name__)
        bindings.bind(sequence, func, add)
        touch()
        return "%d%s" % (id(func), getattr(func, "__name__", "lambda"))

    def unbind(self, sequence, funcid=None):
        self._binds.unbind(sequence)
        touch()

    def bind_all(self, sequence=None, func=None, add=None):
        return self._bind(app.all_binds, sequence, func, add)

    def unbind_all(self, sequence):
        app.all_binds.unbind(sequence)
        touch()

    def bind_class(self, className, sequence=None, func=None, add=None):
        bindings = app.class_binds.get(className)
        if bindings is None:
            bindings = Bindings()
            app.class_binds[className] = bindings
        return self._bind(bindings, sequence, func, add)

    def unbind_class(self, className, sequence):
        bindings = app.class_binds.get(className)
        if bindings is not None:
            bindings.unbind(sequence)
            touch()

    def bindtags(self, tagList=None):
        top = self.winfo_toplevel()
        tags = [self._w, self._class] + ([] if top is self else [top._w]) + ["all"]
        return tuple(tags)

    def _chain(self):
        chain = [self._binds]
        by_class = app.class_binds.get(self._class)
        if by_class is not None:
            chain.append(by_class)
        top = self.winfo_toplevel()
        if top is not self:
            chain.append(top._binds)
        chain.append(app.all_binds)
        return chain

    def _fire(self, event):
        event.widget = self
        for bindings in self._chain():
            functions = bindings.best(event)
            if functions is not None and _events.call(functions, event):
                return

    def event_generate(self, sequence, **kw):
        kind, detail, modifiers, count = _events.parse(sequence)
        event = Event(kind, self)
        event._detail = detail
        event._count = count
        event._set_modifiers(modifiers)
        if kind in ("ButtonPress", "ButtonRelease"):
            event.num = int(detail) if detail else 1
        if kind in ("KeyPress", "KeyRelease"):
            event.keysym = detail or "??"
        for key in kw:
            setattr(event, key, kw[key])
        self._fire(event)

    def _page_binds(self):
        kinds = self._binds.page_kinds()
        by_class = app.class_binds.get(self._class)
        if by_class is not None:
            kinds = kinds + [k for k in by_class.page_kinds() if k not in kinds]
        return kinds

    # ── timers ──

    def after(self, ms, func=None, *args):
        if func is None:
            # Pause: the page cannot wait inside the program.
            return None
        number = app.next_timer
        app.next_timer += 1
        app.timers[number] = (func, args)
        _mriya.tk_after(number, max(0, _style.integer(ms)))
        return "after#%d" % number

    def after_idle(self, func, *args):
        return self.after(0, func, *args)

    def after_cancel(self, id):
        text = str(id)
        if not text.startswith("after#"):
            return
        number = int(text[6:])
        if number in app.timers:
            del app.timers[number]
            _mriya.tk_cancel(number)

    # ── program ──

    def mainloop(self, n=0):
        mainloop(n)

    def quit(self):
        _close()

    def update(self):
        flush()

    def update_idletasks(self):
        flush()

    def wait_window(self, window=None):
        pass

    def wait_variable(self, name="PY_VAR"):
        pass

    waitvar = wait_variable

    def wait_visibility(self, window=None):
        pass

    def bell(self, displayof=0):
        pass

    def focus_set(self):
        app.focus = self._id
        app.focus_rev += 1
        touch()

    focus = focus_set
    focus_force = focus_set

    def focus_get(self):
        return app.by_id.get(app.focus)

    focus_displayof = focus_get

    def nametowidget(self, name):
        for widget in app.widgets:
            if widget._w == str(name):
                return widget
        raise KeyError(name)

    def register(self, func, subst=None, needcleanup=1):
        return func

    def option_add(self, pattern, value, priority=None):
        pass

    def tk_setPalette(self, *args, **kw):
        pass

    def grab_set(self):
        pass

    def grab_release(self):
        pass

    def clipboard_clear(self, **kw):
        pass

    def clipboard_append(self, string, **kw):
        pass

    # ── containers ──

    def _rowcol(self, store, index, cnf, kw):
        options = dict(cnf) if cnf else {}
        options.update(kw)
        indexes = index if isinstance(index, (tuple, list)) else [index]
        if not options:
            found = store.get(_style.integer(indexes[0]), {"weight": 0, "minsize": 0, "pad": 0})
            return {"weight": found["weight"], "minsize": found["minsize"], "pad": found["pad"], "uniform": None}
        for each in indexes:
            if each == "all":
                continue
            number = _style.integer(each)
            current = store.get(number, {"weight": 0, "minsize": 0, "pad": 0})
            for key in options:
                if key not in ("weight", "minsize", "pad", "uniform"):
                    raise TclError('bad option "-%s": must be -minsize, -pad, -uniform, or -weight' % key)
                if key != "uniform":
                    current[key] = _style.number(options[key])
            store[number] = current
        touch()

    def columnconfigure(self, index, cnf={}, **kw):
        return self._rowcol(self._columns, index, cnf, kw)

    def rowconfigure(self, index, cnf={}, **kw):
        return self._rowcol(self._rows, index, cnf, kw)

    grid_columnconfigure = columnconfigure
    grid_rowconfigure = rowconfigure

    def pack_propagate(self, flag=None):
        if flag is None:
            return self._propagate
        self._propagate = _style.flag(flag)
        touch()

    grid_propagate = pack_propagate
    propagate = pack_propagate

    def pack_slaves(self):
        return list(self._slaves["pack"])

    def grid_slaves(self, row=None, column=None):
        found = []
        for widget in self._slaves["grid"]:
            if row is not None and widget._info["row"] != row:
                continue
            if column is not None and widget._info["column"] != column:
                continue
            found.append(widget)
        found.reverse()
        return found

    def place_slaves(self):
        return list(self._slaves["place"])

    slaves = pack_slaves

    def grid_size(self):
        columns = 0
        rows = 0
        for widget in self._slaves["grid"]:
            columns = max(columns, widget._info["column"] + widget._info["columnspan"])
            rows = max(rows, widget._info["row"] + widget._info["rowspan"])
        return (columns, rows)

    # ── winfo ──

    def winfo_toplevel(self):
        widget = self
        while widget.master is not None and widget._kind != "Window":
            widget = widget.master
        return widget

    def winfo_children(self):
        return [kid for kid in self._kids if kid._alive]

    def winfo_class(self):
        return self._class

    def winfo_name(self):
        return self._w.split(".")[-1] or "tk"

    def winfo_id(self):
        return self._id

    def winfo_exists(self):
        return 1 if self._alive else 0

    def winfo_ismapped(self):
        return 1 if self._box is not None else 0

    def winfo_viewable(self):
        return self.winfo_ismapped()

    def winfo_parent(self):
        return "" if self.master is None else self.master._w

    def winfo_width(self):
        return 1 if self._box is None else int(self._box[2])

    def winfo_height(self):
        return 1 if self._box is None else int(self._box[3])

    def winfo_reqwidth(self):
        return self.winfo_width()

    def winfo_reqheight(self):
        return self.winfo_height()

    def winfo_x(self):
        return 0 if self._box is None else int(self._box[0])

    def winfo_y(self):
        return 0 if self._box is None else int(self._box[1])

    def winfo_rootx(self):
        x = 0
        widget = self
        while widget is not None:
            x += widget.winfo_x()
            widget = None if widget._kind == "Window" else widget.master
        return x

    def winfo_rooty(self):
        y = 0
        widget = self
        while widget is not None:
            y += widget.winfo_y()
            widget = None if widget._kind == "Window" else widget.master
        return y

    def winfo_screenwidth(self):
        return ScreenWidth

    def winfo_screenheight(self):
        return ScreenHeight

    def winfo_pointerx(self):
        return app.pointer[0]

    def winfo_pointery(self):
        return app.pointer[1]

    def winfo_pointerxy(self):
        return app.pointer

    def winfo_rgb(self, color):
        css = _style.color(color)
        return (0, 0, 0) if css == "" else (65535, 65535, 65535)

    def winfo_fpixels(self, number):
        return float(_style.number(number))

    def winfo_pixels(self, number):
        return int(_style.number(number))

    # ── page ──

    def _destroy_tree(self):
        for kid in list(self._kids):
            kid._destroy_tree()
        if self._binds.items or app.all_binds.items:
            event = Event("Destroy", self)
            self._fire(event)
        self._alive = False
        if self in app.widgets:
            app.widgets.remove(self)
        app.by_id.pop(self._id, None)
        if self._manager is not None:
            self.master._slaves[self._manager].remove(self)
            self._manager = None
        touch()

    def _base_scene(self):
        return {
            "id": self._id,
            "binds": self._page_binds(),
            "bg": _style.color(self._opts.get("background", "")),
            "bd": _style.number(self._opts.get("borderwidth", 0)),
            "relief": str(self._opts.get("relief", "flat")),
            "padx": _style.number(self._opts.get("padx", 0)),
            "pady": _style.number(self._opts.get("pady", 0)),
            "highlight": _style.number(self._opts.get("highlightthickness", 0)),
            "propagate": self._propagate,
            "columns": [[i, c["weight"], c["minsize"]] for i, c in self._columns.items()],
            "rows": [[i, r["weight"], r["minsize"]] for i, r in self._rows.items()],
        }

    def _shown(self):
        # The page shows the window for the first time: Tk sends these events to each widget.
        for kind in ("Map", "Visibility", "Expose", "Configure"):
            event = Event(kind, self)
            if self._box is not None:
                event.width = int(self._box[2])
                event.height = int(self._box[3])
            self._fire(event)
        for kid in self.winfo_children():
            if kid._manager is not None:
                kid._shown()


def mainloop(n=0):
    """Stops the program here: the page shows the windows and calls the handlers."""
    if app.waiting or app.closed:
        return
    if app.root is None:
        raise RuntimeError("Too early to run the main loop: no default root window")
    app.waiting = True
    touch()
    flush()
    raise _MainLoop()


def close():
    _close()


def _scene():
    windows = []
    widgets = []
    for widget in app.widgets:
        if widget._kind == "Window":
            windows.append(widget._scene())
        else:
            widgets.append(widget._scene())
    return {
        "windows": windows,
        "widgets": widgets,
        "focus": app.focus,
        "focusRev": app.focus_rev,
        "bindAll": app.all_binds.page_kinds(),
    }
