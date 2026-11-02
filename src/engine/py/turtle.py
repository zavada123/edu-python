# The turtle module for the browser. Same names and geometry as the CPython `turtle` module, for the
# commands of the grade 5 textbook. The module keeps the state (position, heading, pen) and sends drawing
# commands to the page through `_mriya`; the page animates them on a canvas (turtle-canvas.ts).
import math

import _mriya

_colormode = 1.0


def _channel(value):
    if _colormode == 1.0:
        value = value * 255
    return max(0, min(255, int(round(value))))


def _color(args):
    # "red", "light blue", (1, 0.5, 0), or 1, 0.5, 0
    if len(args) == 1:
        value = args[0]
        if isinstance(value, str):
            return value.replace(" ", "")
        args = tuple(value)
    if len(args) == 3:
        return "rgb(%d,%d,%d)" % (_channel(args[0]), _channel(args[1]), _channel(args[2]))
    raise TypeError("bad color arguments: %r" % (args,))


def _font(font):
    # ("Arial", 16, "bold") or "Arial 16"
    if isinstance(font, str):
        font = tuple(font.split())
    family = font[0] if len(font) > 0 else "Arial"
    size = int(font[1]) if len(font) > 1 else 8
    style = font[2] if len(font) > 2 else "normal"
    weight = "bold" if "bold" in style else "normal"
    slant = "italic" if "italic" in style else "normal"
    return "%s %s %dpx %s" % (slant, weight, int(size * 1.35), family)


class Turtle:
    def __init__(self):
        self._x = 0.0
        self._y = 0.0
        self._heading = 0.0
        self._down = True
        self._pen = "black"
        self._fill = "black"
        self._width = 1
        self._visible = True
        self._filling = None
        _mriya.look(self._pen, self._fill)

    # ── movement ──

    def _moveto(self, x, y):
        self._x = float(x)
        self._y = float(y)
        _mriya.move(self._x, self._y, self._down, self._pen, self._width)
        if self._filling is not None:
            self._filling.append(self._x)
            self._filling.append(self._y)

    def _turn(self, degrees):
        self._heading = (self._heading + degrees) % 360
        _mriya.turn(self._heading)

    def forward(self, distance):
        angle = math.radians(self._heading)
        self._moveto(self._x + distance * math.cos(angle), self._y + distance * math.sin(angle))

    def backward(self, distance):
        self.forward(-distance)

    def left(self, angle):
        self._turn(angle)

    def right(self, angle):
        self._turn(-angle)

    def goto(self, x, y=None):
        if y is None:
            x, y = x
        self._moveto(x, y)

    def setx(self, x):
        self._moveto(x, self._y)

    def sety(self, y):
        self._moveto(self._x, y)

    def setheading(self, angle):
        self._turn(angle - self._heading)

    def home(self):
        self._moveto(0, 0)
        self.setheading(0)

    def circle(self, radius, extent=None, steps=None):
        if extent is None:
            extent = 360
        if steps is None:
            frac = abs(extent) / 360
            steps = 1 + int(min(11 + abs(radius) / 6.0, 59.0) * frac)
        w = 1.0 * extent / steps
        w2 = 0.5 * w
        length = 2.0 * radius * math.sin(math.radians(w2))
        if radius < 0:
            length, w, w2 = -length, -w, -w2
        self._turn(w2)
        for _ in range(steps):
            self.forward(length)
            self._turn(w)
        self._turn(-w2)

    # ── state ──

    def position(self):
        return (round(self._x, 6), round(self._y, 6))

    def xcor(self):
        return round(self._x, 6)

    def ycor(self):
        return round(self._y, 6)

    def heading(self):
        return round(self._heading, 6)

    def distance(self, x, y=None):
        if y is None:
            x, y = x
        return math.sqrt((x - self._x) ** 2 + (y - self._y) ** 2)

    def towards(self, x, y=None):
        if y is None:
            x, y = x
        return math.degrees(math.atan2(y - self._y, x - self._x)) % 360

    def isdown(self):
        return self._down

    def isvisible(self):
        return self._visible

    # ── pen ──

    def penup(self):
        self._down = False

    def pendown(self):
        self._down = True

    def pensize(self, width=None):
        if width is None:
            return self._width
        self._width = width

    def color(self, *args):
        if len(args) == 0:
            return (self._pen, self._fill)
        if len(args) == 2:
            self._pen = _color((args[0],))
            self._fill = _color((args[1],))
        else:
            self._pen = self._fill = _color(args)
        _mriya.look(self._pen, self._fill)

    def pencolor(self, *args):
        if len(args) == 0:
            return self._pen
        self._pen = _color(args)
        _mriya.look(self._pen, self._fill)

    def fillcolor(self, *args):
        if len(args) == 0:
            return self._fill
        self._fill = _color(args)
        _mriya.look(self._pen, self._fill)

    def begin_fill(self):
        self._filling = [self._x, self._y]
        # The fill goes under the lines that the turtle draws after this command, as in CPython.
        _mriya.fill_start()

    def end_fill(self):
        if self._filling is not None and len(self._filling) >= 6:
            _mriya.fill(" ".join([str(v) for v in self._filling]), self._fill)
        self._filling = None

    def filling(self):
        return self._filling is not None

    def dot(self, size=None, *color):
        if size is None:
            size = max(self._width + 4, self._width * 2)
        _mriya.dot(self._x, self._y, size, _color(color) if color else self._pen)

    def write(self, arg, move=False, align="left", font=("Arial", 8, "normal")):
        _mriya.text(self._x, self._y, str(arg), align, _font(font), self._pen)

    def stamp(self):
        _mriya.stamp(self._x, self._y, self._heading, self._fill)

    def speed(self, speed=None):
        if speed is None:
            return 3
        names = {"fastest": 0, "fast": 10, "normal": 6, "slow": 3, "slowest": 1}
        if isinstance(speed, str):
            speed = names.get(speed, 6)
        _mriya.speed(int(speed))

    def hideturtle(self):
        self._visible = False
        _mriya.visible(False)

    def showturtle(self):
        self._visible = True
        _mriya.visible(True)

    def shape(self, name=None):
        return "classic"

    def shapesize(self, *args, **kwargs):
        pass

    def clear(self):
        _mriya.clear()

    def reset(self):
        _mriya.clear()
        self._down = True
        self.home()

    fd = forward
    bk = back = backward
    lt = left
    rt = right
    setpos = setposition = goto
    seth = setheading
    pos = position
    pu = up = penup
    pd = down = pendown
    width = pensize
    ht = hideturtle
    st = showturtle


class _Screen:
    def bgcolor(self, *args):
        _mriya.background(_color(args))

    def colormode(self, mode=None):
        global _colormode
        if mode is None:
            return _colormode
        _colormode = 1.0 if mode == 1 else 255

    def clear(self):
        _mriya.clear()

    def setup(self, *args, **kwargs):
        pass

    def title(self, *args):
        pass

    def tracer(self, *args, **kwargs):
        pass

    def update(self):
        pass

    def mainloop(self):
        pass

    done = exitonclick = bye = mainloop


_screen = _Screen()
_turtle = Turtle()
Pen = RawTurtle = Turtle


def Screen():
    return _screen


forward = fd = _turtle.forward
backward = back = bk = _turtle.backward
left = lt = _turtle.left
right = rt = _turtle.right
goto = setpos = setposition = _turtle.goto
setx = _turtle.setx
sety = _turtle.sety
setheading = seth = _turtle.setheading
home = _turtle.home
circle = _turtle.circle
position = pos = _turtle.position
xcor = _turtle.xcor
ycor = _turtle.ycor
heading = _turtle.heading
distance = _turtle.distance
towards = _turtle.towards
isdown = _turtle.isdown
isvisible = _turtle.isvisible
penup = pu = up = _turtle.penup
pendown = pd = down = _turtle.pendown
pensize = width = _turtle.pensize
color = _turtle.color
pencolor = _turtle.pencolor
fillcolor = _turtle.fillcolor
begin_fill = _turtle.begin_fill
end_fill = _turtle.end_fill
filling = _turtle.filling
dot = _turtle.dot
write = _turtle.write
stamp = _turtle.stamp
speed = _turtle.speed
hideturtle = ht = _turtle.hideturtle
showturtle = st = _turtle.showturtle
shape = _turtle.shape
shapesize = _turtle.shapesize
clear = _turtle.clear
reset = _turtle.reset
bgcolor = _screen.bgcolor
colormode = _screen.colormode
setup = _screen.setup
title = _screen.title
tracer = _screen.tracer
update = _screen.update
done = mainloop = exitonclick = bye = _screen.mainloop
