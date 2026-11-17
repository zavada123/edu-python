# Menus: the menu bar of a window (`root.config(menu=bar)`), drop-down menus (`add_cascade`), a menu that pops
# up at the mouse (`tk_popup`), Menubutton and OptionMenu. The page draws the menus (tk-menus.tsx) and sends
# the chosen entry (MenuItem); the program runs its `command`.
from tkinter import _style
from tkinter._core import BASE_OPTIONS, TclError, touch
from tkinter._vars import StringVar, Variable
from tkinter._widgets import _BUTTON_OPTIONS, Button, Widget

_MENU_OPTIONS = dict(BASE_OPTIONS)
_MENU_OPTIONS.update(
    {
        "activebackground": "SystemHighlight",
        "activeborderwidth": 0,
        "activeforeground": "SystemHighlightText",
        "activerelief": "flat",
        "background": "SystemMenu",
        "borderwidth": 1,
        "disabledforeground": "SystemDisabledText",
        "font": "TkMenuFont",
        "foreground": "SystemMenuText",
        "postcommand": "",
        "relief": "flat",
        "selectcolor": "SystemMenuText",
        "tearoff": 1,
        "tearoffcommand": "",
        "title": "",
        "type": "normal",
    }
)

_TYPES = ("command", "cascade", "checkbutton", "radiobutton", "separator")
_ENTRY_OPTIONS = {
    "accelerator": "",
    "activebackground": "",
    "activeforeground": "",
    "background": "",
    "bitmap": "",
    "columnbreak": 0,
    "command": "",
    "compound": "none",
    "font": "",
    "foreground": "",
    "hidemargin": 0,
    "image": "",
    "indicatoron": 1,
    "label": "",
    "menu": "",
    "offvalue": 0,
    "onvalue": 1,
    "selectcolor": "",
    "selectimage": "",
    "state": "normal",
    "underline": -1,
    "value": "",
    "variable": "",
}


class _Entry:
    def __init__(self, kind):
        self.kind = kind
        self.opts = dict(_ENTRY_OPTIONS)
        self.own = None  # the variable of a check entry without `variable`


class Menu(Widget):
    """A menu: a list of commands. In `root.config(menu=…)` it is the menu bar of the window."""

    _kind = "Menu"
    _class = "Menu"
    _defaults = _MENU_OPTIONS

    def _init(self):
        self._entries = []
        self._posted = None  # [x, y, number of the post]
        self._posts = 0

    # ── entries ──

    def _index(self, index):
        if isinstance(index, int) and not isinstance(index, bool):
            return index
        name = str(index)
        if name in ("end", "last"):
            return len(self._entries) - 1 if self._entries else None
        if name == "none":
            return None
        if name == "active":
            return None
        if name.isdigit():
            return int(name)
        for i, entry in enumerate(self._entries):
            if entry.kind != "separator" and str(entry.opts["label"]) == name:
                return i
        raise TclError('bad menu entry index "%s"' % name)

    def _entry(self, index):
        at = self._index(index)
        if at is None or not 0 <= at < len(self._entries):
            raise TclError('bad menu entry index "%s"' % index)
        return self._entries[at]

    def _set(self, entry, cnf, kw):
        options = dict(cnf) if isinstance(cnf, dict) else {}
        options.update(kw)
        for key, value in options.items():
            name = str(key).rstrip("_")
            name = {"bg": "background", "fg": "foreground"}.get(name, name)
            if name not in entry.opts:
                raise TclError('unknown option "-%s"' % name)
            if name == "state":
                _style.one_of("state", value, ("active", "disabled", "normal"))
            elif name in ("foreground", "background") and value != "":
                _style.color(value)
            entry.opts[name] = value
        if entry.kind == "radiobutton" and entry.opts["value"] == "":
            entry.opts["value"] = entry.opts["label"]
        touch()

    def insert(self, index, itemType, cnf={}, **kw):
        kind = _style.one_of("menu entry type", itemType, _TYPES)
        entry = _Entry(kind)
        self._set(entry, cnf, kw)
        at = self._index(index)
        position = len(self._entries) if at is None else max(0, min(at, len(self._entries)))
        self._entries.insert(position, entry)
        touch()

    def add(self, itemType, cnf={}, **kw):
        self.insert(len(self._entries), itemType, cnf, **kw)

    def add_command(self, cnf={}, **kw):
        self.add("command", cnf, **kw)

    def add_cascade(self, cnf={}, **kw):
        self.add("cascade", cnf, **kw)

    def add_checkbutton(self, cnf={}, **kw):
        self.add("checkbutton", cnf, **kw)

    def add_radiobutton(self, cnf={}, **kw):
        self.add("radiobutton", cnf, **kw)

    def add_separator(self, cnf={}, **kw):
        self.add("separator", cnf, **kw)

    def insert_command(self, index, cnf={}, **kw):
        self.insert(index, "command", cnf, **kw)

    def insert_cascade(self, index, cnf={}, **kw):
        self.insert(index, "cascade", cnf, **kw)

    def insert_checkbutton(self, index, cnf={}, **kw):
        self.insert(index, "checkbutton", cnf, **kw)

    def insert_radiobutton(self, index, cnf={}, **kw):
        self.insert(index, "radiobutton", cnf, **kw)

    def insert_separator(self, index, cnf={}, **kw):
        self.insert(index, "separator", cnf, **kw)

    def delete(self, index1, index2=None):
        start = self._index(index1)
        end = start if index2 is None else self._index(index2)
        if start is None or end is None:
            return
        del self._entries[start : end + 1]
        touch()

    def entryconfigure(self, index, cnf=None, **kw):
        entry = self._entry(index)
        if cnf is None and not kw:
            return dict(entry.opts)
        if isinstance(cnf, str):
            return entry.opts[cnf]
        self._set(entry, cnf, kw)

    entryconfig = entryconfigure

    def entrycget(self, index, option):
        name = str(option).rstrip("_")
        entry = self._entry(index)
        if name not in entry.opts:
            raise TclError('unknown option "-%s"' % name)
        return entry.opts[name]

    def index(self, index):
        return self._index(index)

    def type(self, index):
        return self._entry(index).kind

    def _variable(self, entry):
        variable = entry.opts.get("variable")
        if isinstance(variable, Variable):
            return variable
        if entry.own is None:
            entry.own = StringVar(self, value=entry.opts["offvalue"] if entry.kind == "checkbutton" else "")
        return entry.own

    def _checked(self, entry):
        if entry.kind == "checkbutton":
            return _style.tcl_text(self._variable(entry)._value) == _style.tcl_text(entry.opts["onvalue"])
        if entry.kind == "radiobutton":
            return _style.tcl_text(self._variable(entry)._value) == _style.tcl_text(entry.opts["value"])
        return False

    def invoke(self, index):
        entry = self._entry(index)
        if str(entry.opts["state"]) == "disabled" or entry.kind in ("separator", "cascade"):
            return ""
        if entry.kind == "checkbutton":
            value = entry.opts["offvalue"] if self._checked(entry) else entry.opts["onvalue"]
            self._variable(entry)._store(value, None)
        elif entry.kind == "radiobutton":
            self._variable(entry)._store(entry.opts["value"], None)
        command = entry.opts.get("command")
        if callable(command):
            return command()
        return ""

    def _menu_item(self, index):
        # The student chose an entry on the page: the popup menu closes.
        self._posted = None
        if 0 <= index < len(self._entries):
            self.invoke(index)

    # ── popup ──

    def post(self, x, y):
        command = self._opts.get("postcommand")
        if callable(command):
            command()
        self._posts += 1
        self._posted = [int(_style.number(x)), int(_style.number(y)), self._posts]
        touch()

    def tk_popup(self, x, y, entry=""):
        self.post(x, y)

    def unpost(self):
        self._posted = None
        touch()

    def activate(self, index):
        pass

    def xposition(self, index):
        return 0

    def yposition(self, index):
        return 0

    def _entry_scene(self, entry):
        opts = entry.opts
        submenu = opts.get("menu")
        return {
            "type": entry.kind,
            "label": _style.tcl_text(opts["label"]),
            "accelerator": _style.tcl_text(opts["accelerator"]),
            "enabled": str(opts["state"]) != "disabled",
            "checked": self._checked(entry),
            "submenu": submenu._id if isinstance(submenu, Menu) and submenu._alive else 0,
            "underline": int(_style.number(opts["underline"])),
            "fg": _style.color(opts["foreground"]) if opts["foreground"] != "" else "",
        }

    def _scene(self):
        scene = Widget._scene(self)
        scene["menu"] = {"entries": [self._entry_scene(e) for e in self._entries], "posted": self._posted}
        return scene


_MENUBUTTON_OPTIONS = dict(_BUTTON_OPTIONS)
_MENUBUTTON_OPTIONS.update({"direction": "below", "indicatoron": 0, "menu": "", "relief": "flat"})


class Menubutton(Button):
    """A button that opens its `menu`."""

    _kind = "Menubutton"
    _class = "Menubutton"
    _defaults = _MENUBUTTON_OPTIONS

    def invoke(self):
        return ""

    def _scene(self):
        scene = Button._scene(self)
        menu = self._opts.get("menu")
        scene["opens"] = menu._id if isinstance(menu, Menu) and menu._alive else 0
        return scene


class OptionMenu(Menubutton):
    """A button with a list of values: the chosen value goes to `variable`."""

    def __init__(self, master, variable, value, *values, **kwargs):
        command = kwargs.pop("command", None)
        Menubutton.__init__(self, master, textvariable=variable, indicatoron=1, relief="raised", anchor="center", highlightthickness=2, borderwidth=2)
        self._command = command
        self._variable_of = variable
        menu = Menu(self, name="menu", tearoff=0)
        self._menu = menu
        self["menu"] = menu
        for each in (value,) + values:
            self._add_choice(each)
        if kwargs:
            raise TclError('unknown option -%s' % next(iter(kwargs)))

    def _add_choice(self, value):
        def choose(chosen=value):
            if callable(self._command):
                self._command(chosen)

        self._menu.add_radiobutton(label=value, variable=self._variable_of, value=value, command=choose)

    def __getitem__(self, name):
        if name == "menu":
            return self._menu
        return Menubutton.__getitem__(self, name)
