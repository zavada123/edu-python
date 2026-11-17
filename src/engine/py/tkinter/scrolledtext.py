# ScrolledText: a Text with a Scrollbar on the right, in a Frame. pack, grid and place put the frame.
from tkinter._lists import Scrollbar
from tkinter._text import Text
from tkinter._widgets import Frame, Widget

__all__ = ["ScrolledText"]


class ScrolledText(Text):
    def __init__(self, master=None, **kw):
        self.frame = Frame(master)
        self.vbar = Scrollbar(self.frame)
        Widget.pack_configure(self.vbar, side="right", fill="y")
        kw["yscrollcommand"] = self.vbar.set
        Text.__init__(self, self.frame, **kw)
        Widget.pack_configure(self, side="left", fill="both", expand=True)
        self.vbar["command"] = self.yview

    def pack_configure(self, cnf={}, **kw):
        self.frame.pack_configure(cnf, **kw)

    pack = pack_configure

    def grid_configure(self, cnf={}, **kw):
        self.frame.grid_configure(cnf, **kw)

    grid = grid_configure

    def place_configure(self, cnf={}, **kw):
        self.frame.place_configure(cnf, **kw)

    place = place_configure

    def pack_forget(self):
        self.frame.pack_forget()

    def grid_forget(self):
        self.frame.grid_forget()

    def place_forget(self):
        self.frame.place_forget()

    forget = pack_forget

    def destroy(self):
        self.frame.destroy()
