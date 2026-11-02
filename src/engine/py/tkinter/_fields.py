# Fields where the student types or chooses a value: Entry, Text and Scale. The page sends the new text or
# value as an Edit event (`_page.py`).
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


class Entry(Widget):
    """A field for one line of text: `get()` gives the text that the student typed."""

    _kind = "Entry"
    _class = "Entry"
    _defaults = _ENTRY_OPTIONS
    _states = ("disabled", "normal", "readonly")

    def _init(self):
        self._value = ""

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

    def xview(self, *args):
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


_TEXT_OPTIONS = dict(BASE_OPTIONS)
_TEXT_OPTIONS.update(
    {
        "autoseparators": 1,
        "background": "SystemWindow",
        "blockcursor": 0,
        "borderwidth": 1,
        "endline": "",
        "exportselection": 1,
        "font": "TkFixedFont",
        "foreground": "SystemWindowText",
        "height": 24,
        "inactiveselectbackground": "SystemButtonFace",
        "insertbackground": "SystemWindowText",
        "insertborderwidth": 0,
        "insertofftime": 300,
        "insertontime": 600,
        "insertunfocussed": "none",
        "insertwidth": 2,
        "maxundo": 0,
        "padx": 1,
        "pady": 1,
        "relief": "sunken",
        "selectbackground": "SystemHighlight",
        "selectborderwidth": 0,
        "selectforeground": "SystemHighlightText",
        "setgrid": 0,
        "spacing1": 0,
        "spacing2": 0,
        "spacing3": 0,
        "startline": "",
        "state": "normal",
        "tabs": "",
        "tabstyle": "tabular",
        "undo": 0,
        "width": 80,
        "wrap": "char",
        "xscrollcommand": "",
        "yscrollcommand": "",
    }
)


class Text(Widget):
    """A field for many lines of text. Places are "line.column": "1.0" is the start, END is the end."""

    _kind = "Text"
    _class = "Text"
    _defaults = _TEXT_OPTIONS
    _states = ("disabled", "normal")

    def _init(self):
        self._value = ""

    def _offset(self, index):
        text = self._value
        name = str(index) if not isinstance(index, float) else "%.1f" % index
        shift = 0
        for sign in ("+", "-"):
            at = name.find(sign, 1)
            if at > 0:
                change = name[at + 1 :].strip()
                for unit in ("chars", "char", "c"):
                    if change.endswith(unit):
                        change = change[: -len(unit)].strip()
                        break
                if not change.isdigit():
                    raise TclError('bad text index "%s"' % name)
                shift = int(change) if sign == "+" else -int(change)
                name = name[:at].strip()
        if name in ("end", "insert", "current"):
            base = len(text) + 1
        elif "." in name:
            line_text, column_text = name.split(".", 1)
            if not line_text.isdigit() or not (column_text.isdigit() or column_text == "end"):
                raise TclError('bad text index "%s"' % name)
            lines = text.split("\n")
            line = int(line_text)
            if line < 1:
                base = 0
            elif line > len(lines):
                base = len(text) + 1
            else:
                start = sum(len(lines[i]) + 1 for i in range(line - 1))
                length = len(lines[line - 1])
                column = length if column_text == "end" else min(int(column_text), length)
                base = start + column
        else:
            raise TclError('bad text index "%s"' % name)
        return max(0, min(base + shift, len(text) + 1))

    def index(self, index):
        offset = self._offset(index)
        before = (self._value + "\n")[:offset]
        line = before.count("\n") + 1
        column = len(before) - (before.rfind("\n") + 1)
        return "%d.%d" % (line, column)

    def get(self, index1, index2=None):
        whole = self._value + "\n"
        start = self._offset(index1)
        end = start + 1 if index2 is None else self._offset(index2)
        return whole[start:end] if end > start else ""

    def _editable(self):
        return str(self._opts["state"]) == "normal"

    def insert(self, index, chars, *args):
        if not self._editable():
            return
        at = min(self._offset(index), len(self._value))
        self._value = self._value[:at] + _style.tcl_text(chars) + self._value[at:]
        self._rev += 1
        touch()

    def delete(self, index1, index2=None):
        if not self._editable():
            return
        start = min(self._offset(index1), len(self._value))
        end = start + 1 if index2 is None else self._offset(index2)
        end = min(end, len(self._value))
        if end > start:
            self._value = self._value[:start] + self._value[end:]
            self._rev += 1
            touch()

    def _edit(self, text):
        self._value = text
        touch()

    def see(self, index):
        pass

    def mark_set(self, markName, index):
        pass

    def tag_add(self, tagName, index1, *args):
        pass

    def tag_remove(self, tagName, index1, index2=None):
        pass

    def tag_configure(self, tagName, cnf=None, **kw):
        pass

    tag_config = tag_configure

    def edit_reset(self):
        pass

    def edit_modified(self, arg=None):
        return False

    def yview(self, *args):
        pass

    xview = yview

    def _text(self):
        return self._value


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
