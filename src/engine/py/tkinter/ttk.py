# Themed widgets (ttk). In the browser they look like the usual tkinter widgets.
import tkinter
from tkinter import _widgets

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


Combobox = _widgets._unsupported("ttk.Combobox")
Progressbar = _widgets._unsupported("ttk.Progressbar")
Notebook = _widgets._unsupported("ttk.Notebook")
Treeview = _widgets._unsupported("ttk.Treeview")
Separator = _widgets._unsupported("ttk.Separator")
Scrollbar = _widgets._unsupported("ttk.Scrollbar")
Spinbox = _widgets._unsupported("ttk.Spinbox")
