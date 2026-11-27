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
/** Words that may stand between two values: `x if a else b`, `a and b`, `for x in y`. */
var JoinWords = /* @__PURE__ */ new Set([
	"and",
	"or",
	"not",
	"in",
	"is",
	"if",
	"else",
	"for",
	"lambda",
	"as"
]);
/** Two values in brackets one after another without a comma: `bind('<1>' click)` gives both. */
var missingComma = (line) => {
	const tokens = line.replace(/#.*$/, "").match(/(?:[rRbBfFuU]{1,2})?(?:"[^"\n]*"|'[^'\n]*')|[A-Za-z_\u0400-\u04FF]\w*|\d+(?:\.\d+)?|\S/g) ?? [];
	let depth = 0;
	let last = null;
	for (const token of tokens) if ("([{".includes(token)) {
		depth += 1;
		last = null;
	} else if (")]}".includes(token)) {
		depth -= 1;
		last = token;
	} else if (/^["'\w\u0400-\u04FF]/.test(token) && !JoinWords.has(token)) {
		if (depth > 0 && last !== null && !")]}".includes(last)) return Option.some([last, token]);
		last = token;
	} else last = null;
	return Option.none();
};
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
		(n) => Option.map(missingComma(at(n)), ([before, after]) => `Між \`${codeSafe(before)}\` і \`${codeSafe(after)}\` бракує коми. Значення в дужках розділяють комами: \`f(a, b)\`.`),
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
/** The name of the main window in the code (`root = Tk()`), for the hint about `mainloop()`. */
var noMainloop = (code) => {
	const name = /^\s*([A-Za-z_]\w*)\s*=\s*(?:tkinter\.|tk\.)?Tk\(\)/m.exec(code)?.[1];
	return `Програма закінчилась, і вікно закрилось. Допиши останнім рядком \`${name === void 0 ? "mainloop()" : `${name}.mainloop()`}\`: тоді вікно лишиться відкритим і відповідатиме на клацання.`;
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
			if (detail.includes("ended without mainloop()")) return noMainloop(code);
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
	Scale: "Scale",
	Listbox: "Listbox",
	Spinbox: "Spinbox",
	Combobox: "Combobox",
	Scrollbar: "Scrollbar",
	Menu: "Menu",
	Menubutton: "Menubutton",
	Progressbar: "Progressbar",
	Separator: "Separator",
	Notebook: "Notebook",
	Treeview: "Treeview"
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
	Text: "text",
	Image: "image",
	Window: "window"
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
	/** CSS cursor of the `cursor` option, or "". */
	cursor: Schema.String,
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
	/** The program or the student put the window on a place of the screen (`geometry("+100+50")`). */
	placed: Schema.Boolean,
	/** The order of windows: a bigger number is on top (`lift`, `-topmost`). */
	z: Schema.Number,
	/** `minsize` and `maxsize`: width, height. */
	minSize: Pad,
	maxSize: Pad,
	/** `attributes("-alpha", …)`: 0…1. */
	alpha: Schema.Number,
	/** `state("zoomed")` or `attributes("-fullscreen", True)`: the window takes the whole width. */
	zoomed: Schema.Boolean,
	visible: Schema.Boolean,
	decorated: Schema.Boolean,
	/** The Menu of the menu bar, or 0. */
	menu: Schema.Number
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
	hidden: Schema.Boolean,
	/** The PhotoImage of an image figure, or 0. */
	image: Schema.Number,
	/** The widget of a window figure (`create_window`), or 0; `width`, `height`: its size, 0 is its own size. */
	window: Schema.Number,
	height: Schema.Number
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
/** A coloured part of a Text: start, end (characters), colour, background, CSS font, underline, overstrike. */
var TkTextPart = Schema.Tuple([
	Schema.Number,
	Schema.Number,
	Schema.String,
	Schema.String,
	Schema.String,
	Schema.Boolean,
	Schema.Boolean
]);
/** Tags of a Text: the coloured parts and the selection that the program set (`selectionRev` grows then). */
var TkTextStyle = Schema.Struct({
	parts: Schema.Array(TkTextPart),
	selection: Schema.Tuple([Schema.Number, Schema.Number]),
	selectionRev: Schema.Number,
	selectionColor: Schema.String
});
var TkListModes = {
	Single: "single",
	Browse: "browse",
	Multiple: "multiple",
	Extended: "extended",
	Spin: "spin",
	Combo: "combo"
};
/** Rows of a Listbox (text, colour, background), or the values of a Spinbox or a Combobox. */
var TkList = Schema.Struct({
	rows: Schema.Array(Schema.Tuple([
		Schema.String,
		Schema.String,
		Schema.String
	])),
	chosen: Schema.Array(Schema.Number),
	active: Schema.Number,
	mode: Schema.String,
	selectBg: Schema.String,
	selectFg: Schema.String
});
/** A Scrollbar: the widget that it scrolls (0: none). */
var TkScroll = Schema.Struct({
	target: Schema.Number,
	vertical: Schema.Boolean,
	trough: Schema.String
});
var TkMenuEntryTypes = {
	Command: "command",
	Cascade: "cascade",
	Check: "checkbutton",
	Radio: "radiobutton",
	Separator: "separator"
};
var TkMenuEntry = Schema.Struct({
	type: Schema.String,
	label: Schema.String,
	accelerator: Schema.String,
	enabled: Schema.Boolean,
	checked: Schema.Boolean,
	submenu: Schema.Number,
	underline: Schema.Number,
	fg: Schema.String
});
/** A Menu; `posted`: x and y on the "screen" and the number of the post, after `tk_popup`. */
var TkMenu = Schema.Struct({
	entries: Schema.Array(TkMenuEntry),
	posted: Schema.NullOr(Schema.Tuple([
		Schema.Number,
		Schema.Number,
		Schema.Number
	]))
});
/** A Progressbar of ttk: `value` of `maximum`; an "indeterminate" bar that `running` moves by itself. */
var TkProgress = Schema.Struct({
	value: Schema.Number,
	maximum: Schema.Number,
	mode: Schema.String,
	running: Schema.Boolean,
	length: Schema.Number,
	/** Colours of the bar and of the trough from `ttk.Style`, or "". */
	bar: Schema.String,
	trough: Schema.String
});
/** Tabs of a Notebook: the frame of each tab, its text and state; `current` is the shown tab (-1: none). */
var TkTabs = Schema.Struct({
	tabs: Schema.Array(Schema.Tuple([
		Schema.Number,
		Schema.String,
		Schema.String
	])),
	current: Schema.Number
});
/**
* A Treeview: columns (heading, width, anchor of the cells, anchor of the heading) and the shown rows (depth,
* has children, open, cells, colour, background, selected). `tree`: the first column is the tree.
*/
var TkTree = Schema.Struct({
	columns: Schema.Array(Schema.Tuple([
		Schema.String,
		Schema.Number,
		Schema.String,
		Schema.String
	])),
	rows: Schema.Array(Schema.Tuple([
		Schema.Number,
		Schema.Boolean,
		Schema.Boolean,
		Schema.Array(Schema.String),
		Schema.String,
		Schema.String,
		Schema.Boolean
	])),
	tree: Schema.Boolean,
	headings: Schema.Boolean,
	height: Schema.Number,
	mode: Schema.String
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
	scale: Schema.OptionFromNullOr(TkScale),
	/** The PhotoImage of a Label or a Button, or 0; `compound`: where the picture is beside the text. */
	image: Schema.Number,
	compound: Schema.String,
	textStyle: Schema.OptionFromNullOr(TkTextStyle),
	list: Schema.OptionFromNullOr(TkList),
	scroll: Schema.OptionFromNullOr(TkScroll),
	menu: Schema.OptionFromNullOr(TkMenu),
	/** The Menu that a Menubutton opens, or 0. */
	opens: Schema.Number,
	/** Colours of a pressed button (`activebackground`, `activeforeground`), "" for the usual ones. */
	activeBg: Schema.String,
	activeFg: Schema.String,
	/** The relief under the mouse pointer (`overrelief`), or "". */
	overrelief: Schema.String,
	/** The colour of the text cursor of a field (`insertbackground`), or "". */
	caret: Schema.String,
	/** "horizontal", "vertical" or "" (Separator, Progressbar, PanedWindow). */
	orient: Schema.String,
	progress: Schema.OptionFromNullOr(TkProgress),
	tabs: Schema.OptionFromNullOr(TkTabs),
	tree: Schema.OptionFromNullOr(TkTree)
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
/**
* A picture of `PhotoImage` (`tkinter/_images.py`): a PNG or GIF file (base64), and pixels that the program
* painted over it (rows of runs: colour, count…). `shownWidth`, `shownHeight`: with `zoom` and `subsample`.
*/
var TkImage = Schema.Struct({
	id: Schema.Number,
	width: Schema.Number,
	height: Schema.Number,
	shownWidth: Schema.Number,
	shownHeight: Schema.Number,
	base: Schema.NullOr(Schema.Struct({
		mime: Schema.Literals(["image/png", "image/gif"]),
		data: Schema.String
	})),
	pixels: Schema.NullOr(Schema.Array(Schema.Array(Schema.Union([Schema.String, Schema.Number]))))
});
var TkAskKinds = {
	Question: "question",
	Value: "value",
	Color: "color",
	Open: "open",
	Save: "save"
};
/** A dialog that waits for the student (`tkinter/_core.py` `ask`): one shape for all kinds, fields by kind. */
var TkAsk = Schema.Struct({
	kind: Schema.Literals(Object.values(TkAskKinds)),
	title: Schema.String,
	message: Schema.optionalKey(Schema.String),
	icon: Schema.optionalKey(Schema.String),
	buttons: Schema.optionalKey(Schema.Array(Schema.String)),
	default: Schema.optionalKey(Schema.String),
	number: Schema.optionalKey(Schema.String),
	initial: Schema.optionalKey(Schema.String),
	secret: Schema.optionalKey(Schema.Boolean),
	min: Schema.optionalKey(Schema.NullOr(Schema.Number)),
	max: Schema.optionalKey(Schema.NullOr(Schema.Number)),
	files: Schema.optionalKey(Schema.Array(Schema.String)),
	filetypes: Schema.optionalKey(Schema.Array(Schema.Tuple([Schema.String, Schema.String]))),
	extension: Schema.optionalKey(Schema.String),
	multiple: Schema.optionalKey(Schema.Boolean)
});
var decodeSceneJson = Schema.decodeUnknownOption(Schema.fromJsonString(TkScene));
var decodeDialogJson = Schema.decodeUnknownOption(Schema.fromJsonString(TkDialog));
var decodeImageJson = Schema.decodeUnknownOption(Schema.fromJsonString(TkImage));
var decodeAskJson = Schema.decodeUnknownOption(Schema.fromJsonString(TkAsk));
var decodeImage = (json) => decodeImageJson(json);
var decodeAsk = (json) => decodeAskJson(json);
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
export { TkListModes as a, TkWidgetKinds as c, decodeImage as d, decodeScene as f, explainError as g, windowOf as h, TkItemTypes as i, decodeAsk as l, waitsFor as m, TkBindKinds as n, TkManagerKinds as o, managedChildren as p, TkDialogIcons as r, TkMenuEntryTypes as s, TkAskKinds as t, decodeDialog as u };
