# Values of widget options for the page: colours and fonts as CSS, checks of option values. Wrong values
# raise TclError with the same text as Tk, so the student sees the same error as in IDLE.


class TclError(Exception):
    pass


# CSS colour names. Tk knows the same names (and more X11 names, see `_X11`), in any letter case and with
# spaces: "Light Green" is "lightgreen".
_CSS = set(
    (
        "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown "
        "burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan "
        "darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid "
        "darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet "
        "deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro "
        "ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki "
        "lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow "
        "lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray "
        "lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine "
        "mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise "
        "mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab "
        "orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru "
        "pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown "
        "seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan "
        "teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen"
    ).split()
)

# X11 names of Tk that CSS does not have.
_X11 = {
    "navyblue": "#000080",
    "lightgoldenrod": "#eedd82",
    "violetred": "#d02090",
    "lightslateblue": "#8470ff",
    "darkslategrey": "#2f4f4f",
    "systembuttonface": "#f0f0f0",
    "systemwindow": "#ffffff",
    "systemwindowtext": "#000000",
    "systembuttontext": "#000000",
    "systemhighlight": "#0078d7",
    "systemhighlighttext": "#ffffff",
    "systemdisabledtext": "#6d6d6d",
    "systemscrollbar": "#c8c8c8",
    "systemwindowframe": "#646464",
    "systemmenu": "#f0f0f0",
    "systemmenutext": "#000000",
}

_HEX = "0123456789abcdefABCDEF"


def _hex(text):
    digits = text[1:]
    if len(digits) not in (3, 6, 9, 12) or any(c not in _HEX for c in digits):
        return None
    step = len(digits) // 3
    if step == 1:
        return "#" + digits
    # #RRRGGGBBB and #RRRRGGGGBBBB: the first two digits of each channel.
    return "#" + digits[0:2] + digits[step : step + 2] + digits[2 * step : 2 * step + 2]


def _gray(name):
    for prefix in ("gray", "grey"):
        if name.startswith(prefix) and name[len(prefix) :].isdigit():
            level = int(name[len(prefix) :])
            if level <= 100:
                value = int(level * 255 / 100 + 0.5)
                return "rgb(%d,%d,%d)" % (value, value, value)
    return None


def color(value):
    """CSS colour of a Tk colour; "" (no colour) for an empty value. A wrong name raises TclError."""
    if value is None:
        return ""
    text = str(value).strip()
    if text == "":
        return ""
    if text.startswith("#"):
        found = _hex(text)
        if found is None:
            raise TclError('invalid color name "%s"' % text)
        return found
    name = text.lower().replace(" ", "")
    if name in _CSS:
        return name
    if name in _X11:
        return _X11[name]
    gray = _gray(name)
    if gray is not None:
        return gray
    # "red3", "SeaGreen2": X11 shades of a colour. The page shows the base colour.
    if name[-1:] in "1234" and name[:-1] in _CSS:
        return name[:-1]
    if name.startswith("system"):
        return "#f0f0f0"
    raise TclError('unknown color name "%s"' % text)


_FAMILIES = {
    "tkdefaultfont": ("Segoe UI", 9),
    "tktextfont": ("Segoe UI", 9),
    "tkfixedfont": ("Courier New", 10),
    "tkheadingfont": ("Segoe UI", 9),
    "tkcaptionfont": ("Segoe UI", 9),
    "tkmenufont": ("Segoe UI", 9),
}

_GENERIC = {
    "courier": "monospace",
    "courier new": "monospace",
    "consolas": "monospace",
    "times": "serif",
    "times new roman": "serif",
    "georgia": "serif",
}


def _font_words(text):
    # "Arial 14 bold", "Arial, 20", "{Times New Roman} 12 italic"
    words = []
    rest = text.replace(",", " ").strip()
    while rest != "":
        if rest.startswith("{"):
            end = rest.find("}")
            if end == -1:
                raise TclError('unmatched open brace in list')
            words.append(rest[1:end])
            rest = rest[end + 1 :].strip()
            continue
        space = rest.find(" ")
        if space == -1:
            words.append(rest)
            break
        words.append(rest[:space])
        rest = rest[space + 1 :].strip()
    return words


def _font_parts(font):
    if font is None or font == "":
        return ["TkDefaultFont"]
    if isinstance(font, str):
        return _font_words(font)
    if isinstance(font, (tuple, list)):
        parts = []
        for part in font:
            if isinstance(part, str) and len(parts) >= 2:
                parts.extend(part.split())
            else:
                parts.append(part)
        return parts
    raise TclError('expected font but got "%s"' % (font,))


def _size(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        try:
            return int(float(value))
        except (TypeError, ValueError):
            raise TclError('expected integer but got "%s"' % (value,))


# Named fonts of `tkinter.font` (Font objects) by name: a widget with such a font changes with the font.
named_fonts = {}


def _named(value):
    if hasattr(value, "_font_spec"):
        return value._font_spec()
    if isinstance(value, str):
        found = named_fonts.get(value) or named_fonts.get(value.lower())
        if found is not None:
            return found._font_spec()
    return None


def font(value):
    """(CSS `font`, underline) of a Tk font: "Arial 14", ("Arial", 14, "bold"), "Arial, 20", a Font."""
    spec = _named(value)
    if spec is not None:
        value = spec
    parts = _font_parts(value)
    family = str(parts[0])
    size = None
    if family.lower() in _FAMILIES:
        family, size = _FAMILIES[family.lower()]
    if len(parts) > 1:
        size = _size(parts[1])
    if size is None:
        size = 9
    weight = "normal"
    slant = "normal"
    underline = False
    for style in parts[2:]:
        style = str(style).lower()
        if style == "bold":
            weight = "bold"
        elif style in ("italic", "oblique"):
            slant = "italic"
        elif style == "underline":
            underline = True
        elif style not in ("normal", "roman", "overstrike"):
            raise TclError('unknown font style "%s"' % style)
    # A positive size is in points, a negative one in pixels.
    pixels = -size if size < 0 else (size * 4 + 1) // 3
    pixels = max(1, pixels)
    generic = _GENERIC.get(family.lower(), "sans-serif")
    css = '%s %s %dpx/1.2 "%s", %s' % (slant, weight, pixels, family.replace('"', ""), generic)
    return css, underline


def one_of(option, value, allowed):
    text = str(value)
    if text not in allowed:
        names = list(allowed)
        listed = ", ".join(names[:-1]) + ", or " + names[-1]
        raise TclError('bad %s "%s": must be %s' % (option, text, listed))
    return text


def number(value):
    """A size or a coordinate: 10, 2.5, "10"."""
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        found = value
    else:
        try:
            found = float(str(value).strip())
        except ValueError:
            raise TclError('bad screen distance "%s"' % (value,))
    # NaN and infinity cannot go to the page (JSON).
    if found != found or found in (float("inf"), float("-inf")):
        raise TclError('bad screen distance "%s"' % (value,))
    return found


def integer(value):
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    try:
        return int(str(value).strip())
    except ValueError:
        raise TclError('expected integer but got "%s"' % (value,))


def flag(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    text = str(value).strip().lower()
    if text in ("1", "true", "yes", "on"):
        return True
    if text in ("0", "false", "no", "off", ""):
        return False
    raise TclError('expected boolean value but got "%s"' % (value,))


def pads(value):
    """padx/pady of pack and grid: 10 or (5, 20)."""
    if isinstance(value, (tuple, list)):
        if len(value) != 2:
            raise TclError('bad pad value "%s": must be positive screen distance' % (value,))
        return [number(value[0]), number(value[1])]
    if isinstance(value, str) and " " in value.strip():
        parts = value.split()
        return [number(parts[0]), number(parts[1])]
    pad = number(value)
    return [pad, pad]


def tcl_text(value):
    """The text form of a value, as Tcl keeps it: True is "1"."""
    if value is True:
        return "1"
    if value is False:
        return "0"
    return str(value)


# Tk cursor names and the CSS cursors that look like them.
_CURSORS = {
    "arrow": "default",
    "left_ptr": "default",
    "top_left_arrow": "default",
    "hand1": "pointer",
    "hand2": "pointer",
    "heart": "pointer",
    "xterm": "text",
    "ibeam": "text",
    "watch": "wait",
    "clock": "wait",
    "cross": "crosshair",
    "crosshair": "crosshair",
    "tcross": "crosshair",
    "plus": "cell",
    "pencil": "crosshair",
    "spraycan": "crosshair",
    "target": "crosshair",
    "dotbox": "crosshair",
    "fleur": "move",
    "size": "move",
    "circle": "not-allowed",
    "x_cursor": "not-allowed",
    "pirate": "not-allowed",
    "no": "not-allowed",
    "question_arrow": "help",
    "sb_h_double_arrow": "ew-resize",
    "size_we": "ew-resize",
    "sb_v_double_arrow": "ns-resize",
    "size_ns": "ns-resize",
    "size_nw_se": "nwse-resize",
    "size_ne_sw": "nesw-resize",
    "bottom_right_corner": "nwse-resize",
    "top_left_corner": "nwse-resize",
    "bottom_left_corner": "nesw-resize",
    "top_right_corner": "nesw-resize",
    "sizing": "nwse-resize",
    "exchange": "move",
    "dot": "default",
    "icon": "default",
    "man": "default",
    "mouse": "default",
    "star": "default",
    "trek": "default",
    "gumby": "default",
    "spider": "default",
    "boat": "default",
    "coffee_mug": "default",
}


def cursor(value):
    """CSS cursor of a Tk cursor name ("hand2", "watch"…); "" when the widget has none."""
    text = str(value or "").strip().lower()
    if text == "":
        return ""
    return _CURSORS.get(text.split()[0], "default")
