import { Levels } from "../types.ts"
import type { Mission } from "../types.ts"
import { click, keys, program, shows, trial, type } from "./window-kit.ts"

/**
 * Bonus mission «Калькулятор Pro» for stronger students of grades 8–9, after the mission «Свій калькулятор». It
 * teaches what the school topics do not have: `try`/`except`, `.grid()`, `lambda` and `eval`. Each new word has a
 * lesson before the first task that uses it.
 */

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
        result["text"] = "Введи число"
        return
    if op == "+":
        result["text"] = x + y
    elif op == "-":
        result["text"] = x - y
    elif op == "*":
        result["text"] = x * y
    elif y == 0:
        result["text"] = "На нуль ділити не можна"
    else:
        result["text"] = x / y

def add():
    calc("+")

def sub():
    calc("-")

def mul():
    calc("*")

def div():
    calc("/")

Button(root, text="+", command=add).pack()
Button(root, text="-", command=sub).pack()
Button(root, text="*", command=mul).pack()
Button(root, text="/", command=div).pack()
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

const letters = program({
  id: "letters",
  title: "Літери замість чисел",
  story: [
    { speaker: "robot", text: "Спробуй ввести в поле літери: `float(\"abc\")` зупинить програму з помилкою. Перевірити це умовою важко, а `try` ловить таку помилку." }
  ],
  task: "Зроби калькулятор із чотирма діями, який працює з дробами (`2.5`). Якщо в полі не число, напис показує `Введи число`. Якщо ділять на 0 — `На нуль ділити не можна`.",
  solution: SAFE,
  starter: "",
  trials: [
    trial("2.5 + 1.25", [type(1, "2.5"), type(2, "1.25"), click("+")], [shows("3.75")], "Калькулятор має працювати з дробами. Замість `int()` використай `float()`."),
    trial("Ділення на 0", [type(1, "5"), type(2, "0"), click("/")], [shows("На нуль ділити не можна")], "Перед діленням перевір, чи друге число не 0."),
    trial("Літери в полі", [type(1, "abc"), type(2, "3"), click("+")], [shows("Введи число")], "Коли в полі не число, `float()` дає помилку `ValueError`. Злови її в `try`/`except`."),
    trial("9 × 0.5", [type(1, "9"), type(2, "0.5"), click("*")], [shows("4.5")], "Множення має працювати і з дробами.")
  ],
  mustUse: ["try", "except"],
  hints: [
    "`float(\"2.5\")` дає число 2.5, а `float(\"abc\")` — помилку `ValueError`.",
    "Обгорни читання полів у `try:` … `except ValueError:` і там напиши `result[\"text\"] = \"Введи число\"`.",
    "Перед діленням: `if y == 0:` показати повідомлення, `else:` поділити."
  ],
  clue: "Калькулятор не боїться навіть літер."
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

export const calculatorPro: Mission = {
  id: "calculator-pro",
  title: "Калькулятор Pro",
  summary:
    "Додаткова місія для тих, хто зробив «Свій калькулятор»: калькулятор, що не боїться літер, і клавіатура з цифрами, як на телефоні. Тут ти навчишся `try`, `lambda`, `eval` і сітки `grid`.",
  level: Levels.Bonus,
  grades: "8–9",
  file: "калькулятор_pro.py",
  chapters: [
    {
      id: "errors",
      after: "8-16",
      title: "Ловимо помилки",
      topics: "try, except",
      steps: [
        {
          kind: "lesson",
          id: "try-lesson",
          title: "Ловимо помилки",
          story: [{ speaker: "robot", text: "Люди вводять що завгодно. Хороша програма не ламається, а пояснює, що не так." }],
          explain: [
            "`float(\"2.5\")` перетворює текст на дробове число. Якщо в тексті не число, Python видає помилку `ValueError`.",
            "`try:` пробує виконати рядки з відступом. Якщо там сталася помилка, Python не зупиняється, а виконує рядки після `except ValueError:`.",
            "`try` і `except` не вчать у школі, але ними користуються в кожній справжній програмі.",
            "`return` у функції завершує її одразу: решта рядків не виконується."
          ],
          syntax: "try:\n    x = float(a.get())\nexcept ValueError:\n    напис[\"text\"] = \"Введи число\"\n    return",
          notes: [
            { code: "float(\"2.5\")", text: "`2.5`" },
            { code: "float(\"abc\")", text: "Помилка `ValueError`." },
            { code: "except ValueError:", text: "Що робити, коли сталася така помилка." }
          ],
          example: "text = input(\"Число: \")\ntry:\n    x = float(text)\n    print(\"Половина:\", x / 2)\nexcept ValueError:\n    print(\"Це не число\")\n",
          teaches: ["try", "except"]
        },
        letters
      ]
    },
    {
      id: "keypad",
      after: "8-16",
      title: "Кнопки з цифрами",
      topics: "grid, lambda, eval",
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
          example: "from tkinter import *\n\nroot = Tk()\nroot.title(\"Сітка\")\ndisplay = Entry(root)\ndisplay.grid(row=0, column=0, columnspan=3)\n\ndef press(key):\n    display.insert(END, key)\n\nfor i in range(9):\n    key = str(i + 1)\n    Button(root, text=key, width=4, command=lambda k=key: press(k)).grid(row=i // 3 + 1, column=i % 3)\nroot.mainloop()\n",
          teaches: [".grid", "lambda", "eval"]
        },
        keypad
      ]
    }
  ],
  ending: [
    { speaker: "robot", text: "Твій калькулятор Pro готовий! У ньому все, як у справжнього: табло, клавіатура, чотири дії й захист від помилок." },
    { speaker: "robot", text: "Спробуй додати свої кнопки: квадрат числа, корінь чи відсотки." }
  ]
}
