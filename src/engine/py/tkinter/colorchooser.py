# askcolor: the page shows a colour picker; the program (or the handler) runs again with the colour.
from tkinter import _core, _style
from tkinter._images import _rgb


def askcolor(color=None, **options):
    initial = _style.color(color) if color else "#000000"
    if not (initial.startswith("#") and len(initial) == 7):
        initial = "#%02x%02x%02x" % _rgb(initial)
    answer = _core.ask({"kind": "color", "title": str(options.get("title", "")), "initial": initial})
    if not isinstance(answer, str) or len(answer) != 7 or not answer.startswith("#"):
        return (None, None)
    try:
        rgb = (int(answer[1:3], 16), int(answer[3:5], 16), int(answer[5:7], 16))
    except ValueError:
        return (None, None)
    return (rgb, answer.lower())


class Chooser:
    def __init__(self, master=None, **options):
        self.options = options

    def show(self, **options):
        merged = dict(self.options)
        merged.update(options)
        return askcolor(merged.pop("initialcolor", None), **merged)
