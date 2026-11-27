import { _ as verdictMessage, a as isStepDone, b as workerDriver, c as missionScore, d as checkProgram, f as missingWords, g as showsValue, h as runTrial, i as emptyProgress, l as taskSteps, m as normalizeOutput, n as checkMission, o as makeReport, p as normalizeAnswer, r as currentStep, s as markSolved, t as allSteps, u as answerIsRight, v as wordsOf, y as TurnEnds } from "./progress-BmRxRV8G.js";
// src/quests/types.ts
/**
* Missions of the Python tasks: a story told by steps. A lesson explains new words of Python, a program step asks
* for a program that the trainer runs on trials, an answer step asks for a value that the student finds with a
* program. In all texts, words in `backticks` are Python code.
*/
/** Who speaks a story line: the robot Біт (chat bubbles), the narrator or the captain of the station. */
var Speakers = {
	Robot: "robot",
	Narrator: "narrator",
	Captain: "captain"
};
// src/quests/missions/calculator.ts
/**
* Mission 2, «Свій калькулятор», for grades 7–9: the student makes a calculator with windows from nothing, step
* by step: a window, a field and a button, four operations, protection from mistakes, and a keypad. The trials
* type into the fields and click the buttons of the student's window, then read what the window shows.
*/
var type = (field, text) => ({
	_tag: "Type",
	field,
	text
});
var click = (button) => ({
	_tag: "Click",
	button
});
var shows = (text) => ({
	_tag: "Shows",
	text
});
var trial$1 = (label, actions, expect, why) => ({
	_tag: "Window",
	label,
	actions,
	expect,
	why
});
var program$1 = (s) => ({
	kind: "program",
	...s
});
/** Clicks on the buttons of the keys, one by one: "12+3=" is 1, 2, +, 3, =. */
var keys = (text) => [...text].map(click);
var WINDOW = `from tkinter import *

root = Tk()
root.title("Калькулятор")
Label(root, text="Мій калькулятор").pack()
root.mainloop()
`;
var DOUBLE = `from tkinter import *

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
`;
var SUM = `from tkinter import *

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
`;
var FOUR = `from tkinter import *

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
`;
var SAFE = `from tkinter import *

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
`;
var KEYPAD = `from tkinter import *

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
`;
var window = program$1({
	id: "window",
	title: "Перше вікно",
	story: [{
		speaker: "robot",
		text: "Справжні програми мають вікна з кнопками. Почнемо з порожнього вікна з написом."
	}],
	task: "Створи вікно із заголовком `Калькулятор` і написом (`Label`) `Мій калькулятор`.",
	solution: WINDOW,
	starter: "from tkinter import *\n\nroot = Tk()\n",
	trials: [trial$1("Вікно відкривається", [], [{
		_tag: "Title",
		text: "Калькулятор"
	}, {
		_tag: "Widget",
		kind: "Label",
		text: "Мій калькулятор"
	}], "У вікні має бути напис `Label` з текстом «Мій калькулятор». Не забудь `.pack()`, щоб напис з'явився.")],
	mustUse: [
		"Tk",
		"Label",
		"mainloop"
	],
	hints: [
		"Заголовок вікна задає `root.title(\"Калькулятор\")`.",
		"Напис: `Label(root, text=\"Мій калькулятор\").pack()`.",
		"Останній рядок програми — `root.mainloop()`: він тримає вікно відкритим."
	],
	clue: "Вікно калькулятора відкривається."
});
var double = program$1({
	id: "double",
	title: "Кнопка «x2»",
	story: [{
		speaker: "robot",
		text: "Тепер навчимо вікно рахувати. Почнемо з однієї дії: подвоїти число."
	}],
	task: "Зроби вікно з полем введення (`Entry`), кнопкою `x2` і написом (`Label`). Коли натискають `x2`, напис показує число з поля, помножене на 2.",
	solution: DOUBLE,
	starter: "from tkinter import *\n\nroot = Tk()\nroot.title(\"Калькулятор\")\n\nroot.mainloop()\n",
	trials: [
		trial$1("21 × 2", [type(1, "21"), click("x2")], [shows("42")], "Після натискання `x2` напис має показати подвоєне число."),
		trial$1("−5 × 2", [type(1, "-5"), click("x2")], [shows("-10")], "Від'ємні числа теж подвоюються: −5 × 2 = −10."),
		trial$1("7 × 2", [type(1, "7"), click("x2")], [shows("14")], "Перетвори текст поля на число: `int(entry.get())`, інакше «7» × 2 дасть «77».")
	],
	mustUse: [
		"Entry",
		"Button",
		"def"
	],
	hints: [
		"Спершу створи поле `entry = Entry(root)` і напис `result = Label(root, text=\"\")`, і для кожного викличи `.pack()`.",
		"Напиши функцію `def double():`, яка бере число `int(entry.get())` і змінює напис: `result.config(text=n * 2)`.",
		"Кнопка викликає функцію без дужок: `Button(root, text=\"x2\", command=double).pack()`."
	],
	clue: "Калькулятор уміє подвоювати."
});
var sum = program$1({
	id: "sum",
	title: "Додавання",
	story: [{
		speaker: "robot",
		text: "Справжній калькулятор працює з двома числами. Додай друге поле."
	}],
	task: "Зроби вікно з двома полями (`Entry`), кнопкою `+` і написом. Кнопка `+` показує в написі суму двох чисел.",
	solution: SUM,
	starter: "",
	trials: [
		trial$1("2 + 3", [
			type(1, "2"),
			type(2, "3"),
			click("+")
		], [shows("5")], "Після `+` напис має показати суму двох чисел."),
		trial$1("10 + (−4)", [
			type(1, "10"),
			type(2, "-4"),
			click("+")
		], [shows("6")], "Сума неправильна. Перетвори обидва поля на числа: `int(a.get()) + int(b.get())`."),
		trial$1("40 + 2", [
			type(1, "40"),
			type(2, "2"),
			click("+")
		], [shows("42")], "Якщо видно «402», то числа склеїлися як текст. Перетвори їх через `int()`.")
	],
	mustUse: ["Entry", "Button"],
	hints: ["Два поля: `a = Entry(root)` і `b = Entry(root)`, кожне з `.pack()`.", "У функції кнопки: `result.config(text=int(a.get()) + int(b.get()))`."],
	clue: "Калькулятор додає два числа."
});
var four = program$1({
	id: "four",
	title: "Чотири дії",
	story: [{
		speaker: "robot",
		text: "Додай кнопки `-`, `*` і `/`. Для кожної кнопки — своя функція."
	}],
	task: "Зроби калькулятор із двома полями, кнопками `+`, `-`, `*`, `/` і написом для результату.",
	solution: FOUR,
	starter: "",
	trials: [
		trial$1("6 + 3", [
			type(1, "6"),
			type(2, "3"),
			click("+")
		], [shows("9")], "Кнопка `+` має показати суму."),
		trial$1("6 − 8", [
			type(1, "6"),
			type(2, "8"),
			click("-")
		], [shows("-2")], "Кнопка `-` має показати різницю: перше число мінус друге."),
		trial$1("6 × 7", [
			type(1, "6"),
			type(2, "7"),
			click("*")
		], [shows("42")], "Кнопка `*` має показати добуток."),
		trial$1("7 ÷ 2", [
			type(1, "7"),
			type(2, "2"),
			click("/")
		], [shows("3.5")], "Кнопка `/` має показати частку: 7 / 2 = 3.5. Ділення націло `//` тут не підходить.")
	],
	mustUse: ["def"],
	hints: ["Напиши чотири функції: `add`, `sub`, `mul`, `div`. Вони відрізняються лише знаком дії.", "Для кожної кнопки: `Button(root, text=\"-\", command=sub).pack()`."],
	clue: "Калькулятор знає всі чотири дії."
});
var safe = program$1({
	id: "safe",
	title: "Захист від помилок",
	story: [{
		speaker: "robot",
		text: "Спробуй поділити на 0 або ввести літери: програма зламається з помилкою. Справжній калькулятор так не робить."
	}],
	task: "Зроби калькулятор із чотирма діями, який працює з дробами (`2.5`). Якщо в полі не число, напис показує `Введи число`. Якщо ділять на 0 — `На нуль ділити не можна`.",
	solution: SAFE,
	starter: FOUR,
	trials: [
		trial$1("2.5 + 1.25", [
			type(1, "2.5"),
			type(2, "1.25"),
			click("+")
		], [shows("3.75")], "Калькулятор має працювати з дробами. Замість `int()` використай `float()`."),
		trial$1("Ділення на 0", [
			type(1, "5"),
			type(2, "0"),
			click("/")
		], [shows("На нуль ділити не можна")], "Перед діленням перевір, чи друге число не 0."),
		trial$1("Літери в полі", [
			type(1, "abc"),
			type(2, "3"),
			click("+")
		], [shows("Введи число")], "Коли в полі не число, `float()` дає помилку `ValueError`. Злови її в `try`/`except`."),
		trial$1("9 × 0.5", [
			type(1, "9"),
			type(2, "0.5"),
			click("*")
		], [shows("4.5")], "Множення має працювати і з дробами.")
	],
	mustUse: ["try", "except"],
	hints: [
		"`float(\"2.5\")` дає число 2.5, а `float(\"abc\")` — помилку `ValueError`.",
		"Обгорни читання полів у `try:` … `except ValueError:` і там напиши `result.config(text=\"Введи число\")`.",
		"Перед діленням: `if y == 0:` показати повідомлення, `else:` поділити."
	],
	clue: "Калькулятор не боїться помилок."
});
var keypad = program$1({
	id: "keypad",
	title: "Кнопки з цифрами",
	story: [{
		speaker: "robot",
		text: "Останній крок — справжній калькулятор: табло й кнопки з цифрами, як на телефоні."
	}],
	task: "Зроби калькулятор із табло (`Entry`) і кнопками `0`–`9`, `+`, `-`, `*`, `/`, `=` і `C`. Кнопки цифр і дій дописують свій символ на табло, `=` показує результат, `C` очищає табло. Ділення на 0 показує `Помилка`.",
	solution: KEYPAD,
	starter: "",
	trials: [
		trial$1("12 + 3 =", keys("12+3="), [shows("15")], "Натисни 1, 2, +, 3, =: табло має показати 15."),
		trial$1("9 × 8 =", keys("9*8="), [shows("72")], "Натисни 9, *, 8, =: табло має показати 72."),
		trial$1("Очищення", keys("7C4="), [shows("4")], "Після `C` табло має очиститися: 7, C, 4, = дає 4."),
		trial$1("Ділення на 0", keys("8/0="), [shows("Помилка")], "Ділення на 0 має показати `Помилка`, а не зупинити програму.")
	],
	mustUse: ["grid"],
	hints: [
		"Кнопки зручно розставити сіткою: `Button(...).grid(row=1, column=0)`.",
		"Кнопка дописує символ: `display.insert(END, \"7\")`. Щоб не писати 16 функцій, використай `lambda k=key: press(k)` у циклі.",
		"`eval(\"12+3\")` рахує вираз з рядка. А `display.delete(0, END)` очищає табло."
	],
	clue: "Калькулятор готовий!"
});
var calculator = {
	id: "calculator",
	title: "Свій калькулятор",
	summary: "Зроби з нуля справжній калькулятор у вікні: поле, кнопки, чотири дії, захист від помилок і клавіатура з цифрами. Усе на Python і tkinter.",
	grades: "7–9",
	file: "калькулятор.py",
	chapters: [
		{
			id: "first-window",
			title: "Перше вікно",
			topics: "tkinter, Tk, Label, mainloop",
			steps: [{
				kind: "lesson",
				id: "window-lesson",
				title: "Вікно програми",
				story: [{
					speaker: "robot",
					text: "Модуль `tkinter` малює вікна, написи, поля й кнопки."
				}],
				explain: [
					"`from tkinter import *` підключає модуль. `root = Tk()` створює головне вікно, а `root.title(\"…\")` дає йому заголовок.",
					"`Label(root, text=\"…\")` створює напис у вікні. Щоб він з'явився, його треба розмістити: `.pack()` ставить елементи один під одним.",
					"Останній рядок — `root.mainloop()`: вікно чекає дій людини, доки його не закриють."
				],
				syntax: "from tkinter import *\nroot = Tk()\nLabel(root, text=\"напис\").pack()\nroot.mainloop()",
				notes: [
					{
						code: "root = Tk()",
						text: "Створює вікно."
					},
					{
						code: "root.title(\"Привіт\")",
						text: "Заголовок вікна."
					},
					{
						code: "Label(root, text=\"Привіт\").pack()",
						text: "Напис у вікні."
					},
					{
						code: "root.mainloop()",
						text: "Тримає вікно відкритим."
					}
				],
				example: "from tkinter import *\n\nroot = Tk()\nroot.title(\"Привіт\")\nLabel(root, text=\"Моє перше вікно\", font=(\"Arial\", 16)).pack()\nroot.mainloop()\n"
			}, window]
		},
		{
			id: "button",
			title: "Поле і кнопка",
			topics: "Entry, Button, def, command",
			steps: [{
				kind: "lesson",
				id: "button-lesson",
				title: "Поле, кнопка й функція",
				story: [{
					speaker: "robot",
					text: "Кнопка викликає функцію. А функція може прочитати поле й змінити напис."
				}],
				explain: [
					"`Entry(root)` — поле для введення. `entry.get()` повертає текст із поля (рядок!), тому для чисел потрібен `int()`.",
					"`def назва():` створює функцію: рядки з відступом виконуються, коли її викликають.",
					"`Button(root, text=\"OK\", command=назва)` — кнопка, яка викликає функцію. Назву функції пиши без дужок.",
					"`напис.config(text=…)` змінює текст напису."
				],
				syntax: "def дія():\n    n = int(entry.get())\n    напис.config(text=n)\n\nButton(root, text=\"OK\", command=дія).pack()",
				notes: [
					{
						code: "entry = Entry(root)",
						text: "Поле для введення."
					},
					{
						code: "entry.get()",
						text: "Текст із поля."
					},
					{
						code: "command=hello",
						text: "Кнопка викличе функцію `hello`."
					},
					{
						code: "label.config(text=\"Так\")",
						text: "Новий текст напису."
					}
				],
				example: "from tkinter import *\n\nroot = Tk()\nroot.title(\"Привітання\")\nentry = Entry(root)\nentry.pack()\n\ndef hello():\n    label.config(text=\"Привіт, \" + entry.get() + \"!\")\n\nButton(root, text=\"Привітатися\", command=hello).pack()\nlabel = Label(root, text=\"\")\nlabel.pack()\nroot.mainloop()\n"
			}, double]
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
			steps: [{
				kind: "lesson",
				id: "try-lesson",
				title: "Ловимо помилки",
				story: [{
					speaker: "robot",
					text: "Люди вводять що завгодно. Хороша програма не ламається, а пояснює, що не так."
				}],
				explain: [
					"`float(\"2.5\")` перетворює текст на дробове число. Якщо в тексті не число, Python видає помилку `ValueError`.",
					"`try:` пробує виконати рядки з відступом. Якщо там сталася помилка, Python не зупиняється, а виконує рядки після `except ValueError:`.",
					"Ділення на 0 краще перевірити заздалегідь умовою `if y == 0:`.",
					"`return` у функції завершує її одразу: решта рядків не виконується."
				],
				syntax: "try:\n    x = float(a.get())\nexcept ValueError:\n    напис.config(text=\"Введи число\")\n    return",
				notes: [
					{
						code: "float(\"2.5\")",
						text: "`2.5`"
					},
					{
						code: "float(\"abc\")",
						text: "Помилка `ValueError`."
					},
					{
						code: "except ValueError:",
						text: "Що робити, коли сталася така помилка."
					}
				],
				example: "text = input(\"Число: \")\ntry:\n    x = float(text)\n    print(\"Половина:\", x / 2)\nexcept ValueError:\n    print(\"Це не число\")\n"
			}, safe]
		},
		{
			id: "keypad",
			title: "Кнопки з цифрами",
			topics: "grid, lambda, insert, delete, eval",
			steps: [{
				kind: "lesson",
				id: "keypad-lesson",
				title: "Сітка кнопок",
				story: [{
					speaker: "robot",
					text: "Шістнадцять кнопок не пишуть по одній. Їх створює цикл, а розставляє сітка."
				}],
				explain: [
					"`.grid(row=1, column=2)` ставить елемент у рядок 1 і стовпець 2 сітки. `columnspan=4` розтягує його на 4 стовпці.",
					"`display.insert(END, \"7\")` дописує текст у кінець поля, а `display.delete(0, END)` очищає поле.",
					"`lambda k=key: press(k)` — коротка функція без назви. Так кожна кнопка циклу викликає `press` зі своєю цифрою.",
					"`eval(\"12+3\")` рахує вираз, записаний у рядку, і дає `15`."
				],
				syntax: "for r in range(4):\n    for c in range(4):\n        Button(root, text=..., command=...).grid(row=r, column=c)",
				notes: [
					{
						code: "w.grid(row=0, column=1)",
						text: "Місце в сітці."
					},
					{
						code: "e.insert(END, \"5\")",
						text: "Дописати в кінець поля."
					},
					{
						code: "e.delete(0, END)",
						text: "Очистити поле."
					},
					{
						code: "eval(\"2*21\")",
						text: "`42`"
					}
				],
				example: "from tkinter import *\n\nroot = Tk()\nroot.title(\"Сітка\")\ndisplay = Entry(root)\ndisplay.grid(row=0, column=0, columnspan=3)\n\ndef press(key):\n    display.insert(END, key)\n\nfor i in range(9):\n    key = str(i + 1)\n    Button(root, text=key, width=4, command=lambda k=key: press(k)).grid(row=i // 3 + 1, column=i % 3)\nroot.mainloop()\n"
			}, keypad]
		}
	],
	ending: [{
		speaker: "robot",
		text: "Твій калькулятор готовий! У ньому все, як у справжнього: табло, клавіатура, чотири дії й захист від помилок."
	}, {
		speaker: "robot",
		text: "Спробуй додати свої кнопки: квадрат числа, корінь чи відсотки."
	}]
};
// src/quests/missions/space-station.ts
/**
* Mission 1, «Космічна станція «Мрія»», for grades 5–8: the student is the new programmer of the station and
* repairs its systems with `print`, `input`, arithmetic, `if`, `for`, `while` and strings. Every program is
* checked by its output on several inputs, so any correct program is accepted.
*/
var trial = (label, input, output, why, mistakes) => ({
	_tag: "Console",
	label,
	input,
	output,
	why,
	mistakes
});
var program = (s) => ({
	kind: "program",
	mustUse: [],
	...s
});
/** Numbers typed with `input()` stay text: "7" + "3" is "73". */
var glued = (a, b) => ({
	output: a + b,
	why: `Програма склеїла ${a} і ${b} як текст. Те, що повертає \`input()\`, — це рядок. Перетвори його на число: \`int(input())\`.`
});
var greeting = program({
	id: "greeting",
	title: "Станція на зв'язку",
	story: [{
		speaker: "narrator",
		text: "Орбітальна станція «Мрія» летить на висоті 400 км. Сьогодні на борт прибуває новий бортовий програміст — ти."
	}, {
		speaker: "captain",
		text: "Програмісте, Земля чекає нашого сигналу. Передай два рядки, слово в слово, і ми почнемо роботу."
	}],
	task: "Напиши програму, яка виводить два рядки:\n`Станція Мрія на зв'язку!`\n`Екіпаж: 4 космонавти`",
	solution: "print(\"Станція Мрія на зв'язку!\")\nprint(\"Екіпаж: 4 космонавти\")\n",
	starter: "",
	trials: [trial("Сигнал на Землю", "", "Станція Мрія на зв'язку!\nЕкіпаж: 4 космонавти", "Земля отримала не той сигнал. Порівняй кожен рядок зі зразком: літери, пробіли, двокрапку й знак оклику.", [])],
	hints: [
		"Кожен рядок — це окремий `print()`.",
		"У слові «зв'язку» є апостроф. Тому текст бери в подвійні лапки: `\"...\"`.",
		"`print(\"Станція Мрія на зв'язку!\")` і ще один `print` для екіпажу."
	],
	clue: "Зв'язок із Землею налагоджено."
});
var water = program({
	id: "water",
	title: "Запас води",
	story: [{
		speaker: "captain",
		text: "Кожен із 4 космонавтів випиває 3 літри води на день. Скільки літрів нам треба на тиждень?"
	}, {
		speaker: "robot",
		text: "Python рахує, як калькулятор: `*` — множення. Не рахуй сам, нехай рахує програма!"
	}],
	task: "Виведи, скільки літрів води потрібно 4 космонавтам на 7 днів, якщо кожен випиває 3 літри на день. Програма має вивести лише число.",
	solution: "print(4 * 3 * 7)\n",
	starter: "",
	trials: [trial("Розрахунок на тиждень", "", "84", "Число неправильне. Перемнож кількість космонавтів, літри на день і кількість днів.", [{
		output: "4 * 3 * 7",
		why: "Програма вивела вираз як текст. Прибери лапки: `print(4 * 3 * 7)`."
	}, {
		output: "12",
		why: "Це запас лише на один день. Помнож ще на 7 днів."
	}])],
	hints: ["Множення в Python пишеться зірочкою: `*`.", "`print(4 * 3 * 7)` — без лапок, щоб Python порахував."],
	clue: "На тиждень потрібно 84 літри води."
});
var hello = program({
	id: "hello",
	title: "Привітання на борту",
	story: [{
		speaker: "robot",
		text: "До станції прилітають гості. Бортовий комп'ютер має питати ім'я і вітати кожного особисто."
	}],
	task: "Програма питає ім'я і виводить `Вітаю на борту, ІМ'Я!` Наприклад, для імені `Олена` вона виводить `Вітаю на борту, Олена!`",
	solution: "name = input(\"Як тебе звати? \")\nprint(\"Вітаю на борту, \" + name + \"!\")\n",
	starter: "name = input(\"Як тебе звати? \")\n",
	trials: [trial("Гостя Олена", "Олена", "Вітаю на борту, Олена!", "Привітання має бути точно за зразком: `Вітаю на борту, ` + ім'я + `!`.", [{
		output: "Вітаю на борту, name!",
		why: "Програма вивела слово «name», а не ім'я гостя. Змінну пиши без лапок: `\"Вітаю на борту, \" + name + \"!\"`."
	}, {
		output: "Вітаю на борту, Олена !",
		why: "Перед знаком оклику з'явився зайвий пробіл: `print` з комами ставить пробіли між значеннями. Склей рядки через `+`."
	}]), trial("Гість Тарас", "Тарас", "Вітаю на борту, Тарас!", "Програма має вітати того, чиє ім'я ввели, а не одне й те саме ім'я.", [{
		output: "Вітаю на борту, Тарас !",
		why: "Перед знаком оклику з'явився зайвий пробіл. Склей рядки через `+`."
	}])],
	mustUse: ["input"],
	hints: ["Ім'я вже зберігається у змінній `name`. Тепер виведи його разом із привітанням.", "Рядки можна склеїти знаком `+`: `\"Вітаю на борту, \" + name + \"!\"`."],
	clue: "Бортовий комп'ютер вітає гостей на ім'я."
});
var fuel = program({
	id: "fuel",
	title: "Два баки пального",
	story: [{
		speaker: "captain",
		text: "У нас два баки пального. Програма має питати, скільки тонн у кожному, і показувати, скільки разом."
	}, {
		speaker: "robot",
		text: "Обережно: `input()` завжди повертає текст. А текст «7» плюс текст «3» — це «73»!"
	}],
	task: "Програма читає два цілі числа (кожне в окремому рядку) і виводить їхню суму.",
	solution: "a = int(input())\nb = int(input())\nprint(a + b)\n",
	starter: "a = input(\"Бак 1: \")\nb = input(\"Бак 2: \")\nprint(a + b)\n",
	trials: [
		trial("Баки 7 і 3", "7\n3", "10", "Сума неправильна. Програма має додати два числа, які ввели.", [glued("7", "3")]),
		trial("Баки 25 і 17", "25\n17", "42", "Сума неправильна. Програма має додати два числа, які ввели.", [glued("25", "17")]),
		trial("Один бак порожній", "0\n12", "12", "Сума неправильна. Програма має додати два числа, які ввели.", [glued("0", "12")])
	],
	mustUse: ["int"],
	hints: ["Запусти стартову програму з числами 7 і 3. Бачиш «73»? Це склеєний текст.", "Перетвори текст на число функцією `int()`: `a = int(input(\"Бак 1: \"))`."],
	clue: "Разом у баках 42 тонни пального."
});
var session = program({
	id: "session",
	title: "Сеанс зв'язку",
	story: [{
		speaker: "robot",
		text: "Таймер показує тривалість сеансу зв'язку лише в хвилинах. Капітан хоче бачити години й хвилини."
	}, {
		speaker: "robot",
		text: "Підкажу дві дії: `//` ділить націло (`135 // 60` дає `2`), а `%` дає остачу (`135 % 60` дає `15`)."
	}],
	task: "Програма читає ціле число хвилин і виводить його як `2 год 15 хв` (для 135 хвилин).",
	solution: "m = int(input())\nprint(m // 60, \"год\", m % 60, \"хв\")\n",
	starter: "m = int(input(\"Хвилин: \"))\n",
	trials: [
		trial("135 хвилин", "135", "2 год 15 хв", "Перевір години (`m // 60`) і хвилини (`m % 60`) та формат: `2 год 15 хв`.", [{
			output: "2.25 год 15 хв",
			why: "Звичайне ділення `/` дає дріб. Для цілих годин потрібне ділення націло: `//`."
		}]),
		trial("Рівно година", "60", "1 год 0 хв", "Перевір години (`m // 60`) і хвилини (`m % 60`) та формат.", [{
			output: "1.0 год 0 хв",
			why: "Звичайне ділення `/` дає дріб. Для цілих годин потрібне ділення націло: `//`."
		}]),
		trial("Менше години", "59", "0 год 59 хв", "Навіть якщо годин 0, програма все одно має їх показати: `0 год 59 хв`.", [])
	],
	hints: ["Години: `m // 60`. Хвилини, що лишилися: `m % 60`.", "`print(m // 60, \"год\", m % 60, \"хв\")` — кома ставить пробіл між значеннями."],
	clue: "Сеанс зв'язку триває 2 год 15 хв."
});
var temperature = program({
	id: "temperature",
	title: "Датчик температури",
	story: [{
		speaker: "captain",
		text: "У модулі оранжереї зламалася сигналізація. Рослинам добре від 10 до 30 градусів."
	}, {
		speaker: "robot",
		text: "Програма має сама вирішувати, що вивести. Для цього є `if`, `elif` і `else`."
	}],
	task: "Програма читає ціле число (температуру). Якщо вона більша за 30, виводить `Перегрів!`, якщо менша за 10 — `Холодно!`, а інакше — `Норма`.",
	solution: "t = int(input())\nif t > 30:\n    print(\"Перегрів!\")\nelif t < 10:\n    print(\"Холодно!\")\nelse:\n    print(\"Норма\")\n",
	starter: "t = int(input(\"Температура: \"))\n",
	trials: [
		trial("Спека 35°", "35", "Перегрів!", "При 35 градусах потрібно вивести `Перегрів!`.", []),
		trial("Мороз 5°", "5", "Холодно!", "При 5 градусах потрібно вивести `Холодно!`.", []),
		trial("Тепло 20°", "20", "Норма", "При 20 градусах усе гаразд: потрібно вивести `Норма`.", [{
			output: "Перегрів!\nНорма",
			why: "Програма вивела два слова. Використай `elif` і `else`, щоб спрацьовувала лише одна гілка."
		}]),
		trial("Рівно 30°", "30", "Норма", "30 градусів — це ще норма: перегрів буде лише тоді, коли більше за 30. Використай `>`, а не `>=`.", []),
		trial("Рівно 10°", "10", "Норма", "10 градусів — це ще норма: холодно буде лише тоді, коли менше за 10. Використай `<`, а не `<=`.", [])
	],
	mustUse: ["if", "else"],
	hints: [
		"Почни з `if t > 30:` і з відступом напиши `print(\"Перегрів!\")`.",
		"Друга умова — `elif t < 10:`, а все інше — `else:`.",
		"Не забувай про двокрапку в кінці рядків з `if`, `elif`, `else` і про відступ у 4 пробіли."
	],
	clue: "Сигналізація оранжереї знову працює."
});
var password = program({
	id: "password",
	title: "Пароль шлюзу",
	story: [{
		speaker: "captain",
		text: "Шлюз до відкритого космосу має відкриватися лише за паролем `зоря`."
	}, {
		speaker: "robot",
		text: "Щоб порівняти два значення, пиши `==` (два знаки рівності). Один знак `=` лише кладе значення в змінну."
	}],
	task: "Програма читає пароль. Якщо це `зоря`, вона виводить `Шлюз відкрито`, а інакше — `Доступ заборонено`.",
	solution: "p = input()\nif p == \"зоря\":\n    print(\"Шлюз відкрито\")\nelse:\n    print(\"Доступ заборонено\")\n",
	starter: "p = input(\"Пароль: \")\n",
	trials: [
		trial("Правильний пароль", "зоря", "Шлюз відкрито", "З правильним паролем `зоря` шлюз має відкритися.", []),
		trial("Пароль 1234", "1234", "Доступ заборонено", "З чужим паролем шлюз має лишитися зачиненим.", []),
		trial("Пароль «Зоря» з великої літери", "Зоря", "Доступ заборонено", "Для Python «Зоря» і «зоря» — різні рядки. Пароль має збігатися точно.", [])
	],
	mustUse: ["if", "else"],
	hints: ["Порівняй змінну з паролем: `if p == \"зоря\":`.", "Пароль — це текст, тому він у лапках. А `int()` тут не потрібен."],
	clue: "Шлюз відкривається лише за паролем."
});
var countdown = program({
	id: "countdown",
	title: "Зворотний відлік",
	story: [{
		speaker: "captain",
		text: "До Мрії летить вантажний корабель. Перед стикуванням потрібен зворотний відлік."
	}, {
		speaker: "robot",
		text: "`range` вміє рахувати й назад: `range(5, 0, -1)` дає 5, 4, 3, 2, 1."
	}],
	task: "Програма читає число n і виводить числа від n до 1 (кожне в окремому рядку), а потім `Старт!`.",
	solution: "n = int(input())\nfor i in range(n, 0, -1):\n    print(i)\nprint(\"Старт!\")\n",
	starter: "n = int(input(\"Відлік від: \"))\n",
	trials: [
		trial("Відлік від 3", "3", "3\n2\n1\nСтарт!", "Потрібні числа 3, 2, 1, а тоді `Старт!` один раз.", [
			{
				output: "3\nСтарт!\n2\nСтарт!\n1\nСтарт!",
				why: "`Старт!` виводиться в кожному кроці циклу. Напиши цей `print` без відступу, після циклу."
			},
			{
				output: "3\n2\n1\n0\nСтарт!",
				why: "Відлік має закінчитися на 1, без 0. У `range` останнє число не входить: `range(n, 0, -1)`."
			},
			{
				output: "1\n2\n3\nСтарт!",
				why: "Відлік іде вгору, а треба вниз. Використай `range(n, 0, -1)`."
			}
		]),
		trial("Відлік від 5", "5", "5\n4\n3\n2\n1\nСтарт!", "Потрібні числа від 5 до 1, а тоді `Старт!`.", []),
		trial("Відлік від 1", "1", "1\nСтарт!", "Від 1 відлік короткий: `1`, а тоді `Старт!`.", [])
	],
	mustUse: ["for"],
	hints: ["Цикл `for i in range(n, 0, -1):` дає числа від n до 1.", "`print(\"Старт!\")` пиши без відступу, після циклу, щоб він спрацював один раз."],
	clue: "Вантажний корабель пристикувався."
});
var cargo = program({
	id: "cargo",
	title: "Вантаж корабля",
	story: [{
		speaker: "robot",
		text: "Корабель привіз кілька контейнерів. Спершу введуть, скільки їх, а тоді — масу кожного. Капітан хоче знати загальну масу."
	}],
	task: "Програма читає число n, а потім n чисел (маси контейнерів, кожна в окремому рядку). Виведи загальну масу.",
	solution: "n = int(input())\ntotal = 0\nfor i in range(n):\n    total = total + int(input())\nprint(total)\n",
	starter: "n = int(input(\"Контейнерів: \"))\ntotal = 0\n",
	trials: [
		trial("3 контейнери", "3\n10\n20\n5", "35", "Маса неправильна. Додай масу кожного контейнера до `total`.", [{
			output: "5",
			why: "Програма показала лише останній контейнер. Додавай до суми: `total = total + int(input())`."
		}, {
			output: "0",
			why: "Сума лишилася 0. Усередині циклу читай масу й додавай її до `total`."
		}]),
		trial("Один контейнер", "1\n7", "7", "Для одного контейнера сума дорівнює його масі.", []),
		trial("4 однакові", "4\n2\n2\n2\n2", "8", "Маса неправильна. Додай масу кожного контейнера до `total`.", [{
			output: "2",
			why: "Програма показала лише останній контейнер. Додавай до суми: `total = total + int(input())`."
		}])
	],
	mustUse: ["for"],
	hints: [
		"Цикл `for i in range(n):` повториться n разів — стільки, скільки контейнерів.",
		"У тілі циклу читай масу й додавай її: `total = total + int(input())`.",
		"`print(total)` пиши після циклу, без відступу."
	],
	clue: "Вантаж корабля зважено."
});
var orbit = {
	kind: "answer",
	id: "orbit",
	title: "Висота орбіти",
	story: [{
		speaker: "captain",
		text: "Станція щодня трохи знижується, на 2 км. Програма рахує висоту через 10 днів."
	}, {
		speaker: "robot",
		text: "Зміни програму так, щоб вона порахувала висоту через 30 днів."
	}],
	question: "Якою буде висота станції через 30 днів? Впиши число кілометрів.",
	starter: "height = 400\nfor day in range(10):\n    height = height - 2\nprint(height)\n",
	accepted: ["340", "340 км"],
	hints: ["Запусти програму: вона показує висоту через 10 днів.", "Зміни `range(10)` на `range(30)` і запусти ще раз."],
	clue: "Через 30 днів станції треба підняти орбіту: висота буде 340 км."
};
var airlock = program({
	id: "airlock",
	title: "Наполегливий шлюз",
	story: [{
		speaker: "captain",
		text: "Космонавти скаржаться: шлюз питає пароль лише один раз. Він має питати знову й знову, доки не введуть `зоря`."
	}, {
		speaker: "robot",
		text: "Коли невідомо, скільки буде спроб, допоможе `while`: він повторює, доки умова правдива."
	}],
	task: "Програма читає паролі, доки не введуть `зоря`. Після кожного неправильного пароля виводить `Спроба не вдалася`, а після правильного — `Шлюз відкрито`.",
	solution: "p = input()\nwhile p != \"зоря\":\n    print(\"Спроба не вдалася\")\n    p = input()\nprint(\"Шлюз відкрито\")\n",
	starter: "p = input(\"Пароль: \")\n",
	trials: [
		trial("Одразу правильний", "зоря", "Шлюз відкрито", "З правильним паролем шлюз відкривається одразу, без повідомлень про невдалі спроби.", []),
		trial("Дві помилки", "1111\nмрія\nзоря", "Спроба не вдалася\nСпроба не вдалася\nШлюз відкрито", "Після кожного неправильного пароля — `Спроба не вдалася`, а після `зоря` — `Шлюз відкрито`.", [{
			output: "Спроба не вдалася\nШлюз відкрито",
			why: "Програма перевірила лише один неправильний пароль. Читай новий пароль усередині циклу `while`."
		}]),
		trial("П'ять помилок", "a\nb\nc\nd\ne\nзоря", "Спроба не вдалася\nСпроба не вдалася\nСпроба не вдалася\nСпроба не вдалася\nСпроба не вдалася\nШлюз відкрито", "Шлюз має питати стільки разів, скільки потрібно, а не певну кількість разів.", [])
	],
	mustUse: ["while"],
	hints: [
		"Умова циклу: поки пароль не `зоря` — `while p != \"зоря\":`.",
		"У тілі циклу виведи `Спроба не вдалася` і прочитай новий пароль: `p = input()`.",
		"`print(\"Шлюз відкрито\")` пиши після циклу."
	],
	clue: "Шлюз питає пароль, доки його не введуть правильно."
});
var algae = program({
	id: "algae",
	title: "Водорості в оранжереї",
	story: [{
		speaker: "robot",
		text: "В оранжереї ростуть водорості для кисню. Їхня маса подвоюється щогодини. Капітан питає: скільки годин чекати, доки маса досягне потрібної?"
	}],
	task: "Програма читає два цілі числа: масу водоростей зараз і потрібну масу. Виведи, скільки годин мине, доки маса стане не меншою за потрібну.",
	solution: "mass = int(input())\ngoal = int(input())\nhours = 0\nwhile mass < goal:\n    mass = mass * 2\n    hours = hours + 1\nprint(hours)\n",
	starter: "mass = int(input(\"Маса зараз: \"))\ngoal = int(input(\"Потрібна маса: \"))\nhours = 0\n",
	trials: [
		trial("Від 1 до 100", "1\n100", "7", "1, 2, 4, 8, 16, 32, 64, 128: потрібно 7 годин.", [{
			output: "6",
			why: "Через 6 годин маса лише 64, а треба 100. Цикл має тривати, доки маса менша за потрібну: `while mass < goal:`."
		}, {
			output: "128",
			why: "Програма вивела масу, а треба кількість годин. Рахуй години в окремій змінній."
		}]),
		trial("Від 3 до 48", "3\n48", "4", "3, 6, 12, 24, 48: маса 48 уже не менша за потрібну, тож 4 години.", [{
			output: "5",
			why: "Коли маса дорівнює потрібній, чекати вже не треба. Умова — `mass < goal`, а не `mass <= goal`."
		}]),
		trial("Уже досить", "50\n20", "0", "Маси вже досить, тож чекати 0 годин: цикл не має виконатися жодного разу.", [])
	],
	mustUse: ["while"],
	hints: ["Поки маса менша за потрібну (`while mass < goal:`), подвоюй її і додавай годину.", "У тілі циклу два рядки: `mass = mass * 2` і `hours = hours + 1`."],
	clue: "Оранжерея дасть досить кисню вже за кілька годин."
});
var callsign = program({
	id: "callsign",
	title: "Позивний",
	story: [{
		speaker: "robot",
		text: "Кожен корабель має позивний. Бортовий журнал записує першу літеру позивного, останню й кількість літер."
	}, {
		speaker: "robot",
		text: "Літери рядка мають номери від 0: `s[0]` — перша, `s[-1]` — остання. А `len(s)` — довжина."
	}],
	task: "Програма читає позивний і виводить три рядки: першу літеру, останню літеру й кількість літер.",
	solution: "s = input()\nprint(s[0])\nprint(s[-1])\nprint(len(s))\n",
	starter: "s = input(\"Позивний: \")\n",
	trials: [
		trial("Позивний Сокіл", "Сокіл", "С\nл\n5", "Для «Сокіл» потрібно: `С`, `л` і `5`.", [{
			output: "о\nл\n5",
			why: "Номери літер починаються з 0. Перша літера — `s[0]`, а не `s[1]`."
		}]),
		trial("Позивний Орбіта", "Орбіта", "О\nа\n6", "Для «Орбіта» потрібно: `О`, `а` і `6`.", []),
		trial("Позивний Я", "Я", "Я\nЯ\n1", "Коли в позивному одна літера, вона й перша, і остання.", [])
	],
	mustUse: ["len"],
	hints: ["Перша літера — `s[0]`, остання — `s[-1]`.", "Кількість літер дає `len(s)`."],
	clue: "Позивні кораблів записано в журнал."
});
var mirror = program({
	id: "mirror",
	title: "Дзеркальний шифр",
	story: [{
		speaker: "captain",
		text: "Земля передає секретні повідомлення задом наперед. Нам потрібен розшифровувач."
	}, {
		speaker: "robot",
		text: "Цикл `for` уміє йти по літерах рядка: `for ch in s:`. Якщо кожну нову літеру ставити на початок, рядок перевернеться."
	}],
	task: "Програма читає рядок і виводить його задом наперед. Наприклад, для `мрія` — `яірм`.",
	solution: "s = input()\nr = \"\"\nfor ch in s:\n    r = ch + r\nprint(r)\n",
	starter: "s = input(\"Повідомлення: \")\nr = \"\"\n",
	trials: [
		trial("Слово мрія", "мрія", "яірм", "Літери мають іти у зворотному порядку.", [{
			output: "мрія",
			why: "Рядок не перевернувся. Став кожну літеру на початок: `r = ch + r`, а не `r = r + ch`."
		}]),
		trial("Слово кит", "кит", "тик", "Літери мають іти у зворотному порядку.", []),
		trial("Два слова", "ой ні", "ін йо", "Пробіл — теж символ, він також має опинитися на своєму місці.", [])
	],
	mustUse: ["for"],
	hints: ["Почни з порожнього рядка `r = \"\"` і пройди по літерах: `for ch in s:`.", "У тілі циклу: `r = ch + r`. А `print(r)` — після циклу."],
	clue: "Розшифровувач готовий."
});
var spaceStation = {
	id: "space-station",
	title: "Космічна станція «Мрія»",
	summary: "Ти новий бортовий програміст орбітальної станції. Налагодь зв'язок із Землею, порахуй запаси, полагодь сигналізацію, шлюз і розшифровувач — і все це програмами на Python.",
	grades: "5–8",
	file: "станція.py",
	chapters: [
		{
			id: "contact",
			title: "Зв'язок із Землею",
			topics: "print, арифметика",
			steps: [
				{
					kind: "lesson",
					id: "print-lesson",
					title: "Перша програма",
					story: [{
						speaker: "robot",
						text: "Привіт! Я Біт, робот станції. Навчу тебе говорити з бортовим комп'ютером мовою Python."
					}],
					explain: [
						"`print()` виводить на екран те, що в дужках. Текст береться в лапки, а числа й обчислення — без лапок.",
						"Python рахує, як калькулятор: `+` додає, `-` віднімає, `*` множить, `/` ділить. `print(2 + 3)` виведе `5`, а `print(\"2 + 3\")` — сам текст `2 + 3`.",
						"Кожен `print` починає новий рядок. Через кому можна вивести кілька значень: Python поставить між ними пробіл."
					],
					syntax: "print(\"текст\")\nprint(число або вираз)",
					notes: [
						{
							code: "print(\"Привіт\")",
							text: "Виводить текст `Привіт`."
						},
						{
							code: "print(7 * 6)",
							text: "Виводить результат множення: `42`."
						},
						{
							code: "print(\"Разом:\", 5)",
							text: "Виводить `Разом: 5` — кома додає пробіл."
						}
					],
					example: "print(\"Бортовий комп'ютер увімкнено\")\nprint(\"2 + 3 =\", 2 + 3)\n"
				},
				greeting,
				water
			]
		},
		{
			id: "computer",
			title: "Бортовий комп'ютер",
			topics: "змінні, input, int, //, %",
			steps: [
				{
					kind: "lesson",
					id: "input-lesson",
					title: "Змінні та введення",
					story: [{
						speaker: "robot",
						text: "Щоб програма працювала з різними даними, вона має питати їх у людини."
					}],
					explain: [
						"Змінна — це коробка з назвою, у якій лежить значення: `fuel = 25`. Потім назву можна використовувати замість значення.",
						"`input()` чекає, доки людина щось введе, і повертає це як текст (рядок). Текст у дужках — підказка для людини: `input(\"Ім'я: \")`.",
						"Щоб рахувати з введеним числом, перетвори текст на ціле число: `int(input())`. Інакше `\"7\" + \"3\"` дасть `\"73\"`.",
						"`//` ділить націло, а `%` дає остачу: `17 // 5` — це `3`, а `17 % 5` — це `2`."
					],
					syntax: "змінна = input(\"Підказка: \")\nчисло = int(input())",
					notes: [
						{
							code: "name = input()",
							text: "Кладе в `name` те, що ввела людина (текст)."
						},
						{
							code: "n = int(input())",
							text: "Кладе в `n` введене ціле число."
						},
						{
							code: "a + b",
							text: "Для чисел — сума, для рядків — склеювання."
						},
						{
							code: "17 // 5, 17 % 5",
							text: "Ділення націло (`3`) та остача (`2`)."
						}
					],
					example: "name = input(\"Як тебе звати? \")\nage = int(input(\"Скільки тобі років? \"))\nprint(\"Привіт,\", name)\nprint(\"Через 10 років тобі буде\", age + 10)\n"
				},
				hello,
				fuel,
				session
			]
		},
		{
			id: "alarm",
			title: "Сигналізація",
			topics: "if, elif, else, порівняння",
			steps: [
				{
					kind: "lesson",
					id: "if-lesson",
					title: "Умови",
					story: [{
						speaker: "robot",
						text: "Бортовий комп'ютер має реагувати по-різному: коли все гаразд і коли щось не так."
					}],
					explain: [
						"`if` виконує рядки з відступом лише тоді, коли умова правдива. `else` виконується, коли умова хибна.",
						"Якщо варіантів більше двох, між ними пиши `elif` (скорочення від «else if»). Спрацює лише перша правдива гілка.",
						"Порівняння: `>` більше, `<` менше, `>=` не менше, `<=` не більше, `==` дорівнює, `!=` не дорівнює.",
						"Не забувай двокрапку в кінці рядка з `if`, `elif`, `else` і відступ у 4 пробіли в наступних рядках."
					],
					syntax: "if умова:\n    дії\nelif інша_умова:\n    дії\nelse:\n    дії",
					notes: [
						{
							code: "if x > 0:",
							text: "Якщо `x` більше за нуль…"
						},
						{
							code: "elif x == 0:",
							text: "…а інакше, якщо `x` дорівнює нулю…"
						},
						{
							code: "else:",
							text: "…а в усіх інших випадках."
						}
					],
					example: "level = int(input(\"Рівень кисню, %: \"))\nif level < 20:\n    print(\"Тривога!\")\nelif level < 50:\n    print(\"Увага: кисню мало\")\nelse:\n    print(\"Кисню досить\")\n"
				},
				temperature,
				password
			]
		},
		{
			id: "countdown",
			title: "Зворотний відлік",
			topics: "for, range",
			steps: [
				{
					kind: "lesson",
					id: "for-lesson",
					title: "Цикл for",
					story: [{
						speaker: "robot",
						text: "Якщо дію треба повторити багато разів, не пиши її багато разів — скористайся циклом."
					}],
					explain: [
						"`for i in range(5):` повторює рядки з відступом 5 разів. Змінна `i` по черзі дорівнює 0, 1, 2, 3, 4.",
						"`range(1, 6)` дає числа від 1 до 5: останнє число в `range` не входить.",
						"`range(10, 0, -2)` рахує назад із кроком 2: 10, 8, 6, 4, 2.",
						"Щоб накопичити суму, заведи змінну до циклу (`total = 0`) і додавай до неї в циклі: `total = total + x`."
					],
					syntax: "for i in range(початок, кінець, крок):\n    дії",
					notes: [
						{
							code: "range(3)",
							text: "0, 1, 2"
						},
						{
							code: "range(1, 4)",
							text: "1, 2, 3"
						},
						{
							code: "range(3, 0, -1)",
							text: "3, 2, 1"
						}
					],
					example: "for i in range(1, 6):\n    print(\"Модуль\", i, \"перевірено\")\nprint(\"Усі модулі в нормі\")\n"
				},
				countdown,
				cargo,
				orbit
			]
		},
		{
			id: "airlock",
			title: "Шлюз",
			topics: "while",
			steps: [
				{
					kind: "lesson",
					id: "while-lesson",
					title: "Цикл while",
					story: [{
						speaker: "robot",
						text: "Буває, що наперед невідомо, скільки разів повторювати. Тоді потрібен `while`."
					}],
					explain: [
						"`while умова:` повторює рядки з відступом, доки умова правдива. Щойно вона стане хибною, програма йде далі.",
						"Усередині циклу щось має змінюватися, інакше цикл ніколи не закінчиться. Тренажер зупинить таку програму через 5 секунд.",
						"`!=` означає «не дорівнює»: `while p != \"зоря\":` — поки пароль не `зоря`."
					],
					syntax: "while умова:\n    дії",
					notes: [{
						code: "while x < 100:",
						text: "Повторювати, доки `x` менше за 100."
					}, {
						code: "x = x * 2",
						text: "Зміна всередині циклу, яка колись зробить умову хибною."
					}],
					example: "fuel = 100\nday = 0\nwhile fuel > 30:\n    fuel = fuel - 15\n    day = day + 1\nprint(\"Пального вистачить на\", day, \"днів\")\n"
				},
				airlock,
				algae
			]
		},
		{
			id: "cipher",
			title: "Шифри",
			topics: "рядки, len, індекси, for по рядку",
			steps: [
				{
					kind: "lesson",
					id: "string-lesson",
					title: "Рядки",
					story: [{
						speaker: "robot",
						text: "Текст у Python — це рядок літер. З ним можна робити багато цікавого."
					}],
					explain: [
						"`len(s)` — кількість символів у рядку `s` (пробіли теж рахуються).",
						"Кожна літера має номер (індекс) від 0: `s[0]` — перша літера, `s[1]` — друга, а `s[-1]` — остання.",
						"`for ch in s:` проходить по літерах рядка: змінна `ch` по черзі дорівнює кожній літері.",
						"`+` склеює рядки: `\"ab\" + \"c\"` дає `\"abc\"`, а `\"c\" + \"ab\"` дає `\"cab\"`."
					],
					syntax: "len(s)\ns[0], s[-1]\nfor ch in s:\n    дії",
					notes: [
						{
							code: "len(\"Мрія\")",
							text: "`4`"
						},
						{
							code: "\"Мрія\"[0]",
							text: "`М`"
						},
						{
							code: "\"Мрія\"[-1]",
							text: "`я`"
						}
					],
					example: "s = \"Мрія\"\nprint(\"Літер:\", len(s))\nfor ch in s:\n    print(ch, \"*\")\n"
				},
				callsign,
				mirror,
				{
					kind: "answer",
					id: "message",
					title: "Повідомлення з Землі",
					story: [{
						speaker: "narrator",
						text: "На станцію надходить повідомлення із Землі. Воно записане задом наперед."
					}, {
						speaker: "robot",
						text: "Встав свій розшифровувач у програму й прочитай повідомлення."
					}],
					question: "Що написано в повідомленні?",
					starter: "s = \"!имав ясьтєашип ялмеЗ\"\nprint(s)\n",
					accepted: ["Земля пишається вами!", "Земля пишається вами"],
					hints: ["Додай у програму цикл, що перевертає рядок, як у минулому завданні.", "`r = \"\"`, далі `for ch in s: r = ch + r` і `print(r)`."],
					clue: "Земля передала: «Земля пишається вами!»"
				}
			]
		}
	],
	ending: [{
		speaker: "captain",
		text: "Усі системи станції працюють! Ти справжній бортовий програміст."
	}, {
		speaker: "robot",
		text: "Ти вже знаєш `print`, `input`, умови, цикли `for` і `while` та рядки. Наступна місія — вікна з кнопками в `tkinter`!"
	}]
};
// src/quests/missions/index.ts
/** All missions, in the order a student plays them. */
var missions = [spaceStation, calculator];
export { Speakers, TurnEnds, allSteps, answerIsRight, calculator, checkMission, checkProgram, currentStep, emptyProgress, isStepDone, makeReport, markSolved, missingWords, missionScore, missions, normalizeAnswer, normalizeOutput, runTrial, showsValue, spaceStation, taskSteps, verdictMessage, wordsOf, workerDriver };
