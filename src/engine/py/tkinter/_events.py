# Events of the browser tkinter: event sequences ("<Button-1>", "<KeyPress>", "<Return>"), bindings and the
# `Event` object that a handler gets.
from tkinter._style import TclError

_TYPES = {
    "Button": "ButtonPress",
    "ButtonPress": "ButtonPress",
    "ButtonRelease": "ButtonRelease",
    "Key": "KeyPress",
    "KeyPress": "KeyPress",
    "KeyRelease": "KeyRelease",
    "Motion": "Motion",
    "Enter": "Enter",
    "Leave": "Leave",
    "MouseWheel": "MouseWheel",
    "FocusIn": "FocusIn",
    "FocusOut": "FocusOut",
    "Configure": "Configure",
    "Expose": "Expose",
    "Destroy": "Destroy",
    "Map": "Map",
    "Unmap": "Unmap",
    "Visibility": "Visibility",
    "Activate": "Activate",
    "Deactivate": "Deactivate",
}

_MODIFIERS = {
    "Control": "Control",
    "Shift": "Shift",
    "Alt": "Alt",
    "Meta": "Alt",
    "Mod1": "Alt",
    "Option": "Alt",
    "Command": "Control",
    "Lock": "Lock",
    "B1": "B1",
    "B2": "B2",
    "B3": "B3",
    "Button1": "B1",
    "Button2": "B2",
    "Button3": "B3",
}

_COUNTS = {"Double": 2, "Triple": 3, "Quadruple": 4}

# Keysyms of keys that are not one character. Keys with one character have the character as keysym.
_KEYSYMS = set(
    (
        "Return Escape space Tab BackSpace Delete Insert Home End Prior Next Left Right Up Down "
        "Shift_L Shift_R Control_L Control_R Alt_L Alt_R Caps_Lock Num_Lock Scroll_Lock Pause Print Menu "
        "F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12 KP_Enter Win_L Win_R App "
        "comma period minus plus equal slash backslash semicolon apostrophe quotedbl exclam question "
        "asterisk numbersign dollar percent ampersand parenleft parenright bracketleft bracketright "
        "braceleft braceright colon less greater underscore at asciicircum asciitilde grave bar"
    ).split()
)

# The same names as `keysym` of the page (tk-input.ts).
CHAR_KEYSYMS = {
    " ": "space",
    ",": "comma",
    ".": "period",
    "-": "minus",
    "+": "plus",
    "=": "equal",
    "/": "slash",
    "\\": "backslash",
    ";": "semicolon",
    "'": "apostrophe",
    '"': "quotedbl",
    "!": "exclam",
    "?": "question",
    "*": "asterisk",
    "#": "numbersign",
    "$": "dollar",
    "%": "percent",
    "&": "ampersand",
    "(": "parenleft",
    ")": "parenright",
    "[": "bracketleft",
    "]": "bracketright",
    "{": "braceleft",
    "}": "braceright",
    ":": "colon",
    "<": "less",
    ">": "greater",
    "_": "underscore",
    "@": "at",
    "^": "asciicircum",
    "~": "asciitilde",
    "`": "grave",
    "|": "bar",
}

# Kinds of events that the page sends (tk-input.ts): it sends only events that something waits for.
_PAGE_KINDS = {
    "ButtonPress": "Press",
    "ButtonRelease": "Release",
    "Motion": "Motion",
    "Enter": "Enter",
    "Leave": "Leave",
    "MouseWheel": "Wheel",
    "KeyPress": "Key",
    "KeyRelease": "KeyRelease",
}

_STATE_BITS = {"Shift": 1, "Lock": 2, "Control": 4, "Alt": 0x20000, "B1": 256, "B2": 512, "B3": 1024}


def _bad(sequence):
    return TclError('bad event type or keysym "%s"' % sequence)


def _known_keysym(name):
    return len(name) == 1 or name in _KEYSYMS or name.startswith("Cyrillic_")


def _detail(kind, part, sequence):
    # The last part of "<Button-1>" or "<KeyPress-a>": a button number or a keysym.
    if kind in (None, "ButtonPress", "ButtonRelease") and part in ("1", "2", "3", "4", "5"):
        return kind or "ButtonPress", part
    kind = kind or "KeyPress"
    if kind not in ("KeyPress", "KeyRelease") or not _known_keysym(part):
        raise _bad(sequence)
    return kind, part


def parse(sequence):
    """(type, detail, modifiers, count) of an event sequence. A wrong sequence raises TclError."""
    text = str(sequence)
    if text.startswith("<<") and text.endswith(">>") and len(text) > 4:
        return ("Virtual", text[2:-2], (), 1)
    if not (text.startswith("<") and text.endswith(">")):
        # bind("a", ...) waits for the key "a".
        if len(text) == 1:
            return ("KeyPress", CHAR_KEYSYMS.get(text, text), (), 1)
        raise _bad(text)
    parts = text[1:-1].split("-")
    kind = None
    detail = None
    modifiers = []
    count = 1
    last = len(parts) - 1
    for i in range(len(parts)):
        part = parts[i]
        if part == "":
            raise _bad(text)
        if kind is None and i < last and part in _MODIFIERS:
            modifiers.append(_MODIFIERS[part])
        elif kind is None and i < last and part in _COUNTS:
            count = _COUNTS[part]
        elif kind is None and part in _TYPES:
            kind = _TYPES[part]
        elif i == last:
            kind, detail = _detail(kind, part, text)
        else:
            raise _bad(part)
    if kind is None:
        raise _bad(text)
    return (kind, detail, tuple(modifiers), count)


def _matches(pattern, event):
    kind, detail, modifiers, count = pattern
    if kind != event.type:
        return False
    if detail is not None and detail != event._detail:
        return False
    if count > event._count:
        return False
    for modifier in modifiers:
        if modifier not in event._modifiers:
            return False
    return True


def _score(pattern):
    # Tk calls the most exact binding: "<Double-1>" before "<1>", "<KeyPress-a>" before "<KeyPress>".
    return (pattern[3], 0 if pattern[1] is None else 1, len(pattern[2]))


class Bindings:
    """Event handlers of one widget (or of a class, of all widgets, of a canvas tag)."""

    def __init__(self):
        self.items = []  # [sequence, pattern, [functions]]

    def bind(self, sequence, func, add):
        pattern = parse(sequence)
        for item in self.items:
            if item[1] == pattern:
                if add:
                    item[2].append(func)
                else:
                    item[2] = [func]
                return
        self.items.append([str(sequence), pattern, [func]])

    def unbind(self, sequence):
        pattern = parse(sequence)
        self.items = [item for item in self.items if item[1] != pattern]

    def sequences(self):
        return tuple(item[0] for item in self.items)

    def best(self, event):
        found = None
        for item in self.items:
            if _matches(item[1], event) and (found is None or _score(item[1]) > _score(found[1])):
                found = item
        return None if found is None else found[2]

    def page_kinds(self):
        kinds = []
        for item in self.items:
            kind = _PAGE_KINDS.get(item[1][0])
            if kind is not None and kind not in kinds:
                kinds.append(kind)
        return kinds


def call(functions, event):
    """Calls the handlers of one binding. "break" stops the next bindings, as in Tk."""
    stop = False
    for func in list(functions):
        if func(event) == "break":
            stop = True
    return stop


class Event:
    """What happened: the handler gets it as the argument `event`."""

    def __init__(self, kind, widget):
        self.type = kind
        self.widget = widget
        self.x = 0
        self.y = 0
        self.x_root = 0
        self.y_root = 0
        self.num = "??"
        self.keysym = "??"
        self.keysym_num = "??"
        self.keycode = "??"
        self.char = "??"
        self.delta = 0
        self.state = 0
        self.width = "??"
        self.height = "??"
        self.time = 0
        self.serial = 0
        self.send_event = False
        self._detail = None
        self._count = 1
        self._modifiers = ()

    def _set_modifiers(self, modifiers):
        self._modifiers = tuple(modifiers)
        state = 0
        for modifier in modifiers:
            state |= _STATE_BITS.get(modifier, 0)
        self.state = state

    def __repr__(self):
        shown = []
        if self.type in ("KeyPress", "KeyRelease"):
            shown.append("keysym=%s" % self.keysym)
            if self.char not in ("", "??"):
                shown.append("char=%r" % self.char)
        if self.type in ("ButtonPress", "ButtonRelease"):
            shown.append("num=%s" % self.num)
        if self.type == "MouseWheel":
            shown.append("delta=%s" % self.delta)
        if self.type in ("ButtonPress", "ButtonRelease", "Motion", "Enter", "Leave", "MouseWheel"):
            shown.append("x=%s y=%s" % (self.x, self.y))
        return "<%s event %s>" % (self.type, " ".join(shown))
