import { describe, expect, test } from "vitest"
import { checkCode, valuesWord } from "../src/core/code-check.ts"

// Mistakes found while the student types, without a run.

/** The marked code and the message of each mark. */
const marks = (code: string) => checkCode(code).map((w) => ({ at: code.slice(w.from, w.to), severity: w.severity, message: w.message }))

describe("checkCode: the calculator from the lesson", () => {
  const calculator = `def dodavania(a):
    return a + b

dia = input
chislo1 = int(input("Перше число: "))
chislo2 = int(input("Друге число: "))
if dia == "+":
    print(dodavania(chislo1, chislo2))
`

  test("finds b that is never created and suggests a parameter", () => {
    // Act
    const found = marks(calculator).find((m) => m.at === "b")

    // Assert
    expect(found?.severity).toBe("error")
    expect(found?.message).toContain("`def dodavania(a, b):`")
  })

  test("finds a call with more values than the def takes", () => {
    // Act
    const found = marks(calculator).find((m) => m.at === "dodavania(chislo1, chislo2)")

    // Assert
    expect(found?.message).toBe("Функція `dodavania` приймає 1 значення (`a`), а тут їй передають 2 значення. Додай параметр у `def dodavania(a):` або прибери зайве значення.")
  })

  test("finds input without brackets", () => {
    // Act
    const found = marks(calculator).find((m) => m.at === "input")

    // Assert
    expect(found?.message).toContain("Додай дужки: `input()`")
  })
})

describe("checkCode: names", () => {
  test("suggests a similar name", () => {
    expect(marks("prnt('Привіт')\n")[0]?.message).toContain("Можливо, ти мав на увазі `print`?")
  })

  test("finds a function called above its def", () => {
    // Act
    const found = marks("hello()\n\ndef hello():\n    print('hi')\n")

    // Assert
    expect(found[0]?.message).toContain("створено нижче, у рядку 3")
  })

  test("asks for global when a function changes a variable of the program", () => {
    // Act
    const found = marks("count = 0\ndef add():\n    count += 1\nadd()\n")

    // Assert
    expect(found[0]?.at).toBe("count")
    expect(found[0]?.message).toContain("`global count`")
  })

  test("knows the names of from tkinter import * and of modules", () => {
    // Arrange
    const code = `from tkinter import *
from tkinter import messagebox
import turtle, math, random as r
root = Tk()
root.title('Вікно')
Label(root, text='Привіт', bg='white').pack(side=LEFT)
def click(event):
    messagebox.showinfo('Так', str(event.x))
root.bind('<1>', click)
t = turtle.Turtle()
t.forward(math.sqrt(r.randint(1, 9)))
root.mainloop()
`

    // Act & Assert
    expect(marks(code)).toEqual([])
  })

  test("leaves correct programs with functions, classes, loops and comprehensions alone", () => {
    // Arrange
    const code = `import random
class Ball:
    size = 10
    def __init__(self, x, y=0):
        self.x = x
        self.y = y
    def move(self, dx):
        self.x += dx
        return self.x

def total(*values, **options):
    s = 0
    for v in values:
        s += v
    return s

def outer():
    n = 0
    def inner():
        nonlocal n
        n += 1
        return n
    return inner

balls = [Ball(i) for i in range(3)]
pairs = {k: v for k, v in zip("ab", [1, 2])}
square = lambda q: q * q
best = None
while best is None:
    best = random.randint(1, 3)
try:
    value = int("x")
except ValueError as error:
    print(error)
with open("a.txt", "w") as f:
    f.write("1")
if (n := len(balls)) > 2:
    print(n, total(1, 2, sep=1), square(2), pairs, outer()(), balls[0].move(1), __name__)
`

    // Act & Assert
    expect(marks(code)).toEqual([])
  })

  test("is quiet when the code has a syntax error", () => {
    expect(marks("if x\n    print(y)\n")).toEqual([])
  })

  test("does not check names after import * of a module without a name list", () => {
    expect(marks("from json import *\nthing()\n")).toEqual([])
  })
})

describe("checkCode: calls", () => {
  test("finds a call with too few values", () => {
    // Act
    const found = marks("def area(a, b):\n    return a * b\nprint(area(5))\n")

    // Assert
    expect(found[0]?.message).toContain("Бракує значення для `b`")
  })

  test("finds a name of a parameter that the function does not have", () => {
    expect(marks("def hi(name):\n    print(name)\nhi(nam='Оля')\n")[0]?.message).toContain("немає параметра `nam`")
  })

  test("checks functions of turtle with their parameters", () => {
    expect(marks("import turtle\nturtle.forward()\n")[0]?.message).toContain("Бракує значення для `distance`")
  })

  test("reads defaults with commas inside brackets", () => {
    expect(marks("from turtle import *\nwrite('Дім', align='center', font=('Arial', 16, 'bold'))\n")).toEqual([])
  })

  test("checks the number of values of builtins", () => {
    expect(marks("x = input('a', 'b')\n")[0]?.message).toBe("`input` приймає не більше 1 значення, а тут їй передають 2 значення.")
  })

  test("leaves calls with *args alone", () => {
    expect(marks("def f(a):\n    return a\nargs = [1, 2]\nf(*args)\n")).toEqual([])
  })
})

describe("checkCode: text from input()", () => {
  test("finds arithmetic with text", () => {
    // Act
    const found = marks("coins = input('Скільки?')\ntotal = coins + 50\n")

    // Assert
    expect(found[0]?.at).toBe("coins")
    expect(found[0]?.message).toContain("`coins = int(input(...))`")
  })

  test("warns that text == number is always False", () => {
    expect(marks("a = input()\nif a == 0:\n    print(0)\n")[0]?.message).toContain("завжди дає False")
  })

  test("allows text + text and numbers from int(input())", () => {
    expect(marks("a = input()\nb = int(input())\nprint(a + '!', b + 1, a * 2)\n")).toEqual([])
  })

  test("finds a lost result of int() and of a string method", () => {
    // Act
    const found = marks("a = input()\nint(a)\na.upper()\n")

    // Assert
    expect(found.map((m) => m.at)).toEqual(["int(a)", "a.upper()"])
  })
})

describe("checkCode: tkinter", () => {
  test("finds command=f() that calls the function at once", () => {
    // Act
    const found = marks("from tkinter import *\ndef light():\n    print(1)\nButton(text='Світло', command=light()).pack()\n")

    // Assert
    expect(found[0]?.message).toContain("Прибери дужки: `command=light`")
  })

  test("finds a bind handler without the event parameter", () => {
    expect(marks("from tkinter import *\nroot = Tk()\ndef light():\n    pass\nroot.bind('<1>', light)\n")[0]?.message).toContain("`def light(event):`")
  })

  test("finds a button command that needs a value", () => {
    expect(marks("from tkinter import *\ndef press(event):\n    pass\nButton(command=press)\n")[0]?.message).toContain("`def press(event=None):`")
  })

  test("leaves the command of Scale alone: it gets the value", () => {
    expect(marks("from tkinter import *\ndef moved(value):\n    print(value)\nScale(command=moved)\n")).toEqual([])
  })

  test("finds mainloop without brackets", () => {
    expect(marks("from tkinter import *\nroot = Tk()\nroot.mainloop\n")[0]?.message).toContain("`root.mainloop()`")
  })
})

describe("valuesWord", () => {
  test("uses the Ukrainian plural", () => {
    expect([0, 1, 2, 5, 11, 21, 22].map(valuesWord)).toEqual(["0 значень", "1 значення", "2 значення", "5 значень", "11 значень", "21 значення", "22 значення"])
  })
})

describe("checkCode: checks like Pyright", () => {
  test("finds a method with a typo on a window", () => {
    expect(marks("from tkinter import *\nroot = Tk()\nroot.titel('Гра')\nroot.mainloop()\n")[0]?.message).toBe("У `root` (вікна) немає `titel`. Можливо, `title`?")
  })

  test("finds a function with a typo in a module", () => {
    expect(marks("import turtle\nturtle.forwad(100)\n")[0]?.message).toContain("Можливо, `forward`?")
  })

  test("leaves attributes that the program sets alone", () => {
    expect(marks("from tkinter import *\nroot = Tk()\nroot.score = 0\nprint(root.score)\n")).toEqual([])
  })

  test("finds a module that does not exist", () => {
    expect(marks("import turtl\n")[0]?.message).toBe("Модуля `turtl` немає. Можливо, `turtle`?")
  })

  test("finds a name that a module does not have", () => {
    expect(marks("from tkinter import Buton\n")[0]?.message).toContain("Можливо, `Button`?")
  })

  test("finds text + number", () => {
    // Act
    const found = marks("vik = int(input())\nprint('Тобі ' + vik + ' років')\nprint('Через рік ' + (vik + 1))\n")

    // Assert
    expect(found.map((m) => m.at)).toEqual(["vik", "(vik + 1)"])
    expect(found[1]?.message).toContain("`str(vik + 1)`")
  })

  test("checks the values of methods of tkinter and explains geometry", () => {
    expect(marks("from tkinter import *\nroot = Tk()\nroot.geometry(400, 300)\n")[0]?.message).toContain("`root.geometry('400x300')`")
  })

  test("checks the values of methods of a turtle", () => {
    expect(marks("import turtle\nt = turtle.Turtle()\nt.circle()\n")[0]?.message).toContain("Бракує значення для `radius`")
  })

  test("warns about a variable that gets a value only in an if", () => {
    // Act
    const found = marks("a = int(input())\nb = int(input())\nif a > b:\n    big = a\nelif b > a:\n    big = b\nprint(big)\n")

    // Assert
    expect(found[0]?.at).toBe("big")
    expect(found[0]?.message).toContain("лише всередині `if`")
  })

  test("leaves values from if with else, loops and try alone", () => {
    // Arrange
    const code = `a = int(input())
if a > 0:
    sign = 1
elif a < 0:
    sign = -1
else:
    sign = 0
for i in range(3):
    last = i
try:
    n = int(input())
except ValueError:
    n = 0
if a > 5:
    big = True
    print(big)
print(sign, last, n)
`

    // Act & Assert
    expect(marks(code)).toEqual([])
  })

  test("warns about a def written twice", () => {
    expect(marks("def hi():\n    print(1)\ndef hi():\n    print(2)\nhi()\n")[0]?.message).toContain("уже створено в рядку 1")
  })

  test("finds a method without self", () => {
    expect(marks("class Ball:\n    def move():\n        pass\n")[0]?.message).toContain("`def move(self):`")
  })

  test("warns when the result of a function without return is used", () => {
    // Act
    const found = marks("def suma(a, b):\n    print(a + b)\ns = suma(2, 3)\nprint(suma(1, 1))\n")

    // Assert
    expect(found.map((m) => m.at)).toEqual(["suma(2, 3)", "suma(1, 1)"])
    expect(found[0]?.message).toContain("у `s` буде None")
  })

  test("finds a = a.sort() on a list", () => {
    expect(marks("a = [3, 1, 2]\na = a.sort()\n")[0]?.message).toContain("змінює сам список і повертає None")
  })
})
