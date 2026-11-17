# Message windows: showinfo, showwarning, showerror and the questions askyesno, askokcancel and others. The
# page shows a message over the window, and the window waits until the student clicks OK; the program does
# not stop at it. A question waits for the answer: the page asks, then the program (or the handler) runs
# again with the answer (`_core.ask`).
import json as _json

import _mriya
from tkinter import _core

ERROR = "error"
INFO = "info"
QUESTION = "question"
WARNING = "warning"

ABORTRETRYIGNORE = "abortretryignore"
OK = "ok"
OKCANCEL = "okcancel"
RETRYCANCEL = "retrycancel"
YESNO = "yesno"
YESNOCANCEL = "yesnocancel"

ABORT = "abort"
RETRY = "retry"
IGNORE = "ignore"
CANCEL = "cancel"
YES = "yes"
NO = "no"


def _show(icon, title, message, options):
    detail = options.get("detail")
    text = "" if message is None else str(message)
    if detail is not None:
        text = text + "\n\n" + str(detail)
    icon = str(options.get("icon", icon))
    if icon not in (ERROR, INFO, WARNING):
        icon = INFO
    _mriya.tk_dialog(_json.dumps({"icon": icon, "title": "" if title is None else str(title), "message": text}))
    return OK


def showinfo(title=None, message=None, **options):
    return _show(INFO, title, message, options)


def showwarning(title=None, message=None, **options):
    return _show(WARNING, title, message, options)


def showerror(title=None, message=None, **options):
    return _show(ERROR, title, message, options)


_BUTTONS = {
    YESNO: (YES, NO),
    OKCANCEL: (OK, CANCEL),
    YESNOCANCEL: (YES, NO, CANCEL),
    RETRYCANCEL: (RETRY, CANCEL),
    ABORTRETRYIGNORE: (ABORT, RETRY, IGNORE),
    OK: (OK,),
}


def _ask(icon, kind, title, message, options):
    detail = options.get("detail")
    text = "" if message is None else str(message)
    if detail is not None:
        text = text + "\n\n" + str(detail)
    kind = str(options.get("type", kind))
    buttons = _BUTTONS.get(kind, (OK,))
    icon = str(options.get("icon", icon))
    answer = _core.ask(
        {
            "kind": "question",
            "icon": icon if icon in (ERROR, INFO, WARNING, QUESTION) else QUESTION,
            "title": "" if title is None else str(title),
            "message": text,
            "buttons": list(buttons),
            "default": str(options.get("default", buttons[0])),
        }
    )
    # The last button (No, Cancel) is the answer of a closed dialog.
    return answer if answer in buttons else buttons[-1]


def askquestion(title=None, message=None, **options):
    return _ask(QUESTION, YESNO, title, message, options)


def askokcancel(title=None, message=None, **options):
    return _ask(QUESTION, OKCANCEL, title, message, options) == OK


def askyesno(title=None, message=None, **options):
    return _ask(QUESTION, YESNO, title, message, options) == YES


def askyesnocancel(title=None, message=None, **options):
    answer = _ask(QUESTION, YESNOCANCEL, title, message, options)
    return None if answer == CANCEL else answer == YES


def askretrycancel(title=None, message=None, **options):
    return _ask(WARNING, RETRYCANCEL, title, message, options) == RETRY


class Message:
    def __init__(self, master=None, **options):
        self.options = options

    def show(self, **options):
        merged = dict(self.options)
        merged.update(options)
        return _show(merged.pop("icon", INFO), merged.pop("title", None), merged.pop("message", None), merged)
