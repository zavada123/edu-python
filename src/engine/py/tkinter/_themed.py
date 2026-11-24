# Themed widgets of ttk that tkinter does not have: Progressbar, Separator, Notebook (tabs), Treeview (a table
# or a tree), and the styles of `ttk.Style`. A style gives options to all widgets of its class
# ("TButton"), or to the widgets with `style="Big.TButton"`; the options that the program gives to the
# widget itself win.
from tkinter import _style
from tkinter._core import BASE_OPTIONS, TclError, app, touch
from tkinter._events import Event
from tkinter._fields import Linked
from tkinter._vars import Variable
from tkinter._widgets import Widget


def _virtual(widget, name):
    event = Event("Virtual", widget)
    event._detail = name
    widget._fire(event)


# ── styles ──

_styles = {}  # style name -> options
_maps = {}  # style name -> option -> [(states, value)]
_theme = ["vista"]

# Options of a style and the options of tkinter widgets that show them.
_STYLE_OPTIONS = {
    "foreground": "foreground",
    "background": "background",
    "fieldbackground": "background",
    "font": "font",
    "relief": "relief",
    "borderwidth": "borderwidth",
    "anchor": "anchor",
    "justify": "justify",
    "wraplength": "wraplength",
    "width": "width",
    "padding": "padding",
    "troughcolor": "troughcolor",
    "selectbackground": "selectbackground",
    "selectforeground": "selectforeground",
    "insertcolor": "insertbackground",
    "bordercolor": "highlightbackground",
}

# The state of a `style.map` and the tkinter options that show it.
_STATE_OPTIONS = {
    ("active", "background"): "activebackground",
    ("pressed", "background"): "activebackground",
    ("active", "foreground"): "activeforeground",
    ("pressed", "foreground"): "activeforeground",
    ("disabled", "foreground"): "disabledforeground",
}


def _chain(style):
    """Styles from the most common to the style itself: ".", "TButton", "Big.TButton"."""
    parts = str(style).split(".")
    found = ["."]
    for start in range(len(parts) - 1, -1, -1):
        name = ".".join(parts[start:])
        if name != "":
            found.append(name)
    return found


def style_options(style):
    """The options of a style with the options of its parents."""
    found = {}
    for name in _chain(style):
        found.update(_styles.get(name, {}))
    return found


def _state_options(style):
    found = {}
    for name in _chain(style):
        for option, pairs in _maps.get(name, {}).items():
            for pair in pairs:
                states, value = tuple(pair[:-1]), pair[-1]
                for state in states:
                    for word in str(state).split():
                        target = _STATE_OPTIONS.get((word.lstrip("!"), option))
                        if target is not None and not word.startswith("!"):
                            found[target] = value
    return found


class Style:
    """Styles of ttk widgets: `Style().configure("TButton", foreground="red", font=("Arial", 14))`."""

    def __init__(self, master=None):
        self.master = master

    def configure(self, style, query_opt=None, **kw):
        options = _styles.setdefault(str(style), {})
        if query_opt is not None:
            return options.get(str(query_opt).lstrip("-"))
        if not kw:
            return dict(options) if options else None
        for key in kw:
            name = key.lstrip("-").rstrip("_")
            value = kw[key]
            if name in ("foreground", "background", "fieldbackground", "troughcolor", "selectbackground", "selectforeground", "insertcolor", "bordercolor", "lightcolor", "darkcolor"):
                _style.color(value)
            elif name == "font":
                _style.font(value)
            options[name] = value
        touch()
        return None

    def map(self, style, query_opt=None, **kw):
        found = _maps.setdefault(str(style), {})
        if query_opt is not None:
            return list(found.get(str(query_opt).lstrip("-"), []))
        if not kw:
            return {key: list(value) for key, value in found.items()}
        for key in kw:
            found[key.lstrip("-")] = [tuple(pair) if isinstance(pair, (list, tuple)) else (pair,) for pair in kw[key]]
        touch()
        return {}

    def lookup(self, style, option, state=None, default=None):
        return style_options(style).get(str(option).lstrip("-"), default if default is not None else "")

    def layout(self, style, layoutspec=None):
        return []

    def element_create(self, elementname, etype, *args, **kw):
        pass

    def element_names(self):
        return ()

    def element_options(self, elementname):
        return ()

    def theme_create(self, themename, parent=None, settings=None):
        pass

    def theme_settings(self, themename, settings):
        for style in settings:
            spec = settings[style]
            if "configure" in spec:
                self.configure(style, **spec["configure"])
            if "map" in spec:
                self.map(style, **spec["map"])

    def theme_names(self):
        return ("winnative", "clam", "alt", "default", "classic", "vista", "xpnative")

    def theme_use(self, themename=None):
        if themename is None:
            return _theme[0]
        if str(themename) not in self.theme_names():
            raise TclError('can\'t find theme "%s"' % themename)
        _theme[0] = str(themename)
        touch()
        return None


def _padding(value):
    # padding=10, (10, 5), "10 5 10 5": left, top, right, bottom
    if isinstance(value, (tuple, list)):
        parts = list(value)
    else:
        parts = str(value).split()
    numbers = [_style.number(p) for p in parts] or [0]
    left = numbers[0]
    top = numbers[1] if len(numbers) > 1 else left
    return left, top


class Themed:
    """A ttk widget: its options come from its style, then from the program."""

    _style_class = ""

    def _style_name(self):
        name = str(self._opts.get("style", "") or "")
        return name if name != "" else self._style_class

    def _styled(self):
        found = {}
        for option, value in style_options(self._style_name()).items():
            target = _STYLE_OPTIONS.get(option)
            if target is not None:
                found[target] = value
        found.update(_state_options(self._style_name()))
        padding = found.pop("padding", None)
        if "padding" in self._explicit:
            padding = self._opts.get("padding")
        if padding not in (None, "", 0):
            found["padx"], found["pady"] = _padding(padding)
        return {key: found[key] for key in found if key not in self._explicit}

    def _scene(self):
        own = self._opts
        merged = dict(own)
        merged.update(self._styled())
        self._opts = merged
        try:
            return self._base._scene(self)
        finally:
            self._opts = own


# ── Progressbar ──

_PROGRESS_OPTIONS = dict(BASE_OPTIONS)
_PROGRESS_OPTIONS.update(
    {"class": "", "length": 100, "maximum": 100, "mode": "determinate", "orient": "horizontal", "phase": 0, "style": "", "value": 0.0, "variable": ""}
)


class Progressbar(Themed, Widget):
    """A progress bar: `value` from 0 to `maximum`; `start()` moves it by itself."""

    _kind = "Progressbar"
    _class = "TProgressbar"
    _style_class = "Horizontal.TProgressbar"
    _defaults = _PROGRESS_OPTIONS
    _base = Widget

    def _init(self):
        self._timer = None

    def _changed(self, name, old, value):
        Widget._changed(self, name, old, value)
        if name == "orient":
            _style.one_of("orient", value, ("horizontal", "vertical"))
        elif name == "mode":
            _style.one_of("mode", value, ("determinate", "indeterminate"))

    def _value(self):
        variable = self._opts.get("variable")
        if isinstance(variable, Variable):
            try:
                return float(_style.number(variable._value))
            except TclError:
                return 0.0
        return float(_style.number(self._opts.get("value", 0)))

    def _set_value(self, value):
        variable = self._opts.get("variable")
        if isinstance(variable, Variable):
            variable._store(value, None)
        else:
            self._opts["value"] = value
        touch()

    def step(self, amount=1.0):
        maximum = float(_style.number(self._opts["maximum"]))
        value = self._value() + float(_style.number(amount))
        if maximum > 0 and value >= maximum:
            value = value - maximum
        self._set_value(value)

    def _tick(self, interval):
        self.step()
        self._timer = self.after(interval, self._tick, interval)

    def start(self, interval=None):
        self.stop()
        interval = 50 if interval is None else max(1, _style.integer(interval))
        self._timer = self.after(interval, self._tick, interval)

    def stop(self):
        if self._timer is not None:
            self.after_cancel(self._timer)
            self._timer = None

    def _scene(self):
        scene = Themed._scene(self)
        opts = self._opts
        styled = self._styled()
        scene["progress"] = {
            "value": self._value(),
            "maximum": float(_style.number(opts["maximum"])),
            "mode": str(opts["mode"]),
            "running": self._timer is not None,
            "length": _style.number(opts["length"]),
            "bar": _style.color(styled.get("background", "")),
            "trough": _style.color(styled.get("troughcolor", "")),
        }
        return scene


# ── Separator ──

_SEPARATOR_OPTIONS = dict(BASE_OPTIONS)
_SEPARATOR_OPTIONS.update({"class": "", "orient": "horizontal", "style": ""})


class Separator(Themed, Widget):
    """A thin line between widgets."""

    _kind = "Separator"
    _class = "TSeparator"
    _style_class = "TSeparator"
    _defaults = _SEPARATOR_OPTIONS
    _base = Widget


# ── Notebook ──

_NOTEBOOK_OPTIONS = dict(BASE_OPTIONS)
_NOTEBOOK_OPTIONS.update({"class": "", "height": 0, "padding": 0, "style": "", "width": 0})
_TAB_OPTIONS = ("text", "state", "sticky", "padding", "image", "compound", "underline")


class Notebook(Themed, Widget):
    """Tabs: each tab shows one frame (`add(frame, text="…")`), the student clicks the tabs."""

    _kind = "Notebook"
    _class = "TNotebook"
    _style_class = "TNotebook"
    _defaults = _NOTEBOOK_OPTIONS
    _base = Widget

    def _init(self):
        self._tabs = []  # [widget, options]
        self._current = -1

    def _tab_of(self, tab_id):
        if isinstance(tab_id, Widget):
            for index, (widget, _) in enumerate(self._tabs):
                if widget is tab_id:
                    return index
            raise TclError("%s is not managed by %s" % (tab_id, self))
        if isinstance(tab_id, int):
            if 0 <= tab_id < len(self._tabs):
                return tab_id
            raise TclError('Slave index %d out of bounds' % tab_id)
        text = str(tab_id)
        if text == "current":
            if self._current < 0:
                raise TclError("No current tab")
            return self._current
        if text == "end":
            return len(self._tabs)
        if text.isdigit():
            return self._tab_of(int(text))
        for index, (widget, _) in enumerate(self._tabs):
            if widget._w == text:
                return index
        raise TclError('Invalid slave specification %s' % text)

    def _tab_options(self, options):
        for key in options:
            if key.rstrip("_") not in _TAB_OPTIONS:
                raise TclError('bad option "-%s": must be -padding, -sticky, -state, -text, -image, -compound, or -underline' % key)
        return {key.rstrip("_"): options[key] for key in options}

    def add(self, child, **kw):
        options = self._tab_options(kw)
        for index, (widget, found) in enumerate(self._tabs):
            if widget is child:
                found.update(options)
                touch()
                return
        if child._manager is not None:
            child.master._slaves[child._manager].remove(child)
            child._manager = None
        tab = {"text": "", "state": "normal"}
        tab.update(options)
        self._tabs.append([child, tab])
        if self._current < 0:
            self._current = 0
        touch()

    def insert(self, pos, child, **kw):
        self.add(child, **kw)
        index = self._tab_of(child)
        item = self._tabs.pop(index)
        at = min(self._tab_of(pos) if str(pos) != "end" else len(self._tabs), len(self._tabs))
        self._tabs.insert(at, item)
        touch()

    def forget(self, tab_id):
        index = self._tab_of(tab_id)
        self._tabs.pop(index)
        if self._current >= len(self._tabs):
            self._current = len(self._tabs) - 1
        touch()

    hide = forget

    def select(self, tab_id=None):
        if tab_id is None:
            return "" if self._current < 0 else self._tabs[self._current][0]._w
        index = self._tab_of(tab_id)
        if index != self._current:
            self._current = index
            touch()
            _virtual(self, "NotebookTabChanged")
        return None

    def index(self, tab_id):
        return self._tab_of(tab_id)

    def tab(self, tab_id, option=None, **kw):
        found = self._tabs[self._tab_of(tab_id)][1]
        if option is not None:
            return found.get(str(option).lstrip("-"), "")
        if not kw:
            return dict(found)
        found.update(self._tab_options(kw))
        touch()
        return None

    def tabs(self):
        return tuple(widget._w for widget, _ in self._tabs)

    def enable_traversal(self):
        pass

    def _pick(self, items):
        if items and 0 <= items[0] < len(self._tabs) and str(self._tabs[items[0]][1].get("state")) != "disabled":
            self.select(items[0])

    def _scene(self):
        scene = Themed._scene(self)
        self._tabs = [tab for tab in self._tabs if tab[0]._alive]
        scene["tabs"] = {
            "tabs": [[widget._id, _style.tcl_text(tab.get("text", "")), str(tab.get("state", "normal"))] for widget, tab in self._tabs],
            "current": self._current,
        }
        return scene


# ── Treeview ──

_TREE_OPTIONS = dict(BASE_OPTIONS)
_TREE_OPTIONS.update(
    {
        "background": "SystemWindow",
        "class": "",
        "columns": "",
        "font": "TkDefaultFont",
        "foreground": "SystemWindowText",
        "displaycolumns": "#all",
        "height": 10,
        "padding": 0,
        "selectmode": "extended",
        "show": "tree headings",
        "style": "",
        "xscrollcommand": "",
        "yscrollcommand": "",
    }
)

_ROW_HEIGHT = 20
_HEADING_HEIGHT = 22


class _Item:
    def __init__(self, iid, parent):
        self.iid = iid
        self.parent = parent
        self.children = []
        self.options = {"text": "", "image": "", "values": "", "open": False, "tags": ""}


class Treeview(Themed, Widget):
    """A table or a tree: rows with `values` in `columns`; `insert`, `item`, `selection`, `delete`."""

    _kind = "Treeview"
    _class = "Treeview"
    _style_class = "Treeview"
    _defaults = _TREE_OPTIONS
    _base = Widget

    def _init(self):
        self._items = {"": _Item("", None)}
        self._next = 1
        self._selection = []
        self._focus = ""
        self._headings = {"#0": {"text": "", "anchor": "w", "command": "", "image": ""}}
        self._tree_columns = {"#0": {"width": 200, "minwidth": 20, "stretch": True, "anchor": "w", "id": "#0"}}
        self._tags = {}
        self.yview = Linked(self, Treeview._view)
        self.xview = Linked(self, Treeview._view)

    def _view(self, *args):
        if not args:
            return (0.0, 1.0)

    def yview_moveto(self, fraction):
        pass

    def yview_scroll(self, number, what):
        pass

    xview_moveto = yview_moveto
    xview_scroll = yview_scroll

    # ── columns ──

    def _column_names(self):
        from tkinter._lists import tcl_list

        return tcl_list(self._opts.get("columns", ""))

    def _column_key(self, column):
        if isinstance(column, int):
            names = self._column_names()
            if 0 <= column < len(names):
                return names[column]
            raise TclError('Column index %d out of bounds' % column)
        text = str(column)
        if text == "#0":
            return "#0"
        if text.startswith("#") and text[1:].isdigit():
            return self._column_key(int(text[1:]) - 1)
        if text not in self._column_names():
            raise TclError('Invalid column index %s' % text)
        return text

    def _column(self, key):
        return self._tree_columns.setdefault(key, {"width": 200, "minwidth": 20, "stretch": True, "anchor": "w", "id": key})

    def _heading(self, key):
        return self._headings.setdefault(key, {"text": "", "anchor": "center", "command": "", "image": ""})

    def column(self, column, option=None, **kw):
        found = self._column(self._column_key(column))
        if option is not None:
            return found.get(str(option).lstrip("-"))
        if not kw:
            return dict(found)
        for key in kw:
            name = key.lstrip("-")
            if name in ("width", "minwidth"):
                found[name] = _style.integer(kw[key])
            elif name == "stretch":
                found[name] = _style.flag(kw[key])
            elif name == "anchor":
                found[name] = _style.one_of("anchor", kw[key], ("n", "ne", "e", "se", "s", "sw", "w", "nw", "center"))
            else:
                raise TclError('unknown option "-%s"' % name)
        touch()
        return None

    def heading(self, column, option=None, **kw):
        found = self._heading(self._column_key(column))
        if option is not None:
            return found.get(str(option).lstrip("-"))
        if not kw:
            return dict(found)
        for key in kw:
            name = key.lstrip("-")
            if name not in ("text", "anchor", "command", "image"):
                raise TclError('unknown option "-%s"' % name)
            found[name] = kw[key]
        touch()
        return None

    # ── items ──

    def _item(self, iid):
        found = self._items.get(str(iid))
        if found is None:
            raise TclError('Item %s not found' % iid)
        return found

    def insert(self, parent, index, iid=None, **kw):
        owner = self._item(parent)
        if iid is None:
            while True:
                iid = "I%03X" % self._next
                self._next += 1
                if iid not in self._items:
                    break
        iid = str(iid)
        if iid in self._items:
            raise TclError('Item %s already exists' % iid)
        item = _Item(iid, owner.iid)
        self._items[iid] = item
        self._set(item, kw)
        position = len(owner.children) if str(index) == "end" else max(0, min(_style.integer(index), len(owner.children)))
        owner.children.insert(position, iid)
        touch()
        return iid

    def _set(self, item, options):
        for key in options:
            name = key.lstrip("-").rstrip("_")
            if name not in item.options:
                raise TclError('unknown option "-%s"' % name)
            value = options[key]
            if name == "open":
                value = _style.flag(value)
            item.options[name] = value

    def item(self, item, option=None, **kw):
        found = self._item(item)
        if option is not None:
            name = str(option).lstrip("-")
            if name == "values":
                return self._values(found)
            if name == "tags":
                return self._tags_of(found)
            return found.options.get(name)
        if not kw:
            return {
                "text": found.options["text"],
                "image": found.options["image"],
                "values": self._values(found),
                "open": found.options["open"],
                "tags": self._tags_of(found),
            }
        self._set(found, kw)
        touch()
        return None

    def set(self, item, column=None, value=None):
        found = self._item(item)
        names = self._column_names()
        values = list(self._values(found)) if self._values(found) != "" else []
        while len(values) < len(names):
            values.append("")
        if column is None:
            return {names[i]: values[i] for i in range(len(names))}
        key = self._column_key(column)
        index = names.index(key)
        if value is None:
            return values[index]
        values[index] = value
        found.options["values"] = values
        touch()
        return None

    def _values(self, item):
        from tkinter._lists import tcl_list

        value = item.options["values"]
        if value == "" or value is None:
            return ""
        if isinstance(value, (list, tuple)):
            return list(value)
        return tcl_list(value)

    def _tags_of(self, item):
        from tkinter._lists import tcl_list

        tags = item.options["tags"]
        if tags == "" or tags is None:
            return ""
        return tcl_list(tags)

    def get_children(self, item=None):
        return tuple(self._item("" if item is None else item).children)

    def set_children(self, item, *newchildren):
        owner = self._item(item)
        for iid in owner.children:
            self._items[iid].parent = None
        owner.children = []
        for iid in newchildren:
            self.move(iid, item, "end")

    def parent(self, item):
        found = self._item(item)
        return found.parent or ""

    def index(self, item):
        found = self._item(item)
        return self._items[found.parent].children.index(found.iid)

    def next(self, item):
        found = self._item(item)
        siblings = self._items[found.parent].children
        at = siblings.index(found.iid)
        return siblings[at + 1] if at + 1 < len(siblings) else ""

    def prev(self, item):
        found = self._item(item)
        siblings = self._items[found.parent].children
        at = siblings.index(found.iid)
        return siblings[at - 1] if at > 0 else ""

    def exists(self, item):
        return str(item) in self._items and str(item) != ""

    def move(self, item, parent, index):
        found = self._item(item)
        owner = self._item(parent)
        if found.parent is not None and found.parent in self._items:
            old = self._items[found.parent].children
            if found.iid in old:
                old.remove(found.iid)
        found.parent = owner.iid
        position = len(owner.children) if str(index) == "end" else max(0, min(_style.integer(index), len(owner.children)))
        owner.children.insert(position, found.iid)
        touch()

    reattach = move

    def detach(self, *items):
        for iid in items:
            found = self._item(iid)
            if found.parent is not None and found.iid in self._items[found.parent].children:
                self._items[found.parent].children.remove(found.iid)
        touch()

    def delete(self, *items):
        for iid in items:
            if str(iid) not in self._items:
                raise TclError('Item %s not found' % iid)
            self._drop(str(iid))
        touch()

    def _drop(self, iid):
        found = self._items.pop(iid, None)
        if found is None:
            return
        for child in list(found.children):
            self._drop(child)
        if found.parent in self._items and iid in self._items[found.parent].children:
            self._items[found.parent].children.remove(iid)
        if iid in self._selection:
            self._selection.remove(iid)
        if self._focus == iid:
            self._focus = ""

    def see(self, item):
        found = self._item(item)
        while found.parent:
            parent = self._items[found.parent]
            parent.options["open"] = True
            found = parent
        touch()

    def focus(self, item=None):
        if item is None:
            return self._focus
        self._item(item)
        self._focus = str(item)
        touch()
        return None

    # ── selection ──

    def selection(self, selop=None, items=None):
        if selop is None:
            return tuple(self._selection)
        if isinstance(selop, str) and selop in ("set", "add", "remove", "toggle"):
            return getattr(self, "selection_" + selop)(items)
        return self.selection_set(selop)

    def _iids(self, items):
        if isinstance(items, (list, tuple)):
            found = []
            for each in items:
                found.extend(self._iids(each))
            return found
        return [str(items)] if items != "" else []

    def _select(self, iids):
        for iid in iids:
            self._item(iid)
        if iids != self._selection:
            self._selection = iids
            touch()
            _virtual(self, "TreeviewSelect")

    def selection_set(self, *items):
        self._select(self._iids(list(items)))

    def selection_add(self, *items):
        self._select(self._selection + [i for i in self._iids(list(items)) if i not in self._selection])

    def selection_remove(self, *items):
        drop = self._iids(list(items))
        self._select([i for i in self._selection if i not in drop])

    def selection_toggle(self, *items):
        found = list(self._selection)
        for iid in self._iids(list(items)):
            if iid in found:
                found.remove(iid)
            else:
                found.append(iid)
        self._select(found)

    # ── tags ──

    def tag_configure(self, tagname, option=None, **kw):
        found = self._tags.setdefault(str(tagname), {})
        if option is not None:
            return found.get(str(option).lstrip("-"))
        if not kw:
            return dict(found)
        for key in kw:
            name = key.lstrip("-")
            if name in ("foreground", "background"):
                _style.color(kw[key])
            elif name == "font":
                _style.font(kw[key])
            found[name] = kw[key]
        touch()
        return None

    def tag_bind(self, tagname, sequence=None, callback=None):
        return self.bind(sequence, callback, "+")

    def tag_has(self, tagname, item=None):
        if item is None:
            return tuple(iid for iid, found in self._items.items() if iid != "" and str(tagname) in (self._tags_of(found) or []))
        return str(tagname) in (self._tags_of(self._item(item)) or [])

    # ── where the rows are ──

    def _visible(self):
        rows = []

        def walk(iid, depth):
            for child in self._items[iid].children:
                rows.append((child, depth))
                if self._items[child].options["open"]:
                    walk(child, depth + 1)

        walk("", 0)
        return rows

    def _headings_shown(self):
        return "headings" in str(self._opts.get("show", ""))

    def identify_row(self, y):
        top = _HEADING_HEIGHT if self._headings_shown() else 0
        at = (int(_style.number(y)) - top) // _ROW_HEIGHT
        rows = self._visible()
        return rows[at][0] if 0 <= at < len(rows) and int(_style.number(y)) >= top else ""

    def identify_column(self, x):
        x = int(_style.number(x))
        left = 0
        for key in self._shown_columns():
            left += self._column(key)["width"]
            if x < left:
                return "#0" if key == "#0" else "#%d" % (self._column_names().index(key) + 1)
        return ""

    def identify_region(self, x, y):
        if self._headings_shown() and int(_style.number(y)) < _HEADING_HEIGHT:
            return "heading"
        return "cell" if self.identify_row(y) != "" else "nothing"

    def identify(self, component, x, y):
        if component == "row" or component == "item":
            return self.identify_row(y)
        if component == "column":
            return self.identify_column(x)
        return self.identify_region(x, y)

    def bbox(self, item, column=None):
        rows = [iid for iid, _ in self._visible()]
        if str(item) not in rows:
            return ""
        top = (_HEADING_HEIGHT if self._headings_shown() else 0) + rows.index(str(item)) * _ROW_HEIGHT
        width = sum(self._column(key)["width"] for key in self._shown_columns())
        return (0, top, width, _ROW_HEIGHT)

    def _shown_columns(self):
        from tkinter._lists import tcl_list

        names = self._column_names()
        display = self._opts.get("displaycolumns", "#all")
        shown = names if str(display) in ("#all", "") else [self._column_key(c) for c in (display if isinstance(display, (list, tuple)) else tcl_list(display))]
        if "tree" in str(self._opts.get("show", "")):
            return ["#0"] + shown
        return shown

    # ── page ──

    def _pick(self, items):
        rows = self._visible()
        chosen = [rows[i][0] for i in items if 0 <= i < len(rows)]
        mode = str(self._opts.get("selectmode", "extended"))
        if mode == "none":
            return
        if mode == "browse":
            chosen = chosen[:1]
        if chosen:
            self._focus = chosen[-1]
        self._select(chosen)

    def _toggle(self, row):
        rows = self._visible()
        if not 0 <= row < len(rows):
            return
        found = self._items[rows[row][0]]
        found.options["open"] = not found.options["open"]
        touch()
        _virtual(self, "TreeviewOpen" if found.options["open"] else "TreeviewClose")

    def _heading_click(self, column):
        keys = self._shown_columns()
        if 0 <= column < len(keys):
            command = self._heading(keys[column]).get("command")
            if callable(command):
                command()

    def _scene(self):
        scene = Themed._scene(self)
        names = self._column_names()
        keys = self._shown_columns()
        columns = []
        for key in keys:
            column = self._column(key)
            heading = self._heading(key)
            columns.append([_style.tcl_text(heading.get("text", "")), _style.integer(column["width"]), str(column["anchor"]), str(heading.get("anchor", "center"))])
        rows = []
        for iid, depth in self._visible():
            item = self._items[iid]
            values = self._values(item) or []
            cells = []
            for key in keys:
                if key == "#0":
                    cells.append(_style.tcl_text(item.options["text"]))
                else:
                    at = names.index(key)
                    cells.append(_style.tcl_text(values[at]) if at < len(values) else "")
            look = {}
            for tag in self._tags_of(item) or []:
                look.update(self._tags.get(tag, {}))
            rows.append(
                [
                    depth,
                    len(item.children) > 0,
                    bool(item.options["open"]),
                    cells,
                    _style.color(look.get("foreground", "")),
                    _style.color(look.get("background", "")),
                    iid in self._selection,
                ]
            )
        show = str(self._opts.get("show", ""))
        scene["tree"] = {
            "columns": columns,
            "rows": rows,
            "tree": "tree" in show,
            "headings": "headings" in show,
            "height": _style.integer(self._opts.get("height", 10)),
            "mode": str(self._opts.get("selectmode", "extended")),
        }
        return scene
