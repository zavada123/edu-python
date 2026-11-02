# The tkinter module for the browser. Same names as the CPython `tkinter` module, for the window projects of
# the grade 7–8 textbooks: windows, labels, buttons, fields, check boxes, canvas, events and timers.
# The program runs until `mainloop()`; then the page shows the windows and calls the handlers of the
# program for each click, key and typed text (`_core.py`).
from tkinter.constants import *
from tkinter._style import TclError
from tkinter._events import Event
from tkinter._core import Misc, mainloop
from tkinter._windows import Tk, Toplevel, Wm
from tkinter._vars import BooleanVar, DoubleVar, IntVar, StringVar, Variable
from tkinter._fields import Entry, Scale, Text
from tkinter._widgets import (
    BitmapImage,
    Button,
    Checkbutton,
    Frame,
    Label,
    LabelFrame,
    Listbox,
    Menu,
    Menubutton,
    Message,
    OptionMenu,
    PanedWindow,
    PhotoImage,
    Radiobutton,
    Scrollbar,
    Spinbox,
    Widget,
)
from tkinter._canvas import Canvas
from tkinter import _core, _page

TkVersion = 8.6
TclVersion = 8.6

# For prelude.py.
_app = _core.app
_MainLoop = _core._MainLoop
_dispatch = _page.dispatch


def NoDefaultRoot():
    pass


def getint(s):
    return int(s)


def getdouble(s):
    return float(s)


def getboolean(s):
    from tkinter._style import flag

    return flag(s)


def image_names():
    return ()


def image_types():
    return ()
