# Runs once after the engine loads (engine.ts). `_mriya` is the JS module of the engine.
# `_mriya_run` and `_mriya_event` return the traceback text of an uncaught exception, or an empty string.
import builtins
import io
import random
import sys

import _mriya


class _NeedInput(BaseException):
    # BaseException: `except Exception` in student code does not catch it.
    pass


def _tkinter():
    return sys.modules.get("tkinter")


def _input(prompt=""):
    tk = _tkinter()
    if tk is not None and tk._app.waiting:
        # A handler of a window cannot stop for a replay (protocol.ts): the values come from Entry.
        raise RuntimeError("input() doesn't work in a window program after mainloop(): use Entry")
    value = _mriya.next_input(str(prompt))
    if value is None:
        raise _NeedInput()
    return value


builtins.input = _input


def _traceback(error):
    text = io.StringIO()
    sys.print_exception(error, text)
    return text.getvalue()


def _mriya_run(source, seed):
    random.seed(seed)
    # A new run gets a new turtle and new windows: modules of the previous run are not kept.
    for name in list(sys.modules):
        if name in ("turtle", "tkinter") or name.startswith("tkinter."):
            sys.modules.pop(name)
    scope = {"__name__": "__main__"}
    try:
        exec(compile(source, "main.py", "exec"), scope)
        return ""
    except _NeedInput:
        # The engine knows about it: `next_input` returned None.
        return ""
    except SystemExit:
        return ""
    except BaseException as error:
        tk = _tkinter()
        if tk is not None and isinstance(error, tk._MainLoop):
            # `mainloop()`: the windows wait for the user (`_mriya_waiting`).
            return ""
        return _traceback(error)


def _mriya_event(source):
    # One user action in a window (tk-input.ts). The scope of the program is kept by its functions.
    tk = _tkinter()
    if tk is None:
        return ""
    try:
        tk._dispatch(source)
        return ""
    except BaseException as error:
        return _traceback(error)


def _mriya_waiting():
    tk = _tkinter()
    return tk is not None and tk._app.waiting and not tk._app.closed
