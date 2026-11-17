# PhotoImage: a picture from a PNG or GIF file of the program (`file=`), from base64 text (`data=`), or an
# empty picture that the program paints by pixels (`put`). Labels, buttons and the canvas show it
# (`image=`). The page gets each new or changed picture once (`_core.flush`), not with every scene.
import json

import _mriya
from tkinter import _core, _style
from tkinter._core import TclError, app

# Largest picture that the program paints by pixels.
_MAX_PIXELS = 160000

_RGB = {
    "black": (0, 0, 0),
    "white": (255, 255, 255),
    "red": (255, 0, 0),
    "green": (0, 128, 0),
    "lime": (0, 255, 0),
    "blue": (0, 0, 255),
    "yellow": (255, 255, 0),
    "cyan": (0, 255, 255),
    "aqua": (0, 255, 255),
    "magenta": (255, 0, 255),
    "fuchsia": (255, 0, 255),
    "gray": (128, 128, 128),
    "grey": (128, 128, 128),
    "orange": (255, 165, 0),
    "purple": (128, 0, 128),
    "brown": (165, 42, 42),
    "pink": (255, 192, 203),
}


def _rgb(css):
    if css.startswith("#") and len(css) == 7:
        return (int(css[1:3], 16), int(css[3:5], 16), int(css[5:7], 16))
    if css.startswith("#") and len(css) == 4:
        return tuple(int(c * 2, 16) for c in css[1:])
    if css.startswith("rgb("):
        return tuple(int(v) for v in css[4:-1].split(","))
    return _RGB.get(css, (0, 0, 0))


def _load(found, source):
    if found == "missing":
        raise TclError('couldn\'t open "%s": no such file or directory' % source)
    if found == "unknown" or not found:
        raise TclError('couldn\'t recognize data in image file "%s"' % source)
    return json.loads(found)


def _rows(data):
    # put("#f00") - one colour; put("{#f00 #0f0} {#00f #fff}") or put([["red", "blue"], …]) - rows of pixels.
    if isinstance(data, (list, tuple)):
        rows = [row.split() if isinstance(row, str) else list(row) for row in data]
        if rows and not isinstance(data[0], (list, tuple, str)):
            rows = [list(data)]
        return [[_style.color(c) for c in row] for row in rows]
    text = str(data).strip()
    if "{" not in text:
        return [[_style.color(c) for c in text.split()]]
    rows = []
    for part in text.split("}"):
        part = part.strip().lstrip("{").strip()
        if part:
            rows.append([_style.color(c) for c in part.split()])
    return rows


class Image:
    """What PhotoImage and BitmapImage have in common: a name ("pyimage1") that widgets use."""

    def __init__(self, imgtype, name=None, cnf={}, master=None, **kw):
        self._number = app.next_image
        app.next_image += 1
        self.name = str(name) if name is not None else "pyimage%d" % self._number
        app.images[self._number] = self
        self._type = imgtype

    def __str__(self):
        return self.name

    def type(self):
        return self._type

    def __del__(self):
        pass


class PhotoImage(Image):
    """A picture: `PhotoImage(file="cat.png")`, `PhotoImage(data=…)` or `PhotoImage(width=100, height=50)`."""

    def __init__(self, name=None, cnf={}, master=None, **kw):
        Image.__init__(self, "photo", name, cnf, master)
        self._base = None  # {"mime", "width", "height", "data"}
        self._size = (0, 0)  # width and height set by the program
        self._pixels = None  # rows of CSS colours ("" is transparent) over the base picture
        self._zoom = (1, 1, 1, 1)  # zoom x, zoom y, subsample x, subsample y
        self._opts = {"file": "", "data": "", "format": "", "width": 0, "height": 0, "gamma": 1.0, "palette": ""}
        options = dict(cnf) if cnf else {}
        options.update(kw)
        self.configure(**options)

    def _changed(self):
        if self not in app.dirty_images:
            app.dirty_images.append(self)
        _core.touch()

    def configure(self, **kw):
        for key, value in kw.items():
            name = key.rstrip("_")
            if name not in self._opts:
                raise TclError('unknown option "-%s"' % name)
            self._opts[name] = value
            if name == "file" and value != "":
                self._base = _load(_mriya.file_image(str(value)), value)
                self._pixels = None
            elif name == "data" and value != "":
                text = value.decode() if isinstance(value, bytes) else str(value)
                self._base = _load(_mriya.data_image(text), "data")
                self._pixels = None
            elif name in ("width", "height"):
                size = int(_style.number(value))
                self._size = (size, self._size[1]) if name == "width" else (self._size[0], size)
        self._changed()

    config = configure

    def cget(self, option):
        return self._opts[option.rstrip("_")]

    def __getitem__(self, key):
        return self.cget(key)

    def __setitem__(self, key, value):
        self.configure(**{key: value})

    def _natural(self):
        width = self._size[0] or (self._base["width"] if self._base else 0)
        height = self._size[1] or (self._base["height"] if self._base else 0)
        if self._pixels is not None:
            width = max(width, max((len(r) for r in self._pixels), default=0))
            height = max(height, len(self._pixels))
        return width, height

    def width(self):
        width, _ = self._natural()
        return width * self._zoom[0] // self._zoom[2]

    def height(self):
        _, height = self._natural()
        return height * self._zoom[1] // self._zoom[3]

    def blank(self):
        self._pixels = None
        if self._opts["file"] == "" and self._opts["data"] == "":
            self._base = None
        self._changed()

    def _grid(self, width, height):
        if width * height > _MAX_PIXELS:
            raise TclError("the picture is too large to paint by pixels: at most %d pixels" % _MAX_PIXELS)
        if self._pixels is None:
            self._pixels = []
        while len(self._pixels) < height:
            self._pixels.append([])
        for row in self._pixels:
            while len(row) < width:
                row.append("")
        return self._pixels

    def put(self, data, to=None):
        rows = _rows(data)
        if not rows or not rows[0]:
            return
        if to is None:
            box = (0, 0, len(rows[0]), len(rows))
        else:
            box = tuple(int(_style.number(v)) for v in to)
            if len(box) == 2:
                box = (box[0], box[1], box[0] + len(rows[0]), box[1] + len(rows))
        x1, y1, x2, y2 = box
        if x1 < 0 or y1 < 0 or x2 <= x1 or y2 <= y1:
            return
        width, height = self._natural()
        grid = self._grid(max(width, x2), max(height, y2))
        for y in range(y1, y2):
            source = rows[(y - y1) % len(rows)]
            line = grid[y]
            for x in range(x1, x2):
                line[x] = source[(x - x1) % len(source)]
        self._changed()

    def get(self, x, y):
        x = int(x)
        y = int(y)
        width, height = self._natural()
        if not (0 <= x < width and 0 <= y < height):
            raise TclError("%s coordinates out of range" % ("x" if not 0 <= x < width else "y"))
        if self._pixels is not None and y < len(self._pixels) and x < len(self._pixels[y]) and self._pixels[y][x]:
            return _rgb(self._pixels[y][x])
        return (0, 0, 0)

    def transparency_get(self, x, y):
        if self._pixels is not None and y < len(self._pixels) and x < len(self._pixels[y]):
            return self._pixels[y][x] == ""
        return self._base is None

    def transparency_set(self, x, y, boolean):
        if boolean:
            width, height = self._natural()
            grid = self._grid(width, height)
            grid[int(y)][int(x)] = ""
            self._changed()

    def _copy(self, zoom):
        found = PhotoImage()
        found._base = self._base
        found._size = self._size
        found._pixels = None if self._pixels is None else [list(r) for r in self._pixels]
        found._zoom = zoom
        found._changed()
        return found

    def copy(self):
        return self._copy(self._zoom)

    def zoom(self, x, y=""):
        y = x if y == "" else y
        z = self._zoom
        return self._copy((z[0] * int(x), z[1] * int(y), z[2], z[3]))

    def subsample(self, x, y=""):
        y = x if y == "" else y
        z = self._zoom
        return self._copy((z[0], z[1], z[2] * int(x), z[3] * int(y)))

    def write(self, filename, format=None, from_coords=None):
        raise NotImplementedError("PhotoImage.write isn't available in the browser: run the program in IDLE")

    def _image_scene(self):
        width, height = self._natural()
        pixels = None
        if self._pixels is not None:
            # Rows as runs: [colour, count, colour, count…]
            pixels = []
            for row in self._pixels:
                runs = []
                for color in row:
                    if runs and runs[-2] == color:
                        runs[-1] += 1
                    else:
                        runs.extend([color, 1])
                pixels.append(runs)
        base = None
        if self._base is not None:
            base = {"mime": self._base["mime"], "data": self._base["data"]}
        return {
            "id": self._number,
            "width": width,
            "height": height,
            "shownWidth": self.width(),
            "shownHeight": self.height(),
            "base": base,
            "pixels": pixels,
        }


class BitmapImage(Image):
    def __init__(self, name=None, cnf={}, master=None, **kw):
        raise NotImplementedError("BitmapImage isn't available in the browser: use PhotoImage")


def image_of(value):
    """The number of a picture for the page: a PhotoImage or its name; 0 for no picture."""
    if value is None or value == "":
        return 0
    if isinstance(value, Image):
        return value._number
    name = str(value)
    for number, image in app.images.items():
        if image.name == name:
            return number
    raise TclError('image "%s" doesn\'t exist' % name)
