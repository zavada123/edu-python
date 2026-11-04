import { a as MouseKinds, s as TimeLimitMs } from "./protocol-DAGhTCk5.js";
import { Option, Schema } from "effect";
// src/core/errors.ts
/**
* Explains a Python error for a grade 5 student, in Ukrainian. Input: the traceback that MicroPython prints
* and the source code. MicroPython says only "invalid syntax" for most syntax errors, so for them we look at
* the line and find the usual cause: no colon, no closing bracket or quote, typographic quotes, no indent.
*
* The explanation is plain text where `...` marks code (the view shows it in a monospace font).
* Values from the program are put in `...` only after `codeSafe`.
*/
var KnownNames = [
	"print",
	"input",
	"int",
	"float",
	"str",
	"range",
	"len",
	"round",
	"abs",
	"max",
	"min",
	"sum",
	"list",
	"True",
	"False",
	"None",
	"import",
	"from",
	"for",
	"while",
	"if",
	"elif",
	"else",
	"def",
	"return",
	"and",
	"or",
	"not",
	"in",
	"break",
	"continue",
	"randint",
	"random",
	"turtle",
	"math",
	"sqrt",
	"forward",
	"backward",
	"back",
	"left",
	"right",
	"goto",
	"circle",
	"penup",
	"pendown",
	"up",
	"down",
	"color",
	"width",
	"pensize",
	"dot",
	"begin_fill",
	"end_fill",
	"write",
	"speed",
	"shape",
	"bgcolor",
	"done",
	"stamp",
	"home",
	"fillcolor",
	"pencolor",
	"hideturtle",
	"showturtle",
	"setheading",
	"position",
	"clear",
	"mainloop",
	"exitonclick",
	"tkinter",
	"messagebox",
	"Tk",
	"Label",
	"Button",
	"Entry",
	"Canvas",
	"Checkbutton",
	"Radiobutton",
	"Frame",
	"Text",
	"Scale",
	"StringVar",
	"IntVar",
	"BooleanVar",
	"pack",
	"place",
	"grid",
	"bind",
	"title",
	"geometry",
	"resizable",
	"configure",
	"showinfo",
	"showwarning",
	"showerror",
	"create_line",
	"create_rectangle",
	"create_oval",
	"create_polygon",
	"create_arc",
	"create_text",
	"destroy",
	"textvariable"
];
var AvailableModules = [
	"turtle",
	"tkinter",
	"random",
	"math"
];
var HeaderKeyword = /^\s*(if|elif|else|for|while|def|class|try|except|finally|with)\b/;
var TypographicQuotes = /[“”„«»‘’‚]/;
var TypographicDashes = /[–—−]/;
var TypographicMath = /[×÷]/;
var Cyrillic = /[а-яА-ЯіІїЇєЄґҐ]/;
var Latin = /[a-zA-Z]/;
/** Code from the program inside `...`: without backticks, short. */
var codeSafe = (value) => {
	const plain = value.replaceAll("`", "'");
	return plain.length > 40 ? `${plain.slice(0, 40)}…` : plain;
};
var lastLine = (traceback) => {
	return traceback.split("\n").map((l) => l.trim()).filter((l) => l !== "").at(-1) ?? "";
};
var errorLine = (traceback) => {
	const lines = Array.from(traceback.matchAll(/File "main\.py", line (\d+)/g), (m) => Number(m[1]));
	return Option.fromNullishOr(lines.at(-1));
};
var levenshtein = (a, b) => {
	let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		const current = [i];
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			current.push(Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, (previous[j - 1] ?? 0) + cost));
		}
		previous = current;
	}
	return previous[b.length] ?? 0;
};
/** The most similar known word: same word in other letter case, or 1–2 letters are different. */
var similar = (name, candidates) => {
	const sameCase = candidates.find((c) => c !== name && c.toLowerCase() === name.toLowerCase());
	if (sameCase !== void 0) return Option.some(sameCase);
	const limit = name.length <= 4 ? 1 : 2;
	const scored = candidates.filter((c) => c !== name).map((c) => ({
		c,
		d: levenshtein(name.toLowerCase(), c.toLowerCase())
	})).filter((x) => x.d <= limit).sort((a, b) => a.d - b.d);
	return Option.fromNullishOr(scored[0]?.c);
};
var namesInCode = (code) => Array.from(new Set(Array.from(withoutStrings(code).matchAll(/[A-Za-z_]\w*/g), (m) => m[0])));
/** The line without string contents and comments: brackets and colons in text do not count. */
var withoutStrings = (line) => line.replace(/"[^"\n]*"|'[^'\n]*'/g, (s) => `${s[0] ?? ""}${s[0] ?? ""}`).replace(/#.*$/gm, "");
var indentOf = (line) => line.length - line.trimStart().length;
var typographic = (line) => {
	if (TypographicQuotes.test(line)) return Option.some("У рядку є друковані лапки (“ ” « » ‘ ’). Python розуміє лише прямі лапки: `\"` або `'`. Видали ці лапки й надрукуй їх знову з англійської розкладки.");
	if (TypographicDashes.test(line)) return Option.some("У рядку стоїть довге тире `–` замість мінуса. Видали його й надрукуй звичайний мінус `-`.");
	if (TypographicMath.test(line)) return Option.some("Python не знає знаків `×` і `÷`. Для множення пиши `*`, для ділення `/`.");
	return Option.none();
};
var bracketBalance = (line) => {
	const clean = withoutStrings(line);
	let balance = 0;
	for (const ch of clean) {
		if (ch === "(" || ch === "[" || ch === "{") balance++;
		if (ch === ")" || ch === "]" || ch === "}") balance--;
	}
	return balance;
};
var unclosedQuote = (line) => {
	const clean = line.replace(/"[^"\n]*"|'[^'\n]*'/g, "").replace(/#.*$/, "");
	return clean.includes("\"") || clean.includes("'");
};
/** Finds the usual cause of a syntax error near `reported` (lines from 1). */
var syntaxCause = (lines, reported) => {
	const at = (n) => lines[n - 1] ?? "";
	const previous = (() => {
		for (let n = reported - 1; n >= 1; n--) if (at(n).trim() !== "") return n;
		return 0;
	})();
	const checks = [
		(n) => typographic(at(n)),
		(n) => {
			if (!unclosedQuote(at(n))) return Option.none();
			return Option.some("Лапки не закриті. Текст має починатися й закінчуватися однаковими лапками: `\"Привіт\"`.");
		},
		(n) => {
			const line = withoutStrings(at(n)).trimEnd();
			const keyword = HeaderKeyword.exec(line)?.[1];
			if (keyword === void 0 || line.endsWith(":")) return Option.none();
			return Option.some(`У кінці рядка з \`${keyword}\` треба поставити двокрапку \`:\`.`);
		},
		(n) => {
			const line = withoutStrings(at(n));
			if (!/^\s*(if|elif|while)\b/.test(line) || !/[^=!<>]=[^=]/.test(line)) return Option.none();
			return Option.some("Щоб порівняти два значення, пиши два знаки дорівнює: `==`. Один знак `=` дає змінній значення.");
		},
		(n) => {
			const balance = bracketBalance(at(n));
			if (balance > 0) return Option.some("Дужка не закрита: бракує `)`. Кожна `(` повинна мати свою `)`.");
			if (balance < 0) return Option.some("У рядку зайва дужка `)`. Порахуй, скільки дужок відкрито й скільки закрито.");
			return Option.none();
		},
		(n) => {
			if (!/^\s*print\s+[^\s(=]/.test(at(n))) return Option.none();
			return Option.some("Після `print` треба дужки: `print(\"Привіт\")`.");
		},
		(n) => {
			if (!/[+\-*/%=,]\s*$/.test(withoutStrings(at(n)).trimEnd())) return Option.none();
			return Option.some("Рядок закінчується знаком дії, але після нього нічого немає. Допиши вираз до кінця.");
		}
	];
	const indentAfterColon = () => {
		if (previous === 0 || !withoutStrings(at(previous)).trimEnd().endsWith(":")) return Option.none();
		if (indentOf(at(reported)) > indentOf(at(previous))) return Option.none();
		return Option.some({
			line: reported,
			explanation: "Після рядка з двокрапкою `:` команди всередині треба писати з відступом: 4 пробіли на початку рядка."
		});
	};
	const run = (n) => {
		for (const check of checks) {
			const found = check(n);
			if (Option.isSome(found)) return Option.some({
				line: n,
				explanation: found.value
			});
		}
		return Option.none();
	};
	return run(reported).pipe(Option.orElse(indentAfterColon), Option.orElse(() => previous === 0 ? Option.none() : run(previous)));
};
var operationNames = {
	__add__: "додати",
	__sub__: "відняти",
	__mul__: "помножити",
	__truediv__: "поділити",
	__floordiv__: "поділити",
	__mod__: "знайти остачу для",
	__pow__: "піднести до степеня",
	__lt__: "порівняти",
	__gt__: "порівняти",
	__le__: "порівняти",
	__ge__: "порівняти"
};
var typeNames = {
	str: "текст",
	int: "ціле число",
	float: "дробове число",
	list: "список",
	bool: "логічне значення",
	NoneType: "None (нічого)"
};
var typeName = (type) => typeNames[type] ?? type;
var nameError = (name, code) => {
	const shown = codeSafe(name);
	if (TypographicQuotes.test(name)) return Option.getOrElse(typographic(name), () => "");
	if (Cyrillic.test(name) && Latin.test(name)) return `У слові \`${shown}\` змішані українські й англійські літери. Перемкни розкладку на англійську й надрукуй слово знову.`;
	if (Cyrillic.test(name)) return `Python не знає слова \`${shown}\`. Якщо це текст, візьми його в лапки: \`"${shown}"\`.`;
	const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	if (new RegExp(`^\\s*${escaped}\\s*=[^=]`, "m").test(code)) return `Змінна \`${shown}\` ще не має значення в цьому місці. Спершу дай їй значення, а потім використовуй.`;
	const guess = similar(name, [...KnownNames, ...namesInCode(code)]);
	if (Option.isSome(guess)) return guess.value.toLowerCase() === name.toLowerCase() ? `Python не знає слова \`${shown}\`. Можливо, мало бути \`${guess.value}\`? Python розрізняє великі й малі літери.` : `Python не знає слова \`${shown}\`. Можливо, мало бути \`${guess.value}\`?`;
	return `Python не знає слова \`${shown}\`. Перевір, чи правильно воно написане. Якщо це змінна, спершу дай їй значення. Якщо це текст, візьми його в лапки.`;
};
var valueError = (message) => {
	const integer = /invalid syntax for integer with base 10: '(.*)'/.exec(message);
	if (integer !== null) {
		const value = integer[1] ?? "";
		if (value.trim() === "") return "`int()` отримав порожній текст. Можливо, ти нічого не ввів?";
		if (/^\s*-?\d+[.,]\d*\s*$/.test(value)) return `\`int()\` не перетворює дробові числа, як \`${codeSafe(value)}\`. Для них є \`float()\`.`;
		return `\`int()\` перетворює на число лише цифри, а отримав \`${codeSafe(value)}\`.`;
	}
	if (message.includes("invalid syntax for number")) return "`float()` перетворює на число лише запис числа, наприклад `2.5`. Дробову частину відділяй крапкою.";
	if (message.includes("math domain error")) return "Цю математичну дію не можна виконати з таким числом (наприклад, корінь з від'ємного числа).";
	return "Значення не підходить для цієї дії.";
};
var typeError = (message) => {
	const unsupported = /unsupported types for (\w+): '(\w+)', '(\w+)'/.exec(message);
	if (unsupported !== null) {
		const action = operationNames[unsupported[1] ?? ""] ?? "виконати дію з";
		const left = unsupported[2] ?? "";
		const right = unsupported[3] ?? "";
		const withText = left === "str" || right === "str";
		const base = `Не можна ${action} ${typeName(left)} і ${typeName(right)}.`;
		return withText ? `${base} Пам'ятай: \`input()\` завжди дає текст. Щоб рахувати, перетвори текст на число: \`int(...)\`. Щоб склеїти з текстом, перетвори число: \`str(...)\`.` : base;
	}
	const notCallable = /'(\w+)' object isn't callable/.exec(message);
	if (notCallable !== null) return `Після значення (${typeName(notCallable[1] ?? "")}) стоять дужки, ніби це команда. Можливо, бракує знака \`*\`, або змінна має таке саме ім'я, як команда.`;
	const argCount = /takes (\d+) positional arguments? but (\d+) (?:were|was) given/.exec(message);
	if (argCount !== null) return `У дужках неправильна кількість значень: треба ${argCount[1] ?? ""}, а є ${argCount[2] ?? ""}.`;
	const noLen = /object of type '(\w+)' has no len/.exec(message);
	if (noLen !== null) return `\`len()\` рахує довжину тексту або списку, а не ${typeName(noLen[1] ?? "")}.`;
	return "Ця дія не підходить для такого типу значення.";
};
/** Errors of Tk (`TclError`): the window got a wrong option or value. */
var tclError = (message) => {
	const geometry = /bad geometry specifier "(.*)"/.exec(message);
	if (geometry !== null) return `Розмір вікна \`${codeSafe(geometry[1] ?? "")}\` записано неправильно. Пиши ширину й висоту через малу латинську x без пробілів: \`"500x300"\`.`;
	const color = /(?:unknown|invalid) color name "(.*)"/.exec(message);
	if (color !== null) return `Tk не знає кольору \`${codeSafe(color[1] ?? "")}\`. Перевір назву англійською, наприклад \`"yellow"\`.`;
	const option = /unknown option "-(\w+)"/.exec(message) ?? /bad option "-(\w+)"/.exec(message);
	if (option !== null) return `Тут немає параметра \`${codeSafe(option[1] ?? "")}\`. Перевір, чи правильно написане його ім'я.`;
	const manager = /cannot use geometry manager (\w+) inside \S+ which already has slaves managed by (\w+)/.exec(message);
	if (manager !== null) return `В одному вікні (або рамці) не можна змішувати \`${manager[1] ?? ""}()\` і \`${manager[2] ?? ""}()\`. Розмісти всі віджети одним способом.`;
	if (message.includes("bad event type or keysym")) return "Подію в `bind` записано неправильно. Пиши її в кутових дужках, наприклад `\"<Button-1>\"` або `\"<Key>\"`.";
	if (message.includes("wrong # coordinates")) return "Для цієї фігури на полотні треба інша кількість координат.";
	if (/^expected (integer|floating-point number|boolean value)/.test(message) || message.includes("bad screen distance")) return "Цей параметр має бути числом, а отримав інше значення.";
	return "Вікно не може виконати цю команду: перевір параметри віджета.";
};
var explainMessage = (message, code) => {
	const colon = message.indexOf(":");
	const type = colon === -1 ? message : message.slice(0, colon);
	const detail = colon === -1 ? "" : message.slice(colon + 1).trim();
	switch (type) {
		case "NameError": {
			const name = /name '(.+)' isn't defined/.exec(detail)?.[1];
			return name === void 0 ? "Python не знає цього слова." : nameError(name, code);
		}
		case "ValueError": return valueError(detail);
		case "TypeError": return typeError(detail);
		case "ZeroDivisionError": return "Ділити на нуль не можна. Перевір, на що ділиш у цьому рядку.";
		case "IndexError": return "Номер елемента більший, ніж їх є. Нумерація починається з 0: в списку з 3 елементів є номери 0, 1 і 2.";
		case "KeyError": return `У словнику немає ключа \`${codeSafe(detail)}\`.`;
		case "AttributeError": return `Тут немає команди \`${codeSafe(/has no attribute '(\w+)'/.exec(detail)?.[1] ?? "")}\`. Перевір, чи правильно написане слово після крапки.`;
		case "ImportError": {
			const module = /no module named '([\w.]+)'/.exec(detail)?.[1] ?? "";
			const guess = similar(module, AvailableModules);
			return Option.isSome(guess) ? `Python не знає модуля \`${codeSafe(module)}\`. Можливо, \`${guess.value}\`?` : `Модуля \`${codeSafe(module)}\` тут немає. Можна підключати \`turtle\`, \`tkinter\`, \`random\` і \`math\`.`;
		}
		case "IndentationError": return detail.includes("unexpected indent") ? "Зайвий відступ на початку рядка. Прибери пробіли перед командою, або перевір, чи вона має бути всередині `if`, `for` чи `while`." : "Відступ цього рядка не збігається з відступами рядків вище. Пиши однакові відступи: 4 пробіли.";
		case "TclError": return tclError(detail);
		case "NotImplementedError": return detail.includes("run the program in IDLE") ? "Ця команда tkinter поки не працює на сайті. Запусти програму в IDLE на комп'ютері." : "Ця дія поки не працює.";
		case "RuntimeError":
			if (detail.includes("input()") && detail.includes("mainloop")) return "У віконній програмі `input()` не працює після `mainloop()`. Щоб отримати дані від користувача, додай поле `Entry` і читай його через `get()`.";
			return detail.includes("recursion") ? "Функція викликає сама себе без кінця." : "Під час роботи програми сталася помилка.";
		case "MemoryError": return "Програмі забракло пам'яті. Можливо, список або текст росте без кінця.";
		case "OverflowError": return "Число вийшло завеликим.";
		default: return `Під час роботи програми сталася помилка \`${codeSafe(type)}\`.`;
	}
};
var explainError = (traceback, code) => {
	const message = lastLine(traceback);
	const line = errorLine(traceback);
	if (message.startsWith("SyntaxError")) {
		const lines = code.split("\n");
		const found = Option.flatMap(line, (n) => syntaxCause(lines, n));
		return Option.match(found, {
			onNone: () => ({
				line,
				message,
				explanation: "Python не зрозумів цей рядок. Перевір дужки, лапки, двокрапку в кінці `if`, `for`, `while` і відступи."
			}),
			onSome: (f) => ({
				line: Option.some(f.line),
				message,
				explanation: f.explanation
			})
		});
	}
	if (message.startsWith("TypeError") && traceback.includes("/tkinter/_events.py") && /takes 0 positional arguments but 1/.test(message)) return {
		line,
		message,
		explanation: "Функція, яку викликає `bind`, отримує подію. Додай для неї параметр: `def click(event):`."
	};
	const typographicFirst = Option.flatMap(line, (n) => typographic(code.split("\n")[n - 1] ?? ""));
	return {
		line,
		message,
		explanation: message.startsWith("NameError") && Option.isSome(typographicFirst) ? typographicFirst.value : explainMessage(message, code)
	};
};
// src/core/punctuation.ts
/**
* Phone keyboards change `"` to `“` and `-` to `–` (smart punctuation). Python does not accept these
* characters, so the editor changes them back when the student types or pastes code. `«»` stays:
* students use them inside Ukrainian text.
*/
var replacements = [
	[/[“”„]/g, "\""],
	[/[‘’‚]/g, "'"],
	[/[–—−]/g, "-"]
];
var plainPunctuation = (text) => replacements.reduce((result, [pattern, plain]) => result.replace(pattern, plain), text);
// src/core/tk-scene.ts
/**
* State of the windows of a tkinter program, as `tkinter/_core.py` sends it (JSON). The page draws the
* windows from it (tk-window.tsx). Student code can send any text through `_mriya`, so the page decodes it.
*/
var TkWidgetKinds = {
	Label: "Label",
	Button: "Button",
	Checkbutton: "Checkbutton",
	Radiobutton: "Radiobutton",
	Entry: "Entry",
	Text: "Text",
	Frame: "Frame",
	LabelFrame: "LabelFrame",
	Canvas: "Canvas",
	Scale: "Scale"
};
var TkWidgetKind = Schema.Literals(Object.values(TkWidgetKinds));
var TkManagerKinds = {
	Pack: "pack",
	Grid: "grid",
	Place: "place",
	None: "none"
};
var TkManagerKind = Schema.Literals(Object.values(TkManagerKinds));
var TkItemTypes = {
	Line: "line",
	Rectangle: "rectangle",
	Oval: "oval",
	Polygon: "polygon",
	Arc: "arc",
	Text: "text"
};
var TkItemType = Schema.Literals(Object.values(TkItemTypes));
var TkDialogIcons = {
	Info: "info",
	Warning: "warning",
	Error: "error"
};
var TkDialogIcon = Schema.Literals(Object.values(TkDialogIcons));
/** Kinds of events that the program waits for (`_events.py`): the page sends only these. */
var TkBindKinds = {
	Press: "Press",
	Release: "Release",
	Motion: "Motion",
	Enter: "Enter",
	Leave: "Leave",
	Wheel: "Wheel",
	Key: "Key",
	KeyRelease: "KeyRelease"
};
/** A row or column of `grid`: index, weight, minsize. */
var Track = Schema.Tuple([
	Schema.Number,
	Schema.Number,
	Schema.Number
]);
var Pad = Schema.Tuple([Schema.Number, Schema.Number]);
/** What windows and widgets have in common: they hold other widgets. */
var containerFields = {
	id: Schema.Number,
	binds: Schema.Array(Schema.String),
	bg: Schema.String,
	bd: Schema.Number,
	relief: Schema.String,
	padx: Schema.Number,
	pady: Schema.Number,
	highlight: Schema.Number,
	propagate: Schema.Boolean,
	columns: Schema.Array(Track),
	rows: Schema.Array(Track)
};
/** `width`, `height`: from `geometry`, or -1 when the window takes the size of its widgets. */
var TkWindow = Schema.Struct({
	...containerFields,
	title: Schema.String,
	width: Schema.Number,
	height: Schema.Number,
	minWidth: Schema.Number,
	minHeight: Schema.Number,
	x: Schema.Number,
	y: Schema.Number,
	visible: Schema.Boolean,
	decorated: Schema.Boolean
});
/** Options of pack, grid and place; `order` is the place in the list of the parent. -1: not set. */
var TkManager = Schema.Struct({
	kind: TkManagerKind,
	order: Schema.Number,
	side: Schema.String,
	fill: Schema.String,
	expand: Schema.Boolean,
	anchor: Schema.String,
	padx: Pad,
	pady: Pad,
	ipadx: Schema.Number,
	ipady: Schema.Number,
	row: Schema.Number,
	column: Schema.Number,
	rowspan: Schema.Number,
	columnspan: Schema.Number,
	sticky: Schema.String,
	x: Schema.Number,
	y: Schema.Number,
	relx: Schema.Number,
	rely: Schema.Number,
	width: Schema.Number,
	height: Schema.Number,
	relwidth: Schema.Number,
	relheight: Schema.Number
});
/** A canvas figure. Colours are CSS, "" is no colour. */
var TkItem = Schema.Struct({
	id: Schema.Number,
	type: TkItemType,
	coords: Schema.Array(Schema.Number),
	fill: Schema.String,
	outline: Schema.String,
	width: Schema.Number,
	dash: Schema.Array(Schema.Number),
	arrow: Schema.String,
	arrowshape: Schema.Array(Schema.Number),
	capstyle: Schema.String,
	joinstyle: Schema.String,
	smooth: Schema.Boolean,
	start: Schema.Number,
	extent: Schema.Number,
	style: Schema.String,
	text: Schema.String,
	font: Schema.String,
	underline: Schema.Boolean,
	anchor: Schema.String,
	justify: Schema.String,
	wrap: Schema.Number,
	angle: Schema.Number,
	hidden: Schema.Boolean
});
var TkScale = Schema.Struct({
	from: Schema.Number,
	to: Schema.Number,
	resolution: Schema.Number,
	value: Schema.Number,
	orient: Schema.String,
	length: Schema.Number,
	label: Schema.String,
	showvalue: Schema.Boolean,
	trough: Schema.String
});
/**
* A widget. `width` and `height` are in characters and lines for Label, Button, Entry and Text (as in Tk),
* in pixels for Frame and Canvas. `rev` grows when the program changes the text of an Entry or a Text.
*/
var TkWidget = Schema.Struct({
	...containerFields,
	parent: Schema.Number,
	kind: TkWidgetKind,
	manager: TkManager,
	fg: Schema.String,
	font: Schema.String,
	underline: Schema.Boolean,
	width: Schema.Number,
	height: Schema.Number,
	anchor: Schema.String,
	justify: Schema.String,
	wrap: Schema.Number,
	state: Schema.String,
	text: Schema.String,
	rev: Schema.Number,
	checked: Schema.Boolean,
	indicator: Schema.Boolean,
	selectcolor: Schema.String,
	show: Schema.String,
	textwrap: Schema.String,
	items: Schema.Array(TkItem),
	scale: Schema.OptionFromNullOr(TkScale)
});
/** `focus`: the widget of `focus_set()`; `focusRev` grows on each call, so the page moves the focus once. */
var TkScene = Schema.Struct({
	windows: Schema.Array(TkWindow),
	widgets: Schema.Array(TkWidget),
	focus: Schema.Number,
	focusRev: Schema.Number,
	bindAll: Schema.Array(Schema.String)
});
var TkDialog = Schema.Struct({
	icon: TkDialogIcon,
	title: Schema.String,
	message: Schema.String
});
var decodeSceneJson = Schema.decodeUnknownOption(Schema.fromJsonString(TkScene));
var decodeDialogJson = Schema.decodeUnknownOption(Schema.fromJsonString(TkDialog));
var decodeScene = (json) => {
	if (json === "null") return { _tag: "Closed" };
	return Option.match(decodeSceneJson(json), {
		onNone: () => ({ _tag: "Invalid" }),
		onSome: (scene) => ({
			_tag: "Scene",
			scene
		})
	});
};
var decodeDialog = (json) => decodeDialogJson(json);
/** Widgets inside `parent` that a geometry manager shows, in the order of the manager. */
var managedChildren = (scene, parent, kind) => scene.widgets.filter((w) => w.parent === parent && w.manager.kind === kind).toSorted((a, b) => a.manager.order - b.manager.order);
/** The window of a widget. */
var windowOf = (scene, widget) => {
	const byId = new Map(scene.widgets.map((w) => [w.id, w]));
	let current = widget;
	for (let depth = 0; depth < 1e3; depth++) {
		const window = scene.windows.find((w) => w.id === current);
		if (window !== void 0) return Option.some(window);
		const found = byId.get(current);
		if (found === void 0) return Option.none();
		current = found.parent;
	}
	return Option.none();
};
/**
* Does the program wait for this kind of event on the widget? Tk sends an event to the widget, its class,
* its window and `bind_all` (`_core.py` `_chain`).
*/
var waitsFor = (scene, widget, kind) => {
	if (scene.bindAll.includes(kind)) return true;
	const own = scene.widgets.find((w) => w.id === widget);
	if (own !== void 0 && own.binds.includes(kind)) return true;
	return Option.match(windowOf(scene, widget), {
		onNone: () => false,
		onSome: (w) => w.binds.includes(kind)
	});
};
// src/core/session.ts
/**
* One "Run" of a program on the page: starts the worker, keeps the time limit, asks for `input()` values
* and runs the program again with them (`protocol.ts`), sends the user actions in the windows of a tkinter
* program, and builds the state that the view shows.
*/
var StopReasons = {
	User: "user",
	TimeLimit: "time-limit",
	OutputLimit: "output-limit",
	LoadFailed: "load-failed"
};
var idleView = {
	status: { _tag: "Idle" },
	chunks: [],
	ops: [],
	scene: Option.none(),
	dialogs: []
};
var MaxSeed = 2 ** 30;
var isBusy = (status) => status._tag === "Loading" || status._tag === "Running";
var createRunSession = (createWorker, onChange) => {
	let worker = null;
	/** Messages of a worker that was stopped are not used. */
	let generation = 0;
	let timer = null;
	let code = "";
	let seed = 0;
	let inputs = [];
	let view = idleView;
	/** Output of the current replay. Replays repeat the output of the previous ones first. */
	let segmentChunks = [];
	let segmentOps = [];
	/** User actions that the worker did not finish yet. Pointer moves are dropped while it is busy. */
	let pending = 0;
	const publish = (next) => {
		view = next;
		onChange(view);
	};
	const clearTimer = () => {
		if (timer !== null) clearTimeout(timer);
		timer = null;
	};
	const kill = () => {
		clearTimer();
		worker?.terminate();
		worker = null;
		generation++;
	};
	const finish = (status) => {
		clearTimer();
		publish({
			...view,
			status
		});
	};
	const halt = (reason) => {
		kill();
		const closed = reason === StopReasons.User ? {
			scene: Option.none(),
			dialogs: []
		} : {};
		publish({
			...view,
			...closed,
			status: {
				_tag: "Stopped",
				reason
			}
		});
	};
	const armTimer = () => {
		clearTimer();
		timer = setTimeout(() => {
			halt(StopReasons.TimeLimit);
		}, TimeLimitMs);
	};
	const sceneAfter = (scenes) => {
		const last = scenes.at(-1);
		if (last === void 0) return view.scene;
		const update = decodeScene(last);
		switch (update._tag) {
			case "Scene": return Option.some(update.scene);
			case "Closed": return Option.none();
			case "Invalid": return view.scene;
		}
	};
	const done = () => {
		pending = Math.max(0, pending - 1);
	};
	const onMessage = (message) => {
		switch (message._tag) {
			case "Started":
				armTimer();
				return publish({
					...view,
					status: { _tag: "Running" }
				});
			case "Handling": return armTimer();
			case "Progress": {
				segmentChunks = [...segmentChunks, ...message.chunks];
				segmentOps = [...segmentOps, ...message.ops];
				const dialogs = message.dialogs.flatMap((d) => Option.toArray(decodeDialog(d)));
				return publish({
					status: view.status,
					chunks: segmentChunks.length >= view.chunks.length ? segmentChunks : view.chunks,
					ops: segmentOps.length >= view.ops.length ? segmentOps : view.ops,
					scene: sceneAfter(message.scenes),
					dialogs: dialogs.length === 0 ? view.dialogs : [...view.dialogs, ...dialogs]
				});
			}
			case "Waiting":
				done();
				return finish({ _tag: "Window" });
			case "Finished":
				done();
				return finish({ _tag: "Finished" });
			case "NeedInput": return finish({ _tag: "WaitingInput" });
			case "Failed":
				done();
				return finish({
					_tag: "Failed",
					error: explainError(message.traceback, code)
				});
			case "OutputLimit": return halt(StopReasons.OutputLimit);
			case "LoadFailed": return halt(StopReasons.LoadFailed);
		}
	};
	const workerNow = () => {
		if (worker !== null) return worker;
		const own = generation;
		const created = createWorker((message) => {
			if (own === generation) onMessage(message);
		});
		worker = created;
		return created;
	};
	const segment = () => {
		segmentChunks = [];
		segmentOps = [];
		publish({
			...view,
			status: { _tag: "Loading" }
		});
		workerNow().post({
			_tag: "Run",
			code,
			inputs: [...inputs],
			seed
		});
	};
	return {
		start: (source) => {
			if (isBusy(view.status) || view.status._tag === "Window") kill();
			pending = 0;
			code = source;
			seed = Math.floor(Math.random() * MaxSeed);
			inputs = [];
			view = idleView;
			segment();
		},
		provideInput: (value) => {
			if (view.status._tag !== "WaitingInput") return;
			inputs = [...inputs, value];
			segment();
		},
		send: (input, layout) => {
			if (view.status._tag !== "Window" || worker === null) return;
			if (input._tag === "Mouse" && input.kind === MouseKinds.Motion && pending > 0) return;
			pending++;
			worker.post({
				_tag: "Event",
				input,
				layout
			});
		},
		closeDialog: () => {
			if (view.dialogs.length > 0) publish({
				...view,
				dialogs: view.dialogs.slice(1)
			});
		},
		stop: () => {
			if (isBusy(view.status) || view.status._tag === "Window") return halt(StopReasons.User);
			if (view.status._tag === "WaitingInput") finish({
				_tag: "Stopped",
				reason: StopReasons.User
			});
		},
		dispose: kill
	};
};
/**
* The real worker for the browser. `create` starts the worker file of the page (see `startPythonWorker`), for example
* `() => new Worker(new URL("./python-worker.ts", import.meta.url), { type: "module" })`. Each call starts a new
* worker; the engine loads in it once.
*/
var browserWorker = (create) => (onMessage) => {
	const worker = create();
	worker.addEventListener("message", (event) => {
		onMessage(event.data);
	});
	worker.addEventListener("error", () => {
		onMessage({
			_tag: "LoadFailed",
			message: "worker error"
		});
	});
	return {
		post: (request) => {
			worker.postMessage(request);
		},
		terminate: () => {
			worker.terminate();
		}
	};
};
export { TkBindKinds as a, TkManagerKinds as c, decodeScene as d, managedChildren as f, explainError as h, idleView as i, TkWidgetKinds as l, plainPunctuation as m, browserWorker as n, TkDialogIcons as o, waitsFor as p, createRunSession as r, TkItemTypes as s, StopReasons as t, decodeDialog as u };
