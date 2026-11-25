import { A as strMethods, C as builtinNames, D as listMethods, E as keywordSnippets, F as visibleBindings, I as visibleStarImports, L as explainError, M as BindingKinds, N as analyze, O as moduleMembers, P as scopeAt, S as builtinDocs, T as dictMethods, _ as windowOf, a as TkAskKinds, b as checkCode, c as TkItemTypes, d as TkMenuEntryTypes, f as TkWidgetKinds, g as waitsFor, h as managedChildren, i as idleView, j as typer, k as plainKeywords, l as TkListModes, o as TkBindKinds, r as createRunSession, s as TkDialogIcons, t as StopReasons, u as TkManagerKinds, v as plainPunctuation, w as classMembers, x as TypeKinds } from "./session-BjAXpUDE.js";
import { f as safeFileName, n as KeyKinds, o as MouseKinds, r as MaxFileBytes, t as ChunkKinds } from "./protocol-CTCLMVi9.js";
import { Match, Option } from "effect";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, indentUnit, syntaxHighlighting, syntaxTree } from "@codemirror/language";
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, snippetCompletion } from "@codemirror/autocomplete";
import { lintGutter, linter } from "@codemirror/lint";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView, highlightActiveLine, keymap, lineNumbers, tooltips } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { AppWindow, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleAlert, CircleHelp, CircleX, Download, Feather, FileCode2, FileText, FolderOpen, Info, Maximize2, Minimize2, PanelRight, Play, RotateCcw, Square, Trash2, TriangleAlert, Upload, X } from "lucide-react";
// src/ui/completions.ts
/** Code without the line at the cursor: the line being typed is often unfinished and breaks the tree. */
var cached = null;
var modelOf = (code) => {
	if (cached?.code !== code) cached = {
		code,
		model: analyze(code)
	};
	return cached.model;
};
var KindTypes = {
	f: "function",
	c: "class",
	m: "namespace",
	v: "constant"
};
/** A function is inserted with brackets and the cursor inside them; without parameters, after them. */
var callable = (label, params, info, type, boost = 0) => {
	const empty = params !== void 0 && params.trim() === "";
	const base = {
		label,
		type,
		boost,
		detail: params === void 0 ? "(…)" : `(${params})`,
		...info === void 0 ? {} : { info }
	};
	return snippetCompletion(empty ? `${label}()` : `${label}(\${})`, base);
};
var apiCompletion = (name, item, boost = 0) => {
	const [kind, , params] = item;
	if (kind === "f" || kind === "c") return callable(name, params, void 0, KindTypes[kind] ?? "function", boost);
	return {
		label: name,
		type: KindTypes[kind] ?? "variable",
		boost
	};
};
var methodCompletions = (methods) => methods.map((m) => callable(m.name, m.params, m.info, "method"));
/** Members of a value after a dot. */
var membersOf = (type) => {
	switch (type.kind) {
		case TypeKinds.Module: return Array.from(moduleMembers(type.path), ([name, item]) => apiCompletion(name, item));
		case TypeKinds.Instance: return Array.from(classMembers(type.cls), ([name, item]) => apiCompletion(name, item));
		case TypeKinds.Str: return methodCompletions(strMethods);
		case TypeKinds.List: return methodCompletions(listMethods);
		case TypeKinds.Dict: return methodCompletions(dictMethods);
		default: return [];
	}
};
var SkipNodes = /* @__PURE__ */ new Set([
	"String",
	"FormatString",
	"Comment"
]);
/** The code with the unfinished word at the cursor removed: the tree of the rest is whole. */
var withoutWord = (code, from, to) => code.slice(0, from) + code.slice(to);
var memberHints = (context) => {
	const before = context.matchBefore(/[\w.()[\]"']+\.\w*$/);
	if (before === null) return null;
	const dot = before.text.lastIndexOf(".");
	const wordFrom = before.from + dot + 1;
	const code = context.state.doc.toString();
	const model = modelOf(`${code.slice(0, wordFrom)}_${code.slice(context.pos)}`);
	const node = model.tree.resolveInner(wordFrom, 1);
	const object = (node.name === "PropertyName" ? node.parent : null)?.firstChild;
	if (object === null || object === void 0) return null;
	const options = membersOf(typer(model).typeOf(object, scopeAt(model, wordFrom)));
	return options.length === 0 ? null : {
		from: wordFrom,
		options,
		validFor: /^\w*$/
	};
};
var nameHints = (context) => {
	const word = context.matchBefore(/\w+$/);
	if (word === null && !context.explicit) return null;
	const from = word?.from ?? context.pos;
	const model = modelOf(withoutWord(context.state.doc.toString(), from, context.pos));
	const scope = scopeAt(model, from);
	const options = [];
	const seen = /* @__PURE__ */ new Set();
	const add = (option) => {
		if (seen.has(option.label)) return;
		seen.add(option.label);
		options.push(option);
	};
	for (const binding of visibleBindings(scope)) if (binding.kind === BindingKinds.Function && binding.fn !== void 0) add(callable(binding.name, binding.fn.paramsText, "Твоя функція", "function", 3));
	else if (binding.kind === BindingKinds.Class) add(callable(binding.name, void 0, "Твій клас", "class", 3));
	else if (binding.kind === BindingKinds.Import) add({
		label: binding.name,
		type: binding.imported === void 0 ? "namespace" : "variable",
		boost: 2
	});
	else add({
		label: binding.name,
		type: "variable",
		boost: 3
	});
	for (const [name, item] of visibleStarImports(scope).flatMap((path) => Array.from(moduleMembers(path)))) add(apiCompletion(name, item, 1));
	for (const keyword of keywordSnippets) add(snippetCompletion(keyword.snippet, {
		label: keyword.label,
		type: "keyword",
		info: keyword.info,
		boost: 1
	}));
	for (const name of plainKeywords) add({
		label: name,
		type: "keyword"
	});
	for (const [name, doc] of Object.entries(builtinDocs)) add(callable(name, doc.params, doc.info, "function", 2));
	for (const name of builtinNames) add({
		label: name,
		type: /^[A-Z]/.test(name) ? "class" : "function",
		boost: -1
	});
	return {
		from,
		options,
		validFor: /^\w*$/
	};
};
/** The completion source of the editor. */
var pythonHints = (context) => {
	const node = syntaxTree(context.state).resolveInner(context.pos, -1);
	if (SkipNodes.has(node.name) && !(node.name === "FormatString" && context.matchBefore(/\{[\w.]*$/) !== null)) return null;
	return memberHints(context) ?? nameHints(context);
};
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
	},
	".cm-tooltip-lint": {
		fontFamily: "system-ui, sans-serif",
		fontSize: "14px",
		maxWidth: "min(28rem, calc(100vw - 16px))",
		boxSizing: "border-box"
	},
	".cm-diagnostic": {
		lineHeight: "1.45",
		whiteSpace: "normal"
	},
	".cm-diagnostic code": {
		fontFamily: "ui-monospace, Menlo, Consolas, monospace",
		fontSize: "13px",
		padding: "0 3px",
		borderRadius: "4px",
		backgroundColor: "#f4f2f5"
	},
	".cm-lint-marker": {
		width: "0.9em",
		height: "0.9em"
	},
	".cm-tooltip-autocomplete": {
		fontFamily: "ui-monospace, Menlo, Consolas, monospace",
		fontSize: "14px"
	},
	".cm-tooltip-autocomplete > ul > li": { padding: "2px 8px" },
	".cm-completionDetail": {
		opacity: "0.65",
		fontStyle: "normal",
		marginLeft: "0.5em"
	},
	".cm-completionInfo": {
		fontFamily: "system-ui, sans-serif",
		fontSize: "14px",
		maxWidth: "min(20rem, calc(100vw - 16px))",
		lineHeight: "1.45",
		padding: "6px 10px"
	}
});
/** Pause after the last key before the code is checked. */
var CheckDelayMs = 600;
/** The explanation with `code` in backticks as code. Built from text nodes: the message never becomes HTML. */
var renderExplanation = (text) => {
	const box = document.createElement("span");
	text.split("`").forEach((part, index) => {
		if (index % 2 === 0) {
			box.append(document.createTextNode(part));
			return;
		}
		const code = document.createElement("code");
		code.textContent = part;
		box.append(code);
	});
	return box;
};
/** Marks the line of a syntax error while the student types; `check` comes from the page (`useSyntaxCheck`). */
var syntaxMarks = (current) => [
	linter(async (view) => {
		const check = current();
		const code = view.state.doc.toString();
		if (code.trim() === "") return [];
		const found = check === void 0 ? Option.none() : await check(code);
		if (view.state.doc.toString() !== code) return [];
		return Option.match(found, {
			onNone: () => checkCode(code).filter((warning) => warning.to !== view.state.selection.main.head).map((warning) => ({
				from: warning.from,
				to: warning.to,
				severity: warning.severity,
				source: "Python",
				message: warning.message,
				renderMessage: () => renderExplanation(warning.message)
			})),
			onSome: (problem) => {
				const line = view.state.doc.line(Math.max(1, Math.min(problem.line, view.state.doc.lines)));
				return [{
					from: line.from,
					to: line.to,
					severity: "error",
					source: "Python",
					message: problem.explanation,
					renderMessage: () => renderExplanation(problem.explanation)
				}];
			}
		});
	}, { delay: CheckDelayMs }),
	lintGutter(),
	tooltips({ parent: document.body })
];
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
		onRun: props.onRun,
		check: props.check
	});
	useEffect(() => {
		callbacks.current = {
			onChange: props.onChange,
			onRun: props.onRun,
			check: props.check
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
					syntaxMarks(() => callbacks.current.check),
					autocompletion({
						override: [pythonHints],
						icons: true,
						activateOnTypingDelay: 80
					}),
					closeBrackets(),
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
						...closeBracketsKeymap,
						...completionKeymap,
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
// src/core/syntax-check.ts
/**
* Checks the code while the student types: a worker of its own compiles it (`Check`), the program does not run.
* The editor marks the line of a SyntaxError and explains it in Ukrainian, as after a run (`errors.ts`).
*/
var problemOf = (error) => Option.map(error.line, (line) => ({
	line,
	message: error.message,
	explanation: error.explanation
}));
var createSyntaxChecker = (createWorker) => {
	let worker = null;
	let lastId = 0;
	const waiting = /* @__PURE__ */ new Map();
	const answerAll = () => {
		for (const { resolve } of waiting.values()) resolve(Option.none());
		waiting.clear();
	};
	const onMessage = (message) => {
		if (message._tag === "LoadFailed") {
			worker?.terminate();
			worker = null;
			return answerAll();
		}
		if (message._tag !== "Checked") return;
		const asked = waiting.get(message.id);
		if (asked === void 0) return;
		waiting.delete(message.id);
		asked.resolve(message.traceback === "" ? Option.none() : problemOf(explainError(message.traceback, asked.code)));
	};
	const check = (code) => {
		lastId += 1;
		const id = lastId;
		answerAll();
		worker ??= createWorker(onMessage);
		const port = worker;
		return new Promise((resolve) => {
			waiting.set(id, {
				code,
				resolve
			});
			port.post({
				_tag: "Check",
				id,
				code
			});
		});
	};
	const dispose = () => {
		answerAll();
		worker?.terminate();
		worker = null;
	};
	return {
		check,
		dispose
	};
};
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
	Asking: () => "Програма чекає на твою відповідь у діалоговому вікні.",
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
						className: cn(c.kind === ChunkKinds.Input && "epy-console__input", c.value !== void 0 && `epy-console__${c.value}`),
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
/** Checks the code in a worker of its own while the student types (`CodeEditor` `check`). */
function useSyntaxCheck(worker) {
	const checker = useRef(null);
	useEffect(() => () => {
		checker.current?.dispose();
		checker.current = null;
	}, []);
	const [check] = useState(() => (code) => {
		checker.current ??= createSyntaxChecker(worker);
		return checker.current.check(code);
	});
	return check;
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
var canStop = (status) => isBusy(status) || status._tag === "WaitingInput" || status._tag === "Window" || status._tag === "Asking";
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
// src/ui/tk-dialogs.tsx
var ButtonLabels = {
	yes: "Так",
	no: "Ні",
	ok: "OK",
	cancel: "Скасувати",
	retry: "Повторити",
	abort: "Перервати",
	ignore: "Пропустити"
};
var iconOf = (icon) => Match.value(icon ?? "").pipe(Match.when("info", () => /* @__PURE__ */ jsx(Info, {
	"aria-hidden": true,
	className: "epy-tk-dialog__icon epy-tk-dialog__icon--info"
})), Match.when("warning", () => /* @__PURE__ */ jsx(TriangleAlert, {
	"aria-hidden": true,
	className: "epy-tk-dialog__icon epy-tk-dialog__icon--warning"
})), Match.when("error", () => /* @__PURE__ */ jsx(CircleX, {
	"aria-hidden": true,
	className: "epy-tk-dialog__icon epy-tk-dialog__icon--error"
})), Match.orElse(() => /* @__PURE__ */ jsx(CircleHelp, {
	"aria-hidden": true,
	className: "epy-tk-dialog__icon epy-tk-dialog__icon--info"
})));
function Frame(props) {
	return /* @__PURE__ */ jsx("div", {
		className: "epy-tk-backdrop",
		children: /* @__PURE__ */ jsxs("div", {
			role: "dialog",
			"aria-modal": "true",
			"aria-label": props.title === "" ? props.label : props.title,
			className: "epy-tk-dialog epy-tk-ask",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "epy-tk-title",
				children: [/* @__PURE__ */ jsx("span", {
					className: "epy-tk-title__text",
					children: props.title
				}), /* @__PURE__ */ jsx("button", {
					type: "button",
					"aria-label": "Закрити",
					onClick: props.onClose,
					className: "epy-tk-close",
					children: /* @__PURE__ */ jsx(X, {
						"aria-hidden": true,
						className: "epy-tk-close__icon"
					})
				})]
			}), props.children]
		})
	});
}
function Buttons(props) {
	return /* @__PURE__ */ jsxs("div", {
		className: "epy-tk-dialog__buttons",
		children: [/* @__PURE__ */ jsx("button", {
			type: "submit",
			disabled: props.disabled,
			className: "epy-tk-button",
			children: props.ok
		}), /* @__PURE__ */ jsx("button", {
			type: "button",
			onClick: props.onCancel,
			className: "epy-tk-button",
			children: "Скасувати"
		})]
	});
}
function Question(props) {
	const buttons = props.ask.buttons ?? ["ok"];
	const first = useRef(null);
	useEffect(() => {
		first.current?.focus({ preventScroll: true });
	}, [props.ask]);
	return /* @__PURE__ */ jsxs(Frame, {
		title: props.ask.title,
		label: "Питання програми",
		onClose: () => {
			props.onAnswer(null);
		},
		children: [/* @__PURE__ */ jsxs("div", {
			className: "epy-tk-dialog__body",
			children: [iconOf(props.ask.icon), /* @__PURE__ */ jsx("p", {
				className: "epy-tk-dialog__message",
				children: props.ask.message
			})]
		}), /* @__PURE__ */ jsx("div", {
			className: "epy-tk-dialog__buttons",
			children: buttons.map((b) => /* @__PURE__ */ jsx("button", {
				ref: b === (props.ask.default ?? buttons[0]) ? first : void 0,
				type: "button",
				onClick: () => {
					props.onAnswer(b);
				},
				className: "epy-tk-button",
				children: ButtonLabels[b] ?? b
			}, b))
		})]
	});
}
/** The error of a typed value, or "" (askinteger, askfloat: a number between `min` and `max`). */
var valueError = (ask, text) => {
	if (ask.number !== "int" && ask.number !== "float") return "";
	const clean = text.trim();
	if (!(ask.number === "int" ? /^[+-]?\d+$/.test(clean) : clean !== "" && Number.isFinite(Number(clean)))) return ask.number === "int" ? "Потрібне ціле число." : "Потрібне число.";
	const value = Number(clean);
	if (ask.min !== void 0 && ask.min !== null && value < ask.min) return `Число має бути не менше ${ask.min}.`;
	if (ask.max !== void 0 && ask.max !== null && value > ask.max) return `Число має бути не більше ${ask.max}.`;
	return "";
};
function Value(props) {
	const [text, setText] = useState(props.ask.initial ?? "");
	const [error, setError] = useState("");
	const submit = (e) => {
		e.preventDefault();
		const found = valueError(props.ask, text);
		setError(found);
		if (found === "") props.onAnswer(text);
	};
	return /* @__PURE__ */ jsx(Frame, {
		title: props.ask.title,
		label: "Програма питає",
		onClose: () => {
			props.onAnswer(null);
		},
		children: /* @__PURE__ */ jsxs("form", {
			onSubmit: submit,
			children: [/* @__PURE__ */ jsxs("label", {
				className: "epy-tk-ask__body",
				children: [
					/* @__PURE__ */ jsx("span", {
						className: "epy-tk-dialog__message",
						children: props.ask.message
					}),
					/* @__PURE__ */ jsx("input", {
						autoFocus: true,
						type: props.ask.secret === true ? "password" : "text",
						inputMode: props.ask.number === "int" ? "numeric" : props.ask.number === "float" ? "decimal" : void 0,
						value: text,
						onChange: (e) => {
							setText(e.target.value);
						},
						autoCapitalize: "off",
						autoCorrect: "off",
						spellCheck: false,
						className: "epy-tk-ask__field"
					}),
					error !== "" && /* @__PURE__ */ jsx("span", {
						role: "alert",
						className: "epy-tk-ask__error",
						children: error
					})
				]
			}), /* @__PURE__ */ jsx(Buttons, {
				ok: "OK",
				onCancel: () => {
					props.onAnswer(null);
				}
			})]
		})
	});
}
var HexColor = /^#[0-9a-f]{6}$/i;
function Color(props) {
	const initial = props.ask.initial ?? "";
	const [color, setColor] = useState(HexColor.test(initial) ? initial : "#000000");
	return /* @__PURE__ */ jsx(Frame, {
		title: props.ask.title === "" ? "Колір" : props.ask.title,
		label: "Вибір кольору",
		onClose: () => {
			props.onAnswer(null);
		},
		children: /* @__PURE__ */ jsxs("form", {
			onSubmit: (e) => {
				e.preventDefault();
				props.onAnswer(color.toLowerCase());
			},
			children: [/* @__PURE__ */ jsxs("label", {
				className: "epy-tk-ask__body epy-tk-ask__row",
				children: [
					/* @__PURE__ */ jsx("span", { children: "Колір:" }),
					/* @__PURE__ */ jsx("input", {
						type: "color",
						value: color,
						onChange: (e) => {
							setColor(e.target.value);
						},
						className: "epy-tk-ask__color"
					}),
					/* @__PURE__ */ jsx("code", { children: color })
				]
			}), /* @__PURE__ */ jsx(Buttons, {
				ok: "OK",
				onCancel: () => {
					props.onAnswer(null);
				}
			})]
		})
	});
}
/** "*.txt *.py" of `filetypes`: does the name fit? "*" and "*.*" fit all. */
var fitsPattern = (name, patterns) => patterns.split(/\s+/).filter((p) => p !== "").some((pattern) => {
	if (pattern === "*" || pattern === "*.*") return true;
	const extension = pattern.startsWith("*") ? pattern.slice(1) : pattern;
	return name.toLowerCase().endsWith(extension.toLowerCase());
});
/** The `accept` of a file field: ".txt,.py"; "" for all files. */
var acceptOf = (patterns) => {
	const extensions = patterns.split(/\s+/).filter((p) => /^\*\.[\w-]+$/.test(p)).map((p) => p.slice(1));
	return patterns.split(/\s+/).some((p) => p === "*" || p === "*.*") ? "" : extensions.join(",");
};
var readFile = (file) => file.arrayBuffer().then((buffer) => new Uint8Array(buffer));
function ProgramFiles(props) {
	if (props.files.length === 0) return /* @__PURE__ */ jsx("p", {
		className: "epy-tk-ask__empty",
		children: "У папці програми ще немає файлів."
	});
	return /* @__PURE__ */ jsx("div", {
		role: "listbox",
		"aria-label": "Файли програми",
		className: "epy-tk-ask__files",
		children: props.files.map((name) => /* @__PURE__ */ jsxs("div", {
			role: "option",
			"aria-selected": props.chosen.includes(name),
			tabIndex: 0,
			className: "epy-tk-ask__file",
			onClick: () => {
				props.onChoose(name);
			},
			onDoubleClick: () => props.onOpen?.(name),
			onKeyDown: (e) => {
				if (e.key === "Enter") props.onOpen?.(name);
			},
			children: [/* @__PURE__ */ jsx(FileText, {
				"aria-hidden": true,
				size: 14
			}), /* @__PURE__ */ jsx("span", { children: name })]
		}, name))
	});
}
function OpenFile(props) {
	const types = props.ask.filetypes ?? [];
	const [type, setType] = useState(0);
	const [chosen, setChosen] = useState([]);
	const [error, setError] = useState("");
	const upload = useRef(null);
	const multiple = props.ask.multiple === true;
	const patterns = types[type]?.[1] ?? "*";
	const files = (props.ask.files ?? []).filter((name) => fitsPattern(name, patterns));
	const answer = (names, given = []) => {
		if (names.length > 0) props.onAnswer(multiple ? names : names[0], given);
	};
	const fromComputer = async (list) => {
		const picked = Array.from(list ?? []);
		if (picked.some((f) => f.size > 2097152)) {
			setError(`Файл завеликий: можна до ${MaxFileBytes / 1024 / 1024} МБ.`);
			return;
		}
		const given = await Promise.all(picked.flatMap((f) => {
			const name = safeFileName(f.name);
			return name === null ? [] : [readFile(f).then((data) => ({
				name,
				data
			}))];
		}));
		if (given.length === 0) {
			setError("Цей файл не вдалося відкрити: спробуй інший.");
			return;
		}
		answer(given.map((f) => f.name), given);
	};
	return /* @__PURE__ */ jsx(Frame, {
		title: props.ask.title === "" ? "Відкрити" : props.ask.title,
		label: "Відкрити файл",
		onClose: () => {
			props.onAnswer(multiple ? [] : "");
		},
		children: /* @__PURE__ */ jsxs("form", {
			onSubmit: (e) => {
				e.preventDefault();
				answer(chosen);
			},
			children: [/* @__PURE__ */ jsxs("div", {
				className: "epy-tk-ask__body",
				children: [
					/* @__PURE__ */ jsx(ProgramFiles, {
						files,
						chosen,
						onChoose: (name) => {
							setChosen(multiple ? chosen.includes(name) ? chosen.filter((n) => n !== name) : [...chosen, name] : [name]);
						},
						onOpen: (name) => {
							answer([name]);
						}
					}),
					types.length > 1 && /* @__PURE__ */ jsxs("label", {
						className: "epy-tk-ask__row",
						children: [/* @__PURE__ */ jsx("span", { children: "Тип файлів:" }), /* @__PURE__ */ jsx("select", {
							value: type,
							onChange: (e) => {
								setType(Number(e.target.value));
							},
							children: types.map(([label, pattern], i) => /* @__PURE__ */ jsx("option", {
								value: i,
								children: `${label} (${pattern})`
							}, i))
						})]
					}),
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						className: "epy-tk-button epy-tk-ask__upload",
						onClick: () => upload.current?.click(),
						children: [/* @__PURE__ */ jsx(Upload, {
							"aria-hidden": true,
							size: 14
						}), " Файл з комп'ютера…"]
					}),
					/* @__PURE__ */ jsx("input", {
						ref: upload,
						type: "file",
						hidden: true,
						multiple,
						accept: acceptOf(patterns) || void 0,
						onChange: (e) => {
							fromComputer(e.target.files);
						}
					}),
					error !== "" && /* @__PURE__ */ jsx("span", {
						role: "alert",
						className: "epy-tk-ask__error",
						children: error
					})
				]
			}), /* @__PURE__ */ jsx(Buttons, {
				ok: "Відкрити",
				disabled: chosen.length === 0,
				onCancel: () => {
					props.onAnswer(multiple ? [] : "");
				}
			})]
		})
	});
}
/** The name of a saved file with the default extension, or null when the name is not good. */
var saveName = (text, extension) => {
	const name = safeFileName(text);
	if (name === null) return null;
	if (extension === "" || name.includes(".")) return name;
	return name + (extension.startsWith(".") ? extension : `.${extension}`);
};
function SaveFile(props) {
	const [text, setText] = useState(props.ask.initial ?? "");
	const [error, setError] = useState("");
	const extension = props.ask.extension ?? "";
	return /* @__PURE__ */ jsx(Frame, {
		title: props.ask.title === "" ? "Зберегти як" : props.ask.title,
		label: "Зберегти файл",
		onClose: () => {
			props.onAnswer("");
		},
		children: /* @__PURE__ */ jsxs("form", {
			onSubmit: (e) => {
				e.preventDefault();
				const name = saveName(text, extension);
				if (name === null) {
					setError("Напиши назву файлу без папок, наприклад «вірш.txt».");
					return;
				}
				props.onAnswer(name);
			},
			children: [/* @__PURE__ */ jsxs("div", {
				className: "epy-tk-ask__body",
				children: [
					/* @__PURE__ */ jsx(ProgramFiles, {
						files: props.ask.files ?? [],
						chosen: [text],
						onChoose: setText
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "epy-tk-ask__row",
						children: [/* @__PURE__ */ jsx("span", { children: "Назва файлу:" }), /* @__PURE__ */ jsx("input", {
							autoFocus: true,
							value: text,
							onChange: (e) => {
								setText(e.target.value);
							},
							autoCapitalize: "off",
							autoCorrect: "off",
							spellCheck: false,
							className: "epy-tk-ask__field"
						})]
					}),
					error !== "" && /* @__PURE__ */ jsx("span", {
						role: "alert",
						className: "epy-tk-ask__error",
						children: error
					})
				]
			}), /* @__PURE__ */ jsx(Buttons, {
				ok: "Зберегти",
				onCancel: () => {
					props.onAnswer("");
				}
			})]
		})
	});
}
/** The dialog that waits for the student. The parent gives a new `key` for each question. */
function AskDialog(props) {
	return Match.value(props.ask.kind).pipe(Match.when(TkAskKinds.Question, () => /* @__PURE__ */ jsx(Question, { ...props })), Match.when(TkAskKinds.Value, () => /* @__PURE__ */ jsx(Value, { ...props })), Match.when(TkAskKinds.Color, () => /* @__PURE__ */ jsx(Color, { ...props })), Match.when(TkAskKinds.Open, () => /* @__PURE__ */ jsx(OpenFile, { ...props })), Match.when(TkAskKinds.Save, () => /* @__PURE__ */ jsx(SaveFile, { ...props })), Match.exhaustive);
}
var RevokeAfterMs = 1e4;
/** Gives the bytes of a file to the browser as a download: the page never opens the file. */
var download = (file) => {
	const blob = new Blob([new Uint8Array(file.data)], { type: "application/octet-stream" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = safeFileName(file.name) ?? "file.txt";
	link.rel = "noopener";
	link.click();
	setTimeout(() => {
		URL.revokeObjectURL(url);
	}, RevokeAfterMs);
};
/** Files that the program saved: the student downloads them to the computer. */
function Downloads(props) {
	if (props.files.length === 0) return null;
	return /* @__PURE__ */ jsx("ul", {
		className: "epy-tk-downloads",
		"aria-label": "Збережені файли",
		children: props.files.map((file) => /* @__PURE__ */ jsxs("li", {
			className: "epy-tk-downloads__item",
			children: [
				/* @__PURE__ */ jsx(FileText, {
					"aria-hidden": true,
					size: 16
				}),
				/* @__PURE__ */ jsxs("span", {
					className: "epy-tk-downloads__text",
					children: ["Програма зберегла файл ", /* @__PURE__ */ jsx("b", { children: file.name })]
				}),
				/* @__PURE__ */ jsxs("button", {
					type: "button",
					className: "epy-tk-button epy-tk-downloads__button",
					onClick: () => {
						download(file);
					},
					children: [/* @__PURE__ */ jsx(Download, {
						"aria-hidden": true,
						size: 14
					}), " Завантажити"]
				}),
				/* @__PURE__ */ jsx("button", {
					type: "button",
					"aria-label": `Сховати ${file.name}`,
					className: "epy-tk-downloads__close",
					onClick: () => {
						props.onDismiss(file.name);
					},
					children: /* @__PURE__ */ jsx(X, {
						"aria-hidden": true,
						size: 14
					})
				})
			]
		}, file.name))
	});
}
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
// src/ui/tk-field.ts
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
	userSelect: "none",
	...w.cursor === "" ? {} : { cursor: w.cursor }
});
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
	textAlign: w.justify === "right" ? "right" : w.justify === "center" ? "center" : "left",
	...w.caret === "" ? {} : { caretColor: w.caret },
	...w.cursor === "" ? {} : { cursor: w.cursor }
});
// src/ui/tk-text.tsx
/** The attribute of the element that a Scrollbar scrolls (`tk-lists.tsx`). */
var TkScrollAttribute = "data-tk-scroll";
/** Places in the text: Python counts characters (code points), the browser counts UTF-16 units. */
var toUnits = (text, chars) => Array.from(text).slice(0, chars).join("").length;
var toChars = (text, units) => Array.from(text.slice(0, units)).length;
/** Is the widget scrolled by a Scrollbar of the program? Then its own scroll bar is hidden. */
var scrolledByBar = (scene, id) => scene.widgets.some((w) => Option.match(w.scroll, {
	onNone: () => false,
	onSome: (s) => s.target === id
}));
/** "italic bold 16px/1.2 …": the slant and the weight of a CSS font. */
var slantAndWeight = (font) => {
	const words = font.split(" ");
	return {
		fontStyle: words[0] === "italic" ? "italic" : "normal",
		fontWeight: words[1] === "bold" ? "bold" : "normal"
	};
};
/** The text cut at the edges of the tags and of the selection. */
var piecesOf = (text, parts, selection) => {
	const chars = Array.from(text);
	const cuts = /* @__PURE__ */ new Set([0, chars.length]);
	for (const p of parts) {
		cuts.add(Math.min(p[0], chars.length));
		cuts.add(Math.min(p[1], chars.length));
	}
	if (selection !== null) {
		cuts.add(Math.min(selection[0], chars.length));
		cuts.add(Math.min(selection[1], chars.length));
	}
	const sorted = [...cuts].toSorted((a, b) => a - b);
	return sorted.slice(0, -1).map((start, i) => {
		const end = sorted[i + 1] ?? start;
		return {
			text: chars.slice(start, end).join(""),
			part: parts.find((p) => p[0] <= start && end <= p[1]) ?? null,
			selected: selection !== null && selection[0] <= start && end <= selection[1] && selection[0] < selection[1]
		};
	});
};
function Copy(props) {
	return /* @__PURE__ */ jsxs(Fragment, { children: [piecesOf(props.text, props.parts, props.selection).map((piece, i) => {
		const p = piece.part;
		const style = {
			...p === null || p[4] === "" ? {} : props.fullFont ? { font: p[4] } : slantAndWeight(p[4]),
			color: p !== null && p[2] !== "" ? p[2] : void 0,
			background: piece.selected ? props.selectionColor : p !== null && p[3] !== "" ? p[3] : void 0,
			textDecoration: [p?.[5] === true ? "underline" : "", p?.[6] === true ? "line-through" : ""].join(" ").trim() || void 0
		};
		return /* @__PURE__ */ jsx("span", {
			style,
			children: piece.text
		}, i);
	}), "​"] });
}
var wrapping = (w) => ({
	whiteSpace: w.textwrap === "none" ? "pre" : "pre-wrap",
	wordBreak: w.textwrap === "char" ? "break-all" : "normal",
	overflowWrap: w.textwrap === "none" ? "normal" : "anywhere"
});
function TextView(props) {
	const tk = useTk();
	const events = useWidgetEvents(props.widget.id);
	const w = props.widget;
	const [value, setValue] = useFieldText(w);
	const field = useRef(null);
	const copy = useRef(null);
	const [focused, setFocused] = useState(false);
	const sent = useRef("");
	const style = Option.getOrNull(w.textStyle);
	const parts = style?.parts ?? [];
	const selectionRev = useRef(style?.selectionRev ?? 0);
	const nativeBar = !scrolledByBar(tk.scene, w.id);
	useEffect(() => {
		const element = field.current;
		if (style === null || element === null || style.selectionRev === selectionRev.current) return;
		selectionRev.current = style.selectionRev;
		element.setSelectionRange(toUnits(element.value, style.selection[0]), toUnits(element.value, style.selection[1]));
	}, [style]);
	const box = {
		boxSizing: "content-box",
		padding: `${w.pady}px ${w.padx}px`,
		width: `${Math.max(1, w.width)}ch`,
		height: `${Math.max(1, w.height) * LineHeight}em`,
		font: w.font,
		...w.caret === "" ? {} : { caretColor: w.caret },
		...wrapping(w),
		scrollbarGutter: nativeBar ? "stable" : void 0,
		scrollbarWidth: nativeBar ? void 0 : "none"
	};
	const outer = {
		position: "relative",
		display: "flex",
		background: w.bg,
		color: w.fg,
		...border(w.relief, w.bd),
		margin: w.highlight,
		font: w.font,
		...props.layout
	};
	const selection = style !== null && !focused ? style.selection : null;
	const selectionColor = style?.selectionColor ?? "var(--tk-accent)";
	if (w.state === "disabled") return /* @__PURE__ */ jsx("div", {
		[TkIdAttribute]: w.id,
		...events,
		style: outer,
		children: /* @__PURE__ */ jsx("div", {
			[TkScrollAttribute]: w.id,
			role: "textbox",
			"aria-readonly": true,
			"aria-label": "Текстове поле програми",
			style: {
				...box,
				flex: "1 1 auto",
				overflow: "auto"
			},
			children: /* @__PURE__ */ jsx(Copy, {
				text: value,
				parts,
				selection,
				selectionColor,
				fullFont: true
			})
		})
	});
	const coloured = parts.length > 0 || selection !== null && selection[0] < selection[1];
	const sendSelection = (element) => {
		const text = element.value;
		const start = toChars(text, element.selectionStart);
		const end = toChars(text, element.selectionEnd);
		const caret = element.selectionDirection === "backward" ? start : end;
		const key = `${start} ${end} ${caret}`;
		if (!tk.active || key === sent.current) return;
		sent.current = key;
		tk.send({
			_tag: "Selection",
			widget: w.id,
			start,
			end,
			caret
		});
	};
	const sendClipboard = (element) => {
		if (tk.active) tk.send({
			_tag: "Clipboard",
			text: element.value.slice(element.selectionStart, element.selectionEnd)
		});
	};
	return /* @__PURE__ */ jsxs("div", {
		[TkIdAttribute]: w.id,
		...events,
		style: outer,
		children: [coloured && /* @__PURE__ */ jsx("div", {
			ref: copy,
			"aria-hidden": true,
			style: {
				...box,
				position: "absolute",
				inset: 0,
				overflow: "hidden",
				pointerEvents: "none"
			},
			children: /* @__PURE__ */ jsx(Copy, {
				text: value,
				parts,
				selection,
				selectionColor,
				fullFont: false
			})
		}), /* @__PURE__ */ jsx("textarea", {
			ref: field,
			[TkScrollAttribute]: w.id,
			"aria-label": "Текстове поле програми",
			value,
			readOnly: !tk.active,
			spellCheck: false,
			onChange: (e) => {
				setValue(e.target.value);
				tk.send({
					_tag: "Edit",
					widget: w.id,
					text: e.target.value
				});
			},
			onSelect: (e) => {
				sendSelection(e.currentTarget);
			},
			onCopy: (e) => {
				sendClipboard(e.currentTarget);
			},
			onCut: (e) => {
				sendClipboard(e.currentTarget);
			},
			onFocus: () => {
				setFocused(true);
			},
			onBlur: () => {
				setFocused(false);
			},
			onScroll: (e) => {
				if (copy.current !== null) {
					copy.current.scrollTop = e.currentTarget.scrollTop;
					copy.current.scrollLeft = e.currentTarget.scrollLeft;
				}
			},
			style: {
				...box,
				position: "relative",
				flex: "1 1 auto",
				minWidth: 0,
				margin: 0,
				border: 0,
				outline: "none",
				resize: "none",
				background: "transparent",
				color: coloured ? "transparent" : w.fg,
				caretColor: w.fg
			}
		})]
	});
}
// src/ui/tk-lists.tsx
/** The rows chosen after a click on `row`, as Tk chooses them in each `selectmode`. */
var chooseRows = (mode, chosen, row, toggle, range, anchor) => {
	if (mode === TkListModes.Multiple) return chosen.includes(row) ? chosen.filter((r) => r !== row) : [...chosen, row].toSorted((a, b) => a - b);
	if (mode === TkListModes.Extended && range) {
		const from = Math.min(anchor, row);
		return Array.from({ length: Math.abs(row - anchor) + 1 }, (_, i) => from + i);
	}
	if (mode === TkListModes.Extended && toggle) return chosen.includes(row) ? chosen.filter((r) => r !== row) : [...chosen, row].toSorted((a, b) => a - b);
	return [row];
};
function ListboxView(props) {
	const tk = useTk();
	const events = useWidgetEvents(props.widget.id);
	const w = props.widget;
	const list = Option.getOrNull(w.list);
	const rows = list?.rows ?? [];
	const chosen = list?.chosen ?? [];
	const disabled = w.state === "disabled";
	const pick = (items) => {
		if (!disabled && tk.active) tk.send({
			_tag: "Pick",
			widget: w.id,
			items
		});
	};
	const click = (row, e) => {
		pick(chooseRows(list?.mode ?? TkListModes.Browse, chosen, row, e.ctrlKey || e.metaKey, e.shiftKey, list?.active ?? 0));
	};
	const key = (e) => {
		if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
		e.preventDefault();
		const now = chosen.at(-1) ?? list?.active ?? -1;
		const next = Math.max(0, Math.min(rows.length - 1, now + (e.key === "ArrowDown" ? 1 : -1)));
		if (rows.length > 0 && next !== now) pick([next]);
	};
	return /* @__PURE__ */ jsx("div", {
		[TkIdAttribute]: w.id,
		...events,
		style: {
			display: "flex",
			...border(w.relief, w.bd),
			margin: w.highlight,
			background: w.bg,
			...props.layout
		},
		children: /* @__PURE__ */ jsx("div", {
			[TkScrollAttribute]: w.id,
			role: "listbox",
			tabIndex: disabled ? -1 : 0,
			"aria-label": "Список програми",
			"aria-multiselectable": list?.mode === TkListModes.Multiple || list?.mode === TkListModes.Extended,
			"aria-disabled": disabled,
			onKeyDown: key,
			style: {
				boxSizing: "content-box",
				flex: "1 1 auto",
				width: `${Math.max(1, w.width)}ch`,
				height: `${Math.max(1, w.height) * LineHeight}em`,
				overflow: "auto",
				font: w.font,
				color: disabled ? "var(--tk-shadow)" : w.fg,
				scrollbarWidth: scrolledByBar(tk.scene, w.id) ? "none" : void 0,
				outline: "none",
				userSelect: "none"
			},
			children: rows.map(([text, fg, bg], i) => {
				const on = chosen.includes(i);
				return /* @__PURE__ */ jsx("div", {
					role: "option",
					"aria-selected": on,
					onClick: (e) => {
						click(i, e);
					},
					style: {
						padding: "0 2px",
						whiteSpace: "pre",
						lineHeight: LineHeight,
						cursor: disabled ? "default" : "pointer",
						background: on ? list?.selectBg : bg === "" ? void 0 : bg,
						color: on ? list?.selectFg : fg === "" ? void 0 : fg
					},
					children: text === "" ? "\xA0" : text
				}, i);
			})
		})
	});
}
var arrowButton = {
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	width: 16,
	padding: 0,
	border: "1px solid var(--tk-shadow)",
	background: "var(--tk-face)",
	color: "var(--tk-text)"
};
/** Entry of a Spinbox or a Combobox. */
function FieldInput(props) {
	const tk = useTk();
	const w = props.widget;
	const [value, setValue] = useFieldText(w);
	return /* @__PURE__ */ jsx("input", {
		"aria-label": "Поле програми",
		value,
		disabled: w.state === "disabled",
		readOnly: props.readOnly || !tk.active,
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
			border: 0,
			margin: 0,
			width: `${Math.max(1, w.width)}ch`,
			minWidth: 0,
			flex: "1 1 auto"
		}
	});
}
function SpinboxView(props) {
	const tk = useTk();
	const events = useWidgetEvents(props.widget.id);
	const w = props.widget;
	const spin = (up) => {
		if (w.state !== "disabled" && tk.active) tk.send({
			_tag: "Spin",
			widget: w.id,
			up
		});
	};
	return /* @__PURE__ */ jsxs("div", {
		[TkIdAttribute]: w.id,
		...events,
		style: {
			display: "flex",
			...border(w.relief, w.bd),
			margin: w.highlight,
			background: w.bg,
			...props.layout
		},
		children: [/* @__PURE__ */ jsx(FieldInput, {
			widget: w,
			readOnly: w.state === "readonly"
		}), /* @__PURE__ */ jsxs("div", {
			style: {
				display: "flex",
				flexDirection: "column"
			},
			children: [/* @__PURE__ */ jsx("button", {
				type: "button",
				"aria-label": "Більше",
				onClick: () => {
					spin(true);
				},
				style: {
					...arrowButton,
					flex: 1
				},
				children: /* @__PURE__ */ jsx(ChevronUp, {
					"aria-hidden": true,
					size: 10
				})
			}), /* @__PURE__ */ jsx("button", {
				type: "button",
				"aria-label": "Менше",
				onClick: () => {
					spin(false);
				},
				style: {
					...arrowButton,
					flex: 1
				},
				children: /* @__PURE__ */ jsx(ChevronDown, {
					"aria-hidden": true,
					size: 10
				})
			})]
		})]
	});
}
/** Closes a drop-down list after a click outside of it or Escape. */
var useOutsideClose = (open, close, inside) => {
	useEffect(() => {
		if (!open) return;
		const down = (e) => {
			const target = e.target;
			if (target instanceof Node && inside().some((el) => el?.contains(target) === true)) return;
			close();
		};
		const key = (e) => {
			if (e.key === "Escape") close();
		};
		document.addEventListener("pointerdown", down, true);
		document.addEventListener("keydown", key);
		return () => {
			document.removeEventListener("pointerdown", down, true);
			document.removeEventListener("keydown", key);
		};
	}, [
		open,
		close,
		inside
	]);
};
function ComboboxView(props) {
	const tk = useTk();
	const events = useWidgetEvents(props.widget.id);
	const w = props.widget;
	const [open, setOpen] = useState(false);
	const box = useRef(null);
	const list = Option.getOrNull(w.list);
	const close = useRef(() => {
		setOpen(false);
	}).current;
	const inside = useRef(() => [box.current]).current;
	useOutsideClose(open, close, inside);
	const disabled = w.state === "disabled" || !tk.active;
	return /* @__PURE__ */ jsxs("div", {
		ref: box,
		[TkIdAttribute]: w.id,
		...events,
		style: {
			position: "relative",
			display: "flex",
			...border(w.relief, w.bd),
			margin: w.highlight,
			background: w.bg,
			...props.layout
		},
		children: [
			/* @__PURE__ */ jsx(FieldInput, {
				widget: w,
				readOnly: w.state === "readonly"
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				"aria-label": "Відкрити список",
				"aria-expanded": open,
				disabled,
				onClick: () => {
					setOpen(!open);
				},
				style: {
					...arrowButton,
					border: 0
				},
				children: /* @__PURE__ */ jsx(ChevronDown, {
					"aria-hidden": true,
					size: 12
				})
			}),
			open && /* @__PURE__ */ jsx("div", {
				role: "listbox",
				"aria-label": "Значення",
				className: "epy-tk-popup",
				style: {
					position: "absolute",
					top: "100%",
					left: 0,
					right: 0,
					maxHeight: "12em",
					overflow: "auto"
				},
				children: (list?.rows ?? []).map(([text], i) => /* @__PURE__ */ jsx("div", {
					role: "option",
					"aria-selected": list?.chosen.includes(i) === true,
					className: "epy-tk-popup__item",
					onClick: () => {
						setOpen(false);
						tk.send({
							_tag: "Pick",
							widget: w.id,
							items: [i]
						});
					},
					children: text === "" ? "\xA0" : text
				}, i))
			})
		]
	});
}
/** Line of a scroll arrow, in pixels. */
var ScrollStep = 16;
var RefreshMs = 250;
var MinThumb = .05;
var viewOf = (el, vertical) => {
	const size = vertical ? el.scrollHeight : el.scrollWidth;
	const shown = vertical ? el.clientHeight : el.clientWidth;
	const at = vertical ? el.scrollTop : el.scrollLeft;
	if (size <= 0 || shown >= size) return {
		first: 0,
		last: 1
	};
	return {
		first: at / size,
		last: (at + shown) / size
	};
};
function ScrollbarView(props) {
	const events = useWidgetEvents(props.widget.id);
	const w = props.widget;
	const scroll = Option.getOrNull(w.scroll);
	const vertical = scroll?.vertical ?? true;
	const target = scroll?.target ?? 0;
	const self = useRef(null);
	const [view, setView] = useState({
		first: 0,
		last: 1
	});
	const element = () => {
		const found = (self.current?.closest(".epy-tk-windows"))?.querySelector(`[${TkScrollAttribute}="${target}"]`);
		return found instanceof HTMLElement ? found : null;
	};
	useEffect(() => {
		const el = element();
		if (el === null) return;
		const update = () => {
			const next = viewOf(el, vertical);
			setView((old) => old.first === next.first && old.last === next.last ? old : next);
		};
		update();
		el.addEventListener("scroll", update);
		const timer = setInterval(update, RefreshMs);
		return () => {
			el.removeEventListener("scroll", update);
			clearInterval(timer);
		};
	}, [target, vertical]);
	const by = (pixels) => {
		const el = element();
		if (el !== null) el.scrollBy(vertical ? { top: pixels } : { left: pixels });
	};
	const drag = (e) => {
		const el = element();
		const track = e.currentTarget.parentElement;
		if (el === null || track === null) return;
		e.preventDefault();
		e.stopPropagation();
		const start = vertical ? e.clientY : e.clientX;
		const from = vertical ? el.scrollTop : el.scrollLeft;
		const trackSize = vertical ? track.clientHeight : track.clientWidth;
		const size = vertical ? el.scrollHeight : el.scrollWidth;
		const move = (m) => {
			const delta = ((vertical ? m.clientY : m.clientX) - start) * (size / Math.max(1, trackSize));
			if (vertical) el.scrollTop = from + delta;
			else el.scrollLeft = from + delta;
		};
		const up = () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
		};
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
	};
	const thickness = Math.max(8, w.width);
	const length = Math.max(MinThumb, view.last - view.first);
	const thumb = vertical ? {
		position: "absolute",
		left: 1,
		right: 1,
		top: `${view.first * 100}%`,
		height: `${length * 100}%`
	} : {
		position: "absolute",
		top: 1,
		bottom: 1,
		left: `${view.first * 100}%`,
		width: `${length * 100}%`
	};
	const Back = vertical ? ChevronUp : ChevronLeft;
	const Forward = vertical ? ChevronDown : ChevronRight;
	return /* @__PURE__ */ jsxs("div", {
		ref: self,
		[TkIdAttribute]: w.id,
		...events,
		role: "scrollbar",
		"aria-orientation": vertical ? "vertical" : "horizontal",
		"aria-valuenow": Math.round(view.first * 100),
		"aria-valuemin": 0,
		"aria-valuemax": 100,
		style: {
			display: "flex",
			flexDirection: vertical ? "column" : "row",
			[vertical ? "width" : "height"]: thickness,
			[vertical ? "minHeight" : "minWidth"]: thickness * 3,
			background: scroll?.trough === "" || scroll === null ? "var(--tk-face)" : scroll.trough,
			margin: w.highlight,
			...props.layout
		},
		children: [
			/* @__PURE__ */ jsx("button", {
				type: "button",
				"aria-label": "Назад",
				tabIndex: -1,
				onClick: () => {
					by(-16);
				},
				style: {
					...arrowButton,
					width: thickness,
					height: thickness,
					flex: "none"
				},
				children: /* @__PURE__ */ jsx(Back, {
					"aria-hidden": true,
					size: 10
				})
			}),
			/* @__PURE__ */ jsx("div", {
				style: {
					position: "relative",
					flex: "1 1 auto"
				},
				onPointerDown: (e) => {
					const el = element();
					if (el === null || e.target !== e.currentTarget) return;
					const box = e.currentTarget.getBoundingClientRect();
					const at = vertical ? (e.clientY - box.top) / box.height : (e.clientX - box.left) / box.width;
					const page = vertical ? el.clientHeight : el.clientWidth;
					by(at < view.first ? -page : page);
				},
				children: view.last - view.first < 1 && /* @__PURE__ */ jsx("div", {
					onPointerDown: drag,
					style: {
						...thumb,
						background: "var(--tk-shadow)",
						borderRadius: 2,
						touchAction: "none"
					}
				})
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				"aria-label": "Вперед",
				tabIndex: -1,
				onClick: () => {
					by(ScrollStep);
				},
				style: {
					...arrowButton,
					width: thickness,
					height: thickness,
					flex: "none"
				},
				children: /* @__PURE__ */ jsx(Forward, {
					"aria-hidden": true,
					size: 10
				})
			})
		]
	});
}
// src/ui/tk-menus.tsx
var entriesOf = (scene, menu) => {
	const found = scene.widgets.find((w) => w.id === menu);
	return found === void 0 ? [] : Option.match(found.menu, {
		onNone: () => [],
		onSome: (m) => m.entries
	});
};
var MenuWidth = 180;
/** Keeps a menu inside the viewport. */
var inView = (place) => ({
	left: Math.max(4, Math.min(place.left, window.innerWidth - MenuWidth - 4)),
	top: Math.max(4, place.top)
});
/** A drop-down menu. Cascades open to the right; the menu closes after a click outside or Escape. */
function MenuList(props) {
	const tk = useTk();
	const list = useRef(null);
	const [sub, setSub] = useState(null);
	const depth = props.depth ?? 0;
	const inside = useCallback(() => [list.current, ...Array.from(document.querySelectorAll(".epy-tk-menu"))], []);
	useOutsideClose(depth === 0, props.onClose, inside);
	const entries = entriesOf(tk.scene, props.menu);
	const place = inView(props.place);
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("div", {
		ref: list,
		role: "menu",
		className: "epy-tk-popup epy-tk-menu",
		style: {
			position: "fixed",
			left: place.left,
			top: place.top,
			minWidth: 140,
			zIndex: 20 + depth
		},
		children: entries.map((entry, i) => {
			if (entry.type === TkMenuEntryTypes.Separator) return /* @__PURE__ */ jsx("div", {
				role: "separator",
				className: "epy-tk-menu__separator"
			}, i);
			const cascade = entry.type === TkMenuEntryTypes.Cascade;
			const role = entry.type === TkMenuEntryTypes.Check ? "menuitemcheckbox" : entry.type === TkMenuEntryTypes.Radio ? "menuitemradio" : "menuitem";
			return /* @__PURE__ */ jsxs("button", {
				type: "button",
				role,
				"aria-checked": role === "menuitem" ? void 0 : entry.checked,
				"aria-haspopup": cascade ? "menu" : void 0,
				disabled: !entry.enabled || !tk.active,
				className: "epy-tk-popup__item epy-tk-menu__item",
				style: entry.fg === "" ? void 0 : { color: entry.fg },
				onClick: (e) => {
					if (cascade) {
						const box = e.currentTarget.getBoundingClientRect();
						setSub(sub?.menu === entry.submenu ? null : {
							menu: entry.submenu,
							place: {
								left: box.right,
								top: box.top
							}
						});
						return;
					}
					props.onClose();
					tk.send({
						_tag: "MenuItem",
						widget: props.menu,
						index: i
					});
				},
				children: [
					/* @__PURE__ */ jsx("span", {
						className: "epy-tk-menu__mark",
						"aria-hidden": true,
						children: entry.checked && (entry.type === TkMenuEntryTypes.Radio ? "●" : /* @__PURE__ */ jsx(Check, { size: 12 }))
					}),
					/* @__PURE__ */ jsx("span", {
						className: "epy-tk-menu__label",
						children: entry.label
					}),
					/* @__PURE__ */ jsx("span", {
						className: "epy-tk-menu__accelerator",
						children: cascade ? /* @__PURE__ */ jsx(ChevronRight, {
							"aria-hidden": true,
							size: 12
						}) : entry.accelerator
					})
				]
			}, i);
		})
	}), sub !== null && sub.menu !== 0 && /* @__PURE__ */ jsx(MenuList, {
		menu: sub.menu,
		place: sub.place,
		onClose: props.onClose,
		depth: depth + 1
	})] });
}
/** The menu bar under the title of a window. */
function MenuBar(props) {
	const tk = useTk();
	const [open, setOpen] = useState(null);
	const close = useCallback(() => {
		setOpen(null);
	}, []);
	const entries = entriesOf(tk.scene, props.menu);
	return /* @__PURE__ */ jsxs("div", {
		role: "menubar",
		className: "epy-tk-menubar",
		children: [entries.map((entry, i) => {
			if (entry.type === TkMenuEntryTypes.Separator) return null;
			const cascade = entry.type === TkMenuEntryTypes.Cascade;
			return /* @__PURE__ */ jsx("button", {
				type: "button",
				role: "menuitem",
				"aria-haspopup": cascade ? "menu" : void 0,
				"aria-expanded": cascade ? open?.index === i : void 0,
				disabled: !entry.enabled || !tk.active,
				className: "epy-tk-menubar__item",
				onClick: (e) => {
					if (!cascade) {
						tk.send({
							_tag: "MenuItem",
							widget: props.menu,
							index: i
						});
						return;
					}
					const box = e.currentTarget.getBoundingClientRect();
					setOpen(open?.index === i ? null : {
						index: i,
						place: {
							left: box.left,
							top: box.bottom
						}
					});
				},
				children: entry.label
			}, i);
		}), open !== null && /* @__PURE__ */ jsx(MenuList, {
			menu: entries[open.index]?.submenu ?? 0,
			place: open.place,
			onClose: close
		})]
	});
}
/** Menus that the program opened with `tk_popup(x, y)`: at the place on the "screen" of their window. */
function PopupMenus(props) {
	const tk = useTk();
	const [closed, setClosed] = useState(/* @__PURE__ */ new Map());
	return /* @__PURE__ */ jsx(Fragment, { children: tk.scene.widgets.flatMap((w) => {
		const posted = Option.match(w.menu, {
			onNone: () => null,
			onSome: (m) => m.posted
		});
		if (posted === null || closed.get(w.id) === posted[2]) return [];
		const place = Option.match(windowOf(tk.scene, w.id), {
			onNone: () => null,
			onSome: (window) => {
				const client = props.root?.querySelector(`[${TkIdAttribute}="${window.id}"]`)?.getBoundingClientRect();
				return client === void 0 ? null : {
					left: client.left + posted[0] - window.x,
					top: client.top + posted[1] - window.y
				};
			}
		});
		if (place === null) return [];
		const close = () => {
			setClosed(new Map([...closed, [w.id, posted[2]]]));
		};
		return [/* @__PURE__ */ jsx(MenuList, {
			menu: w.id,
			place,
			onClose: close
		}, `${w.id}-${posted[2]}`)];
	}) });
}
function MenubuttonView(props) {
	const tk = useTk();
	const events = useWidgetEvents(props.widget.id);
	const w = props.widget;
	const [place, setPlace] = useState(null);
	const close = useCallback(() => {
		setPlace(null);
	}, []);
	const disabled = w.state === "disabled" || !tk.active || w.opens === 0;
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("button", {
		type: "button",
		[TkIdAttribute]: w.id,
		...events,
		"aria-haspopup": "menu",
		"aria-expanded": place !== null,
		"aria-disabled": disabled,
		onClick: (e) => {
			if (disabled) return;
			const box = e.currentTarget.getBoundingClientRect();
			setPlace(place === null ? {
				left: box.left,
				top: box.bottom
			} : null);
		},
		style: {
			...textBox(w),
			gap: 6,
			cursor: disabled ? "default" : "pointer",
			...props.layout
		},
		children: [/* @__PURE__ */ jsx("span", { children: w.text }), w.indicator && /* @__PURE__ */ jsx(ChevronDown, {
			"aria-hidden": true,
			size: 12,
			style: { flex: "none" }
		})]
	}), place !== null && /* @__PURE__ */ jsx(MenuList, {
		menu: w.opens,
		place,
		onClose: close
	})] });
}
// src/ui/tk-image.tsx
var Base64 = /^[A-Za-z0-9+/]*={0,2}$/;
var baseUrl = (image) => image.base !== null && Base64.test(image.base.data) ? `data:${image.base.mime};base64,${image.base.data}` : null;
var loadPicture = (url) => new Promise((resolve) => {
	const picture = new Image();
	picture.onload = () => {
		resolve(picture);
	};
	picture.onerror = () => {
		resolve(null);
	};
	picture.src = url;
});
/** Rows of runs from `_images.py`: colour, count, colour, count… An empty colour is transparent. */
var paintPixels = (context, pixels) => {
	pixels.forEach((row, y) => {
		let x = 0;
		for (let i = 0; i + 1 < row.length; i += 2) {
			const color = row[i];
			const count = Number(row[i + 1]);
			if (typeof color === "string" && color !== "") {
				context.fillStyle = color;
				context.fillRect(x, y, count, 1);
			}
			x += count;
		}
	});
};
var drawImage = async (image) => {
	const base = baseUrl(image);
	if (image.pixels === null) return base;
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, image.width);
	canvas.height = Math.max(1, image.height);
	const context = canvas.getContext("2d");
	if (context === null) return base;
	const picture = base === null ? null : await loadPicture(base);
	if (picture !== null) context.drawImage(picture, 0, 0);
	paintPixels(context, image.pixels);
	return canvas.toDataURL("image/png");
};
/** The address of a picture for `<img>` or SVG `<image>`; null while it is drawn or when there is none. */
var useImageUrl = (id) => {
	const tk = useTk();
	const image = id === 0 ? void 0 : tk.images.get(id);
	const [url, setUrl] = useState(null);
	useEffect(() => {
		let live = true;
		if (image === void 0) {
			setUrl(null);
			return;
		}
		drawImage(image).then((found) => {
			if (live) setUrl(found);
		});
		return () => {
			live = false;
		};
	}, [image]);
	return {
		url,
		image
	};
};
/** A picture in a Label or a Button. */
function TkPicture(props) {
	const { url, image } = useImageUrl(props.id);
	if (image === void 0) return null;
	const size = {
		width: image.shownWidth,
		height: image.shownHeight
	};
	if (url === null) return /* @__PURE__ */ jsx("span", {
		"aria-hidden": true,
		style: {
			display: "inline-block",
			flex: "none",
			...size
		}
	});
	return /* @__PURE__ */ jsx("img", {
		src: url,
		alt: "",
		draggable: false,
		style: {
			display: "block",
			flex: "none",
			imageRendering: "pixelated",
			...size
		}
	});
}
/** A picture on the canvas: `x`, `y` and `anchor` as in Tk. */
function TkCanvasPicture(props) {
	const { url, image } = useImageUrl(props.id);
	if (image === void 0 || url === null) return null;
	const width = image.shownWidth;
	const height = image.shownHeight;
	const a = props.anchor;
	const left = props.x - (a === "center" || a === "n" || a === "s" ? width / 2 : a.includes("e") ? width : 0);
	const top = props.y - (a === "center" || a === "e" || a === "w" ? height / 2 : a.startsWith("s") ? height : 0);
	return /* @__PURE__ */ jsx("image", {
		"data-tk-item": props.item,
		href: url,
		x: left,
		y: top,
		width,
		height,
		preserveAspectRatio: "none",
		style: { imageRendering: "pixelated" }
	});
}
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
var windowShift = (anchor) => {
	return `translate(${anchor.includes("w") ? "0" : anchor.includes("e") ? "-100%" : "-50%"}, ${anchor.startsWith("n") ? "0" : anchor.startsWith("s") ? "-100%" : "-50%"})`;
};
/** A widget on the canvas (`create_window`): at the point of the figure, by its anchor. */
function WindowItem(props) {
	const tk = useTk();
	const item = props.item;
	const widget = tk.scene.widgets.find((w) => w.id === item.window);
	if (widget === void 0) return null;
	const layout = {
		position: "absolute",
		left: item.coords[0] ?? 0,
		top: item.coords[1] ?? 0,
		transform: windowShift(item.anchor),
		pointerEvents: "auto",
		margin: 0,
		...item.width > 0 ? {
			width: item.width,
			boxSizing: "border-box"
		} : {},
		...item.height > 0 ? {
			height: item.height,
			boxSizing: "border-box"
		} : {}
	};
	return /* @__PURE__ */ jsx("foreignObject", {
		x: 0,
		y: 0,
		width: "100%",
		height: "100%",
		style: {
			pointerEvents: "none",
			overflow: "visible"
		},
		children: /* @__PURE__ */ jsx("div", {
			style: {
				position: "relative",
				width: "100%",
				height: "100%"
			},
			children: props.child(widget, layout)
		})
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
	})), Match.when(TkItemTypes.Text, () => /* @__PURE__ */ jsx(TextItem, { item })), Match.when(TkItemTypes.Window, () => /* @__PURE__ */ jsx(WindowItem, {
		item,
		child: props.child
	})), Match.when(TkItemTypes.Image, () => /* @__PURE__ */ jsx(TkCanvasPicture, {
		id: item.image,
		x: item.coords[0] ?? 0,
		y: item.coords[1] ?? 0,
		anchor: item.anchor,
		item: item.id
	})), Match.exhaustive);
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
		style: {
			display: "block",
			flex: "none",
			background: w.bg === "" ? "transparent" : w.bg,
			overflow: "hidden",
			touchAction: drags ? "none" : void 0,
			...w.cursor === "" ? {} : { cursor: w.cursor },
			...props.layout
		},
		children: w.items.map((item) => /* @__PURE__ */ jsx(CanvasItem, {
			item,
			child: props.child
		}, item.id))
	});
}
// src/ui/tk-themed.tsx
/** Thickness of a Progressbar, as in Tk on Windows. */
var BarThickness = 18;
function ProgressbarView(props) {
	const events = useWidgetEvents(props.widget.id);
	const w = props.widget;
	return Option.match(w.progress, {
		onNone: () => null,
		onSome: (p) => {
			const vertical = w.orient === "vertical";
			const share = p.maximum > 0 ? Math.max(0, Math.min(1, p.value / p.maximum)) : 0;
			const moving = p.mode === "indeterminate";
			const size = vertical ? {
				width: BarThickness,
				height: p.length
			} : {
				width: p.length,
				height: BarThickness
			};
			const bar = moving ? {
				position: "absolute",
				inset: vertical ? "0 0 auto 0" : "0 auto 0 0",
				[vertical ? "height" : "width"]: "30%"
			} : {
				position: "absolute",
				inset: vertical ? "auto 0 0 0" : "0 auto 0 0",
				[vertical ? "height" : "width"]: `${share * 100}%`
			};
			return /* @__PURE__ */ jsx("div", {
				[TkIdAttribute]: w.id,
				...events,
				role: "progressbar",
				"aria-label": "Смуга виконання",
				"aria-valuemin": 0,
				"aria-valuemax": p.maximum,
				"aria-valuenow": moving ? void 0 : p.value,
				className: "epy-tk-progress",
				style: {
					...size,
					background: p.trough === "" ? void 0 : p.trough,
					...props.layout
				},
				children: /* @__PURE__ */ jsx("div", {
					className: moving && p.running ? vertical ? "epy-tk-progress__bar epy-tk-progress__bar--moving-v" : "epy-tk-progress__bar epy-tk-progress__bar--moving" : "epy-tk-progress__bar",
					style: {
						...bar,
						background: p.bar === "" ? void 0 : p.bar
					}
				})
			});
		}
	});
}
function SeparatorView(props) {
	const events = useWidgetEvents(props.widget.id);
	const w = props.widget;
	const vertical = w.orient === "vertical";
	return /* @__PURE__ */ jsx("div", {
		[TkIdAttribute]: w.id,
		...events,
		role: "separator",
		"aria-orientation": vertical ? "vertical" : "horizontal",
		className: vertical ? "epy-tk-separator epy-tk-separator--vertical" : "epy-tk-separator",
		style: props.layout
	});
}
function NotebookView(props) {
	const tk = useTk();
	const events = useWidgetEvents(props.widget.id);
	const w = props.widget;
	const tabs = Option.match(w.tabs, {
		onNone: () => ({
			tabs: [],
			current: -1
		}),
		onSome: (t) => t
	});
	const byId = new Map(tk.scene.widgets.map((widget) => [widget.id, widget]));
	return /* @__PURE__ */ jsxs("div", {
		[TkIdAttribute]: w.id,
		...events,
		className: "epy-tk-notebook",
		style: {
			font: w.font,
			...props.layout
		},
		children: [/* @__PURE__ */ jsx("div", {
			role: "tablist",
			className: "epy-tk-notebook__tabs",
			children: tabs.tabs.map(([id, text, state], i) => /* @__PURE__ */ jsx("button", {
				type: "button",
				role: "tab",
				"aria-selected": i === tabs.current,
				disabled: state === "disabled",
				className: i === tabs.current ? "epy-tk-notebook__tab epy-tk-notebook__tab--current" : "epy-tk-notebook__tab",
				onClick: () => {
					if (tk.active && i !== tabs.current) tk.send({
						_tag: "Pick",
						widget: w.id,
						items: [i]
					});
				},
				children: text
			}, id))
		}), /* @__PURE__ */ jsx("div", {
			role: "tabpanel",
			className: "epy-tk-notebook__panel",
			style: {
				background: w.bg === "" ? void 0 : w.bg,
				padding: `${w.pady}px ${w.padx}px`,
				...w.width > 0 ? { width: w.width } : {},
				...w.height > 0 ? { height: w.height } : {}
			},
			children: tabs.tabs.map(([id], i) => {
				const child = byId.get(id);
				if (child === void 0) return null;
				const layout = {
					gridArea: "1 / 1",
					alignSelf: "stretch",
					justifySelf: "stretch",
					visibility: i === tabs.current ? "visible" : "hidden"
				};
				return /* @__PURE__ */ jsx("div", {
					style: { display: "contents" },
					children: props.child(child, layout)
				}, id);
			})
		})]
	});
}
/** Heights of a row and of the headings: the same numbers as `_themed.py` (`identify_row`). */
var RowHeight = 20;
var HeadingHeight = 22;
var Indent = 18;
var cellAlign = (anchor) => anchor.includes("e") && !anchor.includes("w") && anchor !== "center" ? "right" : anchor === "center" || anchor === "n" || anchor === "s" ? "center" : "left";
function TreeviewView(props) {
	const tk = useTk();
	const events = useWidgetEvents(props.widget.id);
	const w = props.widget;
	return Option.match(w.tree, {
		onNone: () => null,
		onSome: (tree) => {
			const template = tree.columns.map(([, width]) => `${Math.max(20, width)}px`).join(" ");
			const chosen = tree.rows.flatMap((row, i) => row[6] ? [i] : []);
			const pick = (row, toggle, range) => {
				if (!tk.active || tree.mode === "none") return;
				const mode = tree.mode === "browse" ? TkListModes.Browse : TkListModes.Extended;
				tk.send({
					_tag: "Pick",
					widget: w.id,
					items: chooseRows(mode, chosen, row, toggle, range, chosen.at(-1) ?? row)
				});
			};
			return /* @__PURE__ */ jsx("div", {
				[TkIdAttribute]: w.id,
				...events,
				className: "epy-tk-tree",
				style: {
					...border("sunken", 1),
					font: w.font,
					color: w.fg,
					background: w.bg === "" ? "var(--tk-paper)" : w.bg,
					...props.layout
				},
				children: /* @__PURE__ */ jsxs("div", {
					[TkScrollAttribute]: w.id,
					role: "treegrid",
					"aria-label": "Таблиця програми",
					"aria-multiselectable": tree.mode === "extended",
					className: "epy-tk-tree__body",
					style: {
						height: (tree.headings ? HeadingHeight : 0) + Math.max(1, tree.height) * RowHeight,
						scrollbarWidth: scrolledByBar(tk.scene, w.id) ? "none" : void 0
					},
					children: [tree.headings && /* @__PURE__ */ jsx("div", {
						role: "row",
						className: "epy-tk-tree__row epy-tk-tree__head",
						style: {
							gridTemplateColumns: template,
							height: HeadingHeight
						},
						children: tree.columns.map(([text, , , anchor], i) => /* @__PURE__ */ jsx("button", {
							type: "button",
							role: "columnheader",
							className: "epy-tk-tree__heading",
							style: { textAlign: cellAlign(anchor) },
							onClick: () => {
								if (tk.active) tk.send({
									_tag: "Heading",
									widget: w.id,
									index: i
								});
							},
							children: text
						}, i))
					}), tree.rows.map(([depth, parent, open, cells, fg, bg, selected], i) => /* @__PURE__ */ jsx("div", {
						role: "row",
						"aria-selected": selected,
						"aria-expanded": parent ? open : void 0,
						className: selected ? "epy-tk-tree__row epy-tk-tree__row--selected" : "epy-tk-tree__row",
						style: {
							gridTemplateColumns: template,
							height: RowHeight,
							...selected ? {} : {
								color: fg === "" ? void 0 : fg,
								background: bg === "" ? void 0 : bg
							}
						},
						onClick: (e) => {
							pick(i, e.ctrlKey || e.metaKey, e.shiftKey);
						},
						children: cells.map((cell, c) => {
							const first = c === 0 && tree.tree;
							return /* @__PURE__ */ jsxs("span", {
								role: "gridcell",
								className: "epy-tk-tree__cell",
								style: {
									textAlign: cellAlign(tree.columns[c]?.[2] ?? "w"),
									paddingLeft: first ? 4 + depth * Indent : void 0
								},
								children: [first && /* @__PURE__ */ jsx("span", {
									"aria-hidden": true,
									className: "epy-tk-tree__toggle",
									onClick: (e) => {
										if (!parent) return;
										e.stopPropagation();
										if (tk.active) tk.send({
											_tag: "Toggle",
											widget: w.id,
											index: i
										});
									},
									children: parent ? open ? "▾" : "▸" : ""
								}), cell]
							}, c);
						})
					}, i))]
				})
			});
		}
	});
}
/** A themed widget of ttk; `child` draws a widget inside a tab of a Notebook. */
function ThemedView(props) {
	return Match.value(props.widget.kind).pipe(Match.when("Progressbar", () => /* @__PURE__ */ jsx(ProgressbarView, { ...props })), Match.when("Separator", () => /* @__PURE__ */ jsx(SeparatorView, { ...props })), Match.when("Notebook", () => /* @__PURE__ */ jsx(NotebookView, { ...props })), Match.when("Treeview", () => /* @__PURE__ */ jsx(TreeviewView, { ...props })), Match.orElse(() => null));
}
// src/ui/tk-widgets.tsx
/** Does the container take the size of its widgets (pack and grid do it, place does not)? */
var fitsContent = (scene, id, propagate) => propagate && scene.widgets.some((w) => w.parent === id && (w.manager.kind === TkManagerKinds.Pack || w.manager.kind === TkManagerKinds.Grid));
var containerSize = (scene, id, propagate, width, height) => fitsContent(scene, id, propagate) ? {} : {
	width: Math.max(1, width),
	height: Math.max(1, height)
};
var compoundDirection = (compound) => compound === "bottom" ? "column-reverse" : compound === "left" ? "row" : compound === "right" ? "row-reverse" : "column";
/** The text of a Label or a Button, and its picture (`image`, `compound`), as Tk shows them. */
function Caption(props) {
	const w = props.widget;
	const text = /* @__PURE__ */ jsx("span", {
		style: {
			maxWidth: w.wrap > 0 ? w.wrap : void 0,
			overflowWrap: "anywhere"
		},
		children: w.text
	});
	if (w.image === 0) return text;
	if (w.compound === "none" || w.compound === "") return /* @__PURE__ */ jsx(TkPicture, { id: w.image });
	if (w.compound === "center") return /* @__PURE__ */ jsxs("span", {
		style: {
			display: "grid",
			placeItems: "center"
		},
		children: [/* @__PURE__ */ jsx("span", {
			style: { gridArea: "1 / 1" },
			children: /* @__PURE__ */ jsx(TkPicture, { id: w.image })
		}), /* @__PURE__ */ jsx("span", {
			style: { gridArea: "1 / 1" },
			children: text
		})]
	});
	return /* @__PURE__ */ jsxs("span", {
		style: {
			display: "flex",
			flexDirection: compoundDirection(w.compound),
			alignItems: "center",
			gap: 2
		},
		children: [/* @__PURE__ */ jsx(TkPicture, { id: w.image }), text]
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
	const [over, setOver] = useState(false);
	const w = props.widget;
	const disabled = w.state === "disabled";
	const style = textBox(w);
	const pressedStyle = pressed ? {
		...w.relief === "raised" ? border("sunken", w.bd) : {},
		...w.activeBg === "" ? {} : { background: w.activeBg },
		...w.activeFg === "" ? {} : { color: w.activeFg }
	} : {};
	const overStyle = over && !pressed && !disabled && w.overrelief !== "" ? border(w.overrelief, w.bd) : {};
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
		onPointerEnter: (e) => {
			setOver(true);
			events.onPointerEnter(e);
		},
		onPointerLeave: (e) => {
			setPressed(false);
			setOver(false);
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
			...overStyle,
			...pressedStyle,
			cursor: w.cursor !== "" ? w.cursor : disabled ? "default" : "pointer",
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
			cursor: w.cursor !== "" ? w.cursor : disabled ? "default" : "pointer",
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
		...w.cursor === "" ? {} : { cursor: w.cursor },
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
	})), Match.when(TkWidgetKinds.Entry, () => /* @__PURE__ */ jsx(EntryView, { ...props })), Match.when(TkWidgetKinds.Text, () => /* @__PURE__ */ jsx(TextView, { ...props })), Match.when(TkWidgetKinds.Frame, () => /* @__PURE__ */ jsx(FrameView, { ...props })), Match.when(TkWidgetKinds.LabelFrame, () => /* @__PURE__ */ jsx(FrameView, { ...props })), Match.when(TkWidgetKinds.Canvas, () => /* @__PURE__ */ jsx(TkCanvasView, {
		...props,
		child: (widget, layout) => /* @__PURE__ */ jsx(TkWidgetView, {
			widget,
			layout
		})
	})), Match.when(TkWidgetKinds.Scale, () => /* @__PURE__ */ jsx(ScaleView, { ...props })), Match.when(TkWidgetKinds.Listbox, () => /* @__PURE__ */ jsx(ListboxView, { ...props })), Match.when(TkWidgetKinds.Spinbox, () => /* @__PURE__ */ jsx(SpinboxView, { ...props })), Match.when(TkWidgetKinds.Combobox, () => /* @__PURE__ */ jsx(ComboboxView, { ...props })), Match.when(TkWidgetKinds.Scrollbar, () => /* @__PURE__ */ jsx(ScrollbarView, { ...props })), Match.when(TkWidgetKinds.Menubutton, () => /* @__PURE__ */ jsx(MenubuttonView, { ...props })), Match.whenOr(TkWidgetKinds.Progressbar, TkWidgetKinds.Separator, TkWidgetKinds.Notebook, TkWidgetKinds.Treeview, () => /* @__PURE__ */ jsx(ThemedView, {
		...props,
		child: (widget, layout) => /* @__PURE__ */ jsx(TkWidgetView, {
			widget,
			layout
		})
	})), Match.when(TkWidgetKinds.Menu, () => null), Match.exhaustive);
}
var isVertical = (side) => side !== "left" && side !== "right";
var direction = (side) => side === "bottom" ? "column-reverse" : side === "left" ? "row" : side === "right" ? "row-reverse" : "column";
var fills = (m, axis) => m.fill === "both" || m.fill === axis;
var TextKinds = /* @__PURE__ */ new Set([
	TkWidgetKinds.Label,
	TkWidgetKinds.Button,
	TkWidgetKinds.Checkbutton,
	TkWidgetKinds.Radiobutton,
	TkWidgetKinds.Menubutton
]);
var FieldKinds = /* @__PURE__ */ new Set([
	TkWidgetKinds.Entry,
	TkWidgetKinds.Spinbox,
	TkWidgetKinds.Combobox
]);
var BoxKinds = /* @__PURE__ */ new Set([TkWidgetKinds.Text, TkWidgetKinds.Listbox]);
/** The size that a widget asks for (`width`, `height`), as CSS: the least size when it stretches. */
var requested = (w, axis) => {
	const size = axis === "x" ? w.width : w.height;
	const unit = (count) => axis === "x" ? `${count}ch` : `${count * LineHeight}em`;
	if (TextKinds.has(w.kind)) return size > 0 && w.image === 0 ? unit(size) : void 0;
	if (FieldKinds.has(w.kind)) return axis === "x" ? unit(Math.max(1, size)) : void 0;
	if (BoxKinds.has(w.kind)) return unit(Math.max(1, size));
	if (w.kind === TkWidgetKinds.Canvas) return Math.max(1, size + 2 * (w.highlight + w.bd));
};
/**
* A widget that `fill` or `sticky` stretches: the stretch wins over the size that it asks for (`height=3`
* of a Label), as in Tk, but the widget does not get smaller than it asks.
*/
var stretched = (w, axis) => {
	const least = requested(w, axis);
	return axis === "x" ? {
		width: "auto",
		...least === void 0 ? {} : { minWidth: least }
	} : {
		height: "auto",
		...least === void 0 ? {} : { minHeight: least }
	};
};
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
		...fills(m, "x") ? stretched(props.widget, "x") : {},
		...fills(m, "y") ? stretched(props.widget, "y") : {},
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
	const laterExpand = later.filter((w) => w.manager.expand && isVertical(w.manager.side) === vertical).length;
	const restGrow = item.manager.expand ? laterExpand : Math.max(1, laterExpand);
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
				...stickyX(m.sticky) === "stretch" ? stretched(w, "x") : {},
				...stickyY(m.sticky) === "stretch" ? stretched(w, "y") : {},
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
/** The "screen" of the program (`ScreenWidth`, `ScreenHeight` in `tkinter/_core.py`). */
var Screen = {
	width: 1920,
	height: 1080
};
/** A zoomed window (`state("zoomed")`) is at least this high on the page. */
var ZoomedHeight = 360;
/** The size of the client area: `geometry`, or the size of the widgets; `minsize` and `maxsize` limit it. */
var clientSize = (scene, w) => {
	const [minWidth, minHeight] = w.minSize;
	const [maxWidth, maxHeight] = w.maxSize;
	const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
	if (w.zoomed) return {
		width: "100%",
		minHeight: Math.max(ZoomedHeight, w.height),
		boxSizing: "border-box"
	};
	if (w.width >= 0 && w.height >= 0) return {
		width: clamp(w.width, minWidth, Math.max(minWidth, maxWidth)),
		height: clamp(w.height, minHeight, Math.max(minHeight, maxHeight))
	};
	return {
		...containerSize(scene, w.id, w.propagate, w.minWidth > 0 ? w.minWidth : EmptyWindowSize, w.minHeight > 0 ? w.minHeight : EmptyWindowSize),
		...minWidth > 1 ? { minWidth } : {},
		...minHeight > 1 ? { minHeight } : {},
		...maxWidth < Screen.width ? { maxWidth } : {},
		...maxHeight < Screen.height ? { maxHeight } : {}
	};
};
function ClientArea(props) {
	const tk = useTk();
	const events = useWidgetEvents(props.window.id);
	const w = props.window;
	const fixed = w.width >= 0 && w.height >= 0;
	const size = clientSize(tk.scene, w);
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
			...w.cursor === "" ? {} : { cursor: w.cursor },
			minWidth: fixed || w.zoomed ? void 0 : "max-content",
			...size
		},
		children: /* @__PURE__ */ jsx(Children, { parent: w.id })
	});
}
/** Drags shorter than this are clicks on the title. */
var DragThreshold = 3;
function WindowFrame(props) {
	const tk = useTk();
	const w = props.window;
	const [drag, setDrag] = useState(Option.none());
	const shift = Option.match(drag, {
		onNone: () => [0, 0],
		onSome: (d) => [d.dx, d.dy]
	});
	const onPointerDown = (e) => {
		if (e.button !== 0 || e.target instanceof Element && e.target.closest("button") !== null) return;
		e.currentTarget.setPointerCapture(e.pointerId);
		setDrag(Option.some({
			startX: e.clientX,
			startY: e.clientY,
			dx: 0,
			dy: 0
		}));
	};
	const onPointerMove = (e) => {
		Option.map(drag, (d) => {
			setDrag(Option.some({
				...d,
				dx: Math.round(e.clientX - d.startX),
				dy: Math.round(e.clientY - d.startY)
			}));
		});
	};
	const onPointerUp = () => {
		Option.map(drag, (d) => {
			if (Math.abs(d.dx) + Math.abs(d.dy) >= DragThreshold) props.onDrop([props.place[0] + d.dx, props.place[1] + d.dy]);
		});
		setDrag(Option.none());
	};
	return /* @__PURE__ */ jsx(TkWindowContext.Provider, {
		value: Option.some(w),
		children: /* @__PURE__ */ jsxs("div", {
			[DesktopWindowAttribute]: w.id,
			className: cn("epy-tk-window", w.zoomed && "epy-tk-window--zoomed", Option.isSome(drag) && "epy-tk-window--dragging"),
			onPointerDownCapture: props.onRaise,
			style: {
				gridArea: "1 / 1",
				marginLeft: w.zoomed ? 0 : props.left,
				marginTop: w.zoomed ? 0 : props.top,
				zIndex: props.layer,
				opacity: w.alpha < 1 ? Math.max(.1, w.alpha) : void 0,
				transform: shift[0] !== 0 || shift[1] !== 0 ? `translate(${shift[0]}px, ${shift[1]}px)` : void 0
			},
			children: [
				w.decorated && /* @__PURE__ */ jsxs("div", {
					className: "epy-tk-title",
					title: "Перетягни, щоб посунути вікно",
					onPointerDown,
					onPointerMove,
					onPointerUp,
					onPointerCancel: () => {
						setDrag(Option.none());
					},
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
				}),
				w.menu !== 0 && /* @__PURE__ */ jsx(MenuBar, { menu: w.menu }),
				/* @__PURE__ */ jsx(ClientArea, { window: w })
			]
		})
	});
}
/** Width of the small screen under the windows, in pixels. */
var MapWidth = 192;
/** The screen in small: where the windows of the program are, as `geometry("+x+y")` put them. */
function ScreenMap(props) {
	const scale = MapWidth / Screen.width;
	return /* @__PURE__ */ jsxs("figure", {
		className: "epy-tk-map",
		children: [/* @__PURE__ */ jsx("div", {
			className: "epy-tk-map__screen",
			"aria-hidden": true,
			style: {
				width: MapWidth,
				height: Math.round(Screen.height * scale)
			},
			children: props.windows.map(([w, place]) => {
				const size = props.sizes.get(w.id) ?? [EmptyWindowSize, EmptyWindowSize];
				return /* @__PURE__ */ jsx("div", {
					className: "epy-tk-map__window",
					style: {
						left: Math.round(place[0] * scale),
						top: Math.round(place[1] * scale),
						width: Math.max(4, Math.round(size[0] * scale)),
						height: Math.max(3, Math.round(size[1] * scale))
					}
				}, w.id);
			})
		}), /* @__PURE__ */ jsxs("figcaption", {
			className: "epy-tk-map__caption",
			children: [/* @__PURE__ */ jsxs("span", { children: [
				"Екран ",
				Screen.width,
				" × ",
				Screen.height
			] }), props.windows.map(([w, place]) => /* @__PURE__ */ jsxs("span", { children: [
				"«",
				w.title,
				"»: x = ",
				place[0],
				", y = ",
				place[1]
			] }, w.id))]
		})]
	});
}
var samePlace = (a, b) => a[0] === b[0] && a[1] === b[1];
/**
* The windows of the program where the program put them: one beside another as on the screen. The student
* drags a window by its title; the program gets <Configure> with the new place.
*/
/**
* `screen`: the area is the 1920 × 1080 screen of the program, and each window stands at its own `+x+y`
* (the windows on top of the page). Otherwise the windows stand from the corner of the area.
*/
function Desktop(props) {
	const tk = useTk();
	const [dragged, setDragged] = useState(/* @__PURE__ */ new Map());
	const [raised, setRaised] = useState(Option.none());
	const [sizes, setSizes] = useState(/* @__PURE__ */ new Map());
	const stage = useRef(null);
	const origin = useRef(Option.none());
	const placeOf = (w) => {
		const own = [w.x, w.y];
		const moved = dragged.get(w.id);
		return moved !== void 0 && samePlace(moved.from, own) ? moved.place : own;
	};
	const placed = props.windows.map((w) => [w, placeOf(w)]);
	const least = [Math.min(...placed.map(([, p]) => p[0])), Math.min(...placed.map(([, p]) => p[1]))];
	const corner = Option.match(origin.current, {
		onNone: () => least,
		onSome: (o) => [Math.min(o[0], least[0]), Math.min(o[1], least[1])]
	});
	origin.current = Option.some(corner);
	const [left, top] = props.screen ? [0, 0] : corner;
	const topZ = Math.max(...props.windows.map((w) => w.z));
	const order = props.windows.toSorted((a, b) => a.z - b.z).map((w) => w.id);
	Option.map(raised, (r) => {
		if (r.topZ !== topZ || !order.includes(r.id)) return;
		order.splice(order.indexOf(r.id), 1);
		order.push(r.id);
	});
	useLayoutEffect(() => {
		const element = stage.current;
		if (element === null) return;
		const found = /* @__PURE__ */ new Map();
		for (const child of Array.from(element.children)) {
			const id = Number(child.getAttribute(DesktopWindowAttribute));
			if (child instanceof HTMLElement) found.set(id, [child.offsetWidth, child.offsetHeight]);
		}
		if (found.size !== sizes.size || Array.from(found).some(([id, size]) => {
			const old = sizes.get(id);
			return old === void 0 || !samePlace(old, size);
		})) setSizes(found);
	});
	const drop = (w, place) => {
		setDragged((old) => new Map(old).set(w.id, {
			place,
			from: [w.x, w.y]
		}));
		if (tk.active) tk.send({
			_tag: "Move",
			widget: w.id,
			x: place[0],
			y: place[1]
		});
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("div", {
		className: "epy-tk-desktop",
		children: /* @__PURE__ */ jsx("div", {
			ref: stage,
			className: cn("epy-tk-stage", props.screen && "epy-tk-stage--screen"),
			style: props.screen ? {
				width: Screen.width,
				height: Screen.height
			} : void 0,
			children: placed.map(([w, place]) => /* @__PURE__ */ jsx(WindowFrame, {
				window: w,
				left: place[0] - left,
				top: place[1] - top,
				layer: order.indexOf(w.id) + 1,
				place,
				onRaise: () => {
					setRaised(Option.some({
						id: w.id,
						topZ
					}));
				},
				onDrop: (next) => {
					drop(w, next);
				}
			}, w.id))
		})
	}), !props.screen && placed.some(([w]) => w.placed) && /* @__PURE__ */ jsx(ScreenMap, {
		windows: placed,
		sizes
	})] });
}
/** Marks the box of each window in the area of the windows, to measure it. */
var DesktopWindowAttribute = "data-epy-tk-desktop";
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
/** The browser shows `element` on the whole screen, or stops showing it so. */
var toggleFullscreen = (element) => {
	if (element === null) return;
	if (document.fullscreenElement === element) {
		document.exitFullscreen().catch(() => void 0);
		return;
	}
	element.requestFullscreen?.().catch(() => void 0);
};
/** The windows on top of the page: a bar with "На весь екран" and "Повернути в панель", the windows under it. */
function WindowsOnTop(props) {
	const screen = useRef(null);
	const [full, setFull] = useState(false);
	useEffect(() => {
		const change = () => {
			setFull(screen.current !== null && document.fullscreenElement === screen.current);
		};
		document.addEventListener("fullscreenchange", change);
		return () => {
			document.removeEventListener("fullscreenchange", change);
			if (screen.current !== null && document.fullscreenElement === screen.current) document.exitFullscreen().catch(() => void 0);
		};
	}, []);
	return /* @__PURE__ */ jsxs("div", {
		ref: screen,
		role: "dialog",
		"aria-modal": "true",
		"aria-label": "Вікно програми поверх сторінки",
		className: "epy-tk-screen",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "epy-tk-screen__bar",
			children: [
				/* @__PURE__ */ jsx(AppWindow, {
					"aria-hidden": true,
					className: "epy-tk-screen__icon"
				}),
				/* @__PURE__ */ jsx("span", {
					className: "epy-tk-screen__caption",
					children: "Вікно програми"
				}),
				/* @__PURE__ */ jsxs(Button, {
					variant: ButtonVariants.Ghost,
					size: ButtonSizes.Sm,
					disabled: false,
					onClick: () => {
						toggleFullscreen(screen.current);
					},
					children: [
						full ? /* @__PURE__ */ jsx(Minimize2, { "aria-hidden": true }) : /* @__PURE__ */ jsx(Maximize2, { "aria-hidden": true }),
						" ",
						full ? "Вийти з повного екрана" : "На весь екран"
					]
				}),
				/* @__PURE__ */ jsxs(Button, {
					variant: ButtonVariants.Ghost,
					size: ButtonSizes.Sm,
					disabled: false,
					onClick: props.onBack,
					children: [/* @__PURE__ */ jsx(PanelRight, { "aria-hidden": true }), " Повернути в панель"]
				})
			]
		}), /* @__PURE__ */ jsx("div", {
			className: "epy-tk-screen__body",
			children: /* @__PURE__ */ jsx("div", {
				className: cn("epy-tk-screen__windows", props.screen && "epy-tk-screen__windows--screen"),
				children: props.children
			})
		})]
	});
}
/** The windows of the program and its message windows. The parent gives a new `key` for each run. */
function TkWindows(props) {
	const [root, setRoot] = useState(null);
	const [press] = useState(() => new PressTracker());
	const announced = useRef(/* @__PURE__ */ new Set());
	const focusRev = useRef(0);
	const { onInput } = props;
	const [onTop, setOnTop] = useState(props.openOnTop === true);
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
			const widget = root?.querySelector(`[${TkIdAttribute}="${scene.focus}"]`);
			const field = widget instanceof HTMLInputElement || widget instanceof HTMLTextAreaElement ? widget : widget?.querySelector("input, textarea");
			if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) field.focus({ preventScroll: true });
		});
	}, [props.scene, root]);
	const dialog = props.dialogs[0];
	if (Option.isNone(props.scene) && dialog === void 0 && Option.isNone(props.ask) && props.downloads.length === 0) return null;
	const top = onTop && props.active && visible.length > 0;
	const screen = top && visible.some((w) => w.placed);
	const windows = Option.match(props.scene, {
		onNone: () => null,
		onSome: (scene) => {
			const value = {
				scene,
				images: props.images,
				active: props.active,
				send,
				press
			};
			return /* @__PURE__ */ jsxs(TkContext.Provider, {
				value: Option.some(value),
				children: [/* @__PURE__ */ jsx("div", {
					className: cn("epy-tk-windows", !props.active && "epy-tk-windows--idle"),
					children: visible.length > 0 && /* @__PURE__ */ jsx(Desktop, {
						windows: visible,
						screen
					}, screen ? "screen" : "area")
				}), props.active && /* @__PURE__ */ jsx(PopupMenus, { root })]
			});
		}
	});
	const dialogs = /* @__PURE__ */ jsxs(Fragment, { children: [dialog !== void 0 && /* @__PURE__ */ jsx(MessageDialog, {
		dialog,
		onClose: props.onCloseDialog
	}), dialog === void 0 && Option.match(props.ask, {
		onNone: () => null,
		onSome: (ask) => /* @__PURE__ */ jsx(AskDialog, {
			ask,
			onAnswer: props.onAnswer
		}, JSON.stringify(ask))
	})] });
	return /* @__PURE__ */ jsxs("section", {
		ref: setRoot,
		className: "epy-tk-area",
		"aria-label": "Вікна програми",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "epy-tk-area__head",
				children: [/* @__PURE__ */ jsx("p", {
					className: "epy-caption",
					children: "Вікно програми"
				}), !top && props.active && visible.length > 0 && /* @__PURE__ */ jsxs(Button, {
					variant: ButtonVariants.Ghost,
					size: ButtonSizes.Sm,
					disabled: false,
					onClick: () => {
						setOnTop(true);
					},
					children: [/* @__PURE__ */ jsx(AppWindow, { "aria-hidden": true }), " Відкрити поверх сторінки"]
				})]
			}),
			top ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("p", {
				className: "epy-tk-area__note",
				children: "Вікно відкрите поверх сторінки."
			}), /* @__PURE__ */ jsxs(WindowsOnTop, {
				screen,
				onBack: () => {
					setOnTop(false);
				},
				children: [windows, dialogs]
			})] }) : /* @__PURE__ */ jsxs(Fragment, { children: [windows, dialogs] }),
			/* @__PURE__ */ jsx(Downloads, {
				files: props.downloads,
				onDismiss: props.onDismissDownload
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
	const check = useSyntaxCheck(props.worker);
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
								check,
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
								onCloseDialog: () => run.session.current?.closeDialog(),
								images: run.view.images,
								ask: run.view.status._tag === "Asking" ? Option.some(run.view.status.ask) : Option.none(),
								onAnswer: (value, files) => run.session.current?.answer(value, files),
								downloads: run.view.downloads,
								onDismissDownload: (name) => run.session.current?.dismissDownload(name),
								openOnTop: true
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
	const [full, setFull] = useState(false);
	const run = usePythonRun(props.worker);
	const check = useSyntaxCheck(props.worker);
	const onCodeChange = useRef(props.onCodeChange);
	useEffect(() => {
		onCodeChange.current = props.onCodeChange;
	}, [props.onCodeChange]);
	useEffect(() => {
		onCodeChange.current(code);
	}, [code]);
	useEffect(() => {
		if (!full) return;
		const close = (event) => {
			if (event.key === "Escape") setFull(false);
		};
		window.addEventListener("keydown", close);
		return () => window.removeEventListener("keydown", close);
	}, [full]);
	const start = () => run.start(code);
	const turtle = run.view.ops.length > 0 || /\bturtle\b/.test(code);
	return /* @__PURE__ */ jsxs("div", {
		className: cn("epy epy-runner", full && "epy-runner--full"),
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
					})
				]
			}),
			/* @__PURE__ */ jsx(CodeEditor, {
				check,
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
				onCloseDialog: () => run.session.current?.closeDialog(),
				images: run.view.images,
				ask: run.view.status._tag === "Asking" ? Option.some(run.view.status.ask) : Option.none(),
				onAnswer: (value, files) => run.session.current?.answer(value, files),
				downloads: run.view.downloads,
				onDismissDownload: (name) => run.session.current?.dismissDownload(name)
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
