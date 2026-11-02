# Tk variables: StringVar, IntVar, DoubleVar, BooleanVar. A widget with `textvariable` or `variable` shows
# the value of the variable; the variable gets the value that the student types or selects on the page.
from tkinter import _core, _style
from tkinter._core import TclError, app, touch


class Variable:
    _default = ""

    def __init__(self, master=None, value=None, name=None):
        if master is None:
            _core.default_root("create variable")
        app.next_var += 1
        self._name = name if name is not None else "PY_VAR%d" % (app.next_var - 1)
        self._value = self._default if value is None else value
        self._traces = []  # [modes, callback, name]
        self._widgets = []

    def __str__(self):
        return self._name

    def __repr__(self):
        return "<tkinter.%s object %s>" % (type(self).__name__, self._name)

    def __eq__(self, other):
        return isinstance(other, Variable) and other._name == self._name

    def __hash__(self):
        return hash(self._name)

    def _store(self, value, source):
        """New value from the program (source None) or from a widget on the page."""
        self._value = value
        for widget in self._widgets:
            if widget is not source:
                widget._rev += 1
        touch()
        self._call("write")

    def _call(self, mode):
        for modes, callback, _ in list(self._traces):
            if mode in modes:
                callback(self._name, "", mode)

    def set(self, value):
        self._store(value, None)

    initialize = set

    def get(self):
        self._call("read")
        return self._value

    def _link(self, widget):
        if widget not in self._widgets:
            self._widgets.append(widget)

    def _unlink(self, widget):
        if widget in self._widgets:
            self._widgets.remove(widget)

    def trace_add(self, mode, callback):
        modes = [mode] if isinstance(mode, str) else list(mode)
        for each in modes:
            _style.one_of("operation", each, ("array", "read", "unset", "write"))
        name = "%d%s" % (id(callback), getattr(callback, "__name__", "lambda"))
        self._traces.append((modes, callback, name))
        return name

    def trace_remove(self, mode, cbname):
        self._traces = [t for t in self._traces if t[2] != cbname]

    def trace_info(self):
        return [(tuple(t[0]), t[2]) for t in self._traces]

    def trace_variable(self, mode, callback):
        names = {"w": "write", "r": "read", "u": "unset"}
        return self.trace_add([names.get(m, m) for m in mode], callback)

    trace = trace_variable

    def trace_vdelete(self, mode, cbname):
        self.trace_remove(mode, cbname)

    def trace_vinfo(self):
        return self.trace_info()


class StringVar(Variable):
    _default = ""

    def get(self):
        value = Variable.get(self)
        return value if isinstance(value, str) else _style.tcl_text(value)


class IntVar(Variable):
    _default = 0

    def get(self):
        value = Variable.get(self)
        if isinstance(value, bool):
            return 1 if value else 0
        if isinstance(value, int):
            return value
        try:
            return int(value)
        except (TypeError, ValueError):
            try:
                return int(float(value))
            except (TypeError, ValueError):
                raise TclError('expected floating-point number but got "%s"' % (value,))


class DoubleVar(Variable):
    _default = 0.0

    def get(self):
        value = Variable.get(self)
        try:
            return float(value)
        except (TypeError, ValueError):
            raise TclError('expected floating-point number but got "%s"' % (value,))


class BooleanVar(Variable):
    _default = False

    def set(self, value):
        self._store(_style.flag(value), None)

    initialize = set

    def get(self):
        return _style.flag(Variable.get(self))
