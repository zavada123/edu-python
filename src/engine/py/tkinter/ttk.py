# Themed widgets (ttk). In the browser they look like the usual tkinter widgets.
import tkinter
from tkinter import _lists, _menus, _widgets

_THEMED = {"style": "", "padding": 0, "class": ""}


def _themed(base):
    found = dict(base._defaults)
    found.update(_THEMED)
    return found


class Button(tkinter.Button):
    _defaults = _themed(tkinter.Button)


class Label(tkinter.Label):
    _defaults = _themed(tkinter.Label)


class Entry(tkinter.Entry):
    _defaults = _themed(tkinter.Entry)


class Frame(tkinter.Frame):
    _defaults = _themed(tkinter.Frame)


class LabelFrame(tkinter.LabelFrame):
    _defaults = _themed(tkinter.LabelFrame)


Labelframe = LabelFrame


class Checkbutton(tkinter.Checkbutton):
    _defaults = _themed(tkinter.Checkbutton)


class Radiobutton(tkinter.Radiobutton):
    _defaults = _themed(tkinter.Radiobutton)


class Scale(tkinter.Scale):
    _defaults = _themed(tkinter.Scale)


class Style:
    def __init__(self, master=None):
        pass

    def configure(self, style, query_opt=None, **kw):
        return {}

    def map(self, style, query_opt=None, **kw):
        return {}

    def theme_use(self, themename=None):
        return "default"

    def theme_names(self):
        return ("default",)

    def lookup(self, style, option, state=None, default=None):
        return default


class Combobox(_lists.Combobox):
    pass


class Spinbox(_lists.Spinbox):
    _defaults = _themed(_lists.Spinbox)


class Scrollbar(_lists.Scrollbar):
    _defaults = _themed(_lists.Scrollbar)


class Menubutton(_menus.Menubutton):
    _defaults = _themed(_menus.Menubutton)


class OptionMenu(_menus.OptionMenu):
    """ttk.OptionMenu(master, variable, default, *values): `default` is the first value of the variable."""

    def __init__(self, master, variable, default=None, *values, **kwargs):
        _menus.OptionMenu.__init__(self, master, variable, *(values or ("",)), **kwargs)
        if default is not None:
            variable.set(default)


Progressbar = _widgets._unsupported("ttk.Progressbar")
Notebook = _widgets._unsupported("ttk.Notebook")
Treeview = _widgets._unsupported("ttk.Treeview")
Separator = _widgets._unsupported("ttk.Separator")
