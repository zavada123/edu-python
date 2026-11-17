# The Text widget: a field for many lines, with tags (colours and fonts of parts of the text), marks, the
# selection, search, undo and the clipboard. Places are "line.column": "1.0" is the start, END is the end.
# The page draws the coloured parts over the field (tk-text.tsx) and sends the new text (Edit) and the
# selection (Selection) of the student.
from tkinter import _style
from tkinter._core import BASE_OPTIONS, TclError, app, touch
from tkinter._events import Event
from tkinter._fields import Linked
from tkinter._widgets import Widget

_TEXT_OPTIONS = dict(BASE_OPTIONS)
_TEXT_OPTIONS.update(
    {
        "autoseparators": 1,
        "background": "SystemWindow",
        "blockcursor": 0,
        "borderwidth": 1,
        "endline": "",
        "exportselection": 1,
        "font": "TkFixedFont",
        "foreground": "SystemWindowText",
        "height": 24,
        "inactiveselectbackground": "SystemButtonFace",
        "insertbackground": "SystemWindowText",
        "insertborderwidth": 0,
        "insertofftime": 300,
        "insertontime": 600,
        "insertunfocussed": "none",
        "insertwidth": 2,
        "maxundo": 0,
        "padx": 1,
        "pady": 1,
        "relief": "sunken",
        "selectbackground": "SystemHighlight",
        "selectborderwidth": 0,
        "selectforeground": "SystemHighlightText",
        "setgrid": 0,
        "spacing1": 0,
        "spacing2": 0,
        "spacing3": 0,
        "startline": "",
        "state": "normal",
        "tabs": "",
        "tabstyle": "tabular",
        "undo": 0,
        "width": 80,
        "wrap": "char",
        "xscrollcommand": "",
        "yscrollcommand": "",
    }
)

# Options of a tag. The page shows foreground, background, font, underline and overstrike.
_TAG_OPTIONS = (
    "background foreground font underline overstrike justify relief borderwidth lmargin1 lmargin2 rmargin "
    "spacing1 spacing2 spacing3 offset elide wrap selectbackground selectforeground tabs bgstipple fgstipple"
).split()
_TAG_COLORS = ("background", "foreground", "selectbackground", "selectforeground")

SEL = "sel"
# Names of the virtual events that the Text does itself (event_generate).
_ACTIONS = ("Cut", "Copy", "Paste", "Clear", "SelectAll", "Undo", "Redo")


def _shift(position, start, removed, added, stays):
    """A place in the text after `removed` characters at `start` became `added` characters."""
    if position < start or (position == start and stays):
        return position
    if position < start + removed:
        return start + added if not stays else start
    return position - removed + added


class _Tag:
    def __init__(self):
        self.opts = {}
        self.ranges = []  # [start, end] in characters, sorted, not empty, not touching
        self.binds = None

    def add(self, start, end):
        if end <= start:
            return
        found = []
        for a, b in sorted(self.ranges + [[start, end]]):
            if found and a <= found[-1][1]:
                found[-1][1] = max(found[-1][1], b)
            else:
                found.append([a, b])
        self.ranges = found

    def remove(self, start, end):
        found = []
        for a, b in self.ranges:
            if b <= start or a >= end:
                found.append([a, b])
                continue
            if a < start:
                found.append([a, start])
            if b > end:
                found.append([end, b])
        self.ranges = found


class Text(Widget):
    """A field for many lines of text. Places are "line.column": "1.0" is the start, END is the end."""

    _kind = "Text"
    _class = "Text"
    _defaults = _TEXT_OPTIONS
    _states = ("disabled", "normal")

    def _init(self):
        self._value = ""
        self._tags = {SEL: _Tag()}
        self._tag_order = [SEL]
        self._marks = {"insert": 0, "current": 0}
        self._gravity = {"insert": "right", "current": "right"}
        self._sel_rev = 0
        self._modified = False
        self._undo = []
        self._redo = []
        self.yview = Linked(self, Text._yview)
        self.xview = Linked(self, Text._yview)

    # ── places ──

    def _offset(self, index):
        text = self._value
        name = str(index) if not isinstance(index, float) else "%.1f" % index
        shift = 0
        for sign in ("+", "-"):
            at = name.find(sign, 1)
            if at > 0:
                change = name[at + 1 :].strip()
                for unit in ("chars", "char", "c"):
                    if change.endswith(unit):
                        change = change[: -len(unit)].strip()
                        break
                if not change.isdigit():
                    raise TclError('bad text index "%s"' % name)
                shift = int(change) if sign == "+" else -int(change)
                name = name[:at].strip()
        base = self._base(name, text)
        return max(0, min(base + shift, len(text) + 1))

    def _base(self, name, text):
        if name == "end":
            return len(text) + 1
        if name in ("sel.first", "sel.last"):
            ranges = self._tags[SEL].ranges
            if not ranges:
                raise TclError('text doesn\'t contain any characters tagged with "sel"')
            return ranges[0][0] if name == "sel.first" else ranges[-1][1]
        if name.endswith(".first") or name.endswith(".last"):
            tag = self._tags.get(name.rsplit(".", 1)[0])
            if tag is not None and tag.ranges:
                return tag.ranges[0][0] if name.endswith(".first") else tag.ranges[-1][1]
        if name in self._marks:
            return min(self._marks[name], len(text))
        if "." in name:
            line_text, column_text = name.split(".", 1)
            if not line_text.isdigit() or not (column_text.isdigit() or column_text == "end"):
                raise TclError('bad text index "%s"' % name)
            lines = text.split("\n")
            line = int(line_text)
            if line < 1:
                return 0
            if line > len(lines):
                return len(text) + 1
            start = sum(len(lines[i]) + 1 for i in range(line - 1))
            length = len(lines[line - 1])
            column = length if column_text == "end" else min(int(column_text), length)
            return start + column
        raise TclError('bad text index "%s"' % name)

    def _place(self, offset):
        before = (self._value + "\n")[:offset]
        line = before.count("\n") + 1
        column = len(before) - (before.rfind("\n") + 1)
        return "%d.%d" % (line, column)

    def index(self, index):
        return self._place(self._offset(index))

    def compare(self, index1, op, index2):
        a = self._offset(index1)
        b = self._offset(index2)
        checks = {"<": a < b, "<=": a <= b, "==": a == b, ">=": a >= b, ">": a > b, "!=": a != b}
        if op not in checks:
            raise TclError('bad comparison operator "%s": must be <, <=, ==, >=, >, or !=' % op)
        return checks[op]

    # ── text ──

    def get(self, index1, index2=None):
        whole = self._value + "\n"
        start = self._offset(index1)
        end = start + 1 if index2 is None else self._offset(index2)
        return whole[start:end] if end > start else ""

    def count(self, index1, index2, *args):
        return (abs(self._offset(index2) - self._offset(index1)),)

    def _editable(self):
        return str(self._opts["state"]) == "normal"

    def _snapshot(self):
        if _style.flag(self._opts["undo"]):
            ranges = {name: [list(r) for r in tag.ranges] for name, tag in self._tags.items()}
            self._undo.append((self._value, ranges))
            self._redo = []

    def _replace(self, start, end, chars, tags=(), source=None):
        """Puts `chars` in place of the text from `start` to `end`: tags and marks move with the text."""
        removed = end - start
        added = len(chars)
        self._value = self._value[:start] + chars + self._value[end:]
        for tag in self._tags.values():
            moved = []
            for a, b in tag.ranges:
                # Text typed at the start or at the end of a tag does not get the tag, as in Tk.
                a2 = _shift(a, start, removed, added, False)
                b2 = _shift(b, start, removed, added, True)
                if b2 > a2:
                    moved.append([a2, b2])
            tag.ranges = moved
        for name in self._marks:
            self._marks[name] = _shift(self._marks[name], start, removed, added, self._gravity.get(name) == "left")
        for name in tags:
            self._tag(name).add(start, start + added)
        if source is None:
            self._rev += 1
        self._set_modified()
        touch()

    def insert(self, index, chars, *args):
        if not self._editable():
            return
        self._snapshot()
        self._insert(min(self._offset(index), len(self._value)), chars, args)

    def _insert(self, at, chars, args):
        # insert(END, "text", "tag", "more text", ("tag1", "tag2")…)
        pieces = [(chars, args[0] if args else ())]
        rest = list(args[1:])
        while rest:
            pieces.append((rest[0], rest[1] if len(rest) > 1 else ()))
            rest = rest[2:]
        for piece, tags in pieces:
            text = _style.tcl_text(piece)
            names = [tags] if isinstance(tags, str) else list(tags)
            names = [n for name in names for n in str(name).split()]
            self._replace(at, at, text, names)
            at += len(text)

    def delete(self, index1, index2=None):
        if not self._editable():
            return
        start = min(self._offset(index1), len(self._value))
        end = start + 1 if index2 is None else self._offset(index2)
        end = min(end, len(self._value))
        if end > start:
            self._snapshot()
            self._replace(start, end, "")

    def replace(self, index1, index2, chars, *args):
        if not self._editable():
            return
        start = min(self._offset(index1), len(self._value))
        end = min(self._offset(index2), len(self._value))
        self._snapshot()
        self._replace(start, max(start, end), "")
        self._insert(start, chars, args)

    def _edit(self, text):
        # The student changed the text: only the changed part is replaced, so the tags stay on the rest.
        new = str(text)
        old = self._value
        if new == old:
            return
        head = 0
        limit = min(len(old), len(new))
        while head < limit and old[head] == new[head]:
            head += 1
        tail = 0
        while tail < limit - head and old[len(old) - 1 - tail] == new[len(new) - 1 - tail]:
            tail += 1
        self._snapshot()
        self._replace(head, len(old) - tail, new[head : len(new) - tail], (), self)

    def _set_modified(self):
        if not self._modified:
            self._modified = True
            self._virtual("Modified")

    def _virtual(self, name):
        event = Event("Virtual", self)
        event._detail = name
        self._fire(event)

    def edit_modified(self, arg=None):
        if arg is None:
            return self._modified
        flag = _style.flag(arg)
        if flag != self._modified:
            self._modified = flag
            self._virtual("Modified")

    def edit_undo(self):
        if not self._undo:
            raise TclError("nothing to undo")
        self._restore(self._undo, self._redo)

    def edit_redo(self):
        if not self._redo:
            raise TclError("nothing to redo")
        self._restore(self._redo, self._undo)

    def _restore(self, source, target):
        ranges = {name: [list(r) for r in tag.ranges] for name, tag in self._tags.items()}
        target.append((self._value, ranges))
        value, saved = source.pop()
        self._value = value
        for name, tag in self._tags.items():
            tag.ranges = saved.get(name, [])
        self._rev += 1
        self._set_modified()
        touch()

    def edit_reset(self):
        self._undo = []
        self._redo = []

    def edit_separator(self):
        pass

    def edit(self, *args):
        if args and args[0] == "undo":
            return self.edit_undo()
        if args and args[0] == "redo":
            return self.edit_redo()
        if args and args[0] == "reset":
            return self.edit_reset()
        if args and args[0] == "modified":
            return self.edit_modified(*args[1:])

    # ── tags ──

    def _tag(self, name):
        name = str(name)
        tag = self._tags.get(name)
        if tag is None:
            tag = _Tag()
            self._tags[name] = tag
            self._tag_order.append(name)
        return tag

    def _pairs(self, index1, args):
        indexes = [index1] + list(args)
        pairs = []
        i = 0
        while i < len(indexes):
            start = min(self._offset(indexes[i]), len(self._value))
            if i + 1 < len(indexes):
                end = min(self._offset(indexes[i + 1]), len(self._value))
            else:
                end = min(start + 1, len(self._value))
            pairs.append((start, end))
            i += 2
        return pairs

    def tag_add(self, tagName, index1, *args):
        tag = self._tag(tagName)
        for start, end in self._pairs(index1, args):
            tag.add(start, end)
        if str(tagName) == SEL:
            self._sel_rev += 1
        touch()

    def tag_remove(self, tagName, index1, index2=None, *args):
        tag = self._tags.get(str(tagName))
        if tag is None:
            return
        rest = ((index2,) if index2 is not None else ()) + args
        for start, end in self._pairs(index1, rest):
            tag.remove(start, end)
        if str(tagName) == SEL:
            self._sel_rev += 1
        touch()

    def tag_configure(self, tagName, cnf=None, **kw):
        tag = self._tag(tagName)
        options = dict(cnf) if isinstance(cnf, dict) else {}
        options.update(kw)
        if isinstance(cnf, str):
            return self.tag_cget(tagName, cnf)
        if not options:
            return {name: tag.opts.get(name, "") for name in _TAG_OPTIONS}
        for key, value in options.items():
            name = str(key).lstrip("-").rstrip("_")
            name = {"bg": "background", "fg": "foreground"}.get(name, name)
            if name not in _TAG_OPTIONS:
                raise TclError('unknown option "-%s"' % name)
            if name in _TAG_COLORS and value != "":
                _style.color(value)
            elif name == "font" and value != "":
                _style.font(value)
            tag.opts[name] = value
        touch()

    tag_config = tag_configure

    def tag_cget(self, tagName, option):
        name = str(option).lstrip("-")
        name = {"bg": "background", "fg": "foreground"}.get(name, name)
        if name not in _TAG_OPTIONS:
            raise TclError('unknown option "-%s"' % name)
        return self._tag(tagName).opts.get(name, "")

    def tag_delete(self, tagName, *tagNames):
        for name in (tagName,) + tagNames:
            name = str(name)
            if name == SEL:
                self._tags[SEL] = _Tag()
                continue
            if name in self._tags:
                del self._tags[name]
                self._tag_order.remove(name)
        touch()

    def tag_names(self, index=None):
        if index is None:
            return tuple(self._tag_order)
        at = self._offset(index)
        return tuple(name for name in self._tag_order if any(a <= at < b for a, b in self._tags[name].ranges))

    def tag_ranges(self, tagName):
        tag = self._tags.get(str(tagName))
        if tag is None:
            return ()
        found = []
        for a, b in tag.ranges:
            found.append(self._place(a))
            found.append(self._place(b))
        return tuple(found)

    def tag_nextrange(self, tagName, index1, index2=None):
        tag = self._tags.get(str(tagName))
        start = self._offset(index1)
        stop = len(self._value) + 1 if index2 is None else self._offset(index2)
        for a, b in tag.ranges if tag is not None else []:
            if a >= start and a < stop or a < start < b:
                return (self._place(max(a, start)), self._place(b))
        return ()

    def tag_prevrange(self, tagName, index1, index2=None):
        tag = self._tags.get(str(tagName))
        start = self._offset(index1)
        stop = 0 if index2 is None else self._offset(index2)
        for a, b in reversed(tag.ranges if tag is not None else []):
            if a < start and b > stop:
                return (self._place(a), self._place(b))
        return ()

    def tag_raise(self, tagName, aboveThis=None):
        name = str(tagName)
        if name in self._tag_order:
            self._tag_order.remove(name)
            self._tag_order.append(name)
            touch()

    def tag_lower(self, tagName, belowThis=None):
        name = str(tagName)
        if name in self._tag_order:
            self._tag_order.remove(name)
            self._tag_order.insert(0, name)
            touch()

    def tag_bind(self, tagName, sequence, func, add=None):
        # Clicks on the parts of the text do not come from the page yet: the binding is kept.
        tag = self._tag(tagName)
        tag.binds = (sequence, func)
        return "%d" % id(func)

    def tag_unbind(self, tagName, sequence, funcid=None):
        self._tag(tagName).binds = None

    # ── marks and selection ──

    def mark_set(self, markName, index):
        name = str(markName)
        self._marks[name] = min(self._offset(index), len(self._value))
        if name == "insert":
            self._sel_rev += 1
        touch()

    def mark_unset(self, *markNames):
        for name in markNames:
            if str(name) not in ("insert", "current"):
                self._marks.pop(str(name), None)

    def mark_names(self):
        return tuple(self._marks)

    def mark_gravity(self, markName, direction=None):
        if direction is None:
            return self._gravity.get(str(markName), "right")
        self._gravity[str(markName)] = _style.one_of("mark gravity", direction, ("left", "right"))

    def mark_next(self, index):
        at = self._offset(index)
        after = sorted((pos, name) for name, pos in self._marks.items() if pos >= at)
        return after[0][1] if after else None

    def mark_previous(self, index):
        at = self._offset(index)
        before = sorted((pos, name) for name, pos in self._marks.items() if pos < at)
        return before[-1][1] if before else None

    def _select_text(self, start, end, caret):
        # The student selected text on the page.
        size = len(self._value)
        start = max(0, min(start, size))
        end = max(start, min(end, size))
        self._tags[SEL].ranges = [[start, end]] if end > start else []
        self._marks["insert"] = max(0, min(caret, size))
        self._marks["current"] = self._marks["insert"]
        self._virtual("Selection")

    def _selected_text(self):
        ranges = self._tags[SEL].ranges
        return self._value[ranges[0][0] : ranges[-1][1]] if ranges else ""

    # ── search and view ──

    def search(self, pattern, index, stopindex=None, forwards=None, backwards=None, exact=None, regexp=None, nocase=None, count=None, elide=None):
        needle = str(pattern)
        if needle == "":
            raise TclError("can't search for an empty pattern")
        text = self._value
        start = min(self._offset(index), len(text))
        hay = text.lower() if nocase else text
        key = needle.lower() if nocase else needle
        found, length = self._find(hay, key, start, bool(backwards), bool(regexp), stopindex)
        if found < 0:
            return ""
        if count is not None:
            count.set(length)
        return self._place(found)

    def _find(self, hay, key, start, backwards, regexp, stopindex):
        stop = None if stopindex is None else self._offset(stopindex)
        if regexp:
            import re

            matches = []
            at = 0
            while at <= len(hay):
                m = re.search(key, hay[at:])
                if m is None:
                    break
                matches.append((at + m.start(0), len(m.group(0))))
                at = at + m.start(0) + max(1, len(m.group(0)))
            order = [m for m in matches if m[0] < start][::-1] + [m for m in matches if m[0] >= start][::-1] if backwards else [m for m in matches if m[0] >= start] + [m for m in matches if m[0] < start]
        else:
            if backwards:
                spot = hay.rfind(key, 0, start)
                if spot < 0 and stop is None:
                    spot = hay.rfind(key, start)
            else:
                spot = hay.find(key, start)
                if spot < 0 and stop is None:
                    spot = hay.find(key, 0, start)
            order = [] if spot < 0 else [(spot, len(key))]
        for spot, length in order:
            if stop is not None and (spot > stop if not backwards else spot < stop):
                continue
            return spot, length
        return -1, 0

    def see(self, index):
        pass

    def _yview(self, *args):
        if not args:
            return (0.0, 1.0)

    def yview_moveto(self, fraction):
        pass

    def yview_scroll(self, number, what):
        pass

    xview_moveto = yview_moveto
    xview_scroll = yview_scroll

    def bbox(self, index):
        return None

    def dlineinfo(self, index):
        return None

    # ── virtual events: <<Copy>>, <<Paste>>… ──

    def event_generate(self, sequence, **kw):
        Widget.event_generate(self, sequence, **kw)
        text = str(sequence)
        if text.startswith("<<") and text.endswith(">>") and text[2:-2] in _ACTIONS:
            getattr(self, "_do_" + text[2:-2].lower())()

    def _do_copy(self):
        chosen = self._selected_text()
        if chosen:
            app.clipboard = chosen

    def _do_cut(self):
        chosen = self._selected_text()
        if chosen and self._editable():
            app.clipboard = chosen
            self.delete("sel.first", "sel.last")

    def _do_paste(self):
        if not self._editable() or app.clipboard == "":
            return
        if self._tags[SEL].ranges:
            self.delete("sel.first", "sel.last")
        self.insert("insert", app.clipboard)

    def _do_clear(self):
        if self._tags[SEL].ranges:
            self.delete("sel.first", "sel.last")

    def _do_selectall(self):
        self.tag_add(SEL, "1.0", "end")

    def _do_undo(self):
        if self._undo:
            self.edit_undo()

    def _do_redo(self):
        if self._redo:
            self.edit_redo()

    # ── page ──

    def _text(self):
        return self._value

    def _styles(self):
        # The parts of the text with the look of their tags: [start, end, colour, background, font, underline, overstrike].
        shown = [name for name in self._tag_order if name != SEL and self._tags[name].ranges and self._tags[name].opts]
        cuts = set()
        for name in shown:
            for a, b in self._tags[name].ranges:
                cuts.add(a)
                cuts.add(b)
        cuts = sorted(cuts)
        parts = []
        for i in range(len(cuts) - 1):
            a, b = cuts[i], cuts[i + 1]
            look = {}
            for name in shown:
                if any(x <= a and b <= y for x, y in self._tags[name].ranges):
                    look.update({k: v for k, v in self._tags[name].opts.items() if v != ""})
            if look:
                parts.append(self._part(a, b, look))
        return parts

    def _part(self, a, b, look):
        font = ""
        if "font" in look:
            font = _style.font(look["font"])[0]
        return [
            a,
            b,
            _style.color(look.get("foreground", "")),
            _style.color(look.get("background", "")),
            font,
            _style.flag(look.get("underline", 0)),
            _style.flag(look.get("overstrike", 0)),
        ]

    def _scene(self):
        scene = Widget._scene(self)
        ranges = self._tags[SEL].ranges
        sel = self._tags[SEL]
        scene["textStyle"] = {
            "parts": self._styles(),
            "selection": [ranges[0][0], ranges[-1][1]] if ranges else [self._marks["insert"], self._marks["insert"]],
            "selectionRev": self._sel_rev,
            "selectionColor": _style.color(sel.opts.get("background", "") or self._opts["selectbackground"]),
        }
        return scene
