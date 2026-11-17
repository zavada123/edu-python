# User actions from the page (tk-input.ts): prelude.py calls `dispatch` with one action as JSON. The action
# calls the handlers of the program; then the page gets the new state of the windows.
import json

import _mriya
from tkinter import _core
from tkinter._core import app
from tkinter._events import Event

_MOUSE_TYPES = {"Press": "ButtonPress", "Release": "ButtonRelease", "Motion": "Motion", "Enter": "Enter", "Leave": "Leave", "Wheel": "MouseWheel"}


def _layout(boxes):
    for box in boxes:
        widget = app.by_id.get(box[0])
        if widget is not None:
            widget._box = box[1:]


def _mouse(data, widget):
    kind = _MOUSE_TYPES[data["kind"]]
    event = Event(kind, widget)
    event.x = int(data["x"])
    event.y = int(data["y"])
    event.x_root = int(data["rootX"])
    event.y_root = int(data["rootY"])
    modifiers = list(data["modifiers"])
    buttons = int(data["buttons"])
    for bit, name in ((1, "B1"), (4, "B2"), (2, "B3")):
        if buttons & bit:
            modifiers.append(name)
    event._set_modifiers(modifiers)
    if kind in ("ButtonPress", "ButtonRelease"):
        event.num = int(data["button"])
        event._detail = str(event.num)
        event._count = max(1, int(data["count"]))
    if kind == "MouseWheel":
        event.delta = int(data["delta"])
    app.pointer = (event.x_root, event.y_root)
    item = int(data["item"])
    if item != 0 and hasattr(widget, "_fire_item") and widget._fire_item(item, event):
        return
    widget._fire(event)


def _key(data, widget):
    kind = "KeyPress" if data["kind"] == "Press" else "KeyRelease"
    event = Event(kind, widget)
    event.keysym = str(data["keysym"])
    event.char = str(data["char"])
    event.keycode = int(data["keycode"])
    event._detail = event.keysym
    event._set_modifiers(data["modifiers"])
    widget._fire(event)


def _handle(data):
    tag = data["_tag"]
    if tag == "Timer":
        number = int(data["timer"])
        timer = app.timers.get(number)
        if timer is not None:
            # Removed after the handler: a handler that asks (`_Ask`) runs again with the answer.
            timer[0](*timer[1])
            app.timers.pop(number, None)
        return
    if tag == "Clipboard":
        app.clipboard = str(data["text"])
        return
    widget = app.by_id.get(int(data["widget"]))
    if widget is None or not widget._alive:
        return
    if tag == "Mouse":
        _mouse(data, widget)
    elif tag == "Key":
        _key(data, widget)
    elif tag == "Shown":
        widget._shown()
    elif tag == "Invoke" and hasattr(widget, "_invoke"):
        widget._invoke()
    elif tag == "Edit" and hasattr(widget, "_edit"):
        widget._edit(data["text"])
    elif tag == "Close" and hasattr(widget, "_close_request"):
        widget._close_request()
    elif tag == "Selection" and hasattr(widget, "_select_text"):
        widget._select_text(int(data["start"]), int(data["end"]), int(data["caret"]))
    elif tag == "Pick" and hasattr(widget, "_pick"):
        widget._pick([int(i) for i in data["items"]])
    elif tag == "Spin" and hasattr(widget, "_spin"):
        widget._spin(1 if data["up"] else -1)
    elif tag == "MenuItem" and hasattr(widget, "_menu_item"):
        widget._menu_item(int(data["index"]))


def dispatch(text):
    data = json.loads(text)
    _core.new_answers()
    try:
        _layout(data["layout"])
        _handle(data["input"])
    except SystemExit:
        _core.close()
    except _core._Ask as question:
        # The page shows the dialog and sends this action again with the answer.
        _mriya.tk_ask(json.dumps(question.spec))
    finally:
        _core.flush()
