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

_print = builtins.print


def _value_kind(value):
    # The console colors strings, numbers and True / False / None as the editor does (protocol.ts, `ValueKinds`): `print("10", 10)` shows
    # a string and a number in different colors. bool is an int, so it goes first.
    if value is None or isinstance(value, bool):
        return "constant"
    if isinstance(value, (int, float)):
        return "number"
    if isinstance(value, str):
        return "string"
    return ""


def _text_arg(name, value, default):
    if value is None:
        return default
    if not isinstance(value, str):
        raise TypeError("%s must be None or a string, not %s" % (name, type(value).__name__))
    return value


def _typed_print(*values, sep=" ", end="\n", file=None, flush=False):
    # `flush`: the output goes to the page at once anyway.
    if file is not None and file is not sys.stdout:
        _print(*values, sep=sep, end=end, file=file)
        return
    sep = _text_arg("sep", sep, " ")
    end = _text_arg("end", end, "\n")
    out = sys.stdout
    for i, value in enumerate(values):
        if i > 0:
            out.write(sep)
        shown = str(value)
        kind = _value_kind(value)
        if kind:
            _mriya.value(kind, shown)
        else:
            out.write(shown)
    out.write(end)


builtins.print = _typed_print


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
