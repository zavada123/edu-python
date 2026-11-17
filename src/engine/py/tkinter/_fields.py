# Fields where the student types or chooses a value: Entry and Scale (Text is in `_text.py`). The page sends
# the new text or value as an Edit event (`_page.py`).
from tkinter import _core, _style
from tkinter._core import BASE_OPTIONS, TclError, touch
from tkinter._vars import Variable
from tkinter._widgets import Widget, _options

_ENTRY_OPTIONS = dict(BASE_OPTIONS)
_ENTRY_OPTIONS.update(
    {
        "background": "SystemWindow",
        "borderwidth": 1,
        "disabledbackground": "SystemButtonFace",
        "disabledforeground": "SystemDisabledText",
        "exportselection": 1,
        "font": "TkTextFont",
        "foreground": "SystemWindowText",
        "insertbackground": "SystemWindowText",
        "insertborderwidth": 0,
        "insertofftime": 300,
        "insertontime": 600,
        "insertwidth": 2,
        "invalidcommand": "",
        "justify": "left",
        "readonlybackground": "SystemButtonFace",
        "relief": "sunken",
        "selectbackground": "SystemHighlight",
        "selectborderwidth": 0,
        "selectforeground": "SystemHighlightText",
        "show": "",
        "state": "normal",
        "textvariable": "",
        "validate": "none",
        "validatecommand": "",
        "width": 20,
        "xscrollcommand": "",
    }
)


class Linked:
    """A method of one widget that knows the widget: `command=text.yview` tells a Scrollbar what it scrolls.

    MicroPython has no `__self__` of a bound method, so the widgets keep these objects as their attributes.
    """

    def __init__(self, owner, func):
        self.owner = owner
        self.func = func

    def __call__(self, *args):
        return self.func(self.owner, *args)


class Entry(Widget):
    """A field for one line of text: `get()` gives the text that the student typed."""

    _kind = "Entry"
    _class = "Entry"
    _defaults = _ENTRY_OPTIONS
    _states = ("disabled", "normal", "readonly")

    def _init(self):
        self._value = ""
        self.xview = Linked(self, Entry._xview)

    def get(self):
        variable = self._opts.get("textvariable")
        if isinstance(variable, Variable):
            return _style.tcl_text(variable.get())
        return self._value

    def _put(self, text, source):
        variable = self._opts.get("textvariable")
        if isinstance(variable, Variable):
            variable._store(text, source)
        else:
            self._value = text
            if source is None:
                self._rev += 1
            touch()

    def _edit(self, text):
        self._put(text, self)

    def index(self, index):
        text = self.get()
        if isinstance(index, int) and not isinstance(index, bool):
            return max(0, min(index, len(text)))
        name = str(index)
        if name in ("end", "insert"):
            return len(text)
        if name.isdigit():
            return min(int(name), len(text))
        raise TclError('bad entry index "%s"' % name)

    def _editable(self):
        return str(self._opts["state"]) == "normal"

    def insert(self, index, string):
        if not self._editable():
            return
        text = self.get()
        at = self.index(index)
        self._put(text[:at] + _style.tcl_text(string) + text[at:], None)

    def delete(self, first, last=None):
        if not self._editable():
            return
        text = self.get()
        start = self.index(first)
        end = start + 1 if last is None else self.index(last)
        if end > start:
            self._put(text[:start] + text[end:], None)

    def icursor(self, index):
        pass

    def select_range(self, start, end):
        pass

    selection_range = select_range

    def select_clear(self):
        pass

    selection_clear = select_clear

    def select_present(self):
        return False

    selection_present = select_present

    def _xview(self, *args):
        if not args:
            return (0.0, 1.0)

    def xview_moveto(self, fraction):
        pass

    def xview_scroll(self, number, what):
        pass

    def _text(self):
        return self.get()

    def _scene(self):
        scene = Widget._scene(self)
        state = str(self._opts["state"])
        if state == "disabled":
            scene["bg"] = _style.color(self._opts["disabledbackground"])
        elif state == "readonly":
            scene["bg"] = _style.color(self._opts["readonlybackground"])
        return scene


_SCALE_OPTIONS = dict(BASE_OPTIONS)
_SCALE_OPTIONS.update(
    {
        "activebackground": "SystemButtonFace",
        "bigincrement": 0,
        "borderwidth": 1,
        "command": "",
        "digits": 0,
        "font": "TkDefaultFont",
        "foreground": "SystemButtonText",
        "from": 0,
        "highlightthickness": 2,
        "label": "",
        "length": 100,
        "orient": "vertical",
        "repeatdelay": 300,
        "repeatinterval": 100,
        "resolution": 1,
        "showvalue": 1,
        "sliderlength": 30,
        "sliderrelief": "raised",
        "state": "normal",
        "tickinterval": 0,
        "to": 100,
        "troughcolor": "SystemScrollbar",
        "variable": "",
        "width": 15,
    }
)


class Scale(Widget):
    """A slider for a number from `from_` to `to`."""

    _kind = "Scale"
    _class = "Scale"
    _defaults = _SCALE_OPTIONS

    def _init(self):
        self._value = 0

    def _round(self, value):
        low = float(_style.number(self._opts["from"]))
        high = float(_style.number(self._opts["to"]))
        step = float(_style.number(self._opts["resolution"]))
        value = max(min(low, high), min(max(low, high), float(value)))
        if step > 0:
            value = low + round((value - low) / step) * step
        return int(value) if step == int(step) and step >= 1 else value

    def get(self):
        variable = self._opts.get("variable")
        if isinstance(variable, Variable):
            try:
                return self._round(float(variable._value))
            except (TypeError, ValueError):
                return self._round(0)
        return self._round(self._value)

    def set(self, value):
        self._slide(value, None)

    def _slide(self, value, source):
        found = self._round(_style.number(value))
        variable = self._opts.get("variable")
        if isinstance(variable, Variable):
            variable._store(found, source)
        else:
            self._value = found
            if source is None:
                self._rev += 1
            touch()
        command = self._opts.get("command")
        if source is not None and callable(command):
            command(str(found))

    def _edit(self, value):
        self._slide(value, self)

    def _scene(self):
        scene = Widget._scene(self)
        scene["scale"] = {
            "from": float(_style.number(self._opts["from"])),
            "to": float(_style.number(self._opts["to"])),
            "resolution": float(_style.number(self._opts["resolution"])),
            "value": float(self.get()),
            "orient": str(self._opts["orient"]),
            "length": _style.number(self._opts["length"]),
            "label": str(self._opts["label"]),
            "showvalue": _style.flag(self._opts["showvalue"]),
            "trough": _style.color(self._opts["troughcolor"]),
        }
        return scene
