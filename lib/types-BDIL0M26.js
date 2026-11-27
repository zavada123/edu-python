import { c as TimeLimitMs, d as inputLines, t as ChunkKinds } from "./protocol-CTCLMVi9.js";
import { f as decodeScene, g as explainError, o as TkManagerKinds } from "./tk-scene-Di0snvzZ.js";
import { parser } from "@lezer/python";
// src/quests/run.ts
var TurnEnds = {
	/** The program ended. */
	Finished: "Finished",
	/** The program is at `mainloop()`: its windows wait for user actions. */
	Waiting: "Waiting",
	/** The program asks for more values with `input()` (or a dialog asks) than the trial gives. */
	NeedInput: "NeedInput",
	Failed: "Failed",
	OutputLimit: "OutputLimit",
	TimeLimit: "TimeLimit",
	/** The engine did not load (no network on the first run). */
	LoadFailed: "LoadFailed"
};
/** A driver on a new Web Worker. The time limit counts from `Started` and from `Handling`, as in the IDE. */
var workerDriver = (createWorker) => () => {
	const state = {
		pending: null,
		timer: null
	};
	const stopTimer = () => {
		if (state.timer !== null) clearTimeout(state.timer);
		state.timer = null;
	};
	const finish = (end, traceback) => {
		stopTimer();
		const p = state.pending;
		if (p === null) return;
		state.pending = null;
		p.resolve({
			end,
			output: p.output,
			scene: p.scene,
			traceback
		});
	};
	const startTimer = () => {
		stopTimer();
		state.timer = setTimeout(() => {
			port.terminate();
			finish(TurnEnds.TimeLimit, "");
		}, TimeLimitMs);
	};
	const onMessage = (message) => {
		const p = state.pending;
		switch (message._tag) {
			case "Started":
			case "Handling": return startTimer();
			case "Progress":
				if (p === null) return;
				p.output += message.chunks.filter((c) => c.kind === ChunkKinds.Output).map((c) => c.text).join("");
				p.scene = message.scenes.at(-1) ?? p.scene;
				return;
			case "Checked": return;
			case "Waiting":
			case "Finished":
			case "NeedInput":
			case "OutputLimit": return finish(message._tag, "");
			case "Asking": return finish(TurnEnds.NeedInput, "");
			case "Failed": return finish(TurnEnds.Failed, message.traceback);
			case "LoadFailed": return finish(TurnEnds.LoadFailed, "");
		}
	};
	const port = createWorker(onMessage);
	const turn = (send) => new Promise((resolve) => {
		state.pending = {
			output: "",
			scene: "",
			resolve
		};
		send();
	});
	return {
		run: (code, input) => turn(() => port.post({
			_tag: "Run",
			code,
			inputs: inputLines(input),
			seed: 1
		})),
		event: (input) => turn(() => port.post({
			_tag: "Event",
			input,
			layout: []
		})),
		close: () => {
			stopTimer();
			port.terminate();
		}
	};
};
// src/quests/check.ts
/**
* Checks of the Python tasks: the words a program must use (on the syntax tree, the program does not run),
* the trials (the program runs), and the answers. Every message is in Ukrainian, in the words of a teacher.
*/
/** Output as the student sees it: `\r\n` is `\n`, spaces at the ends of lines and empty lines at the end do not count. */
var normalizeOutput = (raw) => raw.normalize("NFC").replace(/\r\n?/g, "\n").split("\n").map((line) => line.replace(/[ \t ]+$/, "")).join("\n").replace(/\n+$/, "");
/** An answer as the student may type it: letter case, ґ/г, apostrophes, spaces and the last full stop do not count. */
var normalizeAnswer = (s) => s.trim().toLowerCase().replace(/ґ/g, "г").replace(/[’ʼ`]/g, "'").replace(/[.,!]+$/g, "").replace(/\s+/g, " ");
var answerIsRight = (step, text) => {
	const a = normalizeAnswer(text);
	return a !== "" && step.accepted.some((x) => normalizeAnswer(x) === a);
};
/** Keywords (`for`, `while`, `elif`…) and names (`input`, `Entry`, `mainloop`…) in the code; text in strings and comments does not count. */
var wordsOf = (code) => {
	const words = /* @__PURE__ */ new Set();
	parser.parse(code).iterate({ enter: (node) => {
		if (node.name === "VariableName" || node.name === "PropertyName") words.add(code.slice(node.from, node.to));
		else if (/^[a-z]+$/.test(node.name)) words.add(node.name);
	} });
	return words;
};
/** Words of `mustUse` that the code does not have. */
var missingWords = (step, code) => {
	const words = wordsOf(code);
	return step.mustUse.filter((w) => !words.has(w));
};
var noCompare = { _tag: "None" };
/** A message about a turn that did not end as the trial needs, or "" when the turn is fine. */
var turnProblem = (turn, code) => {
	switch (turn.end) {
		case TurnEnds.Finished:
		case TurnEnds.Waiting: return "";
		case TurnEnds.NeedInput: return "Програма чекає більше значень, ніж дає це випробування. Перевір, скільки разів у ній викликається `input()`.";
		case TurnEnds.Failed: {
			const error = explainError(turn.traceback, code);
			return `Програма зупинилася з помилкою${error.line._tag === "Some" ? ` у рядку ${error.line.value}` : ""}: ${error.explanation}`;
		}
		case TurnEnds.OutputLimit: return "Програма вивела забагато тексту. Можливо, цикл ніколи не закінчується.";
		case TurnEnds.TimeLimit: return "Програма працювала понад 5 секунд. Можливо, цикл `while` ніколи не закінчується.";
		case TurnEnds.LoadFailed: return "Не вдалося завантажити Python. Перевір інтернет і спробуй ще раз.";
	}
};
var runConsole = async (driver, code, trial) => {
	const turn = await driver.run(code, trial.input);
	const problem = turnProblem(turn, code);
	const got = normalizeOutput(turn.output);
	const want = normalizeOutput(trial.output);
	const compare = {
		_tag: "Output",
		got,
		want
	};
	if (problem !== "") return {
		_tag: "Wrong",
		label: trial.label,
		message: problem,
		compare
	};
	if (got === want) return {
		_tag: "Passed",
		label: trial.label
	};
	const known = trial.mistakes.find((m) => normalizeOutput(m.output) === got);
	return {
		_tag: "Wrong",
		label: trial.label,
		message: known === void 0 ? trial.why : known.why,
		compare
	};
};
var sceneOf = (json) => {
	const update = decodeScene(json);
	return update._tag === "Scene" && update.scene.windows.some((w) => w.visible) ? update.scene : null;
};
var byId = (a, b) => a.id - b.id;
/** Widgets that a geometry manager shows: a `Label` without `.pack()` is not in the window. */
var shownWidgets = (scene) => scene.widgets.filter((w) => w.manager.kind !== TkManagerKinds.None);
/** The user action for a trial action, or a message when the window has no such field or button. */
var inputFor = (scene, action) => {
	switch (action._tag) {
		case "Type": {
			const field = shownWidgets(scene).filter((w) => w.kind === "Entry").sort(byId)[action.field - 1];
			return field === void 0 ? `У вікні немає ${action.field}-го поля для введення (\`Entry\`).` : {
				_tag: "Edit",
				widget: field.id,
				text: action.text
			};
		}
		case "Click": {
			const button = shownWidgets(scene).find((w) => w.kind === "Button" && w.text.trim() === action.button);
			return button === void 0 ? `У вікні немає кнопки з написом «${action.button}».` : {
				_tag: "Invoke",
				widget: button.id
			};
		}
	}
};
var NUMBER = /-?\d+(?:[.,]\d+)?(?:e[+-]?\d+)?/gi;
var EPSILON = 1e-9;
var lastNumber = (text) => {
	const found = text.match(NUMBER);
	const last = found === null ? void 0 : found.at(-1);
	return last === void 0 ? NaN : Number(last.replace(",", "."));
};
var isNumber = (text) => /^-?\d+(?:[.,]\d+)?$/.test(text.trim());
/** True when a widget text shows the wanted value (see `WindowCheck` "Shows"). */
var showsValue = (text, want) => isNumber(want) ? Math.abs(lastNumber(text) - Number(want.trim().replace(",", "."))) < EPSILON : text.toLowerCase().includes(want.trim().toLowerCase());
var quoted = (texts) => texts.filter((t) => t.trim() !== "").map((t) => `«${t.trim()}»`).join(", ");
/** A message when the window does not meet the check, or "". `typed`: ids of the fields that the trial filled. */
var windowProblem = (scene, check, typed, why) => {
	switch (check._tag) {
		case "Title": {
			const titles = scene.windows.map((w) => w.title);
			return titles.includes(check.text) ? "" : `Заголовок вікна ${quoted(titles) || "порожній"}, а треба «${check.text}». ${why}`;
		}
		case "Widget": return shownWidgets(scene).some((w) => w.kind === check.kind && (check.text === "" || w.text.trim() === check.text)) ? "" : why;
		case "Shows": {
			const shown = shownWidgets(scene).filter((w) => (w.kind === "Label" || w.kind === "Entry") && !typed.has(w.id));
			if (shown.some((w) => showsValue(w.text, check.text))) return "";
			const now = quoted(shown.map((w) => w.text));
			return `${why} Треба, щоб вікно показало ${check.text}${now === "" ? "." : `, а воно показує: ${now}.`}`;
		}
	}
};
var NO_WINDOW = "Вікно не відкрилося або закрилося. Перевір, що програма створює вікно `Tk()` і закінчується рядком `root.mainloop()` (з назвою твого вікна).";
var runWindow = async (driver, code, trial) => {
	const wrong = (message) => ({
		_tag: "Wrong",
		label: trial.label,
		message,
		compare: noCompare
	});
	const first = await driver.run(code, "");
	const problem = turnProblem(first, code);
	if (problem !== "") return wrong(problem);
	let scene = first.end === TurnEnds.Waiting ? sceneOf(first.scene) : null;
	const typed = /* @__PURE__ */ new Set();
	for (const action of trial.actions) {
		if (scene === null) return wrong(NO_WINDOW);
		const input = inputFor(scene, action);
		if (typeof input === "string") return wrong(input);
		if (input._tag === "Edit") typed.add(input.widget);
		const turn = await driver.event(input);
		const failed = turnProblem(turn, code);
		if (failed !== "") return wrong(failed);
		scene = turn.end !== TurnEnds.Waiting ? null : turn.scene === "" ? scene : sceneOf(turn.scene);
	}
	if (scene === null) return wrong(NO_WINDOW);
	const current = scene;
	const message = trial.expect.map((c) => windowProblem(current, c, typed, trial.why)).find((m) => m !== "");
	return message === void 0 ? {
		_tag: "Passed",
		label: trial.label
	} : wrong(message);
};
/** Runs one trial on a fresh engine: a program of the previous trial does not change the next one. */
var runTrial = async (drivers, code, trial) => {
	const driver = drivers();
	try {
		return trial._tag === "Console" ? await runConsole(driver, code, trial) : await runWindow(driver, code, trial);
	} finally {
		driver.close();
	}
};
var LOAD_FAILED = "Не вдалося завантажити Python. Перевір інтернет і спробуй ще раз.";
/** Checks a program: first the words it must use, then every trial. */
var checkProgram = async (drivers, step, code) => {
	const missing = missingWords(step, code);
	if (missing.length > 0) return {
		_tag: "MustUse",
		words: missing
	};
	const trials = [];
	for (const trial of step.trials) trials.push(await runTrial(drivers, code, trial));
	if (trials.some((t) => t._tag === "Wrong" && t.message === LOAD_FAILED)) return { _tag: "LoadFailed" };
	return trials.every((t) => t._tag === "Passed") ? {
		_tag: "Solved",
		trials
	} : {
		_tag: "Failed",
		trials
	};
};
/** A short message about a verdict, in Ukrainian. Words in `backticks` are code. */
var verdictMessage = (verdict) => {
	switch (verdict._tag) {
		case "Solved": return "Усі випробування пройдено!";
		case "Failed": return `Пройдено ${verdict.trials.filter((t) => t._tag === "Passed").length} з ${verdict.trials.length} випробувань. Подивись, що пішло не так, виправ програму й перевір ще раз.`;
		case "MustUse": return `У цьому завданні програма має використати ${verdict.words.map((w) => `\`${w}\``).join(", ")}.`;
		case "LoadFailed": return LOAD_FAILED;
	}
};
// src/quests/progress.ts
/** Progress in a mission: the order of the steps, the next step, the score and the report for the host app. */
var allSteps = (m) => m.chapters.flatMap((c) => c.steps);
/** Steps that the student must solve: lessons do not count. */
var taskSteps = (m) => allSteps(m).flatMap((s) => s.kind === "lesson" ? [] : [s]);
var emptyProgress = (m) => ({
	missionId: m.id,
	solved: [],
	answers: {},
	drafts: {},
	hintsUsed: {}
});
var isStepDone = (p, stepId) => p.solved.includes(stepId);
/** The first step that is not done, or `undefined` when the mission is complete. Steps open one by one. */
var currentStep = (m, p) => allSteps(m).find((s) => !isStepDone(p, s.id));
/** The progress with one more solved step and its accepted program or answer ("" for a lesson). */
var markSolved = (p, stepId, accepted) => isStepDone(p, stepId) ? p : {
	...p,
	solved: [...p.solved, stepId],
	answers: accepted === "" ? p.answers : {
		...p.answers,
		[stepId]: accepted
	}
};
var HINT_COST = .25;
var MIN_STEP_POINTS = .5;
/** Score from 0 to 1 for the solved task steps: 1 per step, minus 0.25 per hint, but at least 0.5 per step. */
var missionScore = (m, solved, hintsUsed) => {
	const steps = taskSteps(m);
	const points = steps.filter((s) => solved.includes(s.id)).reduce((sum, s) => sum + Math.max(MIN_STEP_POINTS, 1 - HINT_COST * Math.max(0, hintsUsed[s.id] ?? 0)), 0);
	return steps.length === 0 ? 0 : Number((points / steps.length).toFixed(2));
};
var makeReport = (m, p, stepId) => {
	const tasks = taskSteps(m);
	const solvedSteps = tasks.filter((s) => p.solved.includes(s.id)).length;
	return {
		missionId: m.id,
		stepId,
		solvedSteps,
		totalSteps: tasks.length,
		finished: solvedSteps === tasks.length,
		score: missionScore(m, p.solved, p.hintsUsed),
		progress: p
	};
};
/**
* Checks every task step of a mission again with the saved answers, for example on a server before it gives a
* certificate. A step without an answer does not pass.
*/
var checkMission = async (drivers, m, answers) => {
	const checks = [];
	for (const step of taskSteps(m)) {
		const answer = Object.hasOwn(answers, step.id) ? answers[step.id] : void 0;
		const passed = answer === void 0 ? false : step.kind === "answer" ? answerIsRight(step, answer) : (await checkProgram(drivers, step, answer))._tag === "Solved";
		checks.push({
			stepId: step.id,
			passed
		});
	}
	return checks;
};
// src/quests/curriculum.ts
var topic = (grade, paragraph, title, words) => ({
	id: `${grade}-${paragraph}`,
	grade,
	paragraph,
	title,
	words
});
var topics = [
	topic(5, 20, "Середовище опису та виконання алгоритмів", ["print"]),
	topic(5, 21, "Основні поняття мови Python", []),
	topic(5, 22, "Лінійні алгоритми", ["input", "int"]),
	topic(5, 23, "Математичні оператори Python", [
		"from",
		"import",
		"random",
		"randint"
	]),
	topic(5, 24, "«Черепашача» графіка", [
		"turtle",
		"forward",
		"fd",
		"back",
		"bk",
		"left",
		"lt",
		"right",
		"rt",
		"up",
		"down",
		"goto",
		"circle",
		"dot",
		"width",
		"home"
	]),
	topic(5, 25, "Алгоритми створення зображень", [
		"setup",
		"bgcolor",
		"color",
		"begin_fill",
		"end_fill",
		"fillcolor",
		"write",
		"shape",
		"stamp",
		"shapesize"
	]),
	topic(5, 26, "Логічні вирази", [
		"and",
		"or",
		"not",
		"True",
		"False"
	]),
	topic(5, 27, "Команда if", ["if", "str"]),
	topic(5, 28, "Команда if...else", ["else", "float"]),
	topic(5, 29, "Цикл із параметром", [
		"for",
		"in",
		"range",
		"pass",
		"<list>"
	]),
	topic(5, 30, "Цикли для побудови зображень", [
		"<index>",
		"hideturtle",
		"speed"
	]),
	topic(6, 18, "Величини. Команда присвоювання", ["<+=>"]),
	topic(6, 19, "Вкладені цикли з лічильником", [
		"penup",
		"pendown",
		"Turtle",
		"end"
	]),
	topic(6, 20, "Вкладені розгалуження", ["elif"]),
	topic(6, 21, "Цикли з передумовою", [
		"while",
		"xcor",
		"ycor"
	]),
	topic(6, 22, "Вкладені цикли та розгалуження", ["break"]),
	topic(7, 8, "Мова Python. Лінійні проєкти", ["round", "abs"]),
	topic(7, 9, "Розгалуження. Проєкти з розгалуженнями", []),
	topic(7, 10, "Підпрограми", [
		"def",
		"return",
		"len",
		"sum"
	]),
	topic(7, 11, "Проєкти з вікнами", [
		"tkinter",
		"Tk",
		".title",
		".geometry",
		".mainloop"
	]),
	topic(7, 12, "Події. Обробники подій. Вікна повідомлень", [
		"<f-string>",
		"messagebox",
		"showinfo",
		".bind"
	]),
	topic(7, 13, "Графічні зображення на вікні", [
		"Canvas",
		".pack",
		"create_line",
		"create_rectangle",
		"create_oval",
		"create_polygon",
		".delete"
	]),
	topic(8, 12, "Кнопка", ["Button", ".place"]),
	topic(8, 13, "Напис", ["Label"]),
	topic(8, 14, "Поле. Вхідні та вихідні дані", [
		"Entry",
		".get",
		".insert",
		"focus_set",
		"END"
	]),
	topic(8, 15, "Логічні вирази. Логічні змінні", []),
	topic(8, 16, "Віконні проєкти з розгалуженнями", ["showerror", "showwarning"]),
	topic(8, 17, "Прапорці та перемикачі", [
		"Checkbutton",
		"Radiobutton",
		"IntVar",
		"BooleanVar",
		".set"
	]),
	topic(8, 18, "Цикли з лічильником", ["list"]),
	topic(8, 19, "Цикли з передумовою", []),
	topic(9, 9, "Списки в Python", [
		".append",
		".split",
		"map",
		".join",
		"<comprehension>"
	]),
	topic(9, 10, "Опрацювання списків", [
		"<slice>",
		"max",
		"min",
		".remove",
		".pop",
		".index"
	]),
	topic(9, 11, "Сортування та пошук у списках", [
		"sorted",
		".sort",
		".reverse",
		"reverse"
	]),
	topic(9, 12, "Рядкові величини", [
		".replace",
		".find",
		".startswith",
		".endswith",
		".upper",
		".lower",
		".strip",
		".count",
		".isdigit"
	]),
	topic(9, 13, "Модулі", [
		"math",
		"sqrt",
		"pi",
		"ceil",
		"floor",
		"hypot"
	])
];
/** Words that no topic of the course teaches. Base missions must not use them. */
var notTaught = [
	"try",
	"except",
	"finally",
	"raise",
	"lambda",
	"eval",
	"exec",
	"global",
	"nonlocal",
	"class",
	"with",
	"yield",
	"assert",
	"del",
	"is",
	"continue",
	"async",
	"await",
	".grid",
	".config",
	".configure",
	".after",
	".destroy",
	"StringVar",
	"enumerate",
	"zip",
	"<dict>"
];
/** The topic with this id. The tests check that every id in the missions is known. */
var topicById = (id) => topics.find((t) => t.id === id);
/** "5 клас, §27" for the map of the mission. */
var topicLabel = (id) => {
	const t = topicById(id);
	return t === void 0 ? id : `${t.grade} клас, §${t.paragraph}`;
};
/**
* Names, methods (with a dot), keywords and forms of syntax of the code: `x.get()` gives "x" and ".get",
* `s[1:3]` gives "<slice>".
*/
var featuresOf = (code) => {
	const found = /* @__PURE__ */ new Set();
	parser.parse(code).iterate({ enter: (node) => {
		const text = code.slice(node.from, node.to);
		switch (node.name) {
			case "VariableName":
				found.add(text);
				return;
			case "PropertyName":
				found.add(`.${text}`);
				return;
			case "ArrayExpression":
				found.add("<list>");
				return;
			case "ArrayComprehensionExpression":
				found.add("<comprehension>");
				return;
			case "DictionaryExpression":
				found.add("<dict>");
				return;
			case "FormatString":
				found.add("<f-string>");
				return;
			case "UpdateStatement":
				found.add("<+=>");
				return;
			case "MemberExpression":
				if (text.endsWith("]")) found.add(text.slice(text.indexOf("[")).includes(":") ? "<slice>" : "<index>");
				return;
			default: if (node.name === "Boolean") found.add(text);
			else if (/^[a-z]+$/.test(node.name)) found.add(node.name);
		}
	} });
	return found;
};
/** The index of the topic that first teaches the feature; -1 for a word that is never taught; undefined for a name of the program. */
var topicIndexOf = (feature) => {
	const plain = feature.startsWith(".") ? feature.slice(1) : feature;
	const variants = feature.startsWith(".") ? [feature, plain] : [feature];
	for (const variant of variants) {
		if (notTaught.includes(variant)) return -1;
		const index = topics.findIndex((t) => t.words.includes(variant));
		if (index >= 0) return index;
	}
};
/**
* Words of the code that students do not know after the topic `after`: words of later topics and words that the
* course never teaches. `taught` are the words that the lessons of a bonus mission explain.
*/
var unknownWords = (code, after, taught) => {
	const limit = topics.findIndex((t) => t.id === after);
	return [...featuresOf(code)].filter((feature) => {
		if (taught.includes(feature)) return false;
		const index = topicIndexOf(feature);
		return index !== void 0 && (index === -1 || index > limit);
	});
};
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
/** A base mission uses only what the class knows. A bonus mission is for stronger students and teaches more. */
var Levels = {
	Base: "base",
	Bonus: "bonus"
};
export { runTrial as C, TurnEnds as D, wordsOf as E, workerDriver as O, normalizeOutput as S, verdictMessage as T, taskSteps as _, topicById as a, missingWords as b, unknownWords as c, currentStep as d, emptyProgress as f, missionScore as g, markSolved as h, notTaught as i, allSteps as l, makeReport as m, Speakers as n, topicLabel as o, isStepDone as p, featuresOf as r, topics as s, Levels as t, checkMission as u, answerIsRight as v, showsValue as w, normalizeAnswer as x, checkProgram as y };
