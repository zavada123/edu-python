import { a as TkBindKinds, c as TkManagerKinds, f as managedChildren, i as idleView, l as TkWidgetKinds, m as plainPunctuation, o as TkDialogIcons, p as waitsFor, r as createRunSession, s as TkItemTypes, t as StopReasons } from "./session-BNPGRHAb.js";
import { a as MouseKinds, n as KeyKinds, t as ChunkKinds } from "./protocol-CBI4MOYt.js";
import { Match, Option } from "effect";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { CircleAlert, CircleX, Download, Feather, FileCode2, FolderOpen, Info, Maximize2, Minimize2, Play, RotateCcw, Square, Trash2, TriangleAlert, X } from "lucide-react";
// src/ui/code-editor.tsx
var highlight = HighlightStyle.define([
	{
		tag: [
			tags.keyword,
			tags.bool,
			tags.null,
			tags.self
		],
		color: "var(--epy-code-keyword)"
	},
	{
		tag: [tags.string, tags.special(tags.string)],
		color: "var(--epy-code-string)"
	},
	{
		tag: [tags.number],
		color: "var(--epy-code-number)"
	},
	{
		tag: [tags.comment],
		color: "var(--epy-code-comment)",
		fontStyle: "italic"
	},
	{
		tag: [
			tags.function(tags.variableName),
			tags.function(tags.propertyName),
			tags.definition(tags.function(tags.variableName))
		],
		color: "var(--epy-code-title)"
	}
]);
var theme = EditorView.theme({
	"&": {
		fontSize: "16px",
		backgroundColor: "var(--epy-card)",
		color: "var(--epy-text)"
	},
	"&.cm-focused": { outline: "none" },
	".cm-content": {
		fontFamily: "var(--epy-font-mono)",
		padding: "8px 0",
		caretColor: "var(--epy-text)"
	},
	".cm-scroller": {
		fontFamily: "var(--epy-font-mono)",
		lineHeight: "1.6",
		minHeight: "8rem"
	},
	".cm-gutters": {
		backgroundColor: "var(--epy-muted)",
		color: "var(--epy-muted-text)",
		border: "none"
	},
	".cm-activeLine": { backgroundColor: "color-mix(in oklab, var(--epy-primary) 6%, transparent)" },
	".cm-error-line": { backgroundColor: "color-mix(in oklab, var(--epy-danger) 18%, transparent)" },
	".cm-cursor": {
		borderLeftColor: "var(--epy-text)",
		borderLeftWidth: "2px"
	}
});
var setErrorLine = StateEffect.define();
var errorLineField = StateField.define({
	create: () => Decoration.none,
	update: (decorations, tr) => {
		for (const effect of tr.effects) {
			if (!effect.is(setErrorLine)) continue;
			const line = effect.value;
			if (line === null || line < 1 || line > tr.state.doc.lines) return Decoration.none;
			return Decoration.set([Decoration.line({ class: "cm-error-line" }).range(tr.state.doc.line(line).from)]);
		}
		return tr.docChanged ? Decoration.none : decorations.map(tr.changes);
	},
	provide: (field) => EditorView.decorations.from(field)
});
var plainInput = [EditorView.inputHandler.of((view, from, to, text) => {
	const plain = plainPunctuation(text);
	if (plain === text) return false;
	view.dispatch({
		changes: {
			from,
			to,
			insert: plain
		},
		selection: { anchor: from + plain.length },
		userEvent: "input.type"
	});
	return true;
}), EditorView.clipboardInputFilter.of((text) => plainPunctuation(text))];
/** `Grow`: the editor grows with the code (tasks, topics). `Fill`: it fills the parent and scrolls (Online IDE). */
var EditorHeights = {
	Grow: "grow",
	Fill: "fill"
};
var fillTheme = EditorView.theme({
	"&": { height: "100%" },
	".cm-scroller": { overflow: "auto" }
});
function CodeEditor(props) {
	const host = useRef(null);
	const view = useRef(null);
	const callbacks = useRef({
		onChange: props.onChange,
		onRun: props.onRun
	});
	useEffect(() => {
		callbacks.current = {
			onChange: props.onChange,
			onRun: props.onRun
		};
	});
	const setup = useRef({
		code: props.initialCode,
		label: props.label,
		height: props.height,
		onReady: props.onReady
	});
	useEffect(() => {
		if (host.current === null) return;
		const editor = new EditorView({
			parent: host.current,
			state: EditorState.create({
				doc: setup.current.code,
				extensions: [
					lineNumbers(),
					highlightActiveLine(),
					EditorView.lineWrapping,
					history(),
					indentUnit.of("    "),
					EditorState.tabSize.of(4),
					python(),
					syntaxHighlighting(highlight),
					theme,
					setup.current.height === EditorHeights.Fill ? fillTheme : [],
					errorLineField,
					plainInput,
					keymap.of([
						{
							key: "Mod-Enter",
							run: () => {
								callbacks.current.onRun();
								return true;
							},
							preventDefault: true
						},
						...defaultKeymap,
						...historyKeymap,
						indentWithTab
					]),
					EditorView.contentAttributes.of({
						"aria-label": setup.current.label,
						autocapitalize: "off",
						autocorrect: "off",
						spellcheck: "false"
					}),
					EditorView.updateListener.of((update) => {
						if (update.docChanged) callbacks.current.onChange(update.state.doc.toString());
					})
				]
			})
		});
		view.current = editor;
		setup.current.onReady({
			insert: (text) => {
				const { from, to } = editor.state.selection.main;
				editor.dispatch({
					changes: {
						from,
						to,
						insert: text
					},
					selection: { anchor: from + text.length },
					userEvent: "input.type"
				});
				editor.focus();
			},
			moveCursor: (by) => {
				const head = Math.max(0, Math.min(editor.state.doc.length, editor.state.selection.main.head + by));
				editor.dispatch({ selection: { anchor: head } });
				editor.focus();
			},
			setCode: (code) => {
				editor.dispatch({ changes: {
					from: 0,
					to: editor.state.doc.length,
					insert: code
				} });
			},
			focus: () => {
				editor.focus();
			}
		});
		return () => {
			editor.destroy();
			view.current = null;
		};
	}, []);
	const errorLine = Option.getOrNull(props.errorLine);
	useEffect(() => {
		view.current?.dispatch({ effects: setErrorLine.of(errorLine) });
	}, [errorLine]);
	return /* @__PURE__ */ jsx("div", {
		ref: host,
		className: props.height === EditorHeights.Fill ? "epy-editor epy-editor--fill" : "epy-editor epy-editor--grow"
	});
}
// src/ui/code-text.tsx
/** Text with `code` parts (explanations of `core/errors.ts`, messages about programs). */
function CodeText(props) {
	return /* @__PURE__ */ jsx(Fragment, { children: props.text.split("`").map((part, i) => i % 2 === 1 ? /* @__PURE__ */ jsx("code", {
		className: "epy-inline-code",
		children: part
	}, i) : /* @__PURE__ */ jsx("span", { children: part }, i)) });
}
// src/ui/kit.tsx
/** Joins class names; `false`, `null` and `""` are left out. */
var cn = (...names) => names.filter((n) => typeof n === "string" && n !== "").join(" ");
var ButtonVariants = {
	Primary: "primary",
	Outline: "outline",
	Ghost: "ghost",
	Danger: "danger"
};
var ButtonSizes = {
	Sm: "sm",
	Md: "md"
};
function Button(props) {
	return /* @__PURE__ */ jsx("button", {
		type: "button",
		className: `epy-btn epy-btn--${props.variant} epy-btn--${props.size}`,
		disabled: props.disabled,
		onClick: props.onClick,
		children: props.children
	});
}
var AlertTones = {
	Info: "info",
	Warning: "warning",
	Error: "error"
};
var icons = {
	info: Info,
	warning: TriangleAlert,
	error: CircleAlert
};
function Alert(props) {
	const Icon = icons[props.tone];
	return /* @__PURE__ */ jsxs("div", {
		role: props.tone === AlertTones.Error ? "alert" : "status",
		className: `epy-alert epy-alert--${props.tone}`,
		children: [/* @__PURE__ */ jsx(Icon, {
			className: "epy-alert__icon",
			"aria-hidden": true
		}), /* @__PURE__ */ jsx("div", {
			className: "epy-alert__body",
			children: props.children
		})]
	});
}
// src/ui/run-output.tsx
/** Symbols that are hard to find on a phone keyboard. */
var symbols = [
	["Tab", "    "],
	["(", "("],
	[")", ")"],
	[":", ":"],
	["\"", "\""],
	["'", "'"],
	["=", "="],
	[",", ","],
	["+", "+"],
	["-", "-"],
	["*", "*"],
	["/", "/"],
	["<", "<"],
	[">", ">"],
	["[", "["],
	["]", "]"],
	["#", "#"],
	["_", "_"]
];
var stopText = {
	[StopReasons.User]: "Програму зупинено.",
	[StopReasons.TimeLimit]: "Програма працювала надто довго, і її зупинено. Можливо, цикл ніколи не закінчується: перевір умову в `while`.",
	[StopReasons.OutputLimit]: "Програма вивела надто багато тексту, і її зупинено. Можливо, `print` стоїть у циклі, який не закінчується.",
	[StopReasons.LoadFailed]: "Не вдалося завантажити Python. Перевір інтернет і спробуй ще раз: після першого завантаження Python працює й без мережі."
};
var statusLine = (status) => Match.valueTags(status, {
	Idle: () => "",
	Loading: () => "Запускаю…",
	Running: () => "Програма працює…",
	WaitingInput: () => "Програма чекає, поки ти введеш значення.",
	Window: () => "Вікно програми відкрите: клацай, вводь текст, натискай клавіші.",
	Finished: () => "Програма завершила роботу.",
	Failed: () => "У програмі помилка.",
	Stopped: () => ""
});
var isBusy = (status) => status._tag === "Loading" || status._tag === "Running";
function InputLine(props) {
	const [value, setValue] = useState("");
	const submit = (event) => {
		event.preventDefault();
		props.onSubmit(value);
		setValue("");
	};
	return /* @__PURE__ */ jsxs("form", {
		onSubmit: submit,
		className: "epy-input-line",
		children: [/* @__PURE__ */ jsx("input", {
			autoFocus: true,
			"aria-label": "Значення для input()",
			value,
			onChange: (e) => {
				setValue(e.target.value);
			},
			autoCapitalize: "off",
			autoCorrect: "off",
			spellCheck: false,
			className: "epy-input-line__field"
		}), /* @__PURE__ */ jsx("button", {
			type: "submit",
			className: "epy-input-line__submit",
			children: "Ввести"
		})]
	});
}
/** `Card`: a block under the editor with a title. `Panel`: the terminal of the Online IDE, without a title. */
var ConsoleLayouts = {
	Card: "card",
	Panel: "panel"
};
function Console(props) {
	const end = useRef(null);
	const waiting = props.view.status._tag === "WaitingInput";
	useEffect(() => {
		end.current?.scrollIntoView({ block: "nearest" });
	}, [props.view.chunks, waiting]);
	const empty = props.view.chunks.length === 0 && !waiting;
	return /* @__PURE__ */ jsxs("div", {
		className: "epy-console-wrap",
		children: [props.layout === ConsoleLayouts.Card && /* @__PURE__ */ jsx("p", {
			className: "epy-caption",
			children: "Результат"
		}), /* @__PURE__ */ jsxs("div", {
			role: "log",
			"aria-live": "polite",
			"aria-label": props.layout === ConsoleLayouts.Panel ? "Термінал" : void 0,
			className: `epy-console epy-console--${props.layout}`,
			children: [
				empty ? /* @__PURE__ */ jsx("span", {
					className: "epy-muted",
					children: props.view.status._tag === "Idle" ? "Натисни «Запустити», і тут з'явиться те, що виведе програма." : ""
				}) : /* @__PURE__ */ jsx("pre", {
					className: "epy-console__text",
					children: props.view.chunks.map((c, i) => /* @__PURE__ */ jsx("span", {
						className: cn(c.kind === ChunkKinds.Input && "epy-console__input"),
						children: c.text
					}, i))
				}),
				waiting && /* @__PURE__ */ jsx(InputLine, { onSubmit: props.onInput }),
				/* @__PURE__ */ jsx("div", { ref: end })
			]
		})]
	});
}
function Problem(props) {
	if (props.status._tag === "Stopped") return /* @__PURE__ */ jsx(Alert, {
		tone: props.status.reason === StopReasons.User ? AlertTones.Info : AlertTones.Warning,
		children: /* @__PURE__ */ jsx(CodeText, { text: stopText[props.status.reason] })
	});
	if (props.status._tag !== "Failed") return null;
	const error = props.status.error;
	return /* @__PURE__ */ jsx(Alert, {
		tone: AlertTones.Error,
		children: /* @__PURE__ */ jsxs("div", {
			className: "epy-problem",
			children: [/* @__PURE__ */ jsxs("p", { children: [Option.match(error.line, {
				onNone: () => "",
				onSome: (n) => `Рядок ${n}: `
			}), /* @__PURE__ */ jsx(CodeText, { text: error.explanation })] }), /* @__PURE__ */ jsxs("details", {
				className: "epy-problem__details",
				children: [/* @__PURE__ */ jsx("summary", { children: "Повідомлення Python" }), /* @__PURE__ */ jsx("code", {
					className: "epy-problem__message",
					children: error.message
				})]
			})]
		})
	});
}
/** Symbol buttons for touch screens: they insert text in the editor and keep the phone keyboard open. */
function SymbolBar(props) {
	return /* @__PURE__ */ jsx("div", {
		className: "epy-symbols",
		role: "group",
		"aria-label": "Символи для коду",
		children: symbols.map(([label, insert]) => /* @__PURE__ */ jsx("button", {
			type: "button",
			onPointerDown: (e) => {
				e.preventDefault();
			},
			onClick: () => props.editor.current?.insert(insert),
			className: "epy-symbols__key",
			children: label
		}, label))
	});
}
function usePythonRun(worker) {
	const [view, setView] = useState(idleView);
	const [runId, setRunId] = useState(0);
	const session = useRef(null);
	const workerRef = useRef(worker);
	useEffect(() => {
		const created = createRunSession(workerRef.current, setView);
		session.current = created;
		return () => {
			created.dispose();
			session.current = null;
		};
	}, []);
	return {
		view,
		runId,
		session,
		start: (code) => {
			setRunId((n) => n + 1);
			session.current?.start(code);
		},
		stop: () => session.current?.stop(),
		clear: () => {
			session.current?.stop();
			setView(idleView);
		},
		provideInput: (value) => session.current?.provideInput(value)
	};
}
/** "Stop" works while the program runs, waits for a value or shows a window. */
var canStop = (status) => isBusy(status) || status._tag === "WaitingInput" || status._tag === "Window";
/** The error line for the editor: only after a failed run. */
var errorLineOf = (status) => status._tag === "Failed" ? status.error.line : Option.none();
// src/core/tk-input.ts
/**
* User actions in the windows of a tkinter program, as Tk names them (`tkinter/_page.py`): keysyms of keys,
* mouse buttons, places of widgets for `winfo_…`.
*/
var NamedKeys = {
	Enter: "Return",
	Escape: "Escape",
	Tab: "Tab",
	Backspace: "BackSpace",
	Delete: "Delete",
	Insert: "Insert",
	Home: "Home",
	End: "End",
	PageUp: "Prior",
	PageDown: "Next",
	ArrowLeft: "Left",
	ArrowRight: "Right",
	ArrowUp: "Up",
	ArrowDown: "Down",
	Shift: "Shift_L",
	Control: "Control_L",
	Alt: "Alt_L",
	AltGraph: "Alt_R",
	Meta: "Win_L",
	CapsLock: "Caps_Lock",
	NumLock: "Num_Lock",
	ScrollLock: "Scroll_Lock",
	Pause: "Pause",
	PrintScreen: "Print",
	ContextMenu: "Menu"
};
/** The same names as `CHAR_KEYSYMS` of `_events.py`. */
var CharKeys = {
	" ": "space",
	",": "comma",
	".": "period",
	"-": "minus",
	"+": "plus",
	"=": "equal",
	"/": "slash",
	"\\": "backslash",
	";": "semicolon",
	"'": "apostrophe",
	"\"": "quotedbl",
	"!": "exclam",
	"?": "question",
	"*": "asterisk",
	"#": "numbersign",
	"$": "dollar",
	"%": "percent",
	"&": "ampersand",
	"(": "parenleft",
	")": "parenright",
	"[": "bracketleft",
	"]": "bracketright",
	"{": "braceleft",
	"}": "braceright",
	":": "colon",
	"<": "less",
	">": "greater",
	"_": "underscore",
	"@": "at",
	"^": "asciicircum",
	"~": "asciitilde",
	"`": "grave",
	"|": "bar"
};
var ControlChars = {
	Enter: "\r",
	Backspace: "\b",
	Tab: "	",
	Escape: "\x1B",
	Delete: ""
};
var isOneChar = (key) => Array.from(key).length === 1;
/** Tk keysym of a DOM `KeyboardEvent.key`: "a", "Return", "space", "Left", "F5". */
var keysym = (key) => {
	if (isOneChar(key)) return CharKeys[key] ?? key;
	if (/^F\d{1,2}$/.test(key)) return key;
	return NamedKeys[key] ?? key;
};
/** `event.char` of Tk: the typed character, or "" for keys like arrows and Shift. */
var keyChar = (key) => isOneChar(key) ? key : ControlChars[key] ?? "";
var modifiers = (e) => [
	...e.shiftKey ? ["Shift"] : [],
	...e.ctrlKey || e.metaKey ? ["Control"] : [],
	...e.altKey ? ["Alt"] : []
];
/** Windows key code (`event.keycode` of Tk on Windows) for letters, digits and the usual keys. */
var KeyCodes = {
	Backspace: 8,
	Tab: 9,
	Enter: 13,
	Shift: 16,
	Control: 17,
	Alt: 18,
	Escape: 27,
	" ": 32,
	PageUp: 33,
	PageDown: 34,
	End: 35,
	Home: 36,
	ArrowLeft: 37,
	ArrowUp: 38,
	ArrowRight: 39,
	ArrowDown: 40,
	Insert: 45,
	Delete: 46
};
var keyCode = (key) => {
	const named = KeyCodes[key];
	if (named !== void 0) return named;
	if (/^[a-zA-Z0-9]$/.test(key)) return key.toUpperCase().charCodeAt(0);
	const f = /^F(\d{1,2})$/.exec(key);
	return f === null ? 0 : 111 + Number(f[1]);
};
/** Tk number of a DOM mouse button: 1 left, 2 middle, 3 right. */
var mouseButton = (button) => button === 1 ? 2 : button === 2 ? 3 : 1;
var TkIdAttribute = "data-tk-id";
var TkItemAttribute = "data-tk-item";
var idOf = (element, attribute) => Number(element.getAttribute(attribute) ?? "0");
/** The canvas figure under the pointer, or 0. */
var itemAt = (target) => {
	if (!(target instanceof Element)) return 0;
	const item = target.closest(`[${TkItemAttribute}]`);
	return item === null ? 0 : idOf(item, TkItemAttribute);
};
/** Places of all windows and widgets under `root`: x and y from the top left corner of the parent. */
var collectLayout = (root) => Array.from(root.querySelectorAll(`[${TkIdAttribute}]`), (element) => {
	const box = element.getBoundingClientRect();
	const parent = element.parentElement?.closest(`[${TkIdAttribute}]`);
	const origin = parent === null || parent === void 0 ? box : parent.getBoundingClientRect();
	return [
		idOf(element, TkIdAttribute),
		Math.round(box.left - origin.left),
		Math.round(box.top - origin.top),
		Math.round(box.width),
		Math.round(box.height)
	];
});
/** A double click: the second press is near the first one and soon after it. */
var DoubleClickMs = 500;
var DoubleClickPx = 6;
/** The press after `last`: `count` is 2 for the second press of a double click. */
var nextPress = (last, widget, time, x, y) => {
	return {
		widget,
		time,
		x,
		y,
		count: Option.match(last, {
			onNone: () => 1,
			onSome: (l) => {
				return l.widget === widget && time - l.time <= DoubleClickMs && Math.abs(l.x - x) <= DoubleClickPx && Math.abs(l.y - y) <= DoubleClickPx ? l.count + 1 : 1;
			}
		})
	};
};
// src/ui/tk-context.ts
/** Remembers the last mouse press: event handlers change it, the view does not show it. */
var PressTracker = class {
	last = Option.none();
};
var TkContext = createContext(Option.none());
var useTk = () => Option.getOrThrowWith(useContext(TkContext), () => /* @__PURE__ */ new Error("useTk outside of TkWindows"));
var TkWindowContext = createContext(Option.none());
var useTkWindow = () => Option.getOrThrowWith(useContext(TkWindowContext), () => /* @__PURE__ */ new Error("useTkWindow outside of a window"));
/** The client area of a window (the element with this attribute): `x_root` and `y_root` count from it. */
var TkWindowAttribute = "data-tk-window";
var clientOf = (element) => element.closest(`[${TkWindowAttribute}]`);
// src/ui/tk-events.ts
var WheelStep = 120;
var isField = (target) => target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
var useWidgetEvents = (widget) => {
	const tk = useTk();
	const tkWindow = useTkWindow();
	const waits = (kind) => tk.active && waitsFor(tk.scene, widget, kind);
	const send = (kind, e, button, count, delta) => {
		const box = e.currentTarget.getBoundingClientRect();
		const client = clientOf(e.currentTarget)?.getBoundingClientRect() ?? box;
		tk.send({
			_tag: "Mouse",
			kind,
			widget,
			item: itemAt(e.target),
			button,
			count,
			buttons: e.buttons,
			delta,
			x: Math.round(e.clientX - box.left),
			y: Math.round(e.clientY - box.top),
			rootX: Math.round(tkWindow.x + e.clientX - client.left),
			rootY: Math.round(tkWindow.y + e.clientY - client.top),
			modifiers: modifiers(e)
		});
	};
	return {
		onPointerDown: (e) => {
			e.stopPropagation();
			const client = clientOf(e.currentTarget);
			if (!isField(e.target) && client instanceof HTMLElement) client.focus({ preventScroll: true });
			if (waits(TkBindKinds.Motion) || waits(TkBindKinds.Release)) e.currentTarget.setPointerCapture(e.pointerId);
			if (!waits(TkBindKinds.Press)) return;
			const box = e.currentTarget.getBoundingClientRect();
			const press = nextPress(tk.press.last, widget, e.timeStamp, e.clientX - box.left, e.clientY - box.top);
			tk.press.last = Option.some(press);
			send(MouseKinds.Press, e, mouseButton(e.button), press.count, 0);
		},
		onPointerUp: (e) => {
			e.stopPropagation();
			if (waits(TkBindKinds.Release)) send(MouseKinds.Release, e, mouseButton(e.button), 1, 0);
		},
		onPointerMove: (e) => {
			e.stopPropagation();
			if (waits(TkBindKinds.Motion)) send(MouseKinds.Motion, e, 0, 0, 0);
		},
		onPointerEnter: (e) => {
			if (waits(TkBindKinds.Enter)) send(MouseKinds.Enter, e, 0, 0, 0);
		},
		onPointerLeave: (e) => {
			if (waits(TkBindKinds.Leave)) send(MouseKinds.Leave, e, 0, 0, 0);
		},
		onWheel: (e) => {
			e.stopPropagation();
			if (waits(TkBindKinds.Wheel)) send(MouseKinds.Wheel, e, 0, 0, e.deltaY < 0 ? WheelStep : -120);
		},
		onContextMenu: (e) => {
			if (waits(TkBindKinds.Press)) e.preventDefault();
		}
	};
};
// src/ui/tk-canvas.tsx
var pointsOf = (coords) => Array.from({ length: Math.floor(coords.length / 2) }, (_, i) => [coords[2 * i] ?? 0, coords[2 * i + 1] ?? 0]);
var middle = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
var at = (p) => `${p[0]} ${p[1]}`;
/** Path through the points; with `smooth` a quadratic B-spline, as Tk draws it. */
var pathOf = (points, smooth, closed) => {
	const first = points[0];
	if (first === void 0) return "";
	if (!smooth || points.length < 3) return `M ${points.map(at).join(" L ")}${closed ? " Z" : ""}`;
	const all = closed ? [
		...points,
		first,
		points[1] ?? first
	] : points;
	const parts = [`M ${at(closed ? middle(first, points[1] ?? first) : first)}`];
	for (let i = 1; i < all.length - 1; i++) {
		const control = all[i] ?? first;
		const next = all[i + 1] ?? first;
		const end = !closed && i === all.length - 2 ? next : middle(control, next);
		parts.push(`Q ${at(control)} ${at(end)}`);
	}
	return parts.join(" ") + (closed ? " Z" : "");
};
/** The arrow head of Tk at `tip`, for a line that comes from `from`; returns the head and the new line end. */
var arrowHead = (tip, from, shape, width) => {
	const dx = tip[0] - from[0];
	const dy = tip[1] - from[1];
	const length = Math.hypot(dx, dy) || 1;
	const ux = dx / length;
	const uy = dy / length;
	const neck = shape[0] ?? 8;
	const back = shape[1] ?? 10;
	const side = (shape[2] ?? 3) + width / 2;
	const base = [tip[0] - ux * back, tip[1] - uy * back];
	return [[
		tip,
		[base[0] - uy * side, base[1] + ux * side],
		[tip[0] - ux * neck, tip[1] - uy * neck],
		[base[0] + uy * side, base[1] - ux * side]
	].map((p) => `${p[0]},${p[1]}`).join(" "), [tip[0] - ux * neck, tip[1] - uy * neck]];
};
var cap = (style) => style === "round" ? "round" : style === "projecting" ? "square" : "butt";
var join = (style) => style === "bevel" ? "bevel" : style === "miter" ? "miter" : "round";
var paint = (color) => color === "" ? "none" : color;
var stroke = (item, color) => ({
	stroke: paint(color),
	strokeWidth: item.width,
	strokeDasharray: item.dash.length > 0 ? item.dash.join(" ") : void 0
});
function LineItem(props) {
	const item = props.item;
	const points = [...pointsOf(item.coords)];
	const heads = [];
	const first = points[0];
	const second = points[1];
	const last = points.at(-1);
	const beforeLast = points.at(-2);
	if (first !== void 0 && second !== void 0 && (item.arrow === "first" || item.arrow === "both")) {
		const [head, end] = arrowHead(first, second, item.arrowshape, item.width);
		heads.push(head);
		points[0] = end;
	}
	if (last !== void 0 && beforeLast !== void 0 && (item.arrow === "last" || item.arrow === "both")) {
		const [head, end] = arrowHead(last, beforeLast, item.arrowshape, item.width);
		heads.push(head);
		points[points.length - 1] = end;
	}
	return /* @__PURE__ */ jsxs("g", {
		[TkItemAttribute]: item.id,
		children: [/* @__PURE__ */ jsx("path", {
			d: pathOf(points, item.smooth, false),
			fill: "none",
			...stroke(item, item.fill),
			strokeLinecap: cap(item.capstyle),
			strokeLinejoin: join(item.joinstyle)
		}), heads.map((head, i) => /* @__PURE__ */ jsx("polygon", {
			points: head,
			fill: paint(item.fill)
		}, i))]
	});
}
var box = (coords) => {
	const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = coords;
	return {
		left: Math.min(x1, x2),
		top: Math.min(y1, y2),
		width: Math.abs(x2 - x1),
		height: Math.abs(y2 - y1)
	};
};
var FullCircle = 360;
var arcPath = (item) => {
	const b = box(item.coords);
	const rx = b.width / 2;
	const ry = b.height / 2;
	const cx = b.left + rx;
	const cy = b.top + ry;
	const extent = Math.max(-360, Math.min(FullCircle, item.extent));
	const pointAt = (degrees) => [cx + rx * Math.cos(degrees * Math.PI / 180), cy - ry * Math.sin(degrees * Math.PI / 180)];
	if (Math.abs(extent) >= FullCircle) {
		const left = pointAt(180);
		const right = pointAt(0);
		return `M ${at(right)} A ${rx} ${ry} 0 1 0 ${at(left)} A ${rx} ${ry} 0 1 0 ${at(right)}`;
	}
	const start = pointAt(item.start);
	const end = pointAt(item.start + extent);
	const curve = `A ${rx} ${ry} 0 ${Math.abs(extent) > 180 ? 1 : 0} ${extent > 0 ? 0 : 1} ${at(end)}`;
	return Match.value(item.style).pipe(Match.when("arc", () => `M ${at(start)} ${curve}`), Match.when("chord", () => `M ${at(start)} ${curve} Z`), Match.orElse(() => `M ${cx} ${cy} L ${at(start)} ${curve} Z`));
};
var fontPixels = (font) => Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? "12");
function TextItem(props) {
	const item = props.item;
	const [x = 0, y = 0] = item.coords;
	const lines = item.text.split("\n");
	const lineHeight = fontPixels(item.font) * 1.2;
	const height = lines.length * lineHeight;
	const anchor = item.anchor;
	const top = anchor === "center" || !(anchor.startsWith("n") || anchor.startsWith("s")) ? y - height / 2 : anchor.startsWith("n") ? y : y - height;
	const textAnchor = anchor === "center" ? "middle" : anchor.includes("w") ? "start" : anchor.includes("e") ? "end" : "middle";
	return /* @__PURE__ */ jsx("text", {
		[TkItemAttribute]: item.id,
		x,
		y: top,
		fill: paint(item.fill),
		textAnchor,
		dominantBaseline: "text-before-edge",
		transform: item.angle !== 0 ? `rotate(${-item.angle} ${x} ${y})` : void 0,
		style: {
			font: item.font,
			textDecoration: item.underline ? "underline" : void 0,
			whiteSpace: "pre",
			userSelect: "none"
		},
		children: lines.map((line, i) => /* @__PURE__ */ jsx("tspan", {
			x,
			y: top + i * lineHeight,
			children: line
		}, i))
	});
}
function CanvasItem(props) {
	const item = props.item;
	if (item.hidden) return null;
	const id = { [TkItemAttribute]: item.id };
	return Match.value(item.type).pipe(Match.when(TkItemTypes.Line, () => /* @__PURE__ */ jsx(LineItem, { item })), Match.when(TkItemTypes.Rectangle, () => {
		const b = box(item.coords);
		return /* @__PURE__ */ jsx("rect", {
			...id,
			x: b.left,
			y: b.top,
			width: b.width,
			height: b.height,
			fill: paint(item.fill),
			...stroke(item, item.outline)
		});
	}), Match.when(TkItemTypes.Oval, () => {
		const b = box(item.coords);
		return /* @__PURE__ */ jsx("ellipse", {
			...id,
			cx: b.left + b.width / 2,
			cy: b.top + b.height / 2,
			rx: b.width / 2,
			ry: b.height / 2,
			fill: paint(item.fill),
			...stroke(item, item.outline)
		});
	}), Match.when(TkItemTypes.Polygon, () => /* @__PURE__ */ jsx("path", {
		...id,
		d: pathOf(pointsOf(item.coords), item.smooth, true),
		fill: paint(item.fill),
		...stroke(item, item.outline),
		strokeLinejoin: join(item.joinstyle)
	})), Match.when(TkItemTypes.Arc, () => /* @__PURE__ */ jsx("path", {
		...id,
		d: arcPath(item),
		fill: item.style === "arc" ? "none" : paint(item.fill),
		...stroke(item, item.outline)
	})), Match.when(TkItemTypes.Text, () => /* @__PURE__ */ jsx(TextItem, { item })), Match.exhaustive);
}
function TkCanvasView(props) {
	const tk = useTk();
	const events = useWidgetEvents(props.widget.id);
	const w = props.widget;
	const edge = w.highlight + w.bd;
	const width = Math.max(1, w.width + 2 * edge);
	const height = Math.max(1, w.height + 2 * edge);
	const drags = waitsFor(tk.scene, w.id, TkBindKinds.Motion);
	return /* @__PURE__ */ jsx("svg", {
		[TkIdAttribute]: w.id,
		...events,
		role: "img",
		"aria-label": "Полотно програми",
		width,
		height,
		viewBox: `0 0 ${width} ${height}`,
		style: {
			display: "block",
			flex: "none",
			background: w.bg === "" ? "transparent" : w.bg,
			overflow: "hidden",
			touchAction: drags ? "none" : void 0,
			...props.layout
		},
		children: w.items.map((item) => /* @__PURE__ */ jsx(CanvasItem, { item }, item.id))
	});
}
// src/ui/tk-widgets.tsx
/** Line height of Tk fonts; the fonts of `_style.py` have the same `/1.2`. */
var LineHeight = 1.2;
var Light = "var(--tk-paper)";
var Shadow = "var(--tk-shadow)";
var border = (relief, width) => {
	if (width <= 0) return {
		borderWidth: 0,
		borderStyle: "none"
	};
	const raised = {
		borderWidth: width,
		borderStyle: "solid",
		borderColor: `${Light} ${Shadow} ${Shadow} ${Light}`
	};
	return Match.value(relief).pipe(Match.when("raised", () => raised), Match.when("sunken", () => ({
		...raised,
		borderColor: `${Shadow} ${Light} ${Light} ${Shadow}`
	})), Match.when("groove", () => ({
		borderWidth: width,
		borderStyle: "groove",
		borderColor: Shadow
	})), Match.when("ridge", () => ({
		borderWidth: width,
		borderStyle: "ridge",
		borderColor: Shadow
	})), Match.when("solid", () => ({
		borderWidth: width,
		borderStyle: "solid",
		borderColor: "var(--tk-text)"
	})), Match.orElse(() => ({
		borderWidth: width,
		borderStyle: "solid",
		borderColor: "transparent"
	})));
};
/** CSS alignment of a Tk anchor: n, ne, e, se, s, sw, w, nw, center. */
var anchorX = (anchor) => anchor === "center" ? "center" : anchor.includes("w") ? "flex-start" : anchor.includes("e") ? "flex-end" : "center";
var anchorY = (anchor) => anchor === "center" ? "center" : anchor.startsWith("n") ? "flex-start" : anchor.startsWith("s") ? "flex-end" : "center";
/** Does the container take the size of its widgets (pack and grid do it, place does not)? */
var fitsContent = (scene, id, propagate) => propagate && scene.widgets.some((w) => w.parent === id && (w.manager.kind === TkManagerKinds.Pack || w.manager.kind === TkManagerKinds.Grid));
var containerSize = (scene, id, propagate, width, height) => fitsContent(scene, id, propagate) ? {} : {
	width: Math.max(1, width),
	height: Math.max(1, height)
};
var textBox = (w) => ({
	boxSizing: "content-box",
	font: w.font,
	color: w.fg,
	background: w.bg === "" ? "transparent" : w.bg,
	...border(w.relief, w.bd),
	padding: `${w.pady}px ${w.padx}px`,
	margin: w.highlight,
	width: w.width > 0 ? `${w.width}ch` : void 0,
	height: w.height > 0 ? `${w.height * LineHeight}em` : void 0,
	display: "flex",
	justifyContent: anchorX(w.anchor),
	alignItems: anchorY(w.anchor),
	textAlign: w.justify === "left" ? "left" : w.justify === "right" ? "right" : "center",
	whiteSpace: w.wrap > 0 ? "pre-wrap" : "pre",
	overflow: "hidden",
	textDecoration: w.underline ? "underline" : void 0,
	userSelect: "none"
});
function Caption(props) {
	return /* @__PURE__ */ jsx("span", {
		style: {
			maxWidth: props.widget.wrap > 0 ? props.widget.wrap : void 0,
			overflowWrap: "anywhere"
		},
		children: props.widget.text
	});
}
function LabelView(props) {
	const events = useWidgetEvents(props.widget.id);
	return /* @__PURE__ */ jsx("div", {
		[TkIdAttribute]: props.widget.id,
		...events,
		style: {
			...textBox(props.widget),
			...props.layout
		},
		children: /* @__PURE__ */ jsx(Caption, { widget: props.widget })
	});
}
function ButtonView(props) {
	const tk = useTk();
	const events = useWidgetEvents(props.widget.id);
	const [pressed, setPressed] = useState(false);
	const w = props.widget;
	const disabled = w.state === "disabled";
	const style = textBox(w);
	return /* @__PURE__ */ jsx("button", {
		type: "button",
		[TkIdAttribute]: w.id,
		...events,
		"aria-disabled": disabled,
		onPointerDown: (e) => {
			if (!disabled) setPressed(true);
			events.onPointerDown(e);
		},
		onPointerUp: (e) => {
			setPressed(false);
			events.onPointerUp(e);
		},
		onPointerLeave: (e) => {
			setPressed(false);
			events.onPointerLeave(e);
		},
		onClick: () => {
			if (!disabled && tk.active) tk.send({
				_tag: "Invoke",
				widget: w.id
			});
		},
		style: {
			...style,
			...pressed && w.relief === "raised" ? border("sunken", w.bd) : {},
			cursor: disabled ? "default" : "pointer",
			...props.layout
		},
		children: /* @__PURE__ */ jsx(Caption, { widget: w })
	});
}
/** A check box or a radio button: the mark and the text; a click anywhere on it is `invoke()`. */
function ChoiceView(props) {
	const tk = useTk();
	const events = useWidgetEvents(props.widget.id);
	const w = props.widget;
	const disabled = w.state === "disabled";
	const mark = {
		boxSizing: "border-box",
		width: "1.1em",
		height: "1.1em",
		flex: "none",
		marginRight: "0.3em",
		border: "1px solid var(--tk-dark)",
		borderRadius: props.round ? "50%" : 0,
		background: w.selectcolor === "" ? "var(--tk-paper)" : w.selectcolor,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		fontSize: "0.9em",
		lineHeight: 1
	};
	return /* @__PURE__ */ jsxs("button", {
		type: "button",
		role: props.round ? "radio" : "checkbox",
		"aria-checked": w.checked,
		"aria-disabled": disabled,
		[TkIdAttribute]: w.id,
		...events,
		onClick: () => {
			if (!disabled && tk.active) tk.send({
				_tag: "Invoke",
				widget: w.id
			});
		},
		style: {
			...textBox(w),
			cursor: disabled ? "default" : "pointer",
			...props.layout
		},
		children: [w.indicator && /* @__PURE__ */ jsx("span", {
			"aria-hidden": true,
			style: mark,
			children: w.checked && (props.round ? /* @__PURE__ */ jsx("span", { style: {
				width: "0.45em",
				height: "0.45em",
				borderRadius: "50%",
				background: "var(--tk-text)"
			} }) : "✓")
		}), /* @__PURE__ */ jsx(Caption, { widget: w })]
	});
}
/** Text of a field: the student types it, and the program changes it (`rev`). */
var useFieldText = (w) => {
	const [value, setValue] = useState(w.text);
	const [rev, setRev] = useState(w.rev);
	if (rev !== w.rev) {
		setRev(w.rev);
		setValue(w.text);
	}
	return [value, setValue];
};
var fieldStyle = (w) => ({
	boxSizing: "content-box",
	font: w.font,
	color: w.fg,
	background: w.bg,
	...border(w.relief, w.bd),
	margin: w.highlight,
	padding: "1px 2px",
	outline: "none",
	textAlign: w.justify === "right" ? "right" : w.justify === "center" ? "center" : "left"
});
function EntryView(props) {
	const tk = useTk();
	const events = useWidgetEvents(props.widget.id);
	const w = props.widget;
	const [value, setValue] = useFieldText(w);
	return /* @__PURE__ */ jsx("input", {
		[TkIdAttribute]: w.id,
		...events,
		type: w.show === "" ? "text" : "password",
		"aria-label": "Поле програми",
		value,
		disabled: w.state === "disabled",
		readOnly: w.state === "readonly" || !tk.active,
		autoCapitalize: "off",
		autoCorrect: "off",
		spellCheck: false,
		onChange: (e) => {
			setValue(e.target.value);
			tk.send({
				_tag: "Edit",
				widget: w.id,
				text: e.target.value
			});
		},
		style: {
			...fieldStyle(w),
			width: `${Math.max(1, w.width)}ch`,
			...props.layout
		}
	});
}
function TextView(props) {
	const tk = useTk();
	const events = useWidgetEvents(props.widget.id);
	const w = props.widget;
	const [value, setValue] = useFieldText(w);
	return /* @__PURE__ */ jsx("textarea", {
		[TkIdAttribute]: w.id,
		...events,
		"aria-label": "Текстове поле програми",
		value,
		readOnly: w.state === "disabled" || !tk.active,
		spellCheck: false,
		onChange: (e) => {
			setValue(e.target.value);
			tk.send({
				_tag: "Edit",
				widget: w.id,
				text: e.target.value
			});
		},
		style: {
			...fieldStyle(w),
			padding: `${w.pady}px ${w.padx}px`,
			width: `${Math.max(1, w.width)}ch`,
			height: `${Math.max(1, w.height) * LineHeight}em`,
			resize: "none",
			whiteSpace: w.textwrap === "none" ? "pre" : "pre-wrap",
			wordBreak: w.textwrap === "char" ? "break-all" : "normal",
			...props.layout
		}
	});
}
function ScaleView(props) {
	const tk = useTk();
	const events = useWidgetEvents(props.widget.id);
	const w = props.widget;
	const [value, setValue] = useFieldText({
		...w,
		text: String(Option.match(w.scale, {
			onNone: () => 0,
			onSome: (s) => s.value
		}))
	});
	return Option.match(w.scale, {
		onNone: () => null,
		onSome: (scale) => {
			const vertical = scale.orient === "vertical";
			return /* @__PURE__ */ jsxs("div", {
				[TkIdAttribute]: w.id,
				...events,
				style: {
					...textBox(w),
					flexDirection: vertical ? "row" : "column",
					gap: 2,
					...props.layout
				},
				children: [
					scale.label !== "" && /* @__PURE__ */ jsx("span", { children: scale.label }),
					scale.showvalue && /* @__PURE__ */ jsx("span", { children: value }),
					/* @__PURE__ */ jsx("input", {
						type: "range",
						"aria-label": scale.label === "" ? "Повзунок програми" : scale.label,
						min: Math.min(scale.from, scale.to),
						max: Math.max(scale.from, scale.to),
						step: scale.resolution > 0 ? scale.resolution : "any",
						value,
						disabled: w.state === "disabled" || !tk.active,
						onChange: (e) => {
							setValue(e.target.value);
							tk.send({
								_tag: "Edit",
								widget: w.id,
								text: e.target.value
							});
						},
						style: {
							width: vertical ? void 0 : scale.length,
							height: vertical ? scale.length : void 0,
							writingMode: vertical ? "vertical-lr" : void 0,
							accentColor: scale.trough === "" ? void 0 : "var(--tk-accent)"
						}
					})
				]
			});
		}
	});
}
function FrameView(props) {
	const tk = useTk();
	const events = useWidgetEvents(props.widget.id);
	const w = props.widget;
	const style = {
		boxSizing: "content-box",
		position: "relative",
		display: "flex",
		flexDirection: "column",
		background: w.bg === "" ? "transparent" : w.bg,
		...border(w.relief, w.bd),
		padding: `${w.pady}px ${w.padx}px`,
		margin: w.highlight,
		...containerSize(tk.scene, w.id, w.propagate, w.width, w.height),
		...props.layout
	};
	if (w.kind === TkWidgetKinds.LabelFrame) return /* @__PURE__ */ jsxs("fieldset", {
		[TkIdAttribute]: w.id,
		...events,
		style: {
			...style,
			minInlineSize: 0,
			paddingTop: Math.max(w.pady, 2)
		},
		children: [/* @__PURE__ */ jsx("legend", {
			style: {
				font: w.font,
				color: w.fg,
				padding: "0 2px",
				marginLeft: 4
			},
			children: w.text
		}), /* @__PURE__ */ jsx(Children, { parent: w.id })]
	});
	return /* @__PURE__ */ jsx("div", {
		[TkIdAttribute]: w.id,
		...events,
		style,
		children: /* @__PURE__ */ jsx(Children, { parent: w.id })
	});
}
function TkWidgetView(props) {
	return Match.value(props.widget.kind).pipe(Match.when(TkWidgetKinds.Label, () => /* @__PURE__ */ jsx(LabelView, { ...props })), Match.when(TkWidgetKinds.Button, () => /* @__PURE__ */ jsx(ButtonView, { ...props })), Match.when(TkWidgetKinds.Checkbutton, () => /* @__PURE__ */ jsx(ChoiceView, {
		...props,
		round: false
	})), Match.when(TkWidgetKinds.Radiobutton, () => /* @__PURE__ */ jsx(ChoiceView, {
		...props,
		round: true
	})), Match.when(TkWidgetKinds.Entry, () => /* @__PURE__ */ jsx(EntryView, { ...props })), Match.when(TkWidgetKinds.Text, () => /* @__PURE__ */ jsx(TextView, { ...props })), Match.when(TkWidgetKinds.Frame, () => /* @__PURE__ */ jsx(FrameView, { ...props })), Match.when(TkWidgetKinds.LabelFrame, () => /* @__PURE__ */ jsx(FrameView, { ...props })), Match.when(TkWidgetKinds.Canvas, () => /* @__PURE__ */ jsx(TkCanvasView, { ...props })), Match.when(TkWidgetKinds.Scale, () => /* @__PURE__ */ jsx(ScaleView, { ...props })), Match.exhaustive);
}
var isVertical = (side) => side !== "left" && side !== "right";
var direction = (side) => side === "bottom" ? "column-reverse" : side === "left" ? "row" : side === "right" ? "row-reverse" : "column";
var fills = (m, axis) => m.fill === "both" || m.fill === axis;
/**
* One packed widget: the parcel is a strip along the side of the free space; the widget sits in it by
* `anchor` and stretches by `fill`. The parcel grows with `expand`.
*/
function Parcel(props) {
	const m = props.widget.manager;
	const parcel = {
		display: "flex",
		flex: `${m.expand ? 1 : 0} 1 auto`,
		alignSelf: "stretch",
		minWidth: 0,
		minHeight: 0,
		padding: `${m.pady[0]}px ${m.padx[1]}px ${m.pady[1]}px ${m.padx[0]}px`,
		justifyContent: anchorX(m.anchor),
		alignItems: anchorY(m.anchor)
	};
	const layout = {
		flexGrow: fills(m, "x") ? 1 : 0,
		alignSelf: fills(m, "y") ? "stretch" : void 0,
		paddingInline: m.ipadx > 0 ? `calc(${m.ipadx}px + ${props.widget.padx}px)` : void 0,
		paddingBlock: m.ipady > 0 ? `calc(${m.ipady}px + ${props.widget.pady}px)` : void 0
	};
	return /* @__PURE__ */ jsx("div", {
		style: parcel,
		children: /* @__PURE__ */ jsx(TkWidgetView, {
			widget: props.widget,
			layout
		})
	});
}
/**
* The pack algorithm of Tk as nested flex boxes: each widget takes a parcel from the free space, the next
* widgets share the rest. The rest grows by the number of later widgets that expand along the same axis.
*/
function PackChain(props) {
	const item = props.items[props.index];
	if (item === void 0) return null;
	const vertical = isVertical(item.manager.side);
	const later = props.items.slice(props.index + 1);
	const restGrow = later.filter((w) => w.manager.expand && isVertical(w.manager.side) === vertical).length;
	return /* @__PURE__ */ jsxs("div", {
		style: {
			display: "flex",
			flexDirection: direction(item.manager.side),
			flex: `${props.grow} 1 auto`,
			alignSelf: "stretch",
			minWidth: 0,
			minHeight: 0
		},
		children: [/* @__PURE__ */ jsx(Parcel, { widget: item }), later.length > 0 && /* @__PURE__ */ jsx(PackChain, {
			items: props.items,
			index: props.index + 1,
			grow: restGrow
		})]
	});
}
var tracks = (configs, count) => Array.from({ length: count }, (_, i) => {
	const config = configs.find((c) => c[0] === i);
	const weight = config?.[1] ?? 0;
	const minimum = config?.[2] ?? 0;
	return weight > 0 ? `minmax(${minimum}px, ${weight}fr)` : `minmax(${minimum}px, max-content)`;
}).join(" ");
var stickyX = (sticky) => sticky.includes("e") && sticky.includes("w") ? "stretch" : sticky.includes("w") ? "start" : sticky.includes("e") ? "end" : "center";
var stickyY = (sticky) => sticky.includes("n") && sticky.includes("s") ? "stretch" : sticky.includes("n") ? "start" : sticky.includes("s") ? "end" : "center";
function GridBox(props) {
	const columnCount = Math.max(1, ...props.items.map((w) => w.manager.column + w.manager.columnspan), ...props.columns.map((c) => c[0] + 1));
	const rowCount = Math.max(1, ...props.items.map((w) => w.manager.row + w.manager.rowspan), ...props.rows.map((r) => r[0] + 1));
	return /* @__PURE__ */ jsx("div", {
		style: {
			display: "grid",
			flex: "1 1 auto",
			alignSelf: "stretch",
			gridTemplateColumns: tracks(props.columns, columnCount),
			gridTemplateRows: tracks(props.rows, rowCount),
			justifyContent: "start",
			alignContent: "start"
		},
		children: props.items.map((w) => {
			const m = w.manager;
			const layout = {
				gridColumn: `${m.column + 1} / span ${Math.max(1, m.columnspan)}`,
				gridRow: `${m.row + 1} / span ${Math.max(1, m.rowspan)}`,
				justifySelf: stickyX(m.sticky),
				alignSelf: stickyY(m.sticky),
				marginTop: m.pady[0] + w.highlight,
				marginBottom: m.pady[1] + w.highlight,
				marginLeft: m.padx[0] + w.highlight,
				marginRight: m.padx[1] + w.highlight
			};
			return /* @__PURE__ */ jsx(TkWidgetView, {
				widget: w,
				layout
			}, w.id);
		})
	});
}
var placeShift = (anchor) => {
	return `translate(${anchor === "center" ? "-50%" : anchor.includes("w") ? "0" : anchor.includes("e") ? "-100%" : "-50%"}, ${anchor === "center" ? "-50%" : anchor.startsWith("n") ? "0" : anchor.startsWith("s") ? "-100%" : "-50%"})`;
};
var placeLayout = (m) => ({
	position: "absolute",
	left: `calc(${m.relx * 100}% + ${m.x}px)`,
	top: `calc(${m.rely * 100}% + ${m.y}px)`,
	width: m.width >= 0 || m.relwidth >= 0 ? `calc(${Math.max(0, m.relwidth) * 100}% + ${Math.max(0, m.width)}px)` : void 0,
	height: m.height >= 0 || m.relheight >= 0 ? `calc(${Math.max(0, m.relheight) * 100}% + ${Math.max(0, m.height)}px)` : void 0,
	boxSizing: m.width >= 0 || m.relwidth >= 0 ? "border-box" : void 0,
	transform: placeShift(m.anchor),
	margin: 0
});
/** The widgets inside a window or a frame. The container is a flex column with `position: relative`. */
function Children(props) {
	const tk = useTk();
	const packed = managedChildren(tk.scene, props.parent, TkManagerKinds.Pack);
	const gridded = managedChildren(tk.scene, props.parent, TkManagerKinds.Grid);
	const placed = managedChildren(tk.scene, props.parent, TkManagerKinds.Place);
	const container = tk.scene.windows.find((w) => w.id === props.parent) ?? tk.scene.widgets.find((w) => w.id === props.parent);
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		packed.length > 0 && /* @__PURE__ */ jsx(PackChain, {
			items: packed,
			index: 0,
			grow: 1
		}),
		gridded.length > 0 && /* @__PURE__ */ jsx(GridBox, {
			items: gridded,
			columns: container?.columns ?? [],
			rows: container?.rows ?? []
		}),
		placed.map((w) => /* @__PURE__ */ jsx(TkWidgetView, {
			widget: w,
			layout: placeLayout(w.manager)
		}, w.id))
	] });
}
/** Keys for the program: from a field (the field gets them) or from the window. */
var keyTarget = (e, windowId) => {
	const target = e.target;
	if (!(target instanceof Element)) return windowId;
	const field = target.closest(`[${TkIdAttribute}]`);
	return field === null ? windowId : Number(field.getAttribute("data-tk-id") ?? windowId);
};
// src/ui/tk-window.tsx
/** A new Tk window without widgets and without `geometry` is 200 × 200, as in Tk. */
var EmptyWindowSize = 200;
/** Keys that the page uses for itself when the program does not wait for them. */
var PageKeys = /* @__PURE__ */ new Set([
	" ",
	"ArrowUp",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
	"PageUp",
	"PageDown",
	"Home",
	"End",
	"Tab"
]);
function ClientArea(props) {
	const tk = useTk();
	const events = useWidgetEvents(props.window.id);
	const w = props.window;
	const fixed = w.width >= 0 && w.height >= 0;
	const size = fixed ? {
		width: w.width,
		height: w.height
	} : containerSize(tk.scene, w.id, w.propagate, w.minWidth > 0 ? w.minWidth : EmptyWindowSize, w.minHeight > 0 ? w.minHeight : EmptyWindowSize);
	const key = (e, kind) => {
		const widget = keyTarget(e, w.id);
		if (!tk.active || !waitsFor(tk.scene, widget, kind === KeyKinds.Press ? TkBindKinds.Key : TkBindKinds.KeyRelease)) return;
		if (e.target === e.currentTarget && PageKeys.has(e.key)) e.preventDefault();
		tk.send({
			_tag: "Key",
			kind,
			widget,
			keysym: keysym(e.key),
			char: keyChar(e.key),
			keycode: keyCode(e.key),
			modifiers: modifiers(e)
		});
	};
	return /* @__PURE__ */ jsx("div", {
		[TkIdAttribute]: w.id,
		[TkWindowAttribute]: "",
		...events,
		tabIndex: 0,
		"aria-label": `Вікно «${w.title}»`,
		onKeyDown: (e) => {
			key(e, KeyKinds.Press);
		},
		onKeyUp: (e) => {
			key(e, KeyKinds.Release);
		},
		className: "epy-tk-client",
		style: {
			boxSizing: "content-box",
			position: "relative",
			display: "flex",
			flexDirection: "column",
			overflow: "hidden",
			background: w.bg === "" ? "var(--tk-face)" : w.bg,
			padding: `${w.pady}px ${w.padx}px`,
			minWidth: fixed ? void 0 : "max-content",
			...size
		},
		children: /* @__PURE__ */ jsx(Children, { parent: w.id })
	});
}
function WindowFrame(props) {
	const tk = useTk();
	const w = props.window;
	return /* @__PURE__ */ jsx(TkWindowContext.Provider, {
		value: Option.some(w),
		children: /* @__PURE__ */ jsxs("figure", {
			className: "epy-tk-figure",
			children: [/* @__PURE__ */ jsx("div", {
				className: "epy-tk-scroll",
				children: /* @__PURE__ */ jsxs("div", {
					className: "epy-tk-window",
					children: [w.decorated && /* @__PURE__ */ jsxs("div", {
						className: "epy-tk-title",
						children: [
							/* @__PURE__ */ jsx(Feather, {
								"aria-hidden": true,
								className: "epy-tk-title__icon"
							}),
							/* @__PURE__ */ jsx("span", {
								className: "epy-tk-title__text",
								children: w.title
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								"aria-label": "Закрити вікно",
								disabled: !tk.active,
								onClick: () => {
									tk.send({
										_tag: "Close",
										widget: w.id
									});
								},
								className: "epy-tk-close",
								children: /* @__PURE__ */ jsx(X, {
									"aria-hidden": true,
									className: "epy-tk-close__icon"
								})
							})
						]
					}), /* @__PURE__ */ jsx(ClientArea, { window: w })]
				})
			}), (w.x !== 0 || w.y !== 0) && /* @__PURE__ */ jsxs("figcaption", {
				className: "epy-tk-place",
				children: [
					"Місце на екрані: x = ",
					w.x,
					", y = ",
					w.y
				]
			})]
		})
	});
}
var dialogIcon = (icon) => Match.value(icon).pipe(Match.when(TkDialogIcons.Info, () => /* @__PURE__ */ jsx(Info, {
	"aria-hidden": true,
	className: "epy-tk-dialog__icon epy-tk-dialog__icon--info"
})), Match.when(TkDialogIcons.Warning, () => /* @__PURE__ */ jsx(TriangleAlert, {
	"aria-hidden": true,
	className: "epy-tk-dialog__icon epy-tk-dialog__icon--warning"
})), Match.when(TkDialogIcons.Error, () => /* @__PURE__ */ jsx(CircleX, {
	"aria-hidden": true,
	className: "epy-tk-dialog__icon epy-tk-dialog__icon--error"
})), Match.exhaustive);
function MessageDialog(props) {
	const ok = useRef(null);
	useEffect(() => {
		ok.current?.focus({ preventScroll: true });
	}, [props.dialog]);
	return /* @__PURE__ */ jsx("div", {
		className: "epy-tk-backdrop",
		children: /* @__PURE__ */ jsxs("div", {
			role: "alertdialog",
			"aria-modal": "true",
			"aria-label": props.dialog.title === "" ? "Повідомлення програми" : props.dialog.title,
			className: "epy-tk-dialog",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "epy-tk-title",
					children: /* @__PURE__ */ jsx("span", {
						className: "epy-tk-title__text",
						children: props.dialog.title
					})
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "epy-tk-dialog__body",
					children: [dialogIcon(props.dialog.icon), /* @__PURE__ */ jsx("p", {
						className: "epy-tk-dialog__message",
						children: props.dialog.message
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "epy-tk-dialog__buttons",
					children: /* @__PURE__ */ jsx("button", {
						ref: ok,
						type: "button",
						onClick: props.onClose,
						className: "epy-tk-button",
						children: "OK"
					})
				})
			]
		})
	});
}
/** The windows of the program and its message windows. The parent gives a new `key` for each run. */
function TkWindows(props) {
	const [root, setRoot] = useState(null);
	const [press] = useState(() => new PressTracker());
	const announced = useRef(/* @__PURE__ */ new Set());
	const focusRev = useRef(0);
	const { onInput } = props;
	const send = useCallback((input) => {
		if (root !== null) onInput(input, collectLayout(root));
	}, [root, onInput]);
	const visibleOf = (scene) => Option.match(scene, {
		onNone: () => [],
		onSome: (s) => s.windows.filter((w) => w.visible)
	});
	const visible = visibleOf(props.scene);
	useEffect(() => {
		const element = root;
		if (!props.active || element === null) return;
		for (const w of visibleOf(props.scene)) {
			if (announced.current.has(w.id)) continue;
			announced.current.add(w.id);
			onInput({
				_tag: "Shown",
				widget: w.id
			}, collectLayout(element));
		}
	}, [
		props.active,
		props.scene,
		root,
		onInput
	]);
	useEffect(() => {
		Option.map(props.scene, (scene) => {
			if (scene.focusRev === focusRev.current) return;
			focusRev.current = scene.focusRev;
			const field = root?.querySelector(`[${TkIdAttribute}="${scene.focus}"]`);
			if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) field.focus({ preventScroll: true });
		});
	}, [props.scene, root]);
	const dialog = props.dialogs[0];
	if (Option.isNone(props.scene) && dialog === void 0) return null;
	return /* @__PURE__ */ jsxs("section", {
		ref: setRoot,
		className: "epy-tk-area",
		"aria-label": "Вікна програми",
		children: [
			/* @__PURE__ */ jsx("p", {
				className: "epy-caption",
				children: "Вікно програми"
			}),
			Option.match(props.scene, {
				onNone: () => null,
				onSome: (scene) => {
					const value = {
						scene,
						active: props.active,
						send,
						press
					};
					return /* @__PURE__ */ jsx(TkContext.Provider, {
						value: Option.some(value),
						children: /* @__PURE__ */ jsx("div", {
							className: cn("epy-tk-windows", !props.active && "epy-tk-windows--idle"),
							children: visible.map((w) => /* @__PURE__ */ jsx(WindowFrame, { window: w }, w.id))
						})
					});
				}
			}),
			dialog !== void 0 && /* @__PURE__ */ jsx(MessageDialog, {
				dialog,
				onClose: props.onCloseDialog
			})
		]
	});
}
var emptyScene = {
	items: [],
	background: "white",
	turtle: {
		x: 0,
		y: 0,
		heading: 0,
		visible: true,
		pen: "black",
		fill: "black"
	},
	speed: 3,
	fillStart: 0,
	applied: 0,
	progress: 0,
	redraw: false
};
/** Distance per frame for speed 1; speed 0 draws at once. With many commands waiting, the turtle goes faster. */
var PixelsPerSpeed = 4;
var BacklogStep = 150;
var frameBudget = (speed, waiting) => {
	if (speed <= 0) return Number.POSITIVE_INFINITY;
	return Math.min(speed, 10) * PixelsPerSpeed * (1 + Math.floor(waiting / BacklogStep));
};
var finite = (n, fallback) => Number.isFinite(n) ? n : fallback;
/** Applies one command that takes no time (all except `Move`). */
var applyInstant = (w, op) => {
	switch (op._tag) {
		case "Turn":
			w.turtle = {
				...w.turtle,
				heading: finite(op.heading, w.turtle.heading)
			};
			return;
		case "Dot":
			w.items.push({
				_tag: "Dot",
				x: op.x,
				y: op.y,
				size: op.size,
				color: op.color
			});
			return;
		case "FillStart":
			w.fillStart = w.items.length;
			return;
		case "Fill": {
			const at = Math.min(w.fillStart, w.items.length);
			w.items.splice(at, 0, {
				_tag: "Polygon",
				points: op.points,
				color: op.color
			});
			w.redraw = true;
			return;
		}
		case "Text":
			w.items.push({
				_tag: "Text",
				x: op.x,
				y: op.y,
				text: op.text,
				align: op.align,
				font: op.font,
				color: op.color
			});
			return;
		case "Stamp":
			w.items.push({
				_tag: "Stamp",
				x: op.x,
				y: op.y,
				heading: op.heading,
				pen: w.turtle.pen,
				fill: op.color
			});
			return;
		case "Background":
			w.background = op.color;
			w.redraw = true;
			return;
		case "Clear":
			w.items = [];
			w.fillStart = 0;
			w.redraw = true;
			return;
		case "Visible":
			w.turtle = {
				...w.turtle,
				visible: op.visible
			};
			return;
		case "Look":
			w.turtle = {
				...w.turtle,
				pen: op.pen,
				fill: op.fill
			};
			return;
		case "Speed":
			w.speed = finite(op.speed, 3);
			return;
	}
};
/** Applies commands from `scene.applied` while the frame budget lasts. */
var advance = (scene, ops) => {
	const w = {
		items: [...scene.items],
		background: scene.background,
		turtle: scene.turtle,
		speed: scene.speed,
		fillStart: scene.fillStart,
		redraw: false
	};
	let applied = scene.applied;
	let progress = scene.progress;
	let budget = frameBudget(scene.speed, ops.length - applied);
	while (applied < ops.length) {
		const op = ops[applied];
		if (op === void 0) break;
		if (op._tag !== "Move") {
			applyInstant(w, op);
			applied++;
			if (op._tag === "Speed") budget = frameBudget(w.speed, ops.length - applied);
			continue;
		}
		const x = finite(op.x, w.turtle.x);
		const y = finite(op.y, w.turtle.y);
		const length = Math.hypot(x - w.turtle.x, y - w.turtle.y);
		if (length - progress > budget) {
			progress += budget;
			break;
		}
		budget -= length - progress;
		if (op.pen) w.items.push({
			_tag: "Line",
			x1: w.turtle.x,
			y1: w.turtle.y,
			x2: x,
			y2: y,
			color: op.color,
			width: op.width
		});
		w.turtle = {
			...w.turtle,
			x,
			y
		};
		progress = 0;
		applied++;
	}
	return {
		items: w.items,
		background: w.background,
		turtle: w.turtle,
		speed: w.speed,
		fillStart: w.fillStart,
		applied,
		progress,
		redraw: w.redraw
	};
};
/** The turtle in the middle of a `Move`, and the part of the line that it has drawn. */
var inMotion = (scene, ops) => {
	const op = ops[scene.applied];
	if (op?._tag !== "Move" || scene.progress === 0) return {
		pose: scene.turtle,
		line: null
	};
	const { x: x1, y: y1 } = scene.turtle;
	const length = Math.hypot(op.x - x1, op.y - y1);
	const t = length === 0 ? 1 : scene.progress / length;
	const x2 = x1 + (op.x - x1) * t;
	const y2 = y1 + (op.y - y1) * t;
	return {
		pose: {
			...scene.turtle,
			x: x2,
			y: y2
		},
		line: op.pen ? {
			x1,
			y1,
			x2,
			y2,
			color: op.color,
			width: op.width
		} : null
	};
};
var isDone = (scene, ops) => scene.applied >= ops.length;
// src/ui/turtle-canvas.tsx
var Size = 600;
var MaxPixelRatio = 2;
var arrow = (ctx, x, y, heading, pen, fill) => {
	ctx.save();
	ctx.translate(x, -y);
	ctx.rotate(-heading * Math.PI / 180);
	ctx.beginPath();
	ctx.moveTo(10, 0);
	ctx.lineTo(-6, 6);
	ctx.lineTo(-3, 0);
	ctx.lineTo(-6, -6);
	ctx.closePath();
	ctx.fillStyle = fill;
	ctx.strokeStyle = pen;
	ctx.lineWidth = 1;
	ctx.fill();
	ctx.stroke();
	ctx.restore();
};
var line = (ctx, l) => {
	ctx.beginPath();
	ctx.moveTo(l.x1, -l.y1);
	ctx.lineTo(l.x2, -l.y2);
	ctx.strokeStyle = l.color;
	ctx.lineWidth = Math.max(1, l.width);
	ctx.stroke();
};
var drawItem = (ctx, item) => {
	switch (item._tag) {
		case "Line": return line(ctx, item);
		case "Dot":
			ctx.beginPath();
			ctx.arc(item.x, -item.y, Math.max(.5, item.size / 2), 0, 2 * Math.PI);
			ctx.fillStyle = item.color;
			ctx.fill();
			return;
		case "Polygon":
			ctx.beginPath();
			for (let i = 0; i + 1 < item.points.length; i += 2) {
				const x = item.points[i] ?? 0;
				const y = -(item.points[i + 1] ?? 0);
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.closePath();
			ctx.fillStyle = item.color;
			ctx.fill();
			return;
		case "Text":
			ctx.font = item.font;
			ctx.fillStyle = item.color;
			ctx.textAlign = item.align === "center" || item.align === "right" ? item.align : "left";
			ctx.textBaseline = "alphabetic";
			ctx.fillText(item.text, item.x, -item.y);
			return;
		case "Stamp": return arrow(ctx, item.x, item.y, item.heading, item.pen, item.fill);
	}
};
var prepare = (canvas, ratio) => {
	const ctx = canvas.getContext("2d");
	if (ctx === null) return null;
	ctx.setTransform(ratio, 0, 0, ratio, Size / 2 * ratio, Size / 2 * ratio);
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	return ctx;
};
var drawTurtle = (ctx, pose) => {
	if (pose.visible) arrow(ctx, pose.x, pose.y, pose.heading, pose.pen, pose.fill);
};
var createPlayer = (visible, ratio) => {
	const paper = document.createElement("canvas");
	paper.width = Size * ratio;
	paper.height = Size * ratio;
	let scene = emptyScene;
	let ops = [];
	/** Count of scene items already on the paper canvas. */
	let drawn = 0;
	let frame = null;
	const render = () => {
		const paperCtx = prepare(paper, ratio);
		const ctx = visible.getContext("2d");
		if (paperCtx === null || ctx === null) return;
		if (scene.redraw || drawn > scene.items.length) {
			paperCtx.save();
			paperCtx.setTransform(1, 0, 0, 1, 0, 0);
			paperCtx.clearRect(0, 0, paper.width, paper.height);
			paperCtx.restore();
			drawn = 0;
		}
		for (const item of scene.items.slice(drawn)) drawItem(paperCtx, item);
		drawn = scene.items.length;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.fillStyle = scene.background;
		ctx.fillRect(0, 0, visible.width, visible.height);
		ctx.drawImage(paper, 0, 0);
		const view = prepare(visible, ratio);
		if (view === null) return;
		const motion = inMotion(scene, ops);
		if (motion.line !== null) line(view, motion.line);
		drawTurtle(view, motion.pose);
	};
	const tick = () => {
		scene = advance(scene, ops);
		render();
		frame = isDone(scene, ops) ? null : requestAnimationFrame(tick);
	};
	return {
		reset: () => {
			if (frame !== null) cancelAnimationFrame(frame);
			frame = null;
			scene = emptyScene;
			ops = [];
			drawn = Number.POSITIVE_INFINITY;
			render();
		},
		update: (next) => {
			ops = next;
			if (frame === null && !isDone(scene, ops)) frame = requestAnimationFrame(tick);
		},
		dispose: () => {
			if (frame !== null) cancelAnimationFrame(frame);
			frame = null;
		}
	};
};
function TurtleCanvas(props) {
	const canvas = useRef(null);
	const player = useRef(null);
	const ratio = typeof window === "undefined" ? 1 : Math.min(MaxPixelRatio, Math.max(1, window.devicePixelRatio));
	useEffect(() => {
		if (canvas.current === null) return;
		const created = createPlayer(canvas.current, ratio);
		player.current = created;
		return () => {
			created.dispose();
			player.current = null;
		};
	}, [ratio]);
	useEffect(() => {
		player.current?.reset();
	}, [props.runId]);
	useEffect(() => {
		player.current?.update(props.ops);
	}, [props.ops]);
	return /* @__PURE__ */ jsx("canvas", {
		ref: canvas,
		width: Size * ratio,
		height: Size * ratio,
		role: "img",
		"aria-label": "Малюнок Черепашки",
		className: "epy-turtle"
	});
}
// src/ui/python-ide.tsx
/** Largest file that "Відкрити файл" reads: a program, not a data set. */
var MAX_OPEN_FILE_BYTES = 2e5;
var pythonFileName = (name) => /\.py$/i.test(name) ? name : `${name.replace(/\s+/g, "_")}.py`;
/** Saves the code as a `.py` file on the device of the student. */
var downloadCode = (fileName, code) => {
	const url = URL.createObjectURL(new Blob([code], { type: "text/x-python;charset=utf-8" }));
	const link = document.createElement("a");
	link.href = url;
	link.download = pythonFileName(fileName);
	link.click();
	URL.revokeObjectURL(url);
};
function PythonIde(props) {
	const editor = useRef(null);
	const fileInput = useRef(null);
	const [code, setCode] = useState(props.initialCode);
	const [full, setFull] = useState(false);
	const [notice, setNotice] = useState("");
	const run = usePythonRun(props.worker);
	const onCodeChange = useRef(props.onCodeChange);
	useEffect(() => {
		onCodeChange.current = props.onCodeChange;
	}, [props.onCodeChange]);
	useEffect(() => {
		if (!full) return;
		const close = (event) => {
			if (event.key === "Escape") setFull(false);
		};
		window.addEventListener("keydown", close);
		return () => window.removeEventListener("keydown", close);
	}, [full]);
	const change = (next) => {
		setCode(next);
		onCodeChange.current(next);
	};
	const start = () => run.start(code);
	const openFile = (event) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (file === void 0) return;
		if (file.size > MAX_OPEN_FILE_BYTES) return setNotice("Файл завеликий: відкрий файл програми .py");
		file.text().then((text) => {
			editor.current?.setCode(text);
			setNotice(`Відкрито файл ${file.name}`);
		}, () => setNotice("Не вдалося прочитати файл"));
	};
	const turtle = run.view.ops.length > 0 || /\bturtle\b/.test(code);
	const status = statusLine(run.view.status);
	return /* @__PURE__ */ jsxs("section", {
		"aria-label": "Онлайн-редактор Python",
		"data-python-ide": true,
		className: cn("epy epy-ide", full && "epy-ide--full"),
		children: [/* @__PURE__ */ jsxs("div", {
			className: "epy-toolbar epy-ide__toolbar",
			title: "Ctrl + Enter у редакторі теж запускає програму",
			children: [
				/* @__PURE__ */ jsxs(Button, {
					variant: ButtonVariants.Primary,
					size: ButtonSizes.Md,
					disabled: false,
					onClick: start,
					children: [/* @__PURE__ */ jsx(Play, { "aria-hidden": true }), " Запустити"]
				}),
				/* @__PURE__ */ jsxs(Button, {
					variant: ButtonVariants.Outline,
					size: ButtonSizes.Sm,
					disabled: !canStop(run.view.status),
					onClick: run.stop,
					children: [/* @__PURE__ */ jsx(Square, { "aria-hidden": true }), " Зупинити"]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "epy-toolbar__end",
					children: [
						props.actions,
						/* @__PURE__ */ jsxs(Button, {
							variant: ButtonVariants.Ghost,
							size: ButtonSizes.Sm,
							disabled: false,
							onClick: () => fileInput.current?.click(),
							children: [/* @__PURE__ */ jsx(FolderOpen, { "aria-hidden": true }), " Відкрити файл"]
						}),
						/* @__PURE__ */ jsxs(Button, {
							variant: ButtonVariants.Ghost,
							size: ButtonSizes.Sm,
							disabled: false,
							onClick: () => downloadCode(props.fileName, code),
							children: [/* @__PURE__ */ jsx(Download, { "aria-hidden": true }), " Завантажити"]
						}),
						/* @__PURE__ */ jsxs(Button, {
							variant: ButtonVariants.Ghost,
							size: ButtonSizes.Sm,
							disabled: false,
							onClick: () => setFull((f) => !f),
							children: [
								full ? /* @__PURE__ */ jsx(Minimize2, { "aria-hidden": true }) : /* @__PURE__ */ jsx(Maximize2, { "aria-hidden": true }),
								" ",
								full ? "Звичайний вигляд" : "На весь екран"
							]
						}),
						/* @__PURE__ */ jsx("input", {
							ref: fileInput,
							type: "file",
							accept: ".py,.txt,text/plain,text/x-python",
							hidden: true,
							"aria-label": "Файл програми",
							onChange: openFile
						})
					]
				})
			]
		}), /* @__PURE__ */ jsxs("div", {
			className: "epy-ide__body",
			children: [
				props.sidebar,
				/* @__PURE__ */ jsxs("div", {
					className: "epy-ide__pane epy-ide__pane--editor",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "epy-ide__tab",
							children: [
								/* @__PURE__ */ jsx(FileCode2, {
									"aria-hidden": true,
									className: "epy-ide__file-icon"
								}),
								/* @__PURE__ */ jsx("span", {
									className: "epy-ide__file",
									children: pythonFileName(props.fileName)
								}),
								/* @__PURE__ */ jsx("span", {
									className: "epy-ide__note",
									"aria-live": "polite",
									children: notice !== "" ? notice : props.saveNote
								})
							]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "epy-ide__editor",
							children: /* @__PURE__ */ jsx(CodeEditor, {
								initialCode: props.initialCode,
								label: `Код програми ${pythonFileName(props.fileName)}`,
								height: EditorHeights.Fill,
								errorLine: errorLineOf(run.view.status),
								onChange: change,
								onRun: start,
								onReady: (handle) => {
									editor.current = handle;
								}
							})
						}),
						/* @__PURE__ */ jsx("div", {
							className: "epy-ide__symbols",
							children: /* @__PURE__ */ jsx(SymbolBar, { editor })
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "epy-ide__pane",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "epy-ide__tab",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "epy-ide__file",
								children: "Термінал"
							}),
							/* @__PURE__ */ jsx("span", {
								className: "epy-ide__note",
								"aria-live": "polite",
								children: status
							}),
							/* @__PURE__ */ jsxs(Button, {
								variant: ButtonVariants.Ghost,
								size: ButtonSizes.Sm,
								disabled: run.view.status._tag === "Idle",
								onClick: run.clear,
								children: [/* @__PURE__ */ jsx(Trash2, { "aria-hidden": true }), " Очистити"]
							})
						]
					}), /* @__PURE__ */ jsxs("div", {
						className: "epy-ide__output",
						children: [
							/* @__PURE__ */ jsx(Problem, { status: run.view.status }),
							/* @__PURE__ */ jsx(TkWindows, {
								scene: run.view.scene,
								dialogs: run.view.dialogs,
								active: run.view.status._tag === "Window",
								onInput: (input, layout) => run.session.current?.send(input, layout),
								onCloseDialog: () => run.session.current?.closeDialog()
							}, run.runId),
							/* @__PURE__ */ jsx(Console, {
								view: run.view,
								layout: ConsoleLayouts.Panel,
								onInput: run.provideInput
							}),
							turtle && /* @__PURE__ */ jsx(TurtleCanvas, {
								ops: run.view.ops,
								runId: run.runId
							})
						]
					})]
				})
			]
		})]
	});
}
// src/ui/python-runner.tsx
function PythonRunner(props) {
	const editor = useRef(null);
	const [code, setCode] = useState(props.initialCode);
	const run = usePythonRun(props.worker);
	const onCodeChange = useRef(props.onCodeChange);
	useEffect(() => {
		onCodeChange.current = props.onCodeChange;
	}, [props.onCodeChange]);
	useEffect(() => {
		onCodeChange.current(code);
	}, [code]);
	const start = () => run.start(code);
	const turtle = run.view.ops.length > 0 || /\bturtle\b/.test(code);
	return /* @__PURE__ */ jsxs("div", {
		className: "epy epy-runner",
		"data-python-runner": true,
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "epy-toolbar",
				children: [
					/* @__PURE__ */ jsxs(Button, {
						variant: ButtonVariants.Primary,
						size: ButtonSizes.Md,
						disabled: false,
						onClick: start,
						children: [/* @__PURE__ */ jsx(Play, { "aria-hidden": true }), " Запустити"]
					}),
					/* @__PURE__ */ jsxs(Button, {
						variant: ButtonVariants.Outline,
						size: ButtonSizes.Sm,
						disabled: !canStop(run.view.status),
						onClick: run.stop,
						children: [/* @__PURE__ */ jsx(Square, { "aria-hidden": true }), " Зупинити"]
					}),
					/* @__PURE__ */ jsxs(Button, {
						variant: ButtonVariants.Ghost,
						size: ButtonSizes.Sm,
						disabled: code === props.resetCode,
						onClick: () => editor.current?.setCode(props.resetCode),
						children: [/* @__PURE__ */ jsx(RotateCcw, { "aria-hidden": true }), " Скинути код"]
					}),
					props.note !== "" && /* @__PURE__ */ jsx("span", {
						className: "epy-toolbar__note",
						"aria-live": "polite",
						children: props.note
					})
				]
			}),
			/* @__PURE__ */ jsx(CodeEditor, {
				initialCode: props.initialCode,
				label: "Код програми на Python",
				height: EditorHeights.Grow,
				errorLine: errorLineOf(run.view.status),
				onChange: setCode,
				onRun: start,
				onReady: (handle) => {
					editor.current = handle;
					props.onEditorReady(handle);
				}
			}),
			/* @__PURE__ */ jsx(SymbolBar, { editor }),
			/* @__PURE__ */ jsx("p", {
				className: "epy-status",
				"aria-live": "polite",
				children: statusLine(run.view.status)
			}),
			/* @__PURE__ */ jsx(Problem, { status: run.view.status }),
			/* @__PURE__ */ jsx(TkWindows, {
				scene: run.view.scene,
				dialogs: run.view.dialogs,
				active: run.view.status._tag === "Window",
				onInput: (input, layout) => run.session.current?.send(input, layout),
				onCloseDialog: () => run.session.current?.closeDialog()
			}, run.runId),
			/* @__PURE__ */ jsx(Console, {
				view: run.view,
				layout: ConsoleLayouts.Card,
				onInput: run.provideInput
			}),
			turtle && /* @__PURE__ */ jsx(TurtleCanvas, {
				ops: run.view.ops,
				runId: run.runId
			})
		]
	});
}
export { CodeEditor, CodeText, Console, ConsoleLayouts, EditorHeights, Problem, PythonIde, PythonRunner, SymbolBar, TkWindows, TurtleCanvas, canStop, errorLineOf, statusLine, stopText, usePythonRun };
