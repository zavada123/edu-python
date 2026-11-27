import type { ProgramStep, WindowAction, WindowCheck, WindowTrial } from "../types.ts"
import type { Mission } from "../types.ts"

/**
 * Mission 2, «Свій калькулятор», for grades 7–9: the student makes a calculator with windows from nothing, step
 * by step: a window, a field and a button, four operations, protection from mistakes, and a keypad. The trials
 * type into the fields and click the buttons of the student's window, then read what the window shows.
 */

const type = (field: number, text: string): WindowAction => ({ _tag: "Type", field, text })
const click = (button: string): WindowAction => ({ _tag: "Click", button })
const shows = (text: string): WindowCheck => ({ _tag: "Shows", text })

const trial = (label: string, actions: readonly WindowAction[], expect: readonly WindowCheck[], why: string): WindowTrial => ({
  _tag: "Window",
  label,
  actions,
  expect,
  why
})

const program = (s: Omit<ProgramStep, "kind">): ProgramStep => ({ kind: "program", ...s })

/** Clicks on the buttons of the keys, one by one: "12+3=" is 1, 2, +, 3, =. */
const keys = (text: string): readonly WindowAction[] => [...text].map(click)

const WINDOW = `from tkinter import *

root = Tk()
root.title("Калькулятор")
Label(root, text="Мій калькулятор").pack()
root.mainloop()
`

const DOUBLE = `from tkinter import *

root = Tk()
root.title("Калькулятор")
entry = Entry(root)
entry.pack()

def double():
    n = int(entry.get())
    result.config(text=n * 2)

Button(root, text="x2", command=double).pack()
result = Label(root, text="")
result.pack()
root.mainloop()
`

const SUM = `from tkinter import *

root = Tk()
root.title("Калькулятор")
a = Entry(root)
a.pack()
b = Entry(root)
b.pack()

def add():
    result.config(text=int(a.get()) + int(b.get()))

Button(root, text="+", command=add).pack()
result = Label(root, text="")
result.pack()
root.mainloop()
`

const FOUR = `from tkinter import *

root = Tk()
root.title("Калькулятор")
a = Entry(root)
a.pack()
b = Entry(root)
b.pack()
result = Label(root, text="")

def add():
    result.config(text=int(a.get()) + int(b.get()))

def sub():
    result.config(text=int(a.get()) - int(b.get()))

def mul():
    result.config(text=int(a.get()) * int(b.get()))

def div():
    result.config(text=int(a.get()) / int(b.get()))

Button(root, text="+", command=add).pack()
Button(root, text="-", command=sub).pack()
Button(root, text="*", command=mul).pack()
Button(root, text="/", command=div).pack()
result.pack()
root.mainloop()
`

const SAFE = `from tkinter import *

root = Tk()
root.title("Калькулятор")
a = Entry(root)
a.pack()
b = Entry(root)
b.pack()
result = Label(root, text="")

def calc(op):
    try:
        x = float(a.get())
        y = float(b.get())
    except ValueError:
        result.config(text="Введи число")
        return
    if op == "+":
        result.config(text=x + y)
    elif op == "-":
        result.config(text=x - y)
    elif op == "*":
        result.config(text=x * y)
    elif y == 0:
        result.config(text="На нуль ділити не можна")
    else:
        result.config(text=x / y)

Button(root, text="+", command=lambda: calc("+")).pack()
Button(root, text="-", command=lambda: calc("-")).pack()
Button(root, text="*", command=lambda: calc("*")).pack()
Button(root, text="/", command=lambda: calc("/")).pack()
result.pack()
root.mainloop()
`

const KEYPAD = `from tkinter import *

root = Tk()
root.title("Калькулятор")
display = Entry(root, width=16, justify="right")
display.grid(row=0, column=0, columnspan=4)

def press(key):
    display.insert(END, key)

def clear():
    display.delete(0, END)

def equals():
    expression = display.get()
    display.delete(0, END)
    try:
        display.insert(END, eval(expression))
    except ZeroDivisionError:
        display.insert(END, "Помилка")

rows = ["789/", "456*", "123-", "C0=+"]
for r in range(4):
    for c in range(4):
        key = rows[r][c]
        if key == "C":
            command = clear
        elif key == "=":
            command = equals
        else:
            command = lambda k=key: press(k)
        Button(root, text=key, width=4, command=command).grid(row=r + 1, column=c)

root.mainloop()
`

const window = program({
  id: "window",
  title: "Перше вікно",
  story: [
    { speaker: "robot", text: "Справжні програми мають вікна з кнопками. Почнемо з порожнього вікна з написом." }
  ],
  task: "Створи вікно із заголовком `Калькулятор` і написом (`Label`) `Мій калькулятор`.",
  solution: WINDOW,
  starter: "from tkinter import *\n\nroot = Tk()\n",
  trials: [
    trial("Вікно відкривається", [], [{ _tag: "Title", text: "Калькулятор" }, { _tag: "Widget", kind: "Label", text: "Мій калькулятор" }],
      "У вікні має бути напис `Label` з текстом «Мій калькулятор». Не забудь `.pack()`, щоб напис з'явився.")
  ],
  mustUse: ["Tk", "Label", "mainloop"],
  hints: [
    "Заголовок вікна задає `root.title(\"Калькулятор\")`.",
    "Напис: `Label(root, text=\"Мій калькулятор\").pack()`.",
    "Останній рядок програми — `root.mainloop()`: він тримає вікно відкритим."
  ],
  clue: "Вікно калькулятора відкривається."
})

const double = program({
  id: "double",
  title: "Кнопка «x2»",
  story: [
    { speaker: "robot", text: "Тепер навчимо вікно рахувати. Почнемо з однієї дії: подвоїти число." }
  ],
  task: "Зроби вікно з полем введення (`Entry`), кнопкою `x2` і написом (`Label`). Коли натискають `x2`, напис показує число з поля, помножене на 2.",
  solution: DOUBLE,
  starter: "from tkinter import *\n\nroot = Tk()\nroot.title(\"Калькулятор\")\n\nroot.mainloop()\n",
  trials: [
    trial("21 × 2", [type(1, "21"), click("x2")], [shows("42")], "Після натискання `x2` напис має показати подвоєне число."),
    trial("−5 × 2", [type(1, "-5"), click("x2")], [shows("-10")], "Від'ємні числа теж подвоюються: −5 × 2 = −10."),
    trial("7 × 2", [type(1, "7"), click("x2")], [shows("14")], "Перетвори текст поля на число: `int(entry.get())`, інакше «7» × 2 дасть «77».")
  ],
  mustUse: ["Entry", "Button", "def"],
  hints: [
    "Спершу створи поле `entry = Entry(root)` і напис `result = Label(root, text=\"\")`, і для кожного викличи `.pack()`.",
    "Напиши функцію `def double():`, яка бере число `int(entry.get())` і змінює напис: `result.config(text=n * 2)`.",
    "Кнопка викликає функцію без дужок: `Button(root, text=\"x2\", command=double).pack()`."
  ],
  clue: "Калькулятор уміє подвоювати."
})

const sum = program({
  id: "sum",
  title: "Додавання",
  story: [
    { speaker: "robot", text: "Справжній калькулятор працює з двома числами. Додай друге поле." }
  ],
  task: "Зроби вікно з двома полями (`Entry`), кнопкою `+` і написом. Кнопка `+` показує в написі суму двох чисел.",
  solution: SUM,
  starter: "",
  trials: [
    trial("2 + 3", [type(1, "2"), type(2, "3"), click("+")], [shows("5")], "Після `+` напис має показати суму двох чисел."),
    trial("10 + (−4)", [type(1, "10"), type(2, "-4"), click("+")], [shows("6")], "Сума неправильна. Перетвори обидва поля на числа: `int(a.get()) + int(b.get())`."),
    trial("40 + 2", [type(1, "40"), type(2, "2"), click("+")], [shows("42")], "Якщо видно «402», то числа склеїлися як текст. Перетвори їх через `int()`.")
  ],
  mustUse: ["Entry", "Button"],
  hints: [
    "Два поля: `a = Entry(root)` і `b = Entry(root)`, кожне з `.pack()`.",
    "У функції кнопки: `result.config(text=int(a.get()) + int(b.get()))`."
  ],
  clue: "Калькулятор додає два числа."
})

const four = program({
  id: "four",
  title: "Чотири дії",
  story: [
    { speaker: "robot", text: "Додай кнопки `-`, `*` і `/`. Для кожної кнопки — своя функція." }
  ],
  task: "Зроби калькулятор із двома полями, кнопками `+`, `-`, `*`, `/` і написом для результату.",
  solution: FOUR,
  starter: "",
  trials: [
    trial("6 + 3", [type(1, "6"), type(2, "3"), click("+")], [shows("9")], "Кнопка `+` має показати суму."),
    trial("6 − 8", [type(1, "6"), type(2, "8"), click("-")], [shows("-2")], "Кнопка `-` має показати різницю: перше число мінус друге."),
    trial("6 × 7", [type(1, "6"), type(2, "7"), click("*")], [shows("42")], "Кнопка `*` має показати добуток."),
    trial("7 ÷ 2", [type(1, "7"), type(2, "2"), click("/")], [shows("3.5")], "Кнопка `/` має показати частку: 7 / 2 = 3.5. Ділення націло `//` тут не підходить.")
  ],
  mustUse: ["def"],
  hints: [
    "Напиши чотири функції: `add`, `sub`, `mul`, `div`. Вони відрізняються лише знаком дії.",
    "Для кожної кнопки: `Button(root, text=\"-\", command=sub).pack()`."
  ],
  clue: "Калькулятор знає всі чотири дії."
})

const safe = program({
  id: "safe",
  title: "Захист від помилок",
  story: [
    { speaker: "robot", text: "Спробуй поділити на 0 або ввести літери: програма зламається з помилкою. Справжній калькулятор так не робить." }
  ],
  task: "Зроби калькулятор із чотирма діями, який працює з дробами (`2.5`). Якщо в полі не число, напис показує `Введи число`. Якщо ділять на 0 — `На нуль ділити не можна`.",
  solution: SAFE,
  starter: FOUR,
  trials: [
    trial("2.5 + 1.25", [type(1, "2.5"), type(2, "1.25"), click("+")], [shows("3.75")], "Калькулятор має працювати з дробами. Замість `int()` використай `float()`."),
    trial("Ділення на 0", [type(1, "5"), type(2, "0"), click("/")], [shows("На нуль ділити не можна")], "Перед діленням перевір, чи друге число не 0."),
    trial("Літери в полі", [type(1, "abc"), type(2, "3"), click("+")], [shows("Введи число")], "Коли в полі не число, `float()` дає помилку `ValueError`. Злови її в `try`/`except`."),
    trial("9 × 0.5", [type(1, "9"), type(2, "0.5"), click("*")], [shows("4.5")], "Множення має працювати і з дробами.")
  ],
  mustUse: ["try", "except"],
  hints: [
    "`float(\"2.5\")` дає число 2.5, а `float(\"abc\")` — помилку `ValueError`.",
    "Обгорни читання полів у `try:` … `except ValueError:` і там напиши `result.config(text=\"Введи число\")`.",
    "Перед діленням: `if y == 0:` показати повідомлення, `else:` поділити."
  ],
  clue: "Калькулятор не боїться помилок."
})

const keypad = program({
  id: "keypad",
  title: "Кнопки з цифрами",
  story: [
    { speaker: "robot", text: "Останній крок — справжній калькулятор: табло й кнопки з цифрами, як на телефоні." }
  ],
  task: "Зроби калькулятор із табло (`Entry`) і кнопками `0`–`9`, `+`, `-`, `*`, `/`, `=` і `C`. Кнопки цифр і дій дописують свій символ на табло, `=` показує результат, `C` очищає табло. Ділення на 0 показує `Помилка`.",
  solution: KEYPAD,
  starter: "",
  trials: [
    trial("12 + 3 =", keys("12+3="), [shows("15")], "Натисни 1, 2, +, 3, =: табло має показати 15."),
    trial("9 × 8 =", keys("9*8="), [shows("72")], "Натисни 9, *, 8, =: табло має показати 72."),
    trial("Очищення", keys("7C4="), [shows("4")], "Після `C` табло має очиститися: 7, C, 4, = дає 4."),
    trial("Ділення на 0", keys("8/0="), [shows("Помилка")], "Ділення на 0 має показати `Помилка`, а не зупинити програму.")
  ],
  mustUse: ["grid"],
  hints: [
    "Кнопки зручно розставити сіткою: `Button(...).grid(row=1, column=0)`.",
    "Кнопка дописує символ: `display.insert(END, \"7\")`. Щоб не писати 16 функцій, використай `lambda k=key: press(k)` у циклі.",
    "`eval(\"12+3\")` рахує вираз з рядка. А `display.delete(0, END)` очищає табло."
  ],
  clue: "Калькулятор готовий!"
})

export const calculator: Mission = {
  id: "calculator",
  title: "Свій калькулятор",
  summary:
    "Зроби з нуля справжній калькулятор у вікні: поле, кнопки, чотири дії, захист від помилок і клавіатура з цифрами. Усе на Python і tkinter.",
  grades: "7–9",
  file: "калькулятор.py",
  chapters: [
    {
      id: "first-window",
      title: "Перше вікно",
      topics: "tkinter, Tk, Label, mainloop",
      steps: [
        {
          kind: "lesson",
          id: "window-lesson",
          title: "Вікно програми",
          story: [{ speaker: "robot", text: "Модуль `tkinter` малює вікна, написи, поля й кнопки." }],
          explain: [
            "`from tkinter import *` підключає модуль. `root = Tk()` створює головне вікно, а `root.title(\"…\")` дає йому заголовок.",
            "`Label(root, text=\"…\")` створює напис у вікні. Щоб він з'явився, його треба розмістити: `.pack()` ставить елементи один під одним.",
            "Останній рядок — `root.mainloop()`: вікно чекає дій людини, доки його не закриють."
          ],
          syntax: "from tkinter import *\nroot = Tk()\nLabel(root, text=\"напис\").pack()\nroot.mainloop()",
          notes: [
            { code: "root = Tk()", text: "Створює вікно." },
            { code: "root.title(\"Привіт\")", text: "Заголовок вікна." },
            { code: "Label(root, text=\"Привіт\").pack()", text: "Напис у вікні." },
            { code: "root.mainloop()", text: "Тримає вікно відкритим." }
          ],
          example: "from tkinter import *\n\nroot = Tk()\nroot.title(\"Привіт\")\nLabel(root, text=\"Моє перше вікно\", font=(\"Arial\", 16)).pack()\nroot.mainloop()\n"
        },
        window
      ]
    },
    {
      id: "button",
      title: "Поле і кнопка",
      topics: "Entry, Button, def, command",
      steps: [
        {
          kind: "lesson",
          id: "button-lesson",
          title: "Поле, кнопка й функція",
          story: [{ speaker: "robot", text: "Кнопка викликає функцію. А функція може прочитати поле й змінити напис." }],
          explain: [
            "`Entry(root)` — поле для введення. `entry.get()` повертає текст із поля (рядок!), тому для чисел потрібен `int()`.",
            "`def назва():` створює функцію: рядки з відступом виконуються, коли її викликають.",
            "`Button(root, text=\"OK\", command=назва)` — кнопка, яка викликає функцію. Назву функції пиши без дужок.",
            "`напис.config(text=…)` змінює текст напису."
          ],
          syntax: "def дія():\n    n = int(entry.get())\n    напис.config(text=n)\n\nButton(root, text=\"OK\", command=дія).pack()",
          notes: [
            { code: "entry = Entry(root)", text: "Поле для введення." },
            { code: "entry.get()", text: "Текст із поля." },
            { code: "command=hello", text: "Кнопка викличе функцію `hello`." },
            { code: "label.config(text=\"Так\")", text: "Новий текст напису." }
          ],
          example: "from tkinter import *\n\nroot = Tk()\nroot.title(\"Привітання\")\nentry = Entry(root)\nentry.pack()\n\ndef hello():\n    label.config(text=\"Привіт, \" + entry.get() + \"!\")\n\nButton(root, text=\"Привітатися\", command=hello).pack()\nlabel = Label(root, text=\"\")\nlabel.pack()\nroot.mainloop()\n"
        },
        double
      ]
    },
    {
      id: "operations",
      title: "Чотири дії",
      topics: "два поля, кілька функцій",
      steps: [sum, four]
    },
    {
      id: "errors",
      title: "Захист від помилок",
      topics: "float, try, except, if",
      steps: [
        {
          kind: "lesson",
          id: "try-lesson",
          title: "Ловимо помилки",
          story: [{ speaker: "robot", text: "Люди вводять що завгодно. Хороша програма не ламається, а пояснює, що не так." }],
          explain: [
            "`float(\"2.5\")` перетворює текст на дробове число. Якщо в тексті не число, Python видає помилку `ValueError`.",
            "`try:` пробує виконати рядки з відступом. Якщо там сталася помилка, Python не зупиняється, а виконує рядки після `except ValueError:`.",
            "Ділення на 0 краще перевірити заздалегідь умовою `if y == 0:`.",
            "`return` у функції завершує її одразу: решта рядків не виконується."
          ],
          syntax: "try:\n    x = float(a.get())\nexcept ValueError:\n    напис.config(text=\"Введи число\")\n    return",
          notes: [
            { code: "float(\"2.5\")", text: "`2.5`" },
            { code: "float(\"abc\")", text: "Помилка `ValueError`." },
            { code: "except ValueError:", text: "Що робити, коли сталася така помилка." }
          ],
          example: "text = input(\"Число: \")\ntry:\n    x = float(text)\n    print(\"Половина:\", x / 2)\nexcept ValueError:\n    print(\"Це не число\")\n"
        },
        safe
      ]
    },
    {
      id: "keypad",
      title: "Кнопки з цифрами",
      topics: "grid, lambda, insert, delete, eval",
      steps: [
        {
          kind: "lesson",
          id: "keypad-lesson",
          title: "Сітка кнопок",
          story: [{ speaker: "robot", text: "Шістнадцять кнопок не пишуть по одній. Їх створює цикл, а розставляє сітка." }],
          explain: [
            "`.grid(row=1, column=2)` ставить елемент у рядок 1 і стовпець 2 сітки. `columnspan=4` розтягує його на 4 стовпці.",
            "`display.insert(END, \"7\")` дописує текст у кінець поля, а `display.delete(0, END)` очищає поле.",
            "`lambda k=key: press(k)` — коротка функція без назви. Так кожна кнопка циклу викликає `press` зі своєю цифрою.",
            "`eval(\"12+3\")` рахує вираз, записаний у рядку, і дає `15`."
          ],
          syntax: "for r in range(4):\n    for c in range(4):\n        Button(root, text=..., command=...).grid(row=r, column=c)",
          notes: [
            { code: "w.grid(row=0, column=1)", text: "Місце в сітці." },
            { code: "e.insert(END, \"5\")", text: "Дописати в кінець поля." },
            { code: "e.delete(0, END)", text: "Очистити поле." },
            { code: "eval(\"2*21\")", text: "`42`" }
          ],
          example: "from tkinter import *\n\nroot = Tk()\nroot.title(\"Сітка\")\ndisplay = Entry(root)\ndisplay.grid(row=0, column=0, columnspan=3)\n\ndef press(key):\n    display.insert(END, key)\n\nfor i in range(9):\n    key = str(i + 1)\n    Button(root, text=key, width=4, command=lambda k=key: press(k)).grid(row=i // 3 + 1, column=i % 3)\nroot.mainloop()\n"
        },
        keypad
      ]
    }
  ],
  ending: [
    { speaker: "robot", text: "Твій калькулятор готовий! У ньому все, як у справжнього: табло, клавіатура, чотири дії й захист від помилок." },
    { speaker: "robot", text: "Спробуй додати свої кнопки: квадрат числа, корінь чи відсотки." }
  ]
}
