# Themed widgets (ttk). In the browser they look like the usual tkinter widgets; `ttk.Style` gives them
# colours, fonts and paddings by style ("TButton", "Big.TLabel"), see `_themed.py`.
import tkinter
from tkinter import _lists, _menus, _widgets
from tkinter._themed import Notebook, Progressbar, Separator, Style, Themed, Treeview

_THEMED = {"style": "", "padding": 0, "class": ""}

__all__ = [
    "Button",
    "Checkbutton",
    "Combobox",
    "Entry",
    "Frame",
    "Label",
    "Labelframe",
    "LabelFrame",
    "Menubutton",
    "Notebook",
    "OptionMenu",
    "PanedWindow",
    "Panedwindow",
    "Progressbar",
    "Radiobutton",
    "Scale",
    "Scrollbar",
    "Separator",
    "Sizegrip",
    "Spinbox",
    "Style",
    "Treeview",
    "LabeledScale",
]


def _themed_options(base):
    found = dict(base._defaults)
    found.update(_THEMED)
    return found


class Button(Themed, tkinter.Button):
    _defaults = _themed_options(tkinter.Button)
    _style_class = "TButton"
    _base = tkinter.Button


class Label(Themed, tkinter.Label):
    _defaults = _themed_options(tkinter.Label)
    _style_class = "TLabel"
    _base = tkinter.Label


class Entry(Themed, tkinter.Entry):
    _defaults = _themed_options(tkinter.Entry)
    _style_class = "TEntry"
    _base = tkinter.Entry


class Frame(Themed, tkinter.Frame):
    _defaults = _themed_options(tkinter.Frame)
    _style_class = "TFrame"
    _base = tkinter.Frame


class LabelFrame(Themed, tkinter.LabelFrame):
    _defaults = _themed_options(tkinter.LabelFrame)
    _style_class = "TLabelframe"
    _base = tkinter.LabelFrame


Labelframe = LabelFrame


class Checkbutton(Themed, tkinter.Checkbutton):
    _defaults = _themed_options(tkinter.Checkbutton)
    _style_class = "TCheckbutton"
    _base = tkinter.Checkbutton


class Radiobutton(Themed, tkinter.Radiobutton):
    _defaults = _themed_options(tkinter.Radiobutton)
    _style_class = "TRadiobutton"
    _base = tkinter.Radiobutton


class Scale(Themed, tkinter.Scale):
    _defaults = _themed_options(tkinter.Scale)
    _style_class = "Horizontal.TScale"
    _base = tkinter.Scale


class Combobox(Themed, _lists.Combobox):
    _defaults = _themed_options(_lists.Combobox)
    _style_class = "TCombobox"
    _base = _lists.Combobox


class Spinbox(Themed, _lists.Spinbox):
    _defaults = _themed_options(_lists.Spinbox)
    _style_class = "TSpinbox"
    _base = _lists.Spinbox


class Scrollbar(Themed, _lists.Scrollbar):
    _defaults = _themed_options(_lists.Scrollbar)
    _style_class = "Vertical.TScrollbar"
    _base = _lists.Scrollbar


class Menubutton(Themed, _menus.Menubutton):
    _defaults = _themed_options(_menus.Menubutton)
    _style_class = "TMenubutton"
    _base = _menus.Menubutton


class PanedWindow(Themed, _widgets.PanedWindow):
    _defaults = _themed_options(_widgets.PanedWindow)
    _style_class = "TPanedwindow"
    _base = _widgets.PanedWindow


Panedwindow = PanedWindow


class Sizegrip(Themed, tkinter.Frame):
    """The corner to resize a window: in the browser the window keeps its size."""

    _defaults = _themed_options(tkinter.Frame)
    _style_class = "TSizegrip"
    _base = tkinter.Frame


class OptionMenu(_menus.OptionMenu):
    """ttk.OptionMenu(master, variable, default, *values): `default` is the first value of the variable."""

    def __init__(self, master, variable, default=None, *values, **kwargs):
        _menus.OptionMenu.__init__(self, master, variable, *(values or ("",)), **kwargs)
        if default is not None:
            variable.set(default)


class LabeledScale(Frame):
    """A Scale with its value above it."""

    def __init__(self, master=None, variable=None, from_=0, to=10, **kw):
        Frame.__init__(self, master, **kw)
        self.variable = variable if variable is not None else tkinter.IntVar(self, value=from_)
        self.scale = Scale(self, variable=self.variable, from_=from_, to=to)
        self.scale.pack(fill="x")
        self.label = Label(self, textvariable=self.variable)
        self.label.pack()

    @property
    def value(self):
        return self.variable.get()

    @value.setter
    def value(self, value):
        self.variable.set(value)

