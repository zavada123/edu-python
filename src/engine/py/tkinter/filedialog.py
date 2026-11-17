# Dialogs for files: open and save. The program works with files in its own folder in the browser. "Open"
# shows these files and takes a file from the computer of the student; "Save" gives a name, and after the
# handler the page offers to download the saved file. The program (or the handler) runs again with the
# answer (`_core.ask`).
import os

from tkinter import _core
from tkinter._core import app

# Most files that the dialog lists.
_MAX_FILES = 200


def _files():
    found = []
    for name in sorted(os.listdir("/")):
        try:
            if os.stat("/" + name)[0] & 0x4000:
                continue
        except OSError:
            continue
        found.append(name)
    return found[:_MAX_FILES]


def _filetypes(value):
    found = []
    for item in value or ():
        if isinstance(item, (tuple, list)) and len(item) == 2:
            label, patterns = item
            if isinstance(patterns, (tuple, list)):
                patterns = " ".join(str(p) for p in patterns)
            found.append([str(label), str(patterns)])
    return found


def _base(name):
    text = str(name).replace("\\", "/")
    return text.split("/")[-1]


def _ask(kind, options, multiple=False):
    spec = {
        "kind": kind,
        "title": str(options.get("title", "")),
        "files": _files(),
        "filetypes": _filetypes(options.get("filetypes")),
        "initial": _base(options.get("initialfile", "") or ""),
        "extension": str(options.get("defaultextension", "") or ""),
        "multiple": multiple,
    }
    return _core.ask(spec)


def _path(name):
    return "/" + _base(name)


def askopenfilename(**options):
    answer = _ask("open", options)
    return _path(answer) if isinstance(answer, str) and answer != "" else ""


def askopenfilenames(**options):
    answer = _ask("open", options, True)
    if not isinstance(answer, list):
        return ()
    return tuple(_path(name) for name in answer if isinstance(name, str) and name != "")


def _with_extension(name, extension):
    if extension and "." not in _base(name):
        return name + (extension if extension.startswith(".") else "." + extension)
    return name


def asksaveasfilename(**options):
    answer = _ask("save", options)
    if not isinstance(answer, str) or answer == "":
        return ""
    path = _path(_with_extension(answer, str(options.get("defaultextension", "") or "")))
    app.downloads.append((path, None))
    return path


def askopenfile(mode="r", **options):
    path = askopenfilename(**options)
    return open(path, mode) if path else None


def askopenfiles(mode="r", **options):
    return [open(path, mode) for path in askopenfilenames(**options)]


def asksaveasfile(mode="w", **options):
    path = asksaveasfilename(**options)
    if not path:
        return None
    handle = open(path, mode)
    app.downloads[-1] = (path, handle)
    return handle


def askdirectory(**options):
    # The program has one folder in the browser.
    return "/"


class Open:
    def __init__(self, master=None, **options):
        self.options = options

    def show(self, **options):
        merged = dict(self.options)
        merged.update(options)
        return askopenfilename(**merged)


class SaveAs(Open):
    def show(self, **options):
        merged = dict(self.options)
        merged.update(options)
        return asksaveasfilename(**merged)
