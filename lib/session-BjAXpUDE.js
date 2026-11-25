import { c as TimeLimitMs, o as MouseKinds } from "./protocol-CTCLMVi9.js";
import { Option, Schema } from "effect";
import { parser } from "@lezer/python";
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
var levenshtein$1 = (a, b) => {
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
		d: levenshtein$1(name.toLowerCase(), c.toLowerCase())
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
// src/core/code-scope.ts
/**
* What the code creates and uses, without running it: the scopes of Python (module, `def`, `class`, `lambda`,
* comprehensions), where each name gets a value and where it is read. The checks of the editor
* (`code-check.ts`) and its hints (`ui/completions.ts`) are built on it.
*/
var ScopeKinds = {
	Module: "module",
	Function: "function",
	Class: "class",
	Lambda: "lambda",
	Comprehension: "comprehension"
};
var BindingKinds = {
	Function: "function",
	Class: "class",
	Param: "param",
	Import: "import",
	Variable: "variable",
	Loop: "loop"
};
var ParamKinds = {
	Positional: "positional",
	Star: "star",
	KeywordOnly: "keyword-only",
	DoubleStar: "double-star"
};
var newScope = (kind, parent, node, fn) => {
	const scope = {
		kind,
		parent,
		from: node.from,
		to: node.to,
		bindings: /* @__PURE__ */ new Map(),
		globals: /* @__PURE__ */ new Set(),
		nonlocals: /* @__PURE__ */ new Set(),
		starImports: [],
		children: [],
		...fn === void 0 ? {} : { fn }
	};
	parent?.children.push(scope);
	return scope;
};
var children = (node) => {
	const out = [];
	for (let child = node.firstChild; child !== null; child = child.nextSibling) out.push(child);
	return out;
};
var ComprehensionNodes = /* @__PURE__ */ new Set([
	"ArrayComprehensionExpression",
	"DictionaryComprehensionExpression",
	"SetComprehensionExpression",
	"ComprehensionExpression"
]);
var TargetGroups = /* @__PURE__ */ new Set([
	"TupleExpression",
	"ArrayExpression",
	"ParenthesizedExpression"
]);
/** The params of a `ParamList`: names, kinds and defaults. */
var readParams = (code, list) => {
	const params = [];
	let star = false;
	let pending = null;
	for (const child of children(list)) if (child.name === "*") {
		pending = ParamKinds.Star;
		star = true;
	} else if (child.name === "**") pending = ParamKinds.DoubleStar;
	else if (child.name === "VariableName") {
		const kind = pending ?? (star ? ParamKinds.KeywordOnly : ParamKinds.Positional);
		params.push({
			name: code.slice(child.from, child.to),
			kind,
			hasDefault: false
		});
		pending = null;
	} else if (child.name === "AssignOp") {
		const last = params.pop();
		if (last !== void 0) params.push({
			...last,
			hasDefault: true
		});
	} else if (child.name === ",") {
		if (pending === ParamKinds.Star) pending = null;
	}
	return params;
};
/** `return value` in the body of a function, not counting nested functions and classes. */
var returnsValue = (body) => {
	const visit = (node) => {
		if (node.name === "FunctionDefinition" || node.name === "ClassDefinition" || node.name === "LambdaExpression") return false;
		if (node.name === "ReturnStatement" && node.lastChild !== null && node.lastChild.name !== "return") return true;
		if (node.name === "YieldExpression" || node.name === "yield") return true;
		return children(node).some(visit);
	};
	return visit(body);
};
/** The dotted module path of `from a.b import` / `import a.b`: names and dots from `start` up to `stop`. */
var dottedPath = (code, nodes) => nodes.map((n) => code.slice(n.from, n.to)).join("");
var analyze = (code) => {
	const tree = parser.parse(code);
	const top = tree.topNode;
	const module = newScope(ScopeKinds.Module, null, top);
	const uses = [];
	const functions = [];
	let broken = false;
	let unsupported = false;
	const text = (node) => code.slice(node.from, node.to);
	/** `nonlocal name`: the value goes to the nearest outer function that has the name. */
	const nonlocalTarget = (scope, name) => {
		for (let current = outer(scope); current !== null; current = outer(current)) if (current.bindings.has(name)) return current;
		return scope;
	};
	const bind = (scope, node, kind, at, extra = {}) => {
		const name = text(node);
		const target = scope.globals.has(name) ? module : scope.nonlocals.has(name) ? nonlocalTarget(scope, name) : scope;
		const binding = {
			name,
			kind,
			from: node.from,
			to: node.to,
			at,
			scope: target,
			...extra
		};
		const list = target.bindings.get(name);
		if (list === void 0) target.bindings.set(name, [binding]);
		else list.push(binding);
	};
	/** Targets of `=`, `for`, `as`: names get a value, `a.b` and `a[0]` read `a`. */
	const bindTarget = (scope, node, kind, at, value) => {
		if (node.name === "VariableName") return bind(scope, node, kind, at, value === void 0 ? {} : { value });
		if (TargetGroups.has(node.name)) {
			for (const child of children(node)) bindTarget(scope, child, kind, at);
			return;
		}
		if (node.name === "*" || node.name === "," || node.name === "(" || node.name === ")" || node.name === "[" || node.name === "]") return;
		visit(scope, node);
	};
	const visitAll = (scope, nodes) => {
		for (const node of nodes) visit(scope, node);
	};
	const visitFunction = (scope, node, decorated) => {
		const name = node.getChild("VariableName");
		const list = node.getChild("ParamList");
		const body = node.getChild("Body");
		if (name === null || list === null || body === null) return visitAll(scope, children(node));
		const info = {
			name: text(name),
			paramsText: code.slice(list.from + 1, list.to - 1),
			params: readParams(code, list),
			returnsValue: returnsValue(body),
			decorated,
			method: scope.kind === ScopeKinds.Class,
			node
		};
		functions.push(info);
		for (const child of children(list)) if (child.name !== "VariableName") visit(scope, child);
		const own = newScope(ScopeKinds.Function, scope, node, info);
		for (const child of children(list)) if (child.name === "VariableName") bind(own, child, BindingKinds.Param, node.from);
		visitAll(own, children(body));
		bind(scope, name, BindingKinds.Function, node.to, { fn: info });
	};
	const visitClass = (scope, node) => {
		const name = node.getChild("VariableName");
		const args = node.getChild("ArgList");
		const body = node.getChild("Body");
		if (args !== null) visit(scope, args);
		if (body !== null) visitAll(newScope(ScopeKinds.Class, scope, node), children(body));
		if (name !== null) bind(scope, name, BindingKinds.Class, node.to);
	};
	const visitLambda = (scope, node) => {
		const list = node.getChild("ParamList");
		const own = newScope(ScopeKinds.Lambda, scope, node);
		if (list !== null) for (const child of children(list)) if (child.name === "VariableName") bind(own, child, BindingKinds.Param, node.from);
		else visit(scope, child);
		let afterColon = false;
		for (const child of children(node)) if (child.name === ":") afterColon = true;
		else if (afterColon) visit(own, child);
	};
	const visitComprehension = (scope, node) => {
		const own = newScope(ScopeKinds.Comprehension, scope, node);
		let inTarget = false;
		for (const child of children(node)) if (child.name === "for") inTarget = true;
		else if (child.name === "in") inTarget = false;
		else if (inTarget) bindTarget(own, child, BindingKinds.Loop, node.from);
		else visit(own, child);
	};
	const visitAssign = (scope, node) => {
		const parts = children(node);
		const lastOp = parts.map((p) => p.name).lastIndexOf("AssignOp");
		if (lastOp < 0) return visitAll(scope, parts);
		const values = parts.slice(lastOp + 1);
		visitAll(scope, values);
		const targets = parts.slice(0, lastOp).filter((p) => p.name !== "AssignOp" && p.name !== "TypeDef");
		const single = targets.length === 1 && values.length === 1 ? values[0] : void 0;
		for (const part of parts.slice(0, lastOp)) if (part.name === "TypeDef") visit(scope, part);
		for (const target of targets) bindTarget(scope, target, BindingKinds.Variable, node.to, single);
	};
	const visitFor = (scope, node) => {
		const parts = children(node);
		const at = node.getChild("Body")?.from ?? node.to;
		let inTarget = false;
		for (const part of parts) if (part.name === "for") inTarget = true;
		else if (part.name === "in") inTarget = false;
		else if (inTarget) bindTarget(scope, part, BindingKinds.Loop, at);
		else visit(scope, part);
	};
	/** `with x as name:` and `except E as name:`: the name after `as` gets a value. */
	const visitWithAs = (scope, node) => {
		let afterAs = false;
		for (const child of children(node)) if (child.name === "as") afterAs = true;
		else if (afterAs && child.name !== "Body") {
			bindTarget(scope, child, BindingKinds.Variable, child.to);
			afterAs = false;
		} else visit(scope, child);
	};
	const visitImport = (scope, node) => {
		const parts = children(node);
		const at = node.to;
		if (parts[0]?.name === "from") {
			const importAt = parts.findIndex((p) => p.name === "import");
			const path = dottedPath(code, parts.slice(1, importAt));
			const rest = parts.slice(importAt + 1);
			if (rest.some((p) => p.name === "*")) {
				scope.starImports.push(path);
				return;
			}
			for (let i = 0; i < rest.length; i++) {
				const part = rest[i];
				if (part?.name !== "VariableName") continue;
				const alias = rest[i + 1]?.name === "as" ? rest[i + 2] : void 0;
				bind(scope, alias ?? part, BindingKinds.Import, at, {
					module: path,
					imported: text(part)
				});
				if (alias !== void 0) i += 2;
			}
			return;
		}
		const groups = [[]];
		for (const part of parts.slice(1)) if (part.name === ",") groups.push([]);
		else groups.at(-1)?.push(part);
		for (const group of groups) {
			const asAt = group.findIndex((p) => p.name === "as");
			const pathNodes = asAt < 0 ? group : group.slice(0, asAt);
			const path = dottedPath(code, pathNodes);
			const alias = asAt < 0 ? void 0 : group[asAt + 1];
			const first = pathNodes[0];
			if (alias !== void 0) bind(scope, alias, BindingKinds.Import, at, { module: path });
			else if (first !== void 0) bind(scope, first, BindingKinds.Import, at, { module: path.split(".")[0] ?? path });
		}
	};
	const visitArgs = (scope, node) => {
		const parts = children(node);
		parts.forEach((part, i) => {
			if (part.name === "VariableName" && parts[i + 1]?.name === "AssignOp") return;
			visit(scope, part);
		});
	};
	const visit = (scope, node) => {
		if (node.type.isError) broken = true;
		switch (node.name) {
			case "VariableName":
				uses.push({
					name: text(node),
					from: node.from,
					to: node.to,
					scope,
					node
				});
				return;
			case "PropertyName":
			case "Comment":
			case "String": return;
			case "FunctionDefinition": return visitFunction(scope, node, false);
			case "DecoratedStatement":
				for (const child of children(node)) if (child.name === "FunctionDefinition") visitFunction(scope, child, true);
				else visit(scope, child);
				return;
			case "ClassDefinition": return visitClass(scope, node);
			case "LambdaExpression": return visitLambda(scope, node);
			case "AssignStatement": return visitAssign(scope, node);
			case "UpdateStatement": {
				const target = node.firstChild;
				visitAll(scope, children(node));
				if (target?.name === "VariableName") bind(scope, target, BindingKinds.Variable, node.to);
				return;
			}
			case "NamedExpression": {
				const target = node.firstChild;
				visitAll(scope, children(node).slice(1));
				if (target?.name === "VariableName") bind(scope.kind === ScopeKinds.Comprehension ? scope.parent ?? scope : scope, target, BindingKinds.Variable, node.to);
				return;
			}
			case "ForStatement": return visitFor(scope, node);
			case "WithStatement":
			case "TryStatement": return visitWithAs(scope, node);
			case "ImportStatement": return visitImport(scope, node);
			case "ScopeStatement": {
				const keyword = node.firstChild?.name;
				for (const child of children(node)) {
					if (child.name !== "VariableName") continue;
					if (keyword === "global") scope.globals.add(text(child));
					else scope.nonlocals.add(text(child));
				}
				return;
			}
			case "ArgList": return visitArgs(scope, node);
			case "MatchStatement":
				unsupported = true;
				return visitAll(scope, children(node));
			default:
				if (ComprehensionNodes.has(node.name)) return visitComprehension(scope, node);
				return visitAll(scope, children(node));
		}
	};
	visitAll(module, children(top));
	return {
		code,
		tree,
		module,
		uses,
		functions,
		broken,
		unsupported
	};
};
/** The scope where a name read in `scope` is looked up next: classes are skipped from inside their methods. */
var outer = (scope) => {
	let next = scope.parent;
	while (next !== null && next.kind === ScopeKinds.Class) next = next.parent;
	return next;
};
/** Where `name`, read in `scope`, has its value: a scope with bindings, or none (builtins, `import *`, unknown). */
var resolve = (name, scope, moduleScope) => {
	let current = scope;
	while (current !== null) {
		if (current.globals.has(name)) current = moduleScope;
		const bindings = current.bindings.get(name);
		if (bindings !== void 0 && bindings.length > 0) return {
			scope: current,
			bindings
		};
		current = outer(current);
	}
	return null;
};
/** The innermost scope at a position: for hints at the cursor. */
var scopeAt = (model, pos) => {
	let scope = model.module;
	for (;;) {
		const inner = scope.children.find((child) => child.from <= pos && pos <= child.to);
		if (inner === void 0) return scope;
		scope = inner;
	}
};
/** All names seen from a scope: its own and those of outer scopes (not the classes around). */
var visibleBindings = (scope) => {
	const seen = /* @__PURE__ */ new Map();
	let current = scope;
	while (current !== null) {
		for (const [name, list] of current.bindings) {
			const first = list[0];
			if (!seen.has(name) && first !== void 0) seen.set(name, first);
		}
		current = outer(current);
	}
	return Array.from(seen.values());
};
/** Star imports seen from a scope. */
var visibleStarImports = (scope) => {
	const out = [];
	let current = scope;
	while (current !== null) {
		out.push(...current.starImports);
		current = outer(current);
	}
	return out;
};
/** The nearest function around a scope (a `def`), if any. */
var enclosingFunction = (scope) => {
	let current = scope;
	while (current !== null) {
		if (current.fn !== void 0) return current.fn;
		current = current.parent;
	}
};
/** Ancestors of a node up to (not including) a node of the given names. */
var hasAncestor = (node, names, stopAt) => {
	for (let parent = node.parent; parent !== null && parent.from >= stopAt; parent = parent.parent) if (names.has(parent.name)) return true;
	return false;
};
// src/core/python-api.ts
var apiBuiltins = [
	"ArithmeticError",
	"AssertionError",
	"AttributeError",
	"BaseException",
	"EOFError",
	"Ellipsis",
	"Exception",
	"GeneratorExit",
	"ImportError",
	"IndentationError",
	"IndexError",
	"KeyError",
	"KeyboardInterrupt",
	"LookupError",
	"MemoryError",
	"NameError",
	"NotImplemented",
	"NotImplementedError",
	"OSError",
	"OverflowError",
	"RuntimeError",
	"StopAsyncIteration",
	"StopIteration",
	"SyntaxError",
	"SystemExit",
	"TypeError",
	"UnicodeError",
	"ValueError",
	"ZeroDivisionError",
	"abs",
	"all",
	"any",
	"bin",
	"bool",
	"bytearray",
	"bytes",
	"callable",
	"chr",
	"classmethod",
	"compile",
	"complex",
	"delattr",
	"dict",
	"dir",
	"divmod",
	"enumerate",
	"eval",
	"exec",
	"execfile",
	"filter",
	"float",
	"frozenset",
	"getattr",
	"globals",
	"hasattr",
	"hash",
	"help",
	"hex",
	"id",
	"input",
	"int",
	"isinstance",
	"issubclass",
	"iter",
	"len",
	"list",
	"locals",
	"map",
	"max",
	"memoryview",
	"min",
	"next",
	"object",
	"oct",
	"open",
	"ord",
	"pow",
	"print",
	"property",
	"range",
	"repr",
	"reversed",
	"round",
	"set",
	"setattr",
	"slice",
	"sorted",
	"staticmethod",
	"str",
	"sum",
	"super",
	"tuple",
	"type",
	"zip"
];
var apiModules = {
	"tkinter.scrolledtext": {
		"Frame": [
			"c",
			"tkinter._widgets.Frame",
			"master=None, cnf={}, **kw"
		],
		"Scrollbar": [
			"c",
			"tkinter._lists.Scrollbar",
			"master=None, cnf={}, **kw"
		],
		"ScrolledText": [
			"c",
			"tkinter.scrolledtext.ScrolledText",
			"master=None, **kw"
		],
		"Text": [
			"c",
			"tkinter._text.Text",
			"master=None, cnf={}, **kw"
		],
		"Widget": [
			"c",
			"tkinter._widgets.Widget",
			"master=None, cnf={}, **kw"
		]
	},
	"random": {
		"choice": ["f", ""],
		"getrandbits": ["f", ""],
		"randint": ["f", ""],
		"random": ["f", ""],
		"randrange": ["f", ""],
		"seed": ["f", ""],
		"uniform": ["f", ""]
	},
	"tkinter.colorchooser": {
		"askcolor": [
			"f",
			"",
			"color=None, **options"
		],
		"Chooser": [
			"c",
			"tkinter.colorchooser.Chooser",
			"master=None, **options"
		]
	},
	"tkinter.filedialog": {
		"app": ["v", ""],
		"askdirectory": [
			"f",
			"",
			"**options"
		],
		"askopenfile": [
			"f",
			"",
			"mode=\"r\", **options"
		],
		"askopenfilename": [
			"f",
			"",
			"**options"
		],
		"askopenfilenames": [
			"f",
			"",
			"**options"
		],
		"askopenfiles": [
			"f",
			"",
			"mode=\"r\", **options"
		],
		"asksaveasfile": [
			"f",
			"",
			"mode=\"w\", **options"
		],
		"asksaveasfilename": [
			"f",
			"",
			"**options"
		],
		"Open": [
			"c",
			"tkinter.filedialog.Open",
			"master=None, **options"
		],
		"os": ["m", ""],
		"SaveAs": [
			"c",
			"tkinter.filedialog.SaveAs",
			"master=None, **options"
		]
	},
	"turtle": {
		"back": [
			"f",
			"",
			"distance"
		],
		"backward": [
			"f",
			"",
			"distance"
		],
		"begin_fill": [
			"f",
			"",
			""
		],
		"bgcolor": [
			"f",
			"",
			"*args"
		],
		"bk": [
			"f",
			"",
			"distance"
		],
		"bye": [
			"f",
			"",
			""
		],
		"circle": [
			"f",
			"",
			"radius, extent=None, steps=None"
		],
		"clear": [
			"f",
			"",
			""
		],
		"color": [
			"f",
			"",
			"*args"
		],
		"colormode": [
			"f",
			"",
			"mode=None"
		],
		"distance": [
			"f",
			"",
			"x, y=None"
		],
		"done": [
			"f",
			"",
			""
		],
		"dot": [
			"f",
			"",
			"size=None, *color"
		],
		"down": [
			"f",
			"",
			""
		],
		"end_fill": [
			"f",
			"",
			""
		],
		"exitonclick": [
			"f",
			"",
			""
		],
		"fd": [
			"f",
			"",
			"distance"
		],
		"fillcolor": [
			"f",
			"",
			"*args"
		],
		"filling": [
			"f",
			"",
			""
		],
		"forward": [
			"f",
			"",
			"distance"
		],
		"goto": [
			"f",
			"",
			"x, y=None"
		],
		"heading": [
			"f",
			"",
			""
		],
		"hideturtle": [
			"f",
			"",
			""
		],
		"home": [
			"f",
			"",
			""
		],
		"ht": [
			"f",
			"",
			""
		],
		"isdown": [
			"f",
			"",
			""
		],
		"isvisible": [
			"f",
			"",
			""
		],
		"left": [
			"f",
			"",
			"angle"
		],
		"lt": [
			"f",
			"",
			"angle"
		],
		"mainloop": [
			"f",
			"",
			""
		],
		"math": ["m", ""],
		"pd": [
			"f",
			"",
			""
		],
		"Pen": [
			"c",
			"turtle.Turtle",
			""
		],
		"pencolor": [
			"f",
			"",
			"*args"
		],
		"pendown": [
			"f",
			"",
			""
		],
		"pensize": [
			"f",
			"",
			"width=None"
		],
		"penup": [
			"f",
			"",
			""
		],
		"pos": [
			"f",
			"",
			""
		],
		"position": [
			"f",
			"",
			""
		],
		"pu": [
			"f",
			"",
			""
		],
		"RawTurtle": [
			"c",
			"turtle.Turtle",
			""
		],
		"reset": [
			"f",
			"",
			""
		],
		"right": [
			"f",
			"",
			"angle"
		],
		"rt": [
			"f",
			"",
			"angle"
		],
		"Screen": [
			"f",
			"",
			""
		],
		"seth": [
			"f",
			"",
			"angle"
		],
		"setheading": [
			"f",
			"",
			"angle"
		],
		"setpos": [
			"f",
			"",
			"x, y=None"
		],
		"setposition": [
			"f",
			"",
			"x, y=None"
		],
		"setup": [
			"f",
			"",
			"*args, **kwargs"
		],
		"setx": [
			"f",
			"",
			"x"
		],
		"sety": [
			"f",
			"",
			"y"
		],
		"shape": [
			"f",
			"",
			"name=None"
		],
		"shapesize": [
			"f",
			"",
			"*args, **kwargs"
		],
		"showturtle": [
			"f",
			"",
			""
		],
		"speed": [
			"f",
			"",
			"speed=None"
		],
		"st": [
			"f",
			"",
			""
		],
		"stamp": [
			"f",
			"",
			""
		],
		"title": [
			"f",
			"",
			"*args"
		],
		"towards": [
			"f",
			"",
			"x, y=None"
		],
		"tracer": [
			"f",
			"",
			"*args, **kwargs"
		],
		"Turtle": [
			"c",
			"turtle.Turtle",
			""
		],
		"up": [
			"f",
			"",
			""
		],
		"update": [
			"f",
			"",
			""
		],
		"width": [
			"f",
			"",
			"width=None"
		],
		"write": [
			"f",
			"",
			"arg, move=False, align=\"left\", font=(\"Arial\", 8, \"normal\")"
		],
		"xcor": [
			"f",
			"",
			""
		],
		"ycor": [
			"f",
			"",
			""
		]
	},
	"time": {
		"const": ["f", ""],
		"gmtime": ["f", ""],
		"localtime": ["f", ""],
		"mktime": ["f", ""],
		"sleep": ["f", ""],
		"sleep_ms": ["f", ""],
		"sleep_us": ["f", ""],
		"strftime": ["f", ""],
		"ticks_add": ["f", ""],
		"ticks_cpu": ["f", ""],
		"ticks_diff": ["f", ""],
		"ticks_ms": ["f", ""],
		"ticks_us": ["f", ""],
		"time": ["f", ""],
		"time_ns": ["f", ""]
	},
	"tkinter.simpledialog": {
		"askfloat": [
			"f",
			"",
			"title, prompt, **kw"
		],
		"askinteger": [
			"f",
			"",
			"title, prompt, **kw"
		],
		"askstring": [
			"f",
			"",
			"title, prompt, **kw"
		],
		"Dialog": [
			"c",
			"tkinter.simpledialog.Dialog",
			"parent, title=None"
		],
		"SimpleDialog": [
			"c",
			"tkinter.simpledialog.Dialog",
			"parent, title=None"
		]
	},
	"tkinter.ttk": {
		"Button": [
			"c",
			"tkinter.ttk.Button",
			"master=None, cnf={}, **kw"
		],
		"Checkbutton": [
			"c",
			"tkinter.ttk.Checkbutton",
			"master=None, cnf={}, **kw"
		],
		"Combobox": [
			"c",
			"tkinter.ttk.Combobox",
			"master=None, cnf={}, **kw"
		],
		"Entry": [
			"c",
			"tkinter.ttk.Entry",
			"master=None, cnf={}, **kw"
		],
		"Frame": [
			"c",
			"tkinter.ttk.Frame",
			"master=None, cnf={}, **kw"
		],
		"Label": [
			"c",
			"tkinter.ttk.Label",
			"master=None, cnf={}, **kw"
		],
		"LabeledScale": [
			"c",
			"tkinter.ttk.LabeledScale",
			"master=None, variable=None, from_=0, to=10, **kw"
		],
		"Labelframe": [
			"c",
			"tkinter.ttk.LabelFrame",
			"master=None, cnf={}, **kw"
		],
		"LabelFrame": [
			"c",
			"tkinter.ttk.LabelFrame",
			"master=None, cnf={}, **kw"
		],
		"Menubutton": [
			"c",
			"tkinter.ttk.Menubutton",
			"master=None, cnf={}, **kw"
		],
		"Notebook": [
			"c",
			"tkinter._themed.Notebook",
			"master=None, cnf={}, **kw"
		],
		"OptionMenu": [
			"c",
			"tkinter.ttk.OptionMenu",
			"master, variable, default=None, *values, **kwargs"
		],
		"Panedwindow": [
			"c",
			"tkinter.ttk.PanedWindow",
			"master=None, cnf={}, **kw"
		],
		"PanedWindow": [
			"c",
			"tkinter.ttk.PanedWindow",
			"master=None, cnf={}, **kw"
		],
		"Progressbar": [
			"c",
			"tkinter._themed.Progressbar",
			"master=None, cnf={}, **kw"
		],
		"Radiobutton": [
			"c",
			"tkinter.ttk.Radiobutton",
			"master=None, cnf={}, **kw"
		],
		"Scale": [
			"c",
			"tkinter.ttk.Scale",
			"master=None, cnf={}, **kw"
		],
		"Scrollbar": [
			"c",
			"tkinter.ttk.Scrollbar",
			"master=None, cnf={}, **kw"
		],
		"Separator": [
			"c",
			"tkinter._themed.Separator",
			"master=None, cnf={}, **kw"
		],
		"Sizegrip": [
			"c",
			"tkinter.ttk.Sizegrip",
			"master=None, cnf={}, **kw"
		],
		"Spinbox": [
			"c",
			"tkinter.ttk.Spinbox",
			"master=None, cnf={}, **kw"
		],
		"Style": [
			"c",
			"tkinter._themed.Style",
			"master=None"
		],
		"Themed": ["c", "tkinter._themed.Themed"],
		"tkinter": ["m", ""],
		"Treeview": [
			"c",
			"tkinter._themed.Treeview",
			"master=None, cnf={}, **kw"
		]
	},
	"tkinter.font": {
		"BOLD": ["v", ""],
		"families": [
			"f",
			"",
			"root=None, displayof=None"
		],
		"Font": [
			"c",
			"tkinter.font.Font",
			"root=None, font=None, name=None, exists=False, **options"
		],
		"ITALIC": ["v", ""],
		"names": [
			"f",
			"",
			"root=None"
		],
		"nametofont": [
			"f",
			"",
			"name, root=None"
		],
		"NORMAL": ["v", ""],
		"ROMAN": ["v", ""],
		"touch": [
			"f",
			"",
			""
		]
	},
	"math": {
		"acos": ["f", ""],
		"acosh": ["f", ""],
		"asin": ["f", ""],
		"asinh": ["f", ""],
		"atan": ["f", ""],
		"atan2": ["f", ""],
		"atanh": ["f", ""],
		"ceil": ["f", ""],
		"copysign": ["f", ""],
		"cos": ["f", ""],
		"cosh": ["f", ""],
		"degrees": ["f", ""],
		"e": ["v", ""],
		"erf": ["f", ""],
		"erfc": ["f", ""],
		"exp": ["f", ""],
		"expm1": ["f", ""],
		"fabs": ["f", ""],
		"factorial": ["f", ""],
		"floor": ["f", ""],
		"fmod": ["f", ""],
		"frexp": ["f", ""],
		"gamma": ["f", ""],
		"inf": ["v", ""],
		"isclose": ["f", ""],
		"isfinite": ["f", ""],
		"isinf": ["f", ""],
		"isnan": ["f", ""],
		"ldexp": ["f", ""],
		"lgamma": ["f", ""],
		"log": ["f", ""],
		"log10": ["f", ""],
		"log2": ["f", ""],
		"modf": ["f", ""],
		"nan": ["v", ""],
		"pi": ["v", ""],
		"pow": ["f", ""],
		"radians": ["f", ""],
		"sin": ["f", ""],
		"sinh": ["f", ""],
		"sqrt": ["f", ""],
		"tan": ["f", ""],
		"tanh": ["f", ""],
		"tau": ["v", ""],
		"trunc": ["f", ""]
	},
	"tkinter": {
		"ACTIVE": ["v", ""],
		"ALL": ["v", ""],
		"ANCHOR": ["v", ""],
		"ARC": ["v", ""],
		"BASELINE": ["v", ""],
		"BEVEL": ["v", ""],
		"BitmapImage": [
			"c",
			"tkinter._images.BitmapImage",
			"name=None, cnf={}, master=None, **kw"
		],
		"BooleanVar": [
			"c",
			"tkinter._vars.BooleanVar",
			"master=None, value=None, name=None"
		],
		"BOTH": ["v", ""],
		"BOTTOM": ["v", ""],
		"BROWSE": ["v", ""],
		"BUTT": ["v", ""],
		"Button": [
			"c",
			"tkinter._widgets.Button",
			"master=None, cnf={}, **kw"
		],
		"Canvas": [
			"c",
			"tkinter._canvas.Canvas",
			"master=None, cnf={}, **kw"
		],
		"CASCADE": ["v", ""],
		"CENTER": ["v", ""],
		"CHAR": ["v", ""],
		"Checkbutton": [
			"c",
			"tkinter._widgets.Checkbutton",
			"master=None, cnf={}, **kw"
		],
		"CHECKBUTTON": ["v", ""],
		"CHORD": ["v", ""],
		"COMMAND": ["v", ""],
		"constants": ["m", ""],
		"CURRENT": ["v", ""],
		"DISABLED": ["v", ""],
		"DOTBOX": ["v", ""],
		"DoubleVar": [
			"c",
			"tkinter._vars.DoubleVar",
			"master=None, value=None, name=None"
		],
		"E": ["v", ""],
		"END": ["v", ""],
		"Entry": [
			"c",
			"tkinter._fields.Entry",
			"master=None, cnf={}, **kw"
		],
		"Event": [
			"c",
			"tkinter._events.Event",
			"kind, widget"
		],
		"EW": ["v", ""],
		"EXTENDED": ["v", ""],
		"FALSE": ["v", ""],
		"FIRST": ["v", ""],
		"FLAT": ["v", ""],
		"Frame": [
			"c",
			"tkinter._widgets.Frame",
			"master=None, cnf={}, **kw"
		],
		"getboolean": [
			"f",
			"",
			"s"
		],
		"getdouble": [
			"f",
			"",
			"s"
		],
		"getint": [
			"f",
			"",
			"s"
		],
		"GROOVE": ["v", ""],
		"HIDDEN": ["v", ""],
		"HORIZONTAL": ["v", ""],
		"Image": [
			"c",
			"tkinter._images.Image",
			"imgtype, name=None, cnf={}, master=None, **kw"
		],
		"image_names": [
			"f",
			"",
			""
		],
		"image_types": [
			"f",
			"",
			""
		],
		"INSERT": ["v", ""],
		"INSIDE": ["v", ""],
		"IntVar": [
			"c",
			"tkinter._vars.IntVar",
			"master=None, value=None, name=None"
		],
		"Label": [
			"c",
			"tkinter._widgets.Label",
			"master=None, cnf={}, **kw"
		],
		"LabelFrame": [
			"c",
			"tkinter._widgets.LabelFrame",
			"master=None, cnf={}, **kw"
		],
		"LAST": ["v", ""],
		"LEFT": ["v", ""],
		"Listbox": [
			"c",
			"tkinter._lists.Listbox",
			"master=None, cnf={}, **kw"
		],
		"mainloop": [
			"f",
			"",
			"n=0"
		],
		"Menu": [
			"c",
			"tkinter._menus.Menu",
			"master=None, cnf={}, **kw"
		],
		"Menubutton": [
			"c",
			"tkinter._menus.Menubutton",
			"master=None, cnf={}, **kw"
		],
		"Message": [
			"c",
			"tkinter._widgets.Message",
			"master=None, cnf={}, **kw"
		],
		"Misc": ["c", "tkinter._core.Misc"],
		"MITER": ["v", ""],
		"MOVETO": ["v", ""],
		"MULTIPLE": ["v", ""],
		"N": ["v", ""],
		"NE": ["v", ""],
		"NO": ["v", ""],
		"NoDefaultRoot": [
			"f",
			"",
			""
		],
		"NONE": ["v", ""],
		"NORMAL": ["v", ""],
		"NS": ["v", ""],
		"NSEW": ["v", ""],
		"NUMERIC": ["v", ""],
		"NW": ["v", ""],
		"OFF": ["v", ""],
		"ON": ["v", ""],
		"OptionMenu": [
			"c",
			"tkinter._menus.OptionMenu",
			"master, variable, value, *values, **kwargs"
		],
		"OUTSIDE": ["v", ""],
		"PAGES": ["v", ""],
		"PanedWindow": [
			"c",
			"tkinter._widgets.PanedWindow",
			"master=None, cnf={}, **kw"
		],
		"PhotoImage": [
			"c",
			"tkinter._images.PhotoImage",
			"name=None, cnf={}, master=None, **kw"
		],
		"PIESLICE": ["v", ""],
		"PROJECTING": ["v", ""],
		"Radiobutton": [
			"c",
			"tkinter._widgets.Radiobutton",
			"master=None, cnf={}, **kw"
		],
		"RADIOBUTTON": ["v", ""],
		"RAISED": ["v", ""],
		"READONLY": ["v", ""],
		"RIDGE": ["v", ""],
		"RIGHT": ["v", ""],
		"ROUND": ["v", ""],
		"S": ["v", ""],
		"Scale": [
			"c",
			"tkinter._fields.Scale",
			"master=None, cnf={}, **kw"
		],
		"SCROLL": ["v", ""],
		"Scrollbar": [
			"c",
			"tkinter._lists.Scrollbar",
			"master=None, cnf={}, **kw"
		],
		"SE": ["v", ""],
		"SEL": ["v", ""],
		"SEL_FIRST": ["v", ""],
		"SEL_LAST": ["v", ""],
		"SEPARATOR": ["v", ""],
		"SINGLE": ["v", ""],
		"SOLID": ["v", ""],
		"Spinbox": [
			"c",
			"tkinter._lists.Spinbox",
			"master=None, cnf={}, **kw"
		],
		"StringVar": [
			"c",
			"tkinter._vars.StringVar",
			"master=None, value=None, name=None"
		],
		"SUNKEN": ["v", ""],
		"SW": ["v", ""],
		"TclError": ["c", "tkinter._style.TclError"],
		"TclVersion": ["v", ""],
		"Text": [
			"c",
			"tkinter._text.Text",
			"master=None, cnf={}, **kw"
		],
		"Tk": [
			"c",
			"tkinter._windows.Tk",
			"screenName=None, baseName=None, className=\"Tk\", useTk=True, sync=False, use=None"
		],
		"TkVersion": ["v", ""],
		"TOP": ["v", ""],
		"Toplevel": [
			"c",
			"tkinter._windows.Toplevel",
			"master=None, cnf={}, **kw"
		],
		"TRUE": ["v", ""],
		"UNDERLINE": ["v", ""],
		"UNITS": ["v", ""],
		"Variable": [
			"c",
			"tkinter._vars.Variable",
			"master=None, value=None, name=None"
		],
		"VERTICAL": ["v", ""],
		"W": ["v", ""],
		"Widget": [
			"c",
			"tkinter._widgets.Widget",
			"master=None, cnf={}, **kw"
		],
		"Wm": ["c", "tkinter._windows.Wm"],
		"WORD": ["v", ""],
		"X": ["v", ""],
		"Y": ["v", ""],
		"YES": ["v", ""]
	},
	"tkinter.messagebox": {
		"ABORT": ["v", ""],
		"ABORTRETRYIGNORE": ["v", ""],
		"askokcancel": [
			"f",
			"",
			"title=None, message=None, **options"
		],
		"askquestion": [
			"f",
			"",
			"title=None, message=None, **options"
		],
		"askretrycancel": [
			"f",
			"",
			"title=None, message=None, **options"
		],
		"askyesno": [
			"f",
			"",
			"title=None, message=None, **options"
		],
		"askyesnocancel": [
			"f",
			"",
			"title=None, message=None, **options"
		],
		"CANCEL": ["v", ""],
		"ERROR": ["v", ""],
		"IGNORE": ["v", ""],
		"INFO": ["v", ""],
		"Message": [
			"c",
			"tkinter.messagebox.Message",
			"master=None, **options"
		],
		"NO": ["v", ""],
		"OK": ["v", ""],
		"OKCANCEL": ["v", ""],
		"QUESTION": ["v", ""],
		"RETRY": ["v", ""],
		"RETRYCANCEL": ["v", ""],
		"showerror": [
			"f",
			"",
			"title=None, message=None, **options"
		],
		"showinfo": [
			"f",
			"",
			"title=None, message=None, **options"
		],
		"showwarning": [
			"f",
			"",
			"title=None, message=None, **options"
		],
		"WARNING": ["v", ""],
		"YES": ["v", ""],
		"YESNO": ["v", ""],
		"YESNOCANCEL": ["v", ""]
	}
};
var apiClasses = {
	"tkinter._canvas.Canvas": {
		"bases": ["tkinter._widgets.Widget"],
		"members": {
			"addtag_all": [
				"f",
				"",
				"newtag"
			],
			"addtag_withtag": [
				"f",
				"",
				"newtag, tagOrId"
			],
			"bbox": [
				"f",
				"",
				"*args"
			],
			"canvasx": [
				"f",
				"",
				"screenx, gridspacing=None"
			],
			"canvasy": [
				"f",
				"",
				"screeny, gridspacing=None"
			],
			"coords": [
				"f",
				"",
				"tagOrId, *args"
			],
			"create_arc": [
				"f",
				"",
				"*args, **kw"
			],
			"create_bitmap": [
				"f",
				"",
				"*args, **kw"
			],
			"create_image": [
				"f",
				"",
				"*args, **kw"
			],
			"create_line": [
				"f",
				"",
				"*args, **kw"
			],
			"create_oval": [
				"f",
				"",
				"*args, **kw"
			],
			"create_polygon": [
				"f",
				"",
				"*args, **kw"
			],
			"create_rectangle": [
				"f",
				"",
				"*args, **kw"
			],
			"create_text": [
				"f",
				"",
				"*args, **kw"
			],
			"create_window": [
				"f",
				"",
				"*args, **kw"
			],
			"delete": [
				"f",
				"",
				"*args"
			],
			"dtag": [
				"f",
				"",
				"tagOrId, tagToDelete=None"
			],
			"find_all": [
				"f",
				"",
				""
			],
			"find_closest": [
				"f",
				"",
				"x, y, halo=None, start=None"
			],
			"find_enclosed": [
				"f",
				"",
				"x1, y1, x2, y2"
			],
			"find_overlapping": [
				"f",
				"",
				"x1, y1, x2, y2"
			],
			"find_withtag": [
				"f",
				"",
				"tagOrId"
			],
			"gettags": [
				"f",
				"",
				"tagOrId"
			],
			"itemcget": [
				"f",
				"",
				"tagOrId, option"
			],
			"itemconfig": ["f", ""],
			"itemconfigure": [
				"f",
				"",
				"tagOrId, cnf=None, **kw"
			],
			"lift": ["f", ""],
			"lower": ["f", ""],
			"move": [
				"f",
				"",
				"tagOrId, xAmount, yAmount"
			],
			"moveto": [
				"f",
				"",
				"tagOrId, x=\"\", y=\"\""
			],
			"postscript": [
				"f",
				"",
				"cnf={}, **kw"
			],
			"scale": [
				"f",
				"",
				"tagOrId, xOrigin, yOrigin, xScale, yScale"
			],
			"tag_bind": [
				"f",
				"",
				"tagOrId, sequence=None, func=None, add=None"
			],
			"tag_lower": [
				"f",
				"",
				"tagOrId, belowThis=None"
			],
			"tag_raise": [
				"f",
				"",
				"tagOrId, aboveThis=None"
			],
			"tag_unbind": [
				"f",
				"",
				"tagOrId, sequence, funcid=None"
			],
			"tkraise": ["f", ""],
			"type": [
				"f",
				"",
				"tagOrId"
			],
			"xview": [
				"f",
				"",
				"*args"
			],
			"yview": ["f", ""]
		}
	},
	"tkinter._core.Misc": {
		"bases": [],
		"members": {
			"after": [
				"f",
				"",
				"ms, func=None, *args"
			],
			"after_cancel": [
				"f",
				"",
				"id"
			],
			"after_idle": [
				"f",
				"",
				"func, *args"
			],
			"bell": [
				"f",
				"",
				"displayof=0"
			],
			"bind": [
				"f",
				"",
				"sequence=None, func=None, add=None"
			],
			"bind_all": [
				"f",
				"",
				"sequence=None, func=None, add=None"
			],
			"bind_class": [
				"f",
				"",
				"className, sequence=None, func=None, add=None"
			],
			"bindtags": [
				"f",
				"",
				"tagList=None"
			],
			"cget": [
				"f",
				"",
				"key"
			],
			"clipboard_append": [
				"f",
				"",
				"string, **kw"
			],
			"clipboard_clear": [
				"f",
				"",
				"**kw"
			],
			"clipboard_get": [
				"f",
				"",
				"**kw"
			],
			"columnconfigure": [
				"f",
				"",
				"index, cnf={}, **kw"
			],
			"config": ["f", ""],
			"configure": [
				"f",
				"",
				"cnf=None, **kw"
			],
			"event_generate": [
				"f",
				"",
				"sequence, **kw"
			],
			"focus": ["f", ""],
			"focus_displayof": ["f", ""],
			"focus_force": ["f", ""],
			"focus_get": [
				"f",
				"",
				""
			],
			"focus_set": [
				"f",
				"",
				""
			],
			"grab_release": [
				"f",
				"",
				""
			],
			"grab_set": [
				"f",
				"",
				""
			],
			"grid_columnconfigure": ["f", ""],
			"grid_propagate": ["f", ""],
			"grid_rowconfigure": ["f", ""],
			"grid_size": [
				"f",
				"",
				""
			],
			"grid_slaves": [
				"f",
				"",
				"row=None, column=None"
			],
			"keys": [
				"f",
				"",
				""
			],
			"mainloop": [
				"f",
				"",
				"n=0"
			],
			"nametowidget": [
				"f",
				"",
				"name"
			],
			"option_add": [
				"f",
				"",
				"pattern, value, priority=None"
			],
			"option_clear": [
				"f",
				"",
				""
			],
			"option_get": [
				"f",
				"",
				"name, className"
			],
			"pack_propagate": [
				"f",
				"",
				"flag=None"
			],
			"pack_slaves": [
				"f",
				"",
				""
			],
			"place_slaves": [
				"f",
				"",
				""
			],
			"propagate": ["f", ""],
			"quit": [
				"f",
				"",
				""
			],
			"register": [
				"f",
				"",
				"func, subst=None, needcleanup=1"
			],
			"rowconfigure": [
				"f",
				"",
				"index, cnf={}, **kw"
			],
			"selection_get": [
				"f",
				"",
				"**kw"
			],
			"slaves": ["f", ""],
			"tk_setPalette": [
				"f",
				"",
				"*args, **kw"
			],
			"unbind": [
				"f",
				"",
				"sequence, funcid=None"
			],
			"unbind_all": [
				"f",
				"",
				"sequence"
			],
			"unbind_class": [
				"f",
				"",
				"className, sequence"
			],
			"update": [
				"f",
				"",
				""
			],
			"update_idletasks": [
				"f",
				"",
				""
			],
			"wait_variable": [
				"f",
				"",
				"name=\"PY_VAR\""
			],
			"wait_visibility": [
				"f",
				"",
				"window=None"
			],
			"wait_window": [
				"f",
				"",
				"window=None"
			],
			"waitvar": ["f", ""],
			"winfo_children": [
				"f",
				"",
				""
			],
			"winfo_class": [
				"f",
				"",
				""
			],
			"winfo_exists": [
				"f",
				"",
				""
			],
			"winfo_fpixels": [
				"f",
				"",
				"number"
			],
			"winfo_height": [
				"f",
				"",
				""
			],
			"winfo_id": [
				"f",
				"",
				""
			],
			"winfo_ismapped": [
				"f",
				"",
				""
			],
			"winfo_name": [
				"f",
				"",
				""
			],
			"winfo_parent": [
				"f",
				"",
				""
			],
			"winfo_pixels": [
				"f",
				"",
				"number"
			],
			"winfo_pointerx": [
				"f",
				"",
				""
			],
			"winfo_pointerxy": [
				"f",
				"",
				""
			],
			"winfo_pointery": [
				"f",
				"",
				""
			],
			"winfo_reqheight": [
				"f",
				"",
				""
			],
			"winfo_reqwidth": [
				"f",
				"",
				""
			],
			"winfo_rgb": [
				"f",
				"",
				"color"
			],
			"winfo_rootx": [
				"f",
				"",
				""
			],
			"winfo_rooty": [
				"f",
				"",
				""
			],
			"winfo_screenheight": [
				"f",
				"",
				""
			],
			"winfo_screenwidth": [
				"f",
				"",
				""
			],
			"winfo_toplevel": [
				"f",
				"",
				""
			],
			"winfo_viewable": [
				"f",
				"",
				""
			],
			"winfo_width": [
				"f",
				"",
				""
			],
			"winfo_x": [
				"f",
				"",
				""
			],
			"winfo_y": [
				"f",
				"",
				""
			]
		}
	},
	"tkinter._events.Event": {
		"bases": [],
		"members": {}
	},
	"tkinter._fields.Entry": {
		"bases": ["tkinter._widgets.Widget"],
		"members": {
			"delete": [
				"f",
				"",
				"first, last=None"
			],
			"get": [
				"f",
				"",
				""
			],
			"icursor": [
				"f",
				"",
				"index"
			],
			"index": [
				"f",
				"",
				"index"
			],
			"insert": [
				"f",
				"",
				"index, string"
			],
			"select_clear": [
				"f",
				"",
				""
			],
			"select_present": [
				"f",
				"",
				""
			],
			"select_range": [
				"f",
				"",
				"start, end"
			],
			"selection_clear": ["f", ""],
			"selection_present": ["f", ""],
			"selection_range": ["f", ""],
			"xview_moveto": [
				"f",
				"",
				"fraction"
			],
			"xview_scroll": [
				"f",
				"",
				"number, what"
			]
		}
	},
	"tkinter._fields.Scale": {
		"bases": ["tkinter._widgets.Widget"],
		"members": {
			"get": [
				"f",
				"",
				""
			],
			"set": [
				"f",
				"",
				"value"
			]
		}
	},
	"tkinter._images.BitmapImage": {
		"bases": ["tkinter._images.Image"],
		"members": {}
	},
	"tkinter._images.Image": {
		"bases": [],
		"members": { "type": [
			"f",
			"",
			""
		] }
	},
	"tkinter._images.PhotoImage": {
		"bases": ["tkinter._images.Image"],
		"members": {
			"blank": [
				"f",
				"",
				""
			],
			"cget": [
				"f",
				"",
				"option"
			],
			"config": ["f", ""],
			"configure": [
				"f",
				"",
				"**kw"
			],
			"copy": [
				"f",
				"",
				""
			],
			"get": [
				"f",
				"",
				"x, y"
			],
			"height": [
				"f",
				"",
				""
			],
			"put": [
				"f",
				"",
				"data, to=None"
			],
			"subsample": [
				"f",
				"",
				"x, y=\"\""
			],
			"transparency_get": [
				"f",
				"",
				"x, y"
			],
			"transparency_set": [
				"f",
				"",
				"x, y, boolean"
			],
			"width": [
				"f",
				"",
				""
			],
			"write": [
				"f",
				"",
				"filename, format=None, from_coords=None"
			],
			"zoom": [
				"f",
				"",
				"x, y=\"\""
			]
		}
	},
	"tkinter._lists.Combobox": {
		"bases": ["tkinter._fields.Entry"],
		"members": {
			"current": [
				"f",
				"",
				"newindex=None"
			],
			"set": [
				"f",
				"",
				"value"
			]
		}
	},
	"tkinter._lists.Listbox": {
		"bases": ["tkinter._widgets.Widget"],
		"members": {
			"activate": [
				"f",
				"",
				"index"
			],
			"curselection": [
				"f",
				"",
				""
			],
			"delete": [
				"f",
				"",
				"first, last=None"
			],
			"get": [
				"f",
				"",
				"first, last=None"
			],
			"index": [
				"f",
				"",
				"index"
			],
			"insert": [
				"f",
				"",
				"index, *elements"
			],
			"itemcget": [
				"f",
				"",
				"index, option"
			],
			"itemconfig": ["f", ""],
			"itemconfigure": [
				"f",
				"",
				"index, cnf=None, **kw"
			],
			"nearest": [
				"f",
				"",
				"y"
			],
			"see": [
				"f",
				"",
				"index"
			],
			"select_anchor": ["f", ""],
			"select_clear": ["f", ""],
			"select_includes": ["f", ""],
			"select_set": ["f", ""],
			"selection_anchor": [
				"f",
				"",
				"index"
			],
			"selection_clear": [
				"f",
				"",
				"first, last=None"
			],
			"selection_includes": [
				"f",
				"",
				"index"
			],
			"selection_set": [
				"f",
				"",
				"first, last=None"
			],
			"size": [
				"f",
				"",
				""
			],
			"xview_moveto": ["f", ""],
			"xview_scroll": ["f", ""],
			"yview_moveto": [
				"f",
				"",
				"fraction"
			],
			"yview_scroll": [
				"f",
				"",
				"number, what"
			]
		}
	},
	"tkinter._lists.Scrollbar": {
		"bases": ["tkinter._widgets.Widget"],
		"members": {
			"activate": [
				"f",
				"",
				"index=None"
			],
			"delta": [
				"f",
				"",
				"deltax, deltay"
			],
			"fraction": [
				"f",
				"",
				"x, y"
			],
			"get": [
				"f",
				"",
				""
			],
			"identify": [
				"f",
				"",
				"x, y"
			]
		}
	},
	"tkinter._lists.Spinbox": {
		"bases": ["tkinter._fields.Entry"],
		"members": {
			"invoke": [
				"f",
				"",
				"element"
			],
			"set": [
				"f",
				"",
				"value"
			]
		}
	},
	"tkinter._menus.Menu": {
		"bases": ["tkinter._widgets.Widget"],
		"members": {
			"activate": [
				"f",
				"",
				"index"
			],
			"add": [
				"f",
				"",
				"itemType, cnf={}, **kw"
			],
			"add_cascade": [
				"f",
				"",
				"cnf={}, **kw"
			],
			"add_checkbutton": [
				"f",
				"",
				"cnf={}, **kw"
			],
			"add_command": [
				"f",
				"",
				"cnf={}, **kw"
			],
			"add_radiobutton": [
				"f",
				"",
				"cnf={}, **kw"
			],
			"add_separator": [
				"f",
				"",
				"cnf={}, **kw"
			],
			"delete": [
				"f",
				"",
				"index1, index2=None"
			],
			"entrycget": [
				"f",
				"",
				"index, option"
			],
			"entryconfig": ["f", ""],
			"entryconfigure": [
				"f",
				"",
				"index, cnf=None, **kw"
			],
			"index": [
				"f",
				"",
				"index"
			],
			"insert": [
				"f",
				"",
				"index, itemType, cnf={}, **kw"
			],
			"insert_cascade": [
				"f",
				"",
				"index, cnf={}, **kw"
			],
			"insert_checkbutton": [
				"f",
				"",
				"index, cnf={}, **kw"
			],
			"insert_command": [
				"f",
				"",
				"index, cnf={}, **kw"
			],
			"insert_radiobutton": [
				"f",
				"",
				"index, cnf={}, **kw"
			],
			"insert_separator": [
				"f",
				"",
				"index, cnf={}, **kw"
			],
			"invoke": [
				"f",
				"",
				"index"
			],
			"post": [
				"f",
				"",
				"x, y"
			],
			"tk_popup": [
				"f",
				"",
				"x, y, entry=\"\""
			],
			"type": [
				"f",
				"",
				"index"
			],
			"unpost": [
				"f",
				"",
				""
			],
			"xposition": [
				"f",
				"",
				"index"
			],
			"yposition": [
				"f",
				"",
				"index"
			]
		}
	},
	"tkinter._menus.Menubutton": {
		"bases": ["tkinter._widgets.Button"],
		"members": { "invoke": [
			"f",
			"",
			""
		] }
	},
	"tkinter._menus.OptionMenu": {
		"bases": ["tkinter._menus.Menubutton"],
		"members": {}
	},
	"tkinter._style.TclError": {
		"bases": [],
		"members": {}
	},
	"tkinter._text.Text": {
		"bases": ["tkinter._widgets.Widget"],
		"members": {
			"bbox": [
				"f",
				"",
				"index"
			],
			"compare": [
				"f",
				"",
				"index1, op, index2"
			],
			"count": [
				"f",
				"",
				"index1, index2, *args"
			],
			"delete": [
				"f",
				"",
				"index1, index2=None"
			],
			"dlineinfo": [
				"f",
				"",
				"index"
			],
			"edit": [
				"f",
				"",
				"*args"
			],
			"edit_modified": [
				"f",
				"",
				"arg=None"
			],
			"edit_redo": [
				"f",
				"",
				""
			],
			"edit_reset": [
				"f",
				"",
				""
			],
			"edit_separator": [
				"f",
				"",
				""
			],
			"edit_undo": [
				"f",
				"",
				""
			],
			"event_generate": [
				"f",
				"",
				"sequence, **kw"
			],
			"get": [
				"f",
				"",
				"index1, index2=None"
			],
			"index": [
				"f",
				"",
				"index"
			],
			"insert": [
				"f",
				"",
				"index, chars, *args"
			],
			"mark_gravity": [
				"f",
				"",
				"markName, direction=None"
			],
			"mark_names": [
				"f",
				"",
				""
			],
			"mark_next": [
				"f",
				"",
				"index"
			],
			"mark_previous": [
				"f",
				"",
				"index"
			],
			"mark_set": [
				"f",
				"",
				"markName, index"
			],
			"mark_unset": [
				"f",
				"",
				"*markNames"
			],
			"replace": [
				"f",
				"",
				"index1, index2, chars, *args"
			],
			"search": [
				"f",
				"",
				"pattern, index, stopindex=None, forwards=None, backwards=None, exact=None, regexp=None, nocase=None, count=None, elide=None"
			],
			"see": [
				"f",
				"",
				"index"
			],
			"tag_add": [
				"f",
				"",
				"tagName, index1, *args"
			],
			"tag_bind": [
				"f",
				"",
				"tagName, sequence, func, add=None"
			],
			"tag_cget": [
				"f",
				"",
				"tagName, option"
			],
			"tag_config": ["f", ""],
			"tag_configure": [
				"f",
				"",
				"tagName, cnf=None, **kw"
			],
			"tag_delete": [
				"f",
				"",
				"tagName, *tagNames"
			],
			"tag_lower": [
				"f",
				"",
				"tagName, belowThis=None"
			],
			"tag_names": [
				"f",
				"",
				"index=None"
			],
			"tag_nextrange": [
				"f",
				"",
				"tagName, index1, index2=None"
			],
			"tag_prevrange": [
				"f",
				"",
				"tagName, index1, index2=None"
			],
			"tag_raise": [
				"f",
				"",
				"tagName, aboveThis=None"
			],
			"tag_ranges": [
				"f",
				"",
				"tagName"
			],
			"tag_remove": [
				"f",
				"",
				"tagName, index1, index2=None, *args"
			],
			"tag_unbind": [
				"f",
				"",
				"tagName, sequence, funcid=None"
			],
			"xview_moveto": ["f", ""],
			"xview_scroll": ["f", ""],
			"yview_moveto": [
				"f",
				"",
				"fraction"
			],
			"yview_scroll": [
				"f",
				"",
				"number, what"
			]
		}
	},
	"tkinter._themed.Notebook": {
		"bases": ["tkinter._themed.Themed", "tkinter._widgets.Widget"],
		"members": {
			"add": [
				"f",
				"",
				"child, **kw"
			],
			"enable_traversal": [
				"f",
				"",
				""
			],
			"forget": [
				"f",
				"",
				"tab_id"
			],
			"hide": ["f", ""],
			"index": [
				"f",
				"",
				"tab_id"
			],
			"insert": [
				"f",
				"",
				"pos, child, **kw"
			],
			"select": [
				"f",
				"",
				"tab_id=None"
			],
			"tab": [
				"f",
				"",
				"tab_id, option=None, **kw"
			],
			"tabs": [
				"f",
				"",
				""
			]
		}
	},
	"tkinter._themed.Progressbar": {
		"bases": ["tkinter._themed.Themed", "tkinter._widgets.Widget"],
		"members": {
			"start": [
				"f",
				"",
				"interval=None"
			],
			"step": [
				"f",
				"",
				"amount=1.0"
			],
			"stop": [
				"f",
				"",
				""
			]
		}
	},
	"tkinter._themed.Separator": {
		"bases": ["tkinter._themed.Themed", "tkinter._widgets.Widget"],
		"members": {}
	},
	"tkinter._themed.Style": {
		"bases": [],
		"members": {
			"configure": [
				"f",
				"",
				"style, query_opt=None, **kw"
			],
			"element_create": [
				"f",
				"",
				"elementname, etype, *args, **kw"
			],
			"element_names": [
				"f",
				"",
				""
			],
			"element_options": [
				"f",
				"",
				"elementname"
			],
			"layout": [
				"f",
				"",
				"style, layoutspec=None"
			],
			"lookup": [
				"f",
				"",
				"style, option, state=None, default=None"
			],
			"map": [
				"f",
				"",
				"style, query_opt=None, **kw"
			],
			"theme_create": [
				"f",
				"",
				"themename, parent=None, settings=None"
			],
			"theme_names": [
				"f",
				"",
				""
			],
			"theme_settings": [
				"f",
				"",
				"themename, settings"
			],
			"theme_use": [
				"f",
				"",
				"themename=None"
			]
		}
	},
	"tkinter._themed.Themed": {
		"bases": [],
		"members": {}
	},
	"tkinter._themed.Treeview": {
		"bases": ["tkinter._themed.Themed", "tkinter._widgets.Widget"],
		"members": {
			"bbox": [
				"f",
				"",
				"item, column=None"
			],
			"column": [
				"f",
				"",
				"column, option=None, **kw"
			],
			"delete": [
				"f",
				"",
				"*items"
			],
			"detach": [
				"f",
				"",
				"*items"
			],
			"exists": [
				"f",
				"",
				"item"
			],
			"focus": [
				"f",
				"",
				"item=None"
			],
			"get_children": [
				"f",
				"",
				"item=None"
			],
			"heading": [
				"f",
				"",
				"column, option=None, **kw"
			],
			"identify": [
				"f",
				"",
				"component, x, y"
			],
			"identify_column": [
				"f",
				"",
				"x"
			],
			"identify_region": [
				"f",
				"",
				"x, y"
			],
			"identify_row": [
				"f",
				"",
				"y"
			],
			"index": [
				"f",
				"",
				"item"
			],
			"insert": [
				"f",
				"",
				"parent, index, iid=None, **kw"
			],
			"item": [
				"f",
				"",
				"item, option=None, **kw"
			],
			"move": [
				"f",
				"",
				"item, parent, index"
			],
			"next": [
				"f",
				"",
				"item"
			],
			"parent": [
				"f",
				"",
				"item"
			],
			"prev": [
				"f",
				"",
				"item"
			],
			"reattach": ["f", ""],
			"see": [
				"f",
				"",
				"item"
			],
			"selection": [
				"f",
				"",
				"selop=None, items=None"
			],
			"selection_add": [
				"f",
				"",
				"*items"
			],
			"selection_remove": [
				"f",
				"",
				"*items"
			],
			"selection_set": [
				"f",
				"",
				"*items"
			],
			"selection_toggle": [
				"f",
				"",
				"*items"
			],
			"set": [
				"f",
				"",
				"item, column=None, value=None"
			],
			"set_children": [
				"f",
				"",
				"item, *newchildren"
			],
			"tag_bind": [
				"f",
				"",
				"tagname, sequence=None, callback=None"
			],
			"tag_configure": [
				"f",
				"",
				"tagname, option=None, **kw"
			],
			"tag_has": [
				"f",
				"",
				"tagname, item=None"
			],
			"xview_moveto": ["f", ""],
			"xview_scroll": ["f", ""],
			"yview_moveto": [
				"f",
				"",
				"fraction"
			],
			"yview_scroll": [
				"f",
				"",
				"number, what"
			]
		}
	},
	"tkinter._vars.BooleanVar": {
		"bases": ["tkinter._vars.Variable"],
		"members": {
			"get": [
				"f",
				"",
				""
			],
			"initialize": ["f", ""],
			"set": [
				"f",
				"",
				"value"
			]
		}
	},
	"tkinter._vars.DoubleVar": {
		"bases": ["tkinter._vars.Variable"],
		"members": { "get": [
			"f",
			"",
			""
		] }
	},
	"tkinter._vars.IntVar": {
		"bases": ["tkinter._vars.Variable"],
		"members": { "get": [
			"f",
			"",
			""
		] }
	},
	"tkinter._vars.StringVar": {
		"bases": ["tkinter._vars.Variable"],
		"members": { "get": [
			"f",
			"",
			""
		] }
	},
	"tkinter._vars.Variable": {
		"bases": [],
		"members": {
			"get": [
				"f",
				"",
				""
			],
			"initialize": ["f", ""],
			"set": [
				"f",
				"",
				"value"
			],
			"trace": ["f", ""],
			"trace_add": [
				"f",
				"",
				"mode, callback"
			],
			"trace_info": [
				"f",
				"",
				""
			],
			"trace_remove": [
				"f",
				"",
				"mode, cbname"
			],
			"trace_variable": [
				"f",
				"",
				"mode, callback"
			],
			"trace_vdelete": [
				"f",
				"",
				"mode, cbname"
			],
			"trace_vinfo": [
				"f",
				"",
				""
			]
		}
	},
	"tkinter._widgets.Button": {
		"bases": ["tkinter._widgets.Widget"],
		"members": {
			"flash": [
				"f",
				"",
				""
			],
			"invoke": [
				"f",
				"",
				""
			]
		}
	},
	"tkinter._widgets.Checkbutton": {
		"bases": ["tkinter._widgets.Button"],
		"members": {
			"deselect": [
				"f",
				"",
				""
			],
			"invoke": [
				"f",
				"",
				""
			],
			"select": [
				"f",
				"",
				""
			],
			"toggle": [
				"f",
				"",
				""
			]
		}
	},
	"tkinter._widgets.Frame": {
		"bases": ["tkinter._widgets.Widget"],
		"members": {}
	},
	"tkinter._widgets.Label": {
		"bases": ["tkinter._widgets.Widget"],
		"members": {}
	},
	"tkinter._widgets.LabelFrame": {
		"bases": ["tkinter._widgets.Widget"],
		"members": {}
	},
	"tkinter._widgets.Message": {
		"bases": ["tkinter._widgets.Label"],
		"members": {}
	},
	"tkinter._widgets.PanedWindow": {
		"bases": ["tkinter._widgets.Frame"],
		"members": {
			"add": [
				"f",
				"",
				"child, **kw"
			],
			"forget": [
				"f",
				"",
				"child"
			],
			"insert": [
				"f",
				"",
				"pos, child, **kw"
			],
			"pane": [
				"f",
				"",
				"pane, option=None, **kw"
			],
			"paneconfig": ["f", ""],
			"paneconfigure": [
				"f",
				"",
				"tagOrId, cnf=None, **kw"
			],
			"panes": [
				"f",
				"",
				""
			],
			"remove": ["f", ""],
			"sash_coord": [
				"f",
				"",
				"index"
			],
			"sash_place": [
				"f",
				"",
				"index, x, y"
			],
			"sashpos": [
				"f",
				"",
				"index, newpos=None"
			]
		}
	},
	"tkinter._widgets.Radiobutton": {
		"bases": ["tkinter._widgets.Button"],
		"members": {
			"deselect": [
				"f",
				"",
				""
			],
			"invoke": [
				"f",
				"",
				""
			],
			"select": [
				"f",
				"",
				""
			]
		}
	},
	"tkinter._widgets.Widget": {
		"bases": ["tkinter._core.Misc"],
		"members": {
			"destroy": [
				"f",
				"",
				""
			],
			"forget": ["f", ""],
			"grid": ["f", ""],
			"grid_configure": [
				"f",
				"",
				"cnf={}, **kw"
			],
			"grid_forget": [
				"f",
				"",
				""
			],
			"grid_info": [
				"f",
				"",
				""
			],
			"grid_remove": ["f", ""],
			"info": ["f", ""],
			"lift": [
				"f",
				"",
				"aboveThis=None"
			],
			"lower": [
				"f",
				"",
				"belowThis=None"
			],
			"pack": ["f", ""],
			"pack_configure": [
				"f",
				"",
				"cnf={}, **kw"
			],
			"pack_forget": [
				"f",
				"",
				""
			],
			"pack_info": [
				"f",
				"",
				""
			],
			"place": ["f", ""],
			"place_configure": [
				"f",
				"",
				"cnf={}, **kw"
			],
			"place_forget": [
				"f",
				"",
				""
			],
			"place_info": [
				"f",
				"",
				""
			],
			"tkraise": ["f", ""]
		}
	},
	"tkinter._windows.Tk": {
		"bases": ["tkinter._windows.Wm", "tkinter._core.Misc"],
		"members": { "report_callback_exception": [
			"f",
			"",
			"exc, val, tb"
		] }
	},
	"tkinter._windows.Toplevel": {
		"bases": ["tkinter._windows.Wm", "tkinter._core.Misc"],
		"members": {}
	},
	"tkinter._windows.Wm": {
		"bases": [],
		"members": {
			"attributes": [
				"f",
				"",
				"*args, **kw"
			],
			"deiconify": [
				"f",
				"",
				""
			],
			"destroy": [
				"f",
				"",
				""
			],
			"geometry": [
				"f",
				"",
				"newGeometry=None"
			],
			"iconbitmap": [
				"f",
				"",
				"bitmap=None, default=None"
			],
			"iconify": ["f", ""],
			"iconname": [
				"f",
				"",
				"newName=None"
			],
			"iconphoto": [
				"f",
				"",
				"default=False, *args"
			],
			"lift": [
				"f",
				"",
				"aboveThis=None"
			],
			"lower": [
				"f",
				"",
				"belowThis=None"
			],
			"maxsize": [
				"f",
				"",
				"width=None, height=None"
			],
			"minsize": [
				"f",
				"",
				"width=None, height=None"
			],
			"overrideredirect": [
				"f",
				"",
				"boolean=None"
			],
			"protocol": [
				"f",
				"",
				"name=None, func=None"
			],
			"resizable": [
				"f",
				"",
				"width=None, height=None"
			],
			"state": [
				"f",
				"",
				"newstate=None"
			],
			"title": [
				"f",
				"",
				"string=None"
			],
			"tkraise": ["f", ""],
			"transient": [
				"f",
				"",
				"master=None"
			],
			"winfo_height": [
				"f",
				"",
				""
			],
			"winfo_rootx": [
				"f",
				"",
				""
			],
			"winfo_rooty": [
				"f",
				"",
				""
			],
			"winfo_width": [
				"f",
				"",
				""
			],
			"winfo_x": [
				"f",
				"",
				""
			],
			"winfo_y": [
				"f",
				"",
				""
			],
			"withdraw": [
				"f",
				"",
				""
			],
			"wm_attributes": ["f", ""],
			"wm_deiconify": ["f", ""],
			"wm_geometry": ["f", ""],
			"wm_iconbitmap": ["f", ""],
			"wm_iconify": ["f", ""],
			"wm_iconphoto": ["f", ""],
			"wm_lift": ["f", ""],
			"wm_maxsize": ["f", ""],
			"wm_minsize": ["f", ""],
			"wm_overrideredirect": ["f", ""],
			"wm_protocol": ["f", ""],
			"wm_resizable": ["f", ""],
			"wm_state": ["f", ""],
			"wm_title": ["f", ""],
			"wm_withdraw": ["f", ""]
		}
	},
	"tkinter.colorchooser.Chooser": {
		"bases": [],
		"members": { "show": [
			"f",
			"",
			"**options"
		] }
	},
	"tkinter.filedialog.Open": {
		"bases": [],
		"members": { "show": [
			"f",
			"",
			"**options"
		] }
	},
	"tkinter.filedialog.SaveAs": {
		"bases": ["tkinter.filedialog.Open"],
		"members": { "show": [
			"f",
			"",
			"**options"
		] }
	},
	"tkinter.font.Font": {
		"bases": [],
		"members": {
			"actual": [
				"f",
				"",
				"option=None, displayof=None"
			],
			"cget": [
				"f",
				"",
				"option"
			],
			"config": ["f", ""],
			"configure": [
				"f",
				"",
				"**options"
			],
			"copy": [
				"f",
				"",
				""
			],
			"measure": [
				"f",
				"",
				"text, displayof=None"
			],
			"metrics": [
				"f",
				"",
				"*options, **kw"
			]
		}
	},
	"tkinter.messagebox.Message": {
		"bases": [],
		"members": { "show": [
			"f",
			"",
			"**options"
		] }
	},
	"tkinter.scrolledtext.ScrolledText": {
		"bases": ["tkinter._text.Text"],
		"members": {
			"destroy": [
				"f",
				"",
				""
			],
			"forget": ["f", ""],
			"grid": ["f", ""],
			"grid_configure": [
				"f",
				"",
				"cnf={}, **kw"
			],
			"grid_forget": [
				"f",
				"",
				""
			],
			"pack": ["f", ""],
			"pack_configure": [
				"f",
				"",
				"cnf={}, **kw"
			],
			"pack_forget": [
				"f",
				"",
				""
			],
			"place": ["f", ""],
			"place_configure": [
				"f",
				"",
				"cnf={}, **kw"
			],
			"place_forget": [
				"f",
				"",
				""
			]
		}
	},
	"tkinter.simpledialog.Dialog": {
		"bases": [],
		"members": {}
	},
	"tkinter.ttk.Button": {
		"bases": ["tkinter._themed.Themed", "tkinter._widgets.Button"],
		"members": {}
	},
	"tkinter.ttk.Checkbutton": {
		"bases": ["tkinter._themed.Themed", "tkinter._widgets.Checkbutton"],
		"members": {}
	},
	"tkinter.ttk.Combobox": {
		"bases": ["tkinter._themed.Themed", "tkinter._lists.Combobox"],
		"members": {}
	},
	"tkinter.ttk.Entry": {
		"bases": ["tkinter._themed.Themed", "tkinter._fields.Entry"],
		"members": {}
	},
	"tkinter.ttk.Frame": {
		"bases": ["tkinter._themed.Themed", "tkinter._widgets.Frame"],
		"members": {}
	},
	"tkinter.ttk.Label": {
		"bases": ["tkinter._themed.Themed", "tkinter._widgets.Label"],
		"members": {}
	},
	"tkinter.ttk.LabeledScale": {
		"bases": ["tkinter.ttk.Frame"],
		"members": { "value": ["v", ""] }
	},
	"tkinter.ttk.LabelFrame": {
		"bases": ["tkinter._themed.Themed", "tkinter._widgets.LabelFrame"],
		"members": {}
	},
	"tkinter.ttk.Menubutton": {
		"bases": ["tkinter._themed.Themed", "tkinter._menus.Menubutton"],
		"members": {}
	},
	"tkinter.ttk.OptionMenu": {
		"bases": ["tkinter._menus.OptionMenu"],
		"members": {}
	},
	"tkinter.ttk.PanedWindow": {
		"bases": ["tkinter._themed.Themed", "tkinter._widgets.PanedWindow"],
		"members": {}
	},
	"tkinter.ttk.Radiobutton": {
		"bases": ["tkinter._themed.Themed", "tkinter._widgets.Radiobutton"],
		"members": {}
	},
	"tkinter.ttk.Scale": {
		"bases": ["tkinter._themed.Themed", "tkinter._fields.Scale"],
		"members": {}
	},
	"tkinter.ttk.Scrollbar": {
		"bases": ["tkinter._themed.Themed", "tkinter._lists.Scrollbar"],
		"members": {}
	},
	"tkinter.ttk.Sizegrip": {
		"bases": ["tkinter._themed.Themed", "tkinter._widgets.Frame"],
		"members": {}
	},
	"tkinter.ttk.Spinbox": {
		"bases": ["tkinter._themed.Themed", "tkinter._lists.Spinbox"],
		"members": {}
	},
	"turtle._Screen": {
		"bases": [],
		"members": {
			"bgcolor": [
				"f",
				"",
				"*args"
			],
			"bye": ["f", ""],
			"clear": [
				"f",
				"",
				""
			],
			"colormode": [
				"f",
				"",
				"mode=None"
			],
			"done": ["f", ""],
			"exitonclick": ["f", ""],
			"mainloop": [
				"f",
				"",
				""
			],
			"setup": [
				"f",
				"",
				"*args, **kwargs"
			],
			"title": [
				"f",
				"",
				"*args"
			],
			"tracer": [
				"f",
				"",
				"*args, **kwargs"
			],
			"update": [
				"f",
				"",
				""
			]
		}
	},
	"turtle.Turtle": {
		"bases": [],
		"members": {
			"back": ["f", ""],
			"backward": [
				"f",
				"",
				"distance"
			],
			"begin_fill": [
				"f",
				"",
				""
			],
			"bk": ["f", ""],
			"circle": [
				"f",
				"",
				"radius, extent=None, steps=None"
			],
			"clear": [
				"f",
				"",
				""
			],
			"color": [
				"f",
				"",
				"*args"
			],
			"distance": [
				"f",
				"",
				"x, y=None"
			],
			"dot": [
				"f",
				"",
				"size=None, *color"
			],
			"down": ["f", ""],
			"end_fill": [
				"f",
				"",
				""
			],
			"fd": ["f", ""],
			"fillcolor": [
				"f",
				"",
				"*args"
			],
			"filling": [
				"f",
				"",
				""
			],
			"forward": [
				"f",
				"",
				"distance"
			],
			"goto": [
				"f",
				"",
				"x, y=None"
			],
			"heading": [
				"f",
				"",
				""
			],
			"hideturtle": [
				"f",
				"",
				""
			],
			"home": [
				"f",
				"",
				""
			],
			"ht": ["f", ""],
			"isdown": [
				"f",
				"",
				""
			],
			"isvisible": [
				"f",
				"",
				""
			],
			"left": [
				"f",
				"",
				"angle"
			],
			"lt": ["f", ""],
			"pd": ["f", ""],
			"pencolor": [
				"f",
				"",
				"*args"
			],
			"pendown": [
				"f",
				"",
				""
			],
			"pensize": [
				"f",
				"",
				"width=None"
			],
			"penup": [
				"f",
				"",
				""
			],
			"pos": ["f", ""],
			"position": [
				"f",
				"",
				""
			],
			"pu": ["f", ""],
			"reset": [
				"f",
				"",
				""
			],
			"right": [
				"f",
				"",
				"angle"
			],
			"rt": ["f", ""],
			"seth": ["f", ""],
			"setheading": [
				"f",
				"",
				"angle"
			],
			"setpos": ["f", ""],
			"setposition": ["f", ""],
			"setx": [
				"f",
				"",
				"x"
			],
			"sety": [
				"f",
				"",
				"y"
			],
			"shape": [
				"f",
				"",
				"name=None"
			],
			"shapesize": [
				"f",
				"",
				"*args, **kwargs"
			],
			"showturtle": [
				"f",
				"",
				""
			],
			"speed": [
				"f",
				"",
				"speed=None"
			],
			"st": ["f", ""],
			"stamp": [
				"f",
				"",
				""
			],
			"towards": [
				"f",
				"",
				"x, y=None"
			],
			"up": ["f", ""],
			"width": ["f", ""],
			"write": [
				"f",
				"",
				"arg, move=False, align=\"left\", font=(\"Arial\", 8, \"normal\")"
			],
			"xcor": [
				"f",
				"",
				""
			],
			"ycor": [
				"f",
				"",
				""
			]
		}
	}
};
// src/core/python-names.ts
/** `a, b=(1, 2), *c` → its parameters: commas inside brackets and strings do not split. */
var splitParams = (params) => {
	const parts = [];
	let depth = 0;
	let quote = "";
	let current = "";
	for (const char of params) {
		if (quote !== "") {
			if (char === quote) quote = "";
		} else if (char === "'" || char === "\"") quote = char;
		else if ("([{".includes(char)) depth += 1;
		else if (")]}".includes(char)) depth -= 1;
		else if (char === "," && depth === 0) {
			parts.push(current.trim());
			current = "";
			continue;
		}
		current += char;
	}
	parts.push(current.trim());
	return parts.filter((p) => p !== "");
};
var doc = (params, info, min, max) => ({
	params,
	info,
	min,
	max
});
/** The builtins that students use, with a short description. */
var builtinDocs = {
	print: doc("*values, sep=' ', end='\\n'", "Виводить значення в консоль.", 0, Infinity),
	input: doc("prompt=''", "Чекає, поки користувач введе текст, і повертає його як рядок (str).", 0, 1),
	int: doc("x=0, base=10", "Перетворює значення на ціле число: int('5') дає 5.", 0, 2),
	float: doc("x=0", "Перетворює значення на дробове число: float('2.5') дає 2.5.", 0, 1),
	str: doc("object=''", "Перетворює значення на рядок (текст).", 0, 3),
	bool: doc("x=False", "Перетворює значення на True або False.", 0, 1),
	len: doc("obj", "Кількість елементів: символів у рядку, елементів у списку.", 1, 1),
	range: doc("start, stop, step=1", "Послідовність цілих чисел для циклу for: range(5) дає 0, 1, 2, 3, 4.", 1, 3),
	abs: doc("x", "Модуль числа: abs(-3) дає 3.", 1, 1),
	round: doc("number, ndigits=None", "Округлює число: round(2.567, 1) дає 2.6.", 1, 2),
	max: doc("*values", "Найбільше зі значень або найбільший елемент списку.", 1, Infinity),
	min: doc("*values", "Найменше зі значень або найменший елемент списку.", 1, Infinity),
	sum: doc("iterable, start=0", "Сума елементів списку.", 1, 2),
	sorted: doc("iterable, key=None, reverse=False", "Новий список з елементами в порядку зростання.", 1, 1),
	list: doc("iterable=()", "Створює список.", 0, 1),
	dict: doc("**pairs", "Створює словник.", 0, Infinity),
	set: doc("iterable=()", "Створює множину: значення без повторів.", 0, 1),
	tuple: doc("iterable=()", "Створює кортеж: список, який не можна змінити.", 0, 1),
	type: doc("object", "Тип значення: int, str, list…", 1, 3),
	chr: doc("code", "Символ за його кодом: chr(65) дає 'A'.", 1, 1),
	ord: doc("char", "Код символу: ord('A') дає 65.", 1, 1),
	pow: doc("base, exp", "Степінь: pow(2, 3) дає 8.", 2, 3),
	divmod: doc("a, b", "Частка й остача ділення разом: divmod(7, 2) дає (3, 1).", 2, 2),
	enumerate: doc("iterable, start=0", "Номери разом з елементами: for i, x in enumerate(список).", 1, 2),
	zip: doc("*iterables", "Пари елементів з кількох списків.", 0, Infinity),
	reversed: doc("sequence", "Елементи у зворотному порядку.", 1, 1),
	isinstance: doc("object, classinfo", "Чи має значення такий тип: isinstance(5, int) дає True.", 2, 2),
	open: doc("file, mode='r'", "Відкриває файл для читання або запису.", 1, 7),
	any: doc("iterable", "True, якщо хоч один елемент істинний.", 1, 1),
	all: doc("iterable", "True, якщо всі елементи істинні.", 1, 1),
	map: doc("function, iterable", "Застосовує функцію до кожного елемента.", 2, Infinity),
	filter: doc("function, iterable", "Елементи, для яких функція дає True.", 2, 2),
	hex: doc("x", "Число в шістнадцятковому записі: hex(255) дає '0xff'.", 1, 1),
	bin: doc("x", "Число в двійковому записі: bin(5) дає '0b101'.", 1, 1)
};
/** Names that Python has without import, besides the builtins of the engine. */
var ExtraNames = [
	"__name__",
	"__file__",
	"__doc__",
	"__builtins__",
	"True",
	"False",
	"None"
];
var builtinSet = /* @__PURE__ */ new Set([...apiBuiltins, ...ExtraNames]);
var isBuiltin = (name) => builtinSet.has(name);
var builtinNames = apiBuiltins;
/** Keywords; `snippet` adds the usual form of the statement. */
var keywordSnippets = [
	{
		label: "if",
		snippet: "if ${умова}:\n	${}",
		info: "Умова: код усередині виконується, лише якщо умова істинна."
	},
	{
		label: "elif",
		snippet: "elif ${умова}:\n	${}",
		info: "Ще одна умова після if."
	},
	{
		label: "else",
		snippet: "else:\n	${}",
		info: "Що робити, коли умови не справдилися."
	},
	{
		label: "for",
		snippet: "for ${i} in range(${10}):\n	${}",
		info: "Цикл: повторює код для кожного числа або елемента."
	},
	{
		label: "while",
		snippet: "while ${умова}:\n	${}",
		info: "Цикл, що повторює код, поки умова істинна."
	},
	{
		label: "def",
		snippet: "def ${name}(${}):\n	${}",
		info: "Створює власну функцію."
	},
	{
		label: "class",
		snippet: "class ${Name}:\n	def __init__(self${}):\n		${}",
		info: "Створює клас."
	},
	{
		label: "return",
		snippet: "return ${}",
		info: "Повертає значення з функції."
	},
	{
		label: "import",
		snippet: "import ${}",
		info: "Підключає модуль: import turtle."
	},
	{
		label: "from",
		snippet: "from ${tkinter} import ${*}",
		info: "Підключає імена з модуля: from tkinter import *."
	},
	{
		label: "try",
		snippet: "try:\n	${}\nexcept ${ValueError}:\n	${}",
		info: "Перехоплює помилку, щоб програма не зупинилася."
	},
	{
		label: "with",
		snippet: "with ${open('файл.txt')} as ${f}:\n	${}",
		info: "Відкриває файл і сам закриває його."
	},
	{
		label: "lambda",
		snippet: "lambda: ${}",
		info: "Коротка функція в один вираз: command=lambda: f(1)."
	}
];
var plainKeywords = [
	"and",
	"or",
	"not",
	"in",
	"is",
	"True",
	"False",
	"None",
	"break",
	"continue",
	"pass",
	"global",
	"nonlocal",
	"del",
	"assert",
	"except",
	"finally",
	"as",
	"yield",
	"raise"
];
var method = (name, params, info) => ({
	name,
	params,
	info
});
/** Methods of a string: they give a new string, the old one stays. */
var strMethods = [
	method("upper", "", "Рядок великими літерами."),
	method("lower", "", "Рядок малими літерами."),
	method("capitalize", "", "Перша літера велика, решта малі."),
	method("title", "", "Кожне слово з великої літери."),
	method("strip", "chars=None", "Рядок без пробілів на початку й у кінці."),
	method("split", "sep=None", "Ділить рядок на список слів."),
	method("replace", "old, new", "Замінює частину рядка на іншу."),
	method("find", "sub", "Де вперше трапляється частина рядка (-1, якщо немає)."),
	method("count", "sub", "Скільки разів трапляється частина рядка."),
	method("startswith", "prefix", "Чи починається рядок з цього тексту."),
	method("endswith", "suffix", "Чи закінчується рядок цим текстом."),
	method("isdigit", "", "Чи складається рядок лише з цифр."),
	method("isalpha", "", "Чи складається рядок лише з літер."),
	method("join", "iterable", "Склеює елементи списку через цей рядок."),
	method("format", "*args", "Підставляє значення замість {}."),
	method("center", "width", "Рядок посередині поля заданої ширини.")
];
/** Methods of a list: they change the list itself. */
var listMethods = [
	method("append", "x", "Додає елемент у кінець списку."),
	method("insert", "i, x", "Вставляє елемент на місце i."),
	method("pop", "i=-1", "Забирає й повертає елемент (останній, якщо без числа)."),
	method("remove", "x", "Видаляє перший такий елемент."),
	method("index", "x", "Номер першого такого елемента."),
	method("count", "x", "Скільки разів елемент є в списку."),
	method("sort", "reverse=False", "Сортує сам список."),
	method("reverse", "", "Перевертає сам список."),
	method("clear", "", "Видаляє всі елементи."),
	method("copy", "", "Копія списку."),
	method("extend", "iterable", "Додає всі елементи іншого списку.")
];
var dictMethods = [
	method("keys", "", "Ключі словника."),
	method("values", "", "Значення словника."),
	method("items", "", "Пари ключ-значення: for k, v in d.items()."),
	method("get", "key, default=None", "Значення за ключем або default, якщо ключа немає."),
	method("pop", "key", "Забирає значення за ключем."),
	method("update", "other", "Додає пари з іншого словника.")
];
/** What a function of a module returns, when it is not a class: `turtle.Screen()` gives the screen. */
var FactoryResults = {
	"turtle.Screen": "turtle._Screen",
	"turtle.getscreen": "turtle._Screen",
	"turtle.getturtle": "turtle.Turtle"
};
var TypeKinds = {
	Str: "str",
	Int: "int",
	Float: "float",
	Bool: "bool",
	List: "list",
	Dict: "dict",
	Module: "module",
	Instance: "instance",
	ApiClass: "api-class",
	ApiFunction: "api-function",
	OwnFunction: "own-function",
	Unknown: "unknown"
};
var unknown = { kind: TypeKinds.Unknown };
var simple = (kind) => ({ kind });
/** Members of a class of the engine with those of its bases, without the names that start with `_`. */
var classMembers = (key) => {
	const out = /* @__PURE__ */ new Map();
	const add = (k, depth) => {
		const cls = apiClasses[k];
		if (cls === void 0 || depth > 12) return;
		for (const [name, item] of Object.entries(cls.members)) if (!out.has(name) && !name.startsWith("_")) out.set(name, item);
		for (const base of cls.bases) add(base, depth + 1);
	};
	add(key, 0);
	return out;
};
var moduleMembers = (path) => new Map(Object.entries(apiModules[path] ?? {}));
var isKnownModule = (path) => path in apiModules;
/** The type of a name of a module of the engine. */
var itemType = (path, name, item) => {
	if (item === void 0) return isKnownModule(`${path}.${name}`) ? {
		kind: TypeKinds.Module,
		path: `${path}.${name}`
	} : unknown;
	const [kind, cls, params] = item;
	if (kind === "c") return {
		kind: TypeKinds.ApiClass,
		cls,
		name,
		...params === void 0 ? {} : { params }
	};
	if (kind === "f") return {
		kind: TypeKinds.ApiFunction,
		path,
		name,
		...params === void 0 ? {} : { params }
	};
	if (kind === "m") return {
		kind: TypeKinds.Module,
		path: `${path}.${name}`
	};
	return unknown;
};
/** The type of a member: `tkinter.Tk`, `root.title`, `turtle.forward`. */
var memberType = (owner, name) => {
	if (owner.kind === TypeKinds.Module) return itemType(owner.path, name, apiModules[owner.path]?.[name]);
	if (owner.kind === TypeKinds.Instance) {
		const item = classMembers(owner.cls).get(name);
		if (item === void 0) return unknown;
		const [kind, cls, params] = item;
		if (kind === "f") return {
			kind: TypeKinds.ApiFunction,
			path: owner.cls,
			name,
			...params === void 0 ? {} : { params }
		};
		if (kind === "c") return {
			kind: TypeKinds.ApiClass,
			cls,
			name,
			...params === void 0 ? {} : { params }
		};
		return unknown;
	}
	return unknown;
};
var StrResults = /* @__PURE__ */ new Set([
	"input",
	"str",
	"repr",
	"chr",
	"hex",
	"bin",
	"oct"
]);
var IntResults = /* @__PURE__ */ new Set([
	"int",
	"len",
	"ord",
	"round"
]);
var StrMethodsToStr = /* @__PURE__ */ new Set([
	"upper",
	"lower",
	"capitalize",
	"title",
	"strip",
	"lstrip",
	"rstrip",
	"replace",
	"format",
	"center",
	"join"
]);
var MaxDepth = 8;
/** The type of the result of a call. */
var callResult = (callee, calleeName) => {
	if (callee.kind === TypeKinds.ApiClass) return {
		kind: TypeKinds.Instance,
		cls: callee.cls
	};
	if (callee.kind === TypeKinds.ApiFunction) {
		const factory = FactoryResults[`${callee.path}.${callee.name}`];
		return factory === void 0 ? unknown : {
			kind: TypeKinds.Instance,
			cls: factory
		};
	}
	if (callee.kind !== TypeKinds.Unknown || !isBuiltin(calleeName)) return unknown;
	if (StrResults.has(calleeName)) return simple("str");
	if (IntResults.has(calleeName)) return simple("int");
	if (calleeName === "float") return simple("float");
	if (calleeName === "bool") return simple("bool");
	if (calleeName === "list" || calleeName === "sorted") return simple("list");
	if (calleeName === "dict") return simple("dict");
	return unknown;
};
/** Types in one model of the code. */
var typer = (model) => {
	const text = (node) => model.code.slice(node.from, node.to);
	const typeOfName = (name, scope, depth) => {
		if (depth > MaxDepth) return unknown;
		const found = resolve(name, scope, model.module);
		if (found === null) {
			for (const path of visibleStarImports(scope)) {
				const item = apiModules[path]?.[name];
				if (item !== void 0) return itemType(path, name, item);
			}
			return unknown;
		}
		const types = found.bindings.map((binding) => {
			if (binding.kind === BindingKinds.Import) {
				if (binding.module === void 0) return unknown;
				if (binding.imported === void 0) return {
					kind: TypeKinds.Module,
					path: binding.module
				};
				return itemType(binding.module, binding.imported, apiModules[binding.module]?.[binding.imported]);
			}
			if (binding.kind === BindingKinds.Function) return {
				kind: TypeKinds.OwnFunction,
				name
			};
			if (binding.kind === BindingKinds.Variable && binding.value !== void 0) return typeOf(binding.value, binding.scope, depth + 1);
			return unknown;
		});
		const first = types[0] ?? unknown;
		return types.every((t) => JSON.stringify(t) === JSON.stringify(first)) ? first : unknown;
	};
	const typeOf = (node, scope, depth) => {
		if (depth > MaxDepth) return unknown;
		switch (node.name) {
			case "Number": return /[.eE]/.test(text(node)) && !/^0[xX]/.test(text(node)) ? simple("float") : simple("int");
			case "String":
			case "FormatString":
			case "ContinuedString": return simple("str");
			case "Boolean": return simple("bool");
			case "ArrayExpression":
			case "ArrayComprehensionExpression": return simple("list");
			case "DictionaryExpression":
			case "DictionaryComprehensionExpression": return simple("dict");
			case "ParenthesizedExpression": {
				const inner = node.firstChild?.nextSibling;
				return inner === null || inner === void 0 ? unknown : typeOf(inner, scope, depth + 1);
			}
			case "VariableName": return typeOfName(text(node), scope, depth + 1);
			case "MemberExpression": {
				const object = node.firstChild;
				const property = node.getChild("PropertyName");
				if (object === null || property === null) return unknown;
				return memberType(typeOf(object, scope, depth + 1), text(property));
			}
			case "CallExpression": {
				const callee = node.firstChild;
				if (callee === null) return unknown;
				if (callee.name === "MemberExpression") {
					const object = callee.firstChild;
					const property = callee.getChild("PropertyName");
					if (object !== null && property !== null && typeOf(object, scope, depth + 1).kind === TypeKinds.Str) {
						if (StrMethodsToStr.has(text(property))) return simple("str");
						if (text(property) === "split") return simple("list");
					}
				}
				return callResult(typeOf(callee, scope, depth + 1), callee.name === "VariableName" ? text(callee) : "");
			}
			case "BinaryExpression": {
				const left = node.firstChild;
				const right = node.lastChild;
				const op = left?.nextSibling;
				if (left === null || right === null || op === null || op === void 0 || op.name !== "ArithOp") return unknown;
				const a = typeOf(left, scope, depth + 1).kind;
				const b = typeOf(right, scope, depth + 1).kind;
				if (a === TypeKinds.Str && b === TypeKinds.Str && text(op) === "+") return simple("str");
				const numbers = /* @__PURE__ */ new Set([TypeKinds.Int, TypeKinds.Float]);
				if (numbers.has(a) && numbers.has(b)) return text(op) === "/" || a === TypeKinds.Float || b === TypeKinds.Float ? simple("float") : simple("int");
				return unknown;
			}
			default: return unknown;
		}
	};
	return {
		typeOf: (node, scope) => typeOf(node, scope, 0),
		typeOfName: (name, scope) => typeOfName(name, scope, 0)
	};
};
// src/core/code-check.ts
var CheckSeverities = {
	Error: "error",
	Warning: "warning"
};
/** At most this many marks: the student fixes the first ones and sees the next. */
var MaxWarnings = 12;
/** `1 значення`, `5 значень`. */
var valuesWord = (count) => {
	const tens = count % 100;
	const ones = count % 10;
	if (tens >= 11 && tens <= 14) return `${count} значень`;
	if (ones === 1) return `${count} значення`;
	if (ones >= 2 && ones <= 4) return `${count} значення`;
	return `${count} значень`;
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
/** A known name that differs only in letter case or in 1–2 letters. */
var similarName = (name, candidates) => {
	const sameCase = candidates.find((c) => c !== name && c.toLowerCase() === name.toLowerCase());
	if (sameCase !== void 0) return sameCase;
	const limit = name.length <= 3 ? 0 : name.length <= 5 ? 1 : 2;
	return candidates.filter((c) => c !== name && Math.abs(c.length - name.length) <= limit).map((c) => ({
		c,
		d: levenshtein(name.toLowerCase(), c.toLowerCase())
	})).filter((x) => x.d <= limit).sort((a, b) => a.d - b.d)[0]?.c;
};
var LoopNodes = /* @__PURE__ */ new Set(["ForStatement", "WhileStatement"]);
/** Builtins that give a value: without brackets the variable gets the function. */
var ValueFunctions = /* @__PURE__ */ new Set([
	"input",
	"int",
	"float",
	"str",
	"len",
	"abs",
	"round",
	"max",
	"min",
	"sum",
	"sorted"
]);
/** Calls whose result is the point: alone on a line they change nothing. */
var ResultFunctions = /* @__PURE__ */ new Set([
	"int",
	"float",
	"str",
	"round",
	"abs",
	"len",
	"sorted"
]);
/** Widgets whose `command` is called without values. */
var ButtonWidgets = /* @__PURE__ */ new Set([
	"Button",
	"Checkbutton",
	"Radiobutton"
]);
var StrNewValue = /* @__PURE__ */ new Set([
	"upper",
	"lower",
	"capitalize",
	"title",
	"strip",
	"lstrip",
	"rstrip",
	"replace"
]);
/** Names that can be read at a use: for "maybe you meant". */
var candidatesAt = (scope) => {
	const own = visibleBindings(scope).map((b) => b.name);
	const starred = visibleStarImports(scope).flatMap((path) => Object.keys(apiModules[path] ?? {}));
	return [
		...own,
		...starred,
		...Object.keys(builtinDocs)
	];
};
/** A name that is never created, or created only below the place where it is read. */
var checkNames = (ctx) => {
	const { model } = ctx;
	const unknownStar = (scope) => visibleStarImports(scope).some((path) => !isKnownModule(path));
	const reported = /* @__PURE__ */ new Set();
	for (const use of model.uses) {
		const found = resolve(use.name, use.scope, model.module);
		if (found === null) {
			if (isBuiltin(use.name) || unknownStar(use.scope)) continue;
			if (visibleStarImports(use.scope).some((path) => apiModules[path]?.[use.name] !== void 0)) continue;
			const fn = enclosingFunction(use.scope);
			const key = `${use.name}@${fn?.node.from ?? -1}`;
			if (reported.has(key)) continue;
			reported.add(key);
			ctx.add(use.from, use.to, CheckSeverities.Error, undefinedMessage(use, fn));
			continue;
		}
		checkOrder(ctx, use, found.scope, found.bindings, reported);
	}
};
var undefinedMessage = (use, fn) => {
	const head = `Ім'я \`${use.name}\` ніде не створене.`;
	const similar = similarName(use.name, candidatesAt(use.scope));
	if (similar !== void 0) return `${head} Можливо, ти мав на увазі \`${similar}\`?`;
	if (fn !== void 0 && !fn.method) {
		const params = [...fn.params.map((p) => p.name), use.name].join(", ");
		return `${head} Якщо це значення, яке функція \`${fn.name}\` має отримати, додай параметр: \`def ${fn.name}(${params}):\`. Або створи його раніше: \`${use.name} = 0\`.`;
	}
	return `${head} Спершу присвой йому значення, наприклад \`${use.name} = 0\`, або перевір, чи правильно воно написане.`;
};
/** Read before it gets a value: Python runs the code from top to bottom. */
var checkOrder = (ctx, use, scope, bindings, reported) => {
	if (use.scope !== scope || scope.kind === ScopeKinds.Class) return;
	if (bindings.some((b) => b.at <= use.from)) return;
	if (bindings.some((b) => b.kind === BindingKinds.Param || b.kind === BindingKinds.Import && scope.kind !== ScopeKinds.Module)) return;
	if (hasAncestor(use.node, LoopNodes, scope.from) && bindings.some((b) => b.from >= scope.from)) {
		if (bindings.some((b) => {
			for (let p = use.node.parent; p !== null && p.from >= scope.from; p = p.parent) if (LoopNodes.has(p.name) && p.from <= b.from && b.to <= p.to) return true;
			return false;
		})) return;
	}
	if (hasAncestor(use.node, /* @__PURE__ */ new Set(["TryStatement"]), scope.from)) return;
	const key = `${use.name}@order@${scope.from}`;
	if (reported.has(key)) return;
	reported.add(key);
	const first = bindings.reduce((a, b) => b.from < a.from ? b : a);
	const line = ctx.line(first.from);
	if (scope.kind === ScopeKinds.Function) {
		const global = ctx.model.module.bindings.has(use.name);
		const fn = scope.fn;
		if (global && fn !== void 0) return ctx.add(use.from, use.to, CheckSeverities.Error, `У функції \`${fn.name}\` змінна \`${use.name}\` змінюється, тому Python вважає її новою, своєю для функції, і тут вона ще без значення. Щоб змінювати загальну змінну, напиши на початку функції: \`global ${use.name}\`.`);
		return ctx.add(use.from, use.to, CheckSeverities.Error, `Змінна \`${use.name}\` отримує значення нижче, у рядку ${line}, а тут її вже читають. Python виконує рядки згори вниз.`);
	}
	if (first.kind === BindingKinds.Function) return ctx.add(use.from, use.to, CheckSeverities.Error, `Функцію \`${use.name}\` створено нижче, у рядку ${line}, а Python виконує програму згори вниз. Перенеси \`def ${use.name}\` вище за цей рядок.`);
	ctx.add(use.from, use.to, CheckSeverities.Error, `Змінна \`${use.name}\` отримує значення нижче, у рядку ${line}, а тут її вже читають. Python виконує програму згори вниз: присвой значення раніше.`);
};
var readArgs = (ctx, list) => {
	const parts = [];
	for (let child = list.firstChild; child !== null; child = child.nextSibling) parts.push(child);
	let positional = 0;
	let spread = false;
	const keywords = [];
	const values = [];
	const keywordValues = /* @__PURE__ */ new Map();
	let i = 0;
	while (i < parts.length) {
		const part = parts[i];
		if (part === void 0) break;
		if (part.name === "(" || part.name === ")" || part.name === ",") {
			i += 1;
			continue;
		}
		if (part.name === "*" || part.name === "**") {
			spread = true;
			i += 2;
			continue;
		}
		if (part.name === "VariableName" && parts[i + 1]?.name === "AssignOp") {
			const value = parts[i + 2];
			keywords.push({
				name: ctx.text(part),
				node: part
			});
			if (value !== void 0) keywordValues.set(ctx.text(part), value);
			i += 3;
			continue;
		}
		if (part.name === "for") return {
			positional: 1,
			keywords,
			spread: true,
			values,
			keywordValues
		};
		positional += 1;
		values.push(part);
		i += 1;
	}
	return {
		positional,
		keywords,
		spread,
		values,
		keywordValues
	};
};
var ownSignature = (fn) => ({
	name: fn.name,
	positional: fn.params.filter((p) => p.kind === ParamKinds.Positional),
	keywordOnly: fn.params.filter((p) => p.kind === ParamKinds.KeywordOnly),
	star: fn.params.some((p) => p.kind === ParamKinds.Star),
	doubleStar: fn.params.some((p) => p.kind === ParamKinds.DoubleStar),
	def: `def ${fn.name}(${fn.paramsText.trim()}):`
});
/** The signature of `a, b=1, *args` from `python-api.ts`. */
var apiSignature = (name, params) => {
	const parts = splitParams(params);
	const positional = [];
	const keywordOnly = [];
	let star = false;
	let doubleStar = false;
	for (const part of parts) if (part.startsWith("**")) doubleStar = true;
	else if (part.startsWith("*")) star = true;
	else {
		const param = {
			name: part.split("=")[0]?.trim() ?? part,
			hasDefault: part.includes("=")
		};
		if (star) keywordOnly.push(param);
		else positional.push(param);
	}
	return {
		name,
		positional,
		keywordOnly,
		star,
		doubleStar
	};
};
/** A call with a different number of values than the function takes. */
var argsMessage = (sig, args) => {
	const max = sig.positional.length;
	const where = sig.def === void 0 ? "" : ` (\`${sig.def}\`)`;
	if (!sig.star && args.positional > max) {
		if (max === 0) return `Функція \`${sig.name}\` не приймає значень${where}, а тут їй передають ${valuesWord(args.positional)}.`;
		const names = sig.positional.map((p) => p.name).join(", ");
		return `Функція \`${sig.name}\` приймає ${valuesWord(max)} (\`${names}\`), а тут їй передають ${valuesWord(args.positional)}.${sig.def === void 0 ? "" : ` Додай параметр у \`${sig.def}\` або прибери зайве значення.`}`;
	}
	const known = new Set([...sig.positional, ...sig.keywordOnly].map((p) => p.name));
	const strange = args.keywords.find((k) => !known.has(k.name));
	if (strange !== void 0 && !sig.doubleStar) {
		const list = [...known].join(", ");
		return `У функції \`${sig.name}\` немає параметра \`${strange.name}\`.${list === "" ? "" : ` Її параметри: \`${list}\`.`}`;
	}
	if (args.spread) return void 0;
	const given = new Set(args.keywords.map((k) => k.name));
	const missing = [...sig.positional.slice(args.positional).filter((p) => !p.hasDefault && !given.has(p.name)), ...sig.keywordOnly.filter((p) => !p.hasDefault && !given.has(p.name))];
	if (missing.length === 0) return void 0;
	const need = sig.positional.filter((p) => !p.hasDefault).length;
	const names = missing.map((p) => `\`${p.name}\``).join(", ");
	return `Функція \`${sig.name}\` чекає ${valuesWord(need)}${where}, а тут їй передають ${valuesWord(args.positional + args.keywords.length)}. Бракує значення для ${names}.`;
};
/** The one `def` of a name: not changed by other assignments, not decorated. */
var ownFunction = (ctx, node, scope) => {
	if (node.name !== "VariableName") return void 0;
	const found = resolve(ctx.text(node), scope, ctx.model.module);
	if (found === null || found.bindings.length !== 1) return void 0;
	const fn = found.bindings[0]?.fn;
	return fn === void 0 || fn.decorated || fn.method ? void 0 : fn;
};
/** The scope of a node: the innermost scope that contains it. */
var scopeOf = (model, pos) => {
	let scope = model.module;
	for (;;) {
		const inner = scope.children.find((child) => child.from <= pos && pos < child.to && !(child.kind === ScopeKinds.Function && pos < (child.fn?.node.getChild("Body")?.from ?? child.from)));
		if (inner === void 0) return scope;
		scope = inner;
	}
};
var signatureOf = (ctx, callee, scope) => {
	const own = ownFunction(ctx, callee, scope);
	if (own !== void 0) return ownSignature(own);
	const type = ctx.types.typeOf(callee, scope);
	if ((type.kind === TypeKinds.ApiFunction || type.kind === TypeKinds.ApiClass) && type.params !== void 0) {
		if (type.kind === TypeKinds.ApiFunction && !isKnownModule(type.path)) return void 0;
		return apiSignature(type.name, type.params);
	}
};
var checkCall = (ctx, call, scope) => {
	const callee = call.firstChild;
	const list = call.getChild("ArgList");
	if (callee === null || list === null) return;
	const args = readArgs(ctx, list);
	const calleeName = callee.name === "VariableName" ? ctx.text(callee) : "";
	const builtin = calleeName !== "" && resolve(calleeName, scope, ctx.model.module) === null ? builtinDocs[calleeName] : void 0;
	if (builtin !== void 0 && !args.spread && args.keywords.length === 0) {
		if (args.positional > builtin.max) return ctx.add(callee.from, list.to, CheckSeverities.Error, `\`${calleeName}\` приймає ${builtin.max === 0 ? "не більше 0 значень" : `не більше ${valuesWord(builtin.max)}`}, а тут їй передають ${valuesWord(args.positional)}.`);
		if (args.positional < builtin.min) return ctx.add(callee.from, list.to, CheckSeverities.Error, `\`${calleeName}\` потрібно ${valuesWord(builtin.min)} в дужках: \`${calleeName}(${builtin.params})\`.`);
	}
	const sig = signatureOf(ctx, callee, scope);
	if (sig !== void 0) {
		const message = argsMessage(sig, args);
		if (message !== void 0) ctx.add(callee.from, list.to, CheckSeverities.Error, message);
	}
	checkTkCallbacks(ctx, callee, args, scope);
	checkStrArgs(ctx, calleeName, builtin !== void 0, args, scope);
};
/** `range(a)` where `a` is text from `input()`. */
var checkStrArgs = (ctx, calleeName, builtin, args, scope) => {
	if (!builtin || calleeName !== "range") return;
	for (const value of args.values) if (value.name === "VariableName" && ctx.types.typeOf(value, scope).kind === TypeKinds.Str && fromInput(ctx, value, scope)) ctx.add(value.from, value.to, CheckSeverities.Error, inputMessage(ctx.text(value)));
};
/** tkinter: `command=f()`, `bind('<1>', f)` with `def f():`, `command=f` with `def f(event):`. */
var checkTkCallbacks = (ctx, callee, args, scope) => {
	const method = callee.name === "MemberExpression" ? ctx.text(callee.getChild("PropertyName") ?? callee) : "";
	const calleeLast = callee.name === "VariableName" ? ctx.text(callee) : method;
	const handlers = [];
	const command = args.keywordValues.get("command");
	if (command !== void 0) handlers.push({
		value: command,
		where: "command",
		event: false
	});
	if (method === "bind" || method === "bind_all" || method === "tag_bind") {
		const handler = args.values[method === "tag_bind" ? 2 : 1];
		if (handler !== void 0) handlers.push({
			value: handler,
			where: method,
			event: true
		});
	}
	if (method === "after") {
		const handler = args.values[1];
		if (handler !== void 0) handlers.push({
			value: handler,
			where: "after",
			event: false
		});
	}
	for (const { value, where, event } of handlers) {
		if (value.name === "CallExpression") {
			const fn = ownFunction(ctx, value.firstChild ?? value, scope);
			if (fn === void 0 || fn.returnsValue) continue;
			const callText = ctx.text(value);
			const target = where === "command" ? `command=${fn.name}` : fn.name;
			ctx.add(value.from, value.to, CheckSeverities.Warning, `Тут \`${callText}\` з дужками: функцію буде викликано одразу, ще до ${event ? "події" : "кліку"}, а ${where === "command" ? "кнопка" : `\`${where}\``} отримає лише її результат (None). Прибери дужки: \`${target}\`.${where === "command" && callText.includes("(") && !callText.endsWith("()") ? ` Щоб передати значення, використай \`lambda\`: \`command=lambda: ${callText}\`.` : ""}`);
			continue;
		}
		const fn = ownFunction(ctx, value, scope);
		if (fn === void 0) continue;
		const sig = ownSignature(fn);
		const required = sig.positional.filter((p) => !p.hasDefault);
		if (event && sig.positional.length === 0 && !sig.star) ctx.add(value.from, value.to, CheckSeverities.Error, `Функція для \`${where}\` отримує подію (\`event\`), а в \`${sig.def ?? ""}\` для неї немає параметра. Додай його: \`def ${fn.name}(event):\`.`);
		if (!event && required.length > 0 && (where !== "command" || ButtonWidgets.has(calleeLast))) {
			const first = required[0]?.name ?? "x";
			const rest = fn.params.map((p) => p.name === first ? `${first}=None` : p.name).join(", ");
			ctx.add(value.from, value.to, CheckSeverities.Error, `${where === "command" ? "Кнопка" : `\`${where}\``} викликає \`${fn.name}\` без значень, а \`${sig.def ?? ""}\` чекає ${required.map((p) => `\`${p.name}\``).join(", ")}. Дай параметру значення за замовчуванням: \`def ${fn.name}(${rest}):\`${where === "command" ? ` або передай значення через \`lambda\`: \`command=lambda: ${fn.name}(...)\`` : ""}.`);
		}
	}
};
/** The variable has text from `input()` in every assignment. */
var fromInput = (ctx, node, scope) => {
	const found = resolve(ctx.text(node), scope, ctx.model.module);
	if (found === null) return false;
	return found.bindings.every((b) => {
		const value = b.value;
		if (value?.name !== "CallExpression") return false;
		const callee = value.firstChild;
		return callee?.name === "VariableName" && ctx.text(callee) === "input";
	});
};
var inputMessage = (name) => `У \`${name}\` — текст, який ввели в \`input()\`, а не число. Щоб рахувати, перетвори його: \`${name} = int(input(...))\` або \`float(input(...))\`.`;
/** `a - 1`, `a + 1`, `a > 5` where `a` is text from `input()`. */
var checkArithmetic = (ctx, node, scope) => {
	const left = node.firstChild;
	const op = left?.nextSibling;
	const right = node.lastChild;
	if (left === null || op === null || op === void 0 || right === null || left === right) return;
	const opText = ctx.text(op);
	const sides = [left, right];
	const typeKinds = sides.map((side) => ctx.types.typeOf(side, scope).kind);
	const numeric = (kind) => kind === TypeKinds.Int || kind === TypeKinds.Float;
	sides.forEach((side, index) => {
		if (side.name !== "VariableName" || typeKinds[index] !== TypeKinds.Str || !fromInput(ctx, side, scope)) return;
		const other = typeKinds[1 - index] ?? TypeKinds.Unknown;
		const arithmetic = op.name === "ArithOp" && ([
			"-",
			"/",
			"//",
			"**"
		].includes(opText) || opText === "+" && numeric(other) || opText === "*" && other === TypeKinds.Float);
		const compare = op.name === "CompareOp" && [
			"<",
			">",
			"<=",
			">="
		].includes(opText) && numeric(other);
		if (arithmetic || compare) return ctx.add(side.from, side.to, CheckSeverities.Error, inputMessage(ctx.text(side)));
		if (op.name === "CompareOp" && (opText === "==" || opText === "!=") && numeric(other)) ctx.add(side.from, side.to, CheckSeverities.Warning, `\`${ctx.text(side)}\` — текст з \`input()\`, а праворуч число, тому \`${opText}\` ${opText === "==" ? "завжди дає False" : "завжди дає True"}. Перетвори текст на число: \`${ctx.text(side)} = int(input(...))\`.`);
	});
};
/** `x = input` and `root.mainloop` without brackets. */
var checkNoBrackets = (ctx, node, scope) => {
	if (node.name === "AssignStatement") {
		const value = node.lastChild;
		const target = node.firstChild;
		if (value?.name !== "VariableName" || target === null) return;
		const name = ctx.text(value);
		if (!ValueFunctions.has(name) || resolve(name, scope, ctx.model.module) !== null) return;
		const call = name === "input" ? "input()" : `${name}(...)`;
		ctx.add(value.from, value.to, CheckSeverities.Warning, `Тут у \`${ctx.text(target)}\` потрапляє сама функція \`${name}\`, а не ${name === "input" ? "те, що ввели" : "її результат"}. Додай дужки: \`${call}\`.`);
		return;
	}
	const expr = node.firstChild;
	if (expr === null || expr.name !== "VariableName" && expr.name !== "MemberExpression") return;
	const type = ctx.types.typeOf(expr, scope);
	if (!((expr.name === "VariableName" ? ownFunction(ctx, expr, scope) : void 0) !== void 0 || type.kind === TypeKinds.ApiFunction || expr.name === "VariableName" && resolve(ctx.text(expr), scope, ctx.model.module) === null && builtinDocs[ctx.text(expr)] !== void 0)) return;
	ctx.add(expr.from, expr.to, CheckSeverities.Warning, `Функцію \`${ctx.text(expr)}\` тут не викликано: бракує дужок. Напиши \`${ctx.text(expr)}()\`.`);
};
/** `int(a)` or `name.upper()` alone on a line: the result is lost. */
var checkLostResult = (ctx, node, scope) => {
	const call = node.firstChild;
	if (call?.name !== "CallExpression") return;
	const callee = call.firstChild;
	const list = call.getChild("ArgList");
	if (callee === null || list === null) return;
	if (callee.name === "VariableName") {
		const name = ctx.text(callee);
		if (!ResultFunctions.has(name) || resolve(name, scope, ctx.model.module) !== null) return;
		const first = readArgs(ctx, list).values[0];
		const target = first?.name === "VariableName" ? ctx.text(first) : "x";
		ctx.add(call.from, call.to, CheckSeverities.Warning, `Результат \`${ctx.text(call)}\` нікуди не записано, тому нічого не зміниться. Запиши його: \`${target} = ${ctx.text(call)}\`${name === "int" || name === "float" ? " або одразу виведи: `print(...)`" : ""}.`);
		return;
	}
	if (callee.name !== "MemberExpression") return;
	const object = callee.firstChild;
	const property = callee.getChild("PropertyName");
	if (object?.name !== "VariableName" || property === null || !StrNewValue.has(ctx.text(property))) return;
	if (ctx.types.typeOf(object, scope).kind !== TypeKinds.Str) return;
	ctx.add(call.from, call.to, CheckSeverities.Warning, `Рядок у Python не змінюється: \`${ctx.text(property)}()\` дає новий рядок. Запиши його: \`${ctx.text(object)} = ${ctx.text(call)}\`.`);
};
var walk = (ctx) => {
	const visit = (node) => {
		const scope = () => scopeOf(ctx.model, node.from);
		if (node.name === "CallExpression") checkCall(ctx, node, scope());
		else if (node.name === "BinaryExpression") checkArithmetic(ctx, node, scope());
		else if (node.name === "AssignStatement") checkNoBrackets(ctx, node, scope());
		else if (node.name === "ExpressionStatement") {
			checkNoBrackets(ctx, node, scope());
			checkLostResult(ctx, node, scope());
		}
		for (let child = node.firstChild; child !== null; child = child.nextSibling) visit(child);
	};
	visit(ctx.model.tree.topNode);
};
/** Mistakes of the code that compiles; nothing for code with a syntax error (the syntax check marks it). */
var checkCode = (code) => {
	const model = analyze(code);
	if (model.broken) return [];
	const warnings = [];
	const lineStarts = [0];
	for (let i = 0; i < code.length; i++) if (code[i] === "\n") lineStarts.push(i + 1);
	const ctx = {
		model,
		types: typer(model),
		text: (node) => code.slice(node.from, node.to),
		line: (pos) => {
			let line = 0;
			while (line + 1 < lineStarts.length && (lineStarts[line + 1] ?? Infinity) <= pos) line += 1;
			return line + 1;
		},
		add: (from, to, severity, message) => {
			if (warnings.some((w) => w.from === from && w.to === to)) return;
			warnings.push({
				from,
				to,
				severity,
				message
			});
		}
	};
	if (!model.unsupported && !/\b(exec|eval|globals|locals|setattr|__import__)\s*\(/.test(code)) checkNames(ctx);
	walk(ctx);
	return warnings.sort((a, b) => a.from - b.from).slice(0, MaxWarnings);
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
	dialogs: [],
	images: /* @__PURE__ */ new Map(),
	downloads: []
};
/** A dialog that the engine sent but the page cannot read: the student can only close it. */
var brokenAsk = {
	kind: "question",
	title: "",
	message: "",
	buttons: ["ok"]
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
	/** Answers to the dialogs of the run (before `mainloop()`), sent with each replay. */
	let runAnswers = [];
	/** The user action whose handler asks, with the answers so far; null when the run itself asks. */
	let asker = null;
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
	const imagesAfter = (images) => {
		if (images.length === 0) return view.images;
		const next = new Map(view.images);
		for (const json of images) Option.map(decodeImage(json), (image) => next.set(image.id, image));
		return next;
	};
	const downloadsAfter = (files) => files.length === 0 ? view.downloads : [...view.downloads.filter((d) => !files.some((f) => f.name === d.name)), ...files];
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
					dialogs: dialogs.length === 0 ? view.dialogs : [...view.dialogs, ...dialogs],
					images: imagesAfter(message.images ?? []),
					downloads: downloadsAfter(message.downloads ?? [])
				});
			}
			case "Asking":
				asker = message.event;
				if (asker !== null) done();
				return finish({
					_tag: "Asking",
					ask: Option.getOrElse(decodeAsk(message.dialog), () => brokenAsk)
				});
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
			case "Checked": return;
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
			seed,
			answers: [...runAnswers],
			files
		});
	};
	/** Files of the last answer: the engine writes them once. */
	let files = [];
	const postEvent = (request) => {
		if (worker === null) return;
		pending++;
		worker.post(request);
	};
	return {
		start: (source) => {
			if (isBusy(view.status) || view.status._tag === "Window" || view.status._tag === "Asking") kill();
			pending = 0;
			code = source;
			seed = Math.floor(Math.random() * MaxSeed);
			inputs = [];
			runAnswers = [];
			files = [];
			asker = null;
			view = idleView;
			segment();
		},
		provideInput: (value) => {
			if (view.status._tag !== "WaitingInput") return;
			inputs = [...inputs, value];
			files = [];
			segment();
		},
		send: (input, layout) => {
			if (view.status._tag !== "Window" || worker === null) return;
			if (input._tag === "Mouse" && input.kind === MouseKinds.Motion && pending > 0) return;
			postEvent({
				_tag: "Event",
				input,
				layout,
				answers: []
			});
		},
		answer: (value, given = []) => {
			if (view.status._tag !== "Asking") return;
			const json = JSON.stringify(value ?? null);
			if (asker === null) {
				runAnswers = [...runAnswers, json];
				files = given;
				return segment();
			}
			const request = {
				...asker,
				answers: [...asker.answers ?? [], json],
				files: given
			};
			publish({
				...view,
				status: { _tag: "Running" }
			});
			postEvent(request);
		},
		dismissDownload: (name) => {
			publish({
				...view,
				downloads: view.downloads.filter((d) => d.name !== name)
			});
		},
		closeDialog: () => {
			if (view.dialogs.length > 0) publish({
				...view,
				dialogs: view.dialogs.slice(1)
			});
		},
		stop: () => {
			if (isBusy(view.status) || view.status._tag === "Window" || view.status._tag === "Asking") return halt(StopReasons.User);
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
export { strMethods as A, builtinNames as C, listMethods as D, keywordSnippets as E, visibleBindings as F, visibleStarImports as I, explainError as L, BindingKinds as M, analyze as N, moduleMembers as O, scopeAt as P, builtinDocs as S, dictMethods as T, windowOf as _, TkAskKinds as a, checkCode as b, TkItemTypes as c, TkMenuEntryTypes as d, TkWidgetKinds as f, waitsFor as g, managedChildren as h, idleView as i, typer as j, plainKeywords as k, TkListModes as l, decodeScene as m, browserWorker as n, TkBindKinds as o, decodeDialog as p, createRunSession as r, TkDialogIcons as s, StopReasons as t, TkManagerKinds as u, plainPunctuation as v, classMembers as w, TypeKinds as x, CheckSeverities as y };
