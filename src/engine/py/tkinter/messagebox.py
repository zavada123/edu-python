# Message windows: showinfo, showwarning, showerror. The page shows the message over the window, and the
# window waits until the student clicks OK. The program does not stop at the message: the page cannot
# wait inside the program, so the questions (askyesno and others) are not available yet.
import json as _json

import _mriya

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


def _question(name):
    def ask(title=None, message=None, **options):
        raise NotImplementedError("%s isn't available in the browser yet: run the program in IDLE" % name)

    return ask


askquestion = _question("askquestion")
askokcancel = _question("askokcancel")
askyesno = _question("askyesno")
askyesnocancel = _question("askyesnocancel")
askretrycancel = _question("askretrycancel")


class Message:
    def __init__(self, master=None, **options):
        self.options = options

    def show(self, **options):
        merged = dict(self.options)
        merged.update(options)
        return _show(merged.pop("icon", INFO), merged.pop("title", None), merged.pop("message", None), merged)
