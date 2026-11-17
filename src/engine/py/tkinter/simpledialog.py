# Dialogs that ask for a value: askstring, askinteger, askfloat. The page shows a field; the program (or the
# handler) runs again with the value (`_core.ask`). Cancel gives None, as in Tk.
from tkinter import _core


def _ask(kind, title, prompt, options):
    initial = options.get("initialvalue")
    spec = {
        "kind": "value",
        "number": kind,
        "title": "" if title is None else str(title),
        "message": "" if prompt is None else str(prompt),
        "initial": "" if initial is None else str(initial),
        "secret": options.get("show") not in (None, ""),
        "min": options.get("minvalue"),
        "max": options.get("maxvalue"),
    }
    for key in ("min", "max"):
        if spec[key] is not None:
            spec[key] = float(spec[key])
    return _core.ask(spec)


def askstring(title, prompt, **kw):
    answer = _ask("", title, prompt, kw)
    return answer if isinstance(answer, str) else None


def _number(kind, convert, title, prompt, kw):
    answer = _ask(kind, title, prompt, kw)
    if not isinstance(answer, str):
        return None
    try:
        value = convert(answer.strip())
    except ValueError:
        return None
    low = kw.get("minvalue")
    high = kw.get("maxvalue")
    if (low is not None and value < low) or (high is not None and value > high):
        return None
    return value


def askinteger(title, prompt, **kw):
    return _number("int", int, title, prompt, kw)


def askfloat(title, prompt, **kw):
    return _number("float", float, title, prompt, kw)


class Dialog:
    def __init__(self, parent, title=None):
        raise NotImplementedError("simpledialog.Dialog isn't available in the browser yet: use askstring, askinteger or askfloat")


SimpleDialog = Dialog
