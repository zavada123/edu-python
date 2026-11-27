import { Levels } from "../types.ts"
import type { Mission } from "../types.ts"
import { click, program, shows, trial, type } from "./window-kit.ts"

/**
 * Mission «Свій калькулятор» for grade 8 (paragraphs 12–16): the student makes a calculator with windows from
 * nothing, step by step: a window, a field and a button, four operations, and protection from mistakes with `if`.
 * The trials type into the fields and click the buttons of the student's window, then read what the window shows.
 * It uses only what the class knows: `Label`, `Button`, `Entry`, `def`, `if`, and `напис["text"] = ...` to change
 * a label. The bonus mission «Калькулятор Pro» adds `try`, `lambda`, `eval` and `.grid()`.
 */

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
    result["text"] = n * 2

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
    result["text"] = int(a.get()) + int(b.get())

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
    result["text"] = int(a.get()) + int(b.get())

def sub():
    result["text"] = int(a.get()) - int(b.get())

def mul():
    result["text"] = int(a.get()) * int(b.get())

def div():
    result["text"] = int(a.get()) / int(b.get())

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

def empty():
    return a.get() == "" or b.get() == ""

def add():
    if empty():
        result["text"] = "Введи число"
    else:
        result["text"] = float(a.get()) + float(b.get())

def sub():
    if empty():
        result["text"] = "Введи число"
    else:
        result["text"] = float(a.get()) - float(b.get())

def mul():
    if empty():
        result["text"] = "Введи число"
    else:
        result["text"] = float(a.get()) * float(b.get())

def div():
    if empty():
        result["text"] = "Введи число"
    elif float(b.get()) == 0:
        result["text"] = "На нуль ділити не можна"
    else:
        result["text"] = float(a.get()) / float(b.get())

Button(root, text="+", command=add).pack()
Button(root, text="-", command=sub).pack()
Button(root, text="*", command=mul).pack()
Button(root, text="/", command=div).pack()
result.pack()
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
    "Напиши функцію `def double():`, яка бере число `int(entry.get())` і змінює напис: `result[\"text\"] = n * 2`.",
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
    "У функції кнопки: `result[\"text\"] = int(a.get()) + int(b.get())`."
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
    { speaker: "robot", text: "Спробуй поділити на 0 або натиснути кнопку з порожнім полем: програма зламається з помилкою. Справжній калькулятор так не робить." }
  ],
  task: "Зроби калькулятор із чотирма діями, який працює з дробами (`2.5`). Якщо якесь поле порожнє, напис показує `Введи число`. Якщо ділять на 0 — `На нуль ділити не можна`.",
  solution: SAFE,
  starter: FOUR,
  trials: [
    trial("2.5 + 1.25", [type(1, "2.5"), type(2, "1.25"), click("+")], [shows("3.75")], "Калькулятор має працювати з дробами. Замість `int()` використай `float()`."),
    trial("Ділення на 0", [type(1, "5"), type(2, "0"), click("/")], [shows("На нуль ділити не можна")], "Перед діленням перевір, чи друге число не 0."),
    trial("Порожнє поле", [type(2, "3"), click("+")], [shows("Введи число")], "Перше поле порожнє. Перевір поля до обчислення: `if a.get() == \"\" or b.get() == \"\":`."),
    trial("9 × 0.5", [type(1, "9"), type(2, "0.5"), click("*")], [shows("4.5")], "Множення має працювати і з дробами.")
  ],
  mustUse: ["if", "float"],
  hints: [
    "`float(\"2.5\")` дає число 2.5. Заміни всі `int()` на `float()`.",
    "Порожнє поле дає порожній рядок: `a.get() == \"\"`. Поєднай перевірки двох полів через `or`.",
    "У функції ділення: `if` порожнє поле, `elif float(b.get()) == 0:`, `else:` поділити."
  ],
  clue: "Калькулятор не боїться помилок."
})

export const calculator: Mission = {
  id: "calculator",
  title: "Свій калькулятор",
  summary:
    "Зроби з нуля справжній калькулятор у вікні: поле, кнопки, чотири дії й захист від помилок. Усе на Python і tkinter, тільки тим, що вивчають у 8 класі.",
  level: Levels.Base,
  grades: "8",
  file: "калькулятор.py",
  chapters: [
    {
      id: "first-window",
      after: "8-13",
      title: "Перше вікно",
      topics: "Tk, Label, pack, mainloop",
      steps: [
        {
          kind: "lesson",
          id: "window-lesson",
          title: "Вікно програми",
          story: [{ speaker: "robot", text: "Пригадаймо, як зробити вікно з написом." }],
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
          example: "from tkinter import *\n\nroot = Tk()\nroot.title(\"Привіт\")\nLabel(root, text=\"Моє перше вікно\", font=(\"Arial\", 16)).pack()\nroot.mainloop()\n",
          teaches: []
        },
        window
      ]
    },
    {
      id: "button",
      after: "8-14",
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
            "`напис[\"text\"] = …` змінює текст напису."
          ],
          syntax: "def дія():\n    n = int(entry.get())\n    напис[\"text\"] = n\n\nButton(root, text=\"OK\", command=дія).pack()",
          notes: [
            { code: "entry = Entry(root)", text: "Поле для введення." },
            { code: "entry.get()", text: "Текст із поля." },
            { code: "command=hello", text: "Кнопка викличе функцію `hello`." },
            { code: "label[\"text\"] = \"Так\"", text: "Новий текст напису." }
          ],
          example: "from tkinter import *\n\nroot = Tk()\nroot.title(\"Привітання\")\nentry = Entry(root)\nentry.pack()\n\ndef hello():\n    label[\"text\"] = \"Привіт, \" + entry.get() + \"!\"\n\nButton(root, text=\"Привітатися\", command=hello).pack()\nlabel = Label(root, text=\"\")\nlabel.pack()\nroot.mainloop()\n",
          teaches: []
        },
        double
      ]
    },
    {
      id: "operations",
      after: "8-14",
      title: "Чотири дії",
      topics: "два поля, кілька функцій",
      steps: [sum, four]
    },
    {
      id: "errors",
      after: "8-16",
      title: "Захист від помилок",
      topics: "float, if, elif, or",
      steps: [
        {
          kind: "lesson",
          id: "check-lesson",
          title: "Перевіряємо дані",
          story: [{ speaker: "robot", text: "Люди натискають кнопки як завгодно. Хороша програма спершу перевіряє дані." }],
          explain: [
            "`float(\"2.5\")` перетворює текст на дробове число, а `int()` уміє лише цілі.",
            "Порожнє поле дає порожній рядок: умова `a.get() == \"\"` правдива, коли в полі нічого немає.",
            "`or` поєднує умови: `a.get() == \"\" or b.get() == \"\"` правдива, якщо порожнє хоча б одне поле.",
            "Ділення на 0 теж краще перевірити заздалегідь: `elif float(b.get()) == 0:`."
          ],
          syntax: "if умова1:\n    дії\nelif умова2:\n    дії\nelse:\n    дії",
          notes: [
            { code: "float(\"2.5\")", text: "`2.5`" },
            { code: "a.get() == \"\"", text: "Поле порожнє." },
            { code: "x == \"\" or y == \"\"", text: "Порожнє хоча б одне." }
          ],
          example: "from tkinter import *\n\nroot = Tk()\nentry = Entry(root)\nentry.pack()\n\ndef half():\n    if entry.get() == \"\":\n        label[\"text\"] = \"Поле порожнє\"\n    else:\n        label[\"text\"] = float(entry.get()) / 2\n\nButton(root, text=\"Половина\", command=half).pack()\nlabel = Label(root, text=\"\")\nlabel.pack()\nroot.mainloop()\n",
          teaches: []
        },
        safe
      ]
    }
  ],
  ending: [
    { speaker: "robot", text: "Твій калькулятор готовий! У ньому все, як у справжнього: поля, чотири дії й захист від помилок." },
    { speaker: "robot", text: "Хочеш калькулятор із кнопками-цифрами, як на телефоні? Спробуй місію «⭐ Калькулятор Pro»." }
  ]
}
