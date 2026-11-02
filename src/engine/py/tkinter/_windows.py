# Windows of the browser tkinter: `Tk` (the main window) and `Toplevel`. The page draws each window with
# a title bar; `geometry` sets the size and the place on the "screen" (the page shows the place as numbers).
from tkinter import _core, _style
from tkinter._core import BASE_OPTIONS, Misc, TclError, app, touch

DefaultSize = 200


def _digits(text, start):
    end = start
    while end < len(text) and text[end].isdigit():
        end += 1
    return end


def _position(text, start, spec):
    # "+100", "-100", "+-100"
    if start >= len(text) or text[start] not in "+-":
        raise TclError('bad geometry specifier "%s"' % spec)
    from_end = text[start] == "-"
    start += 1
    negative = False
    if start < len(text) and text[start] in "+-":
        negative = text[start] == "-"
        start += 1
    end = _digits(text, start)
    if end == start:
        raise TclError('bad geometry specifier "%s"' % spec)
    value = int(text[start:end])
    return (-value if negative else value), from_end, end


def parse_geometry(spec):
    """(size or None, position or None) of "500x300+100+50", "500x300", "+100+50"."""
    text = str(spec)
    if text.startswith("="):
        text = text[1:]
    size = None
    index = 0
    end = _digits(text, 0)
    if end > 0:
        if end >= len(text) or text[end] != "x":
            raise TclError('bad geometry specifier "%s"' % spec)
        stop = _digits(text, end + 1)
        if stop == end + 1:
            raise TclError('bad geometry specifier "%s"' % spec)
        size = (int(text[:end]), int(text[end + 1 : stop]))
        index = stop
    position = None
    if index < len(text):
        x, x_from_end, index = _position(text, index, spec)
        y, y_from_end, index = _position(text, index, spec)
        if index != len(text):
            raise TclError('bad geometry specifier "%s"' % spec)
        position = (x, x_from_end, y, y_from_end)
    if size is None and position is None:
        raise TclError('bad geometry specifier "%s"' % spec)
    return size, position


_WINDOW_OPTIONS = dict(BASE_OPTIONS)
_WINDOW_OPTIONS.update(
    {
        "class": "Tk",
        "colormap": "",
        "container": 0,
        "height": 0,
        "menu": "",
        "padx": 0,
        "pady": 0,
        "screen": "",
        "use": "",
        "visual": "",
        "width": 0,
    }
)


class Wm:
    """Window manager commands: title, size and place, close."""

    def _wm_setup(self):
        self._title = "tk"
        self._size = None
        self._x = 0
        self._y = 0
        self._visible = True
        self._resizable = (True, True)
        self._protocols = {}
        self._decorated = True
        self._shown_once = False

    def title(self, string=None):
        if string is None:
            return self._title
        self._title = str(string)
        touch()

    wm_title = title

    def _current_size(self):
        if self._box is not None:
            return int(self._box[2]), int(self._box[3])
        if self._size is not None:
            return self._size
        return 1, 1

    def geometry(self, newGeometry=None):
        if newGeometry is None:
            width, height = self._current_size()
            return "%dx%d+%d+%d" % (width, height, self._x, self._y)
        if str(newGeometry) == "":
            self._size = None
            touch()
            return ""
        size, position = parse_geometry(newGeometry)
        if size is not None:
            self._size = size
            self._box = None
        if position is not None:
            x, x_from_end, y, y_from_end = position
            width, height = self._current_size()
            self._x = _core.ScreenWidth - width - x if x_from_end else x
            self._y = _core.ScreenHeight - height - y if y_from_end else y
        touch()
        return ""

    wm_geometry = geometry

    def resizable(self, width=None, height=None):
        if width is None and height is None:
            return self._resizable
        self._resizable = (_style.flag(width), _style.flag(height if height is not None else width))

    wm_resizable = resizable

    def minsize(self, width=None, height=None):
        return (1, 1)

    def maxsize(self, width=None, height=None):
        return (_core.ScreenWidth, _core.ScreenHeight)

    wm_minsize = minsize
    wm_maxsize = maxsize

    def attributes(self, *args, **kw):
        return ""

    wm_attributes = attributes

    def protocol(self, name=None, func=None):
        if name is None:
            return tuple(self._protocols)
        if func is None:
            return self._protocols.get(name, "")
        self._protocols[name] = func
        return ""

    wm_protocol = protocol

    def iconbitmap(self, bitmap=None, default=None):
        return ""

    def iconphoto(self, default=False, *args):
        pass

    def iconname(self, newName=None):
        return ""

    wm_iconbitmap = iconbitmap
    wm_iconphoto = iconphoto

    def withdraw(self):
        self._visible = False
        touch()

    def deiconify(self):
        self._visible = True
        touch()

    iconify = withdraw
    wm_withdraw = withdraw
    wm_deiconify = deiconify
    wm_iconify = iconify

    def state(self, newstate=None):
        if newstate is None:
            return "normal" if self._visible else "withdrawn"
        self._visible = str(newstate) not in ("withdrawn", "iconic")
        touch()
        return ""

    wm_state = state

    def overrideredirect(self, boolean=None):
        if boolean is None:
            return not self._decorated
        self._decorated = not _style.flag(boolean)
        touch()

    wm_overrideredirect = overrideredirect

    def lift(self, aboveThis=None):
        pass

    tkraise = lift

    def lower(self, belowThis=None):
        pass

    def transient(self, master=None):
        pass

    def winfo_x(self):
        return self._x

    def winfo_y(self):
        return self._y

    def winfo_rootx(self):
        return self._x

    def winfo_rooty(self):
        return self._y

    def winfo_width(self):
        return self._current_size()[0]

    def winfo_height(self):
        return self._current_size()[1]

    def destroy(self):
        if not self._alive:
            return
        self._destroy_tree()
        if self is app.root or not any(w._kind == "Window" for w in app.widgets):
            # The main window is closed: the program ends.
            for widget in list(app.widgets):
                widget._destroy_tree()
            _core.close()

    def _close_request(self):
        handler = self._protocols.get("WM_DELETE_WINDOW")
        if handler is not None and callable(handler):
            handler()
        else:
            self.destroy()

    def _scene(self):
        scene = self._base_scene()
        width = -1
        height = -1
        if self._size is not None:
            width, height = self._size
        scene.update(
            {
                "title": self._title,
                "width": width,
                "height": height,
                "minWidth": _style.number(self._opts["width"]),
                "minHeight": _style.number(self._opts["height"]),
                "x": self._x,
                "y": self._y,
                "visible": self._visible,
                "decorated": self._decorated,
            }
        )
        return scene


class Tk(Wm, Misc):
    """The main window of the program."""

    _kind = "Window"
    _class = "Tk"

    def __init__(self, screenName=None, baseName=None, className="Tk", useTk=True, sync=False, use=None):
        first = app.root is None or not app.root._alive
        self._setup(None, "." if first else ".tk%d" % app.next_id, _WINDOW_OPTIONS, None, {})
        self._wm_setup()
        if first:
            app.root = self
            app.closed = False

    def report_callback_exception(self, exc, val, tb):
        raise val


class Toplevel(Wm, Misc):
    """One more window of the program."""

    _kind = "Window"
    _class = "Toplevel"

    def __init__(self, master=None, cnf={}, **kw):
        if master is None:
            master = _core.default_root(None)
        count = master._name_counts.get("toplevel", 0) + 1
        master._name_counts["toplevel"] = count
        base = "" if master._w == "." else master._w
        name = kw.pop("name", None)
        path = "%s.%s" % (base, name if name is not None else "!toplevel" + ("" if count == 1 else str(count)))
        self._setup(master, path, _WINDOW_OPTIONS, cnf, kw)
        self._wm_setup()
        master._kids.append(self)
        master.children[path.split(".")[-1]] = self
