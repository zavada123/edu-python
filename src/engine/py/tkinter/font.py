# Named fonts (tkinter.font): `Font(family="Arial", size=16, weight="bold")`. A widget with a Font changes
# when the program changes the font (`f.configure(size=20)`). The page knows no real sizes of letters, so
# `measure` and `metrics` give close numbers.
from tkinter import _style
from tkinter._core import touch

NORMAL = "normal"
ROMAN = "roman"
BOLD = "bold"
ITALIC = "italic"

_FAMILIES = (
    "Arial",
    "Calibri",
    "Cambria",
    "Comic Sans MS",
    "Consolas",
    "Courier",
    "Courier New",
    "Georgia",
    "Helvetica",
    "Impact",
    "Lucida Console",
    "Segoe UI",
    "Tahoma",
    "Times",
    "Times New Roman",
    "Trebuchet MS",
    "Verdana",
)

# The standard fonts of Tk on Windows.
_STANDARD = {
    "TkDefaultFont": ("Segoe UI", 9),
    "TkTextFont": ("Segoe UI", 9),
    "TkFixedFont": ("Courier New", 10),
    "TkMenuFont": ("Segoe UI", 9),
    "TkHeadingFont": ("Segoe UI", 9),
    "TkCaptionFont": ("Segoe UI", 9),
    "TkSmallCaptionFont": ("Segoe UI", 8),
    "TkIconFont": ("Segoe UI", 9),
    "TkTooltipFont": ("Segoe UI", 9),
}

_counter = [0]

# Width of an average letter and the height of a line, in parts of the size in pixels.
_LETTER = 0.55
_MONO_LETTER = 0.6
_ASCENT = 0.9
_DESCENT = 0.25


def _options_of(font):
    """Options of a font description: "Arial 14 bold", ("Arial", 14, "bold")."""
    parts = _style._font_parts(font)
    family = str(parts[0])
    size = 9
    if family in _STANDARD:
        family, size = _STANDARD[family]
    if len(parts) > 1:
        size = _style._size(parts[1])
    options = {"family": family, "size": size, "weight": NORMAL, "slant": ROMAN, "underline": 0, "overstrike": 0}
    for word in parts[2:]:
        word = str(word).lower()
        if word == "bold":
            options["weight"] = BOLD
        elif word in ("italic", "oblique"):
            options["slant"] = ITALIC
        elif word == "underline":
            options["underline"] = 1
        elif word == "overstrike":
            options["overstrike"] = 1
    return options


class Font:
    """A font with a name: widgets with this font change with it."""

    def __init__(self, root=None, font=None, name=None, exists=False, **options):
        if name is None:
            _counter[0] += 1
            name = "font%d" % _counter[0]
        self.name = str(name)
        known = _style.named_fonts.get(self.name)
        if exists:
            if known is None:
                raise _style.TclError('named font "%s" does not already exist' % self.name)
            self._options = known._options
        else:
            self._options = _options_of(font if font is not None else "TkDefaultFont")
        self._set(options)
        _style.named_fonts[self.name] = self
        touch()

    def _set(self, options):
        for key in options:
            name = key.lstrip("-")
            if name not in ("family", "size", "weight", "slant", "underline", "overstrike"):
                raise _style.TclError('bad option "-%s": must be -family, -size, -weight, -slant, -underline, or -overstrike' % name)
            value = options[key]
            if name == "size":
                value = _style._size(value)
            elif name in ("underline", "overstrike"):
                value = 1 if _style.flag(value) else 0
            elif name == "weight":
                value = _style.one_of("weight", str(value), (NORMAL, BOLD))
            elif name == "slant":
                value = _style.one_of("slant", str(value), (ROMAN, ITALIC))
            else:
                value = str(value)
            self._options[name] = value

    def _font_spec(self):
        found = [self._options["family"], self._options["size"]]
        if self._options["weight"] == BOLD:
            found.append("bold")
        if self._options["slant"] == ITALIC:
            found.append("italic")
        if self._options["underline"]:
            found.append("underline")
        if self._options["overstrike"]:
            found.append("overstrike")
        return tuple(found)

    def __str__(self):
        return self.name

    def __repr__(self):
        return "<tkinter.font.Font object %s>" % self.name

    def __eq__(self, other):
        return isinstance(other, Font) and other.name == self.name

    def __hash__(self):
        return hash(self.name)

    def __getitem__(self, key):
        return self.cget(key)

    def __setitem__(self, key, value):
        self.configure(**{key: value})

    def actual(self, option=None, displayof=None):
        if option is not None:
            return self.cget(option)
        return dict(self._options)

    def cget(self, option):
        name = str(option).lstrip("-")
        if name not in self._options:
            raise _style.TclError('bad option "-%s"' % name)
        return self._options[name]

    def configure(self, **options):
        if not options:
            return dict(self._options)
        self._set(options)
        touch()
        return None

    config = configure

    def copy(self):
        return Font(**self._options)

    def _pixels(self):
        size = self._options["size"]
        return -size if size < 0 else (size * 4 + 1) // 3

    def measure(self, text, displayof=None):
        mono = _style._GENERIC.get(self._options["family"].lower()) == "monospace"
        letter = _MONO_LETTER if mono else _LETTER
        if self._options["weight"] == BOLD:
            letter *= 1.1
        return int(len(str(text)) * self._pixels() * letter + 0.5)

    def metrics(self, *options, **kw):
        pixels = self._pixels()
        found = {
            "ascent": int(pixels * _ASCENT + 0.5),
            "descent": int(pixels * _DESCENT + 0.5),
            "linespace": int(pixels * (_ASCENT + _DESCENT) + 0.5),
            "fixed": 1 if _style._GENERIC.get(self._options["family"].lower()) == "monospace" else 0,
        }
        if options:
            if len(options) == 1:
                return found[str(options[0]).lstrip("-")]
            return {str(o).lstrip("-"): found[str(o).lstrip("-")] for o in options}
        return found


def families(root=None, displayof=None):
    return _FAMILIES


def names(root=None):
    for name in _STANDARD:
        nametofont(name)
    return tuple(_style.named_fonts)


def nametofont(name, root=None):
    """The Font with this name; "TkDefaultFont" and other standard fonts too."""
    text = str(name)
    found = _style.named_fonts.get(text)
    if found is not None:
        return found
    if text in _STANDARD:
        return Font(name=text, font=text)
    raise _style.TclError('named font "%s" does not already exist' % text)
