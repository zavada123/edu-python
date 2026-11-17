# Lists and choices: Listbox (rows to choose), Spinbox (a field with arrows), Combobox of ttk (a field with a
# drop-down list) and Scrollbar. The page sends the chosen rows (Pick), the arrows (Spin) and the typed text
# (Edit); a Scrollbar scrolls its widget on the page itself (tk-lists.tsx).
from tkinter import _style
from tkinter._core import BASE_OPTIONS, TclError, touch
from tkinter._events import Event
from tkinter._fields import _ENTRY_OPTIONS, Entry, Linked
from tkinter._vars import Variable
from tkinter._widgets import Widget

_LISTBOX_OPTIONS = dict(BASE_OPTIONS)
_LISTBOX_OPTIONS.update(
    {
        "activestyle": "dotbox",
        "background": "SystemWindow",
        "borderwidth": 1,
        "disabledforeground": "SystemDisabledText",
        "exportselection": 1,
        "font": "TkDefaultFont",
        "foreground": "SystemWindowText",
        "height": 10,
        "highlightthickness": 1,
        "justify": "left",
        "listvariable": "",
        "relief": "sunken",
        "selectbackground": "SystemHighlight",
        "selectborderwidth": 0,
        "selectforeground": "SystemHighlightText",
        "selectmode": "browse",
        "setgrid": 0,
        "state": "normal",
        "width": 20,
        "xscrollcommand": "",
        "yscrollcommand": "",
    }
)

_MODES = ("single", "browse", "multiple", "extended")
_ITEM_OPTIONS = ("background", "foreground", "selectbackground", "selectforeground")


def _virtual(widget, name):
    event = Event("Virtual", widget)
    event._detail = name
    widget._fire(event)


def tcl_list(value):
    """Items of a Tcl list: a tuple or list as it is, a text split by spaces ("{two words}" is one item)."""
    if isinstance(value, (list, tuple)):
        return [_style.tcl_text(v) for v in value]
    text = _style.tcl_text(value)
    if text.startswith("(") and text.endswith(")"):
        # str() of a tuple in a StringVar: ('a', 'b')
        inner = text[1:-1]
        return [part.strip().strip("'\"") for part in inner.split(",") if part.strip()]
    items = []
    word = ""
    depth = 0
    for char in text:
        if char == "{":
            if depth > 0:
                word += char
            depth += 1
        elif char == "}" and depth > 0:
            depth -= 1
            if depth > 0:
                word += char
        elif char in " \t\n" and depth == 0:
            if word:
                items.append(word)
            word = ""
        else:
            word += char
    if word:
        items.append(word)
    return items


class Listbox(Widget):
    """A list of rows: the student chooses one or more of them (`curselection()`)."""

    _kind = "Listbox"
    _class = "Listbox"
    _defaults = _LISTBOX_OPTIONS
    _states = ("disabled", "normal")

    def _init(self):
        self._items = []  # [text, {options}]
        self._chosen = []
        self._active = 0
        self._anchor = 0
        self.yview = Linked(self, Listbox._view)
        self.xview = Linked(self, Listbox._view)

    def _changed(self, name, old, value):
        Widget._changed(self, name, old, value)
        if name == "listvariable":
            if isinstance(old, Variable):
                old._unlink(self)
            if isinstance(value, Variable):
                value._link(self)
                self._items = [[text, {}] for text in tcl_list(value._value)]
        elif name == "selectmode":
            _style.one_of("select mode", value, _MODES + ("",))

    def _list_rows(self):
        variable = self._opts.get("listvariable")
        if isinstance(variable, Variable):
            texts = tcl_list(variable._value)
            if [item[0] for item in self._items] != texts:
                self._items = [[text, {}] for text in texts]
                self._chosen = [i for i in self._chosen if i < len(texts)]
        return self._items

    def _store(self):
        variable = self._opts.get("listvariable")
        if isinstance(variable, Variable):
            variable._store(tuple(item[0] for item in self._items), None)
        touch()

    def _index(self, index, end_is_size=True):
        rows = self._list_rows()
        if isinstance(index, int) and not isinstance(index, bool):
            return index
        name = str(index)
        if name == "end":
            return len(rows) if end_is_size else max(0, len(rows) - 1)
        if name == "active":
            return self._active
        if name == "anchor":
            return self._anchor
        if name.startswith("@"):
            return 0
        if name.lstrip("-").isdigit():
            return int(name)
        raise TclError('bad listbox index "%s": must be active, anchor, end, @x,y, or a number' % name)

    def index(self, index):
        return self._index(index)

    def size(self):
        return len(self._list_rows())

    def insert(self, index, *elements):
        rows = self._list_rows()
        at = max(0, min(self._index(index), len(rows)))
        for offset, element in enumerate(elements):
            rows.insert(at + offset, [_style.tcl_text(element), {}])
        self._chosen = [i + len(elements) if i >= at else i for i in self._chosen]
        self._rev += 1
        self._store()

    def delete(self, first, last=None):
        rows = self._list_rows()
        start = self._index(first, False)
        end = start if last is None else self._index(last, False)
        if start < 0 or end < start:
            return
        count = len(rows[start : end + 1])
        del rows[start : end + 1]
        self._chosen = [i - count if i > end else i for i in self._chosen if i < start or i > end]
        self._rev += 1
        self._store()

    def get(self, first, last=None):
        rows = self._list_rows()
        start = self._index(first, False)
        if last is None:
            return rows[start][0] if 0 <= start < len(rows) else ""
        end = self._index(last, False)
        return tuple(item[0] for item in rows[max(0, start) : end + 1])

    def curselection(self):
        return tuple(sorted(self._chosen))

    def selection_set(self, first, last=None):
        rows = self._list_rows()
        start = self._index(first, False)
        end = start if last is None else self._index(last, False)
        for i in range(max(0, start), min(end, len(rows) - 1) + 1):
            if i not in self._chosen:
                self._chosen.append(i)
        self._rev += 1
        touch()

    select_set = selection_set

    def selection_clear(self, first, last=None):
        start = self._index(first, False)
        end = start if last is None else self._index(last, False)
        self._chosen = [i for i in self._chosen if i < start or i > end]
        self._rev += 1
        touch()

    select_clear = selection_clear

    def selection_includes(self, index):
        return self._index(index, False) in self._chosen

    select_includes = selection_includes

    def selection_anchor(self, index):
        self._anchor = self._index(index, False)

    select_anchor = selection_anchor

    def activate(self, index):
        self._active = max(0, min(self._index(index, False), max(0, len(self._list_rows()) - 1)))
        touch()

    def nearest(self, y):
        return max(0, min(int(_style.number(y)) // 16, len(self._list_rows()) - 1))

    def see(self, index):
        pass

    def _view(self, *args):
        if not args:
            return (0.0, 1.0)

    def yview_moveto(self, fraction):
        pass

    def yview_scroll(self, number, what):
        pass

    xview_moveto = yview_moveto
    xview_scroll = yview_scroll

    def itemconfigure(self, index, cnf=None, **kw):
        rows = self._list_rows()
        at = self._index(index, False)
        if not 0 <= at < len(rows):
            raise TclError('item number "%s" out of range' % index)
        options = dict(cnf) if isinstance(cnf, dict) else {}
        options.update(kw)
        for key, value in options.items():
            name = {"bg": "background", "fg": "foreground"}.get(str(key), str(key))
            if name not in _ITEM_OPTIONS:
                raise TclError('unknown option "-%s"' % name)
            _style.color(value)
            rows[at][1][name] = value
        touch()

    itemconfig = itemconfigure

    def itemcget(self, index, option):
        rows = self._list_rows()
        name = {"bg": "background", "fg": "foreground"}.get(str(option), str(option))
        return rows[self._index(index, False)][1].get(name, "")

    def _pick(self, items):
        # The student chose rows on the page.
        if str(self._opts["state"]) == "disabled":
            return
        size = len(self._list_rows())
        chosen = [i for i in items if 0 <= i < size]
        if str(self._opts["selectmode"]) in ("single", "browse"):
            chosen = chosen[:1]
        self._chosen = chosen
        if chosen:
            self._active = chosen[-1]
            self._anchor = chosen[-1]
        touch()
        _virtual(self, "ListboxSelect")

    def _selected_text(self):
        rows = self._list_rows()
        return "\n".join(rows[i][0] for i in sorted(self._chosen) if i < len(rows))

    def _scene(self):
        scene = Widget._scene(self)
        opts = self._opts
        scene["list"] = {
            "rows": [
                [text, _style.color(look.get("foreground", "")), _style.color(look.get("background", ""))] for text, look in self._list_rows()
            ],
            "chosen": sorted(self._chosen),
            "active": self._active,
            "mode": str(opts["selectmode"]) or "browse",
            "selectBg": _style.color(opts["selectbackground"]),
            "selectFg": _style.color(opts["selectforeground"]),
        }
        return scene


_SPINBOX_OPTIONS = dict(_ENTRY_OPTIONS)
_SPINBOX_OPTIONS.update(
    {
        "activebackground": "SystemButtonFace",
        "buttonbackground": "SystemButtonFace",
        "buttoncursor": "",
        "buttondownrelief": "raised",
        "buttonuprelief": "raised",
        "command": "",
        "format": "",
        "from": 0,
        "increment": 1,
        "repeatdelay": 400,
        "repeatinterval": 100,
        "to": 0,
        "values": "",
        "wrap": 0,
    }
)


class Spinbox(Entry):
    """A field with two arrows: they choose the next number (`from_`, `to`, `increment`) or the next of `values`."""

    _kind = "Spinbox"
    _class = "Spinbox"
    _defaults = _SPINBOX_OPTIONS

    def _init(self):
        Entry._init(self)
        self._value = self._first()

    def _changed(self, name, old, value):
        Entry._changed(self, name, old, value)
        if name in ("from", "values") and not isinstance(self._opts.get("textvariable"), Variable):
            self._value = self._first()
            self._rev += 1

    def _values(self):
        values = self._opts.get("values", "")
        return tcl_list(values) if values not in ("", None) else []

    def _format(self, number):
        pattern = str(self._opts.get("format", ""))
        if pattern:
            try:
                return pattern % number
            except (TypeError, ValueError):
                pass
        step = float(_style.number(self._opts["increment"]))
        low = float(_style.number(self._opts["from"]))
        if step == int(step) and low == int(low):
            return str(int(round(number)))
        return str(round(number, 10))

    def _first(self):
        values = self._values()
        if values:
            return values[0]
        return self._format(float(_style.number(self._opts["from"])))

    def _spin(self, direction):
        if str(self._opts["state"]) == "disabled":
            return
        self._put(self._next(self.get(), direction), None)
        command = self._opts.get("command")
        if callable(command):
            command()

    def _next(self, current, direction):
        wrap = _style.flag(self._opts["wrap"])
        values = self._values()
        if values:
            at = values.index(current) if current in values else -1
            at += direction
            if at >= len(values):
                at = 0 if wrap else len(values) - 1
            if at < 0:
                at = len(values) - 1 if wrap else 0
            return values[at]
        low = float(_style.number(self._opts["from"]))
        high = float(_style.number(self._opts["to"]))
        step = float(_style.number(self._opts["increment"]))
        try:
            number = float(current) + direction * step
        except ValueError:
            number = low
        if number > high:
            number = low if wrap else high
        if number < low:
            number = high if wrap else low
        return self._format(number)

    def invoke(self, element):
        self._spin(1 if str(element) == "buttonup" else -1)

    def set(self, value):
        self._put(_style.tcl_text(value), None)

    def _scene(self):
        scene = Entry._scene(self)
        scene["list"] = {"rows": [[v, "", ""] for v in self._values()], "chosen": [], "active": 0, "mode": "spin", "selectBg": "", "selectFg": ""}
        return scene


_COMBOBOX_OPTIONS = dict(_ENTRY_OPTIONS)
_COMBOBOX_OPTIONS.update({"height": 10, "postcommand": "", "values": "", "style": "", "class": "", "padding": 0})


class Combobox(Entry):
    """A field with a drop-down list of `values` (ttk). `current()` is the number of the chosen value."""

    _kind = "Combobox"
    _class = "TCombobox"
    _defaults = _COMBOBOX_OPTIONS

    def _values(self):
        values = self._opts.get("values", "")
        return tcl_list(values) if values not in ("", None) else []

    def current(self, newindex=None):
        values = self._values()
        if newindex is None:
            text = self.get()
            return values.index(text) if text in values else -1
        at = int(newindex)
        if not 0 <= at < len(values):
            raise TclError("index %s out of range" % newindex)
        self._put(values[at], None)

    def set(self, value):
        self._put(_style.tcl_text(value), None)

    def _editable(self):
        return str(self._opts["state"]) != "disabled"

    def _pick(self, items):
        values = self._values()
        if not items or not 0 <= items[0] < len(values) or str(self._opts["state"]) == "disabled":
            return
        self._put(values[items[0]], None)
        _virtual(self, "ComboboxSelected")

    def _scene(self):
        scene = Entry._scene(self)
        values = self._values()
        scene["list"] = {"rows": [[v, "", ""] for v in values], "chosen": [self.current()] if self.current() >= 0 else [], "active": 0, "mode": "combo", "selectBg": "", "selectFg": ""}
        return scene


_SCROLLBAR_OPTIONS = dict(BASE_OPTIONS)
_SCROLLBAR_OPTIONS.update(
    {
        "activebackground": "SystemButtonFace",
        "activerelief": "raised",
        "command": "",
        "elementborderwidth": -1,
        "jump": 0,
        "orient": "vertical",
        "repeatdelay": 300,
        "repeatinterval": 100,
        "troughcolor": "SystemScrollbar",
        "width": 17,
    }
)


class Scrollbar(Widget):
    """A scroll bar. It scrolls the widget of `command=text.yview` (or the widget with `yscrollcommand=bar.set`)."""

    _kind = "Scrollbar"
    _class = "Scrollbar"
    _defaults = _SCROLLBAR_OPTIONS

    def _init(self):
        self._view = (0.0, 1.0)
        self.set = Linked(self, Scrollbar._set)

    def _set(self, first, last):
        self._view = (float(first), float(last))

    def get(self):
        return self._view

    def activate(self, index=None):
        return None

    def fraction(self, x, y):
        return 0.0

    def delta(self, deltax, deltay):
        return 0.0

    def identify(self, x, y):
        return ""

    def _target(self):
        command = self._opts.get("command")
        if isinstance(command, Linked) and command.owner._alive:
            return command.owner._id
        option = "yscrollcommand" if str(self._opts["orient"]).startswith("v") else "xscrollcommand"
        from tkinter._core import app

        for widget in app.widgets:
            linked = widget._opts.get(option)
            if isinstance(linked, Linked) and linked.owner is self:
                return widget._id
        return 0

    def _scene(self):
        scene = Widget._scene(self)
        scene["scroll"] = {
            "target": self._target(),
            "vertical": str(self._opts["orient"]).startswith("v"),
            "trough": _style.color(self._opts["troughcolor"]),
        }
        return scene
