/**
 * Explains a Python error for a grade 5 student, in Ukrainian. Input: the traceback that MicroPython prints
 * and the source code. MicroPython says only "invalid syntax" for most syntax errors, so for them we look at
 * the line and find the usual cause: no colon, no closing bracket or quote, typographic quotes, no indent.
 *
 * The explanation is plain text where `...` marks code (the view shows it in a monospace font).
 * Values from the program are put in `...` only after `codeSafe`.
 */
import { Option } from "effect"

export interface ProgramError {
  /** Line in the student code, from 1. */
  readonly line: Option.Option<number>
  /** Last line of the traceback, as Python printed it, for example `NameError: name 'x' isn't defined`. */
  readonly message: string
  readonly explanation: string
}

const KnownNames = [
  "print", "input", "int", "float", "str", "range", "len", "round", "abs", "max", "min", "sum", "list", "True", "False", "None",
  "import", "from", "for", "while", "if", "elif", "else", "def", "return", "and", "or", "not", "in", "break", "continue",
  "randint", "random", "turtle", "math", "sqrt", "forward", "backward", "back", "left", "right", "goto", "circle", "penup", "pendown",
  "up", "down", "color", "width", "pensize", "dot", "begin_fill", "end_fill", "write", "speed", "shape", "bgcolor", "done", "stamp",
  "home", "fillcolor", "pencolor", "hideturtle", "showturtle", "setheading", "position", "clear", "mainloop", "exitonclick",
  "tkinter", "messagebox", "Tk", "Label", "Button", "Entry", "Canvas", "Checkbutton", "Radiobutton", "Frame", "Text", "Scale",
  "StringVar", "IntVar", "BooleanVar", "pack", "place", "grid", "bind", "title", "geometry", "resizable", "configure",
  "showinfo", "showwarning", "showerror", "create_line", "create_rectangle", "create_oval",
  "create_polygon", "create_arc", "create_text", "destroy", "textvariable"
] as const

const AvailableModules = ["turtle", "tkinter", "random", "math"] as const

const HeaderKeyword = /^\s*(if|elif|else|for|while|def|class|try|except|finally|with)\b/
const TypographicQuotes = /[“”„«»‘’‚]/
const TypographicDashes = /[–—−]/
const TypographicMath = /[×÷]/
const Cyrillic = /[а-яА-ЯіІїЇєЄґҐ]/
const Latin = /[a-zA-Z]/

/** Code from the program inside `...`: without backticks, short. */
const codeSafe = (value: string): string => {
  const plain = value.replaceAll("`", "'")
  return plain.length > 40 ? `${plain.slice(0, 40)}…` : plain
}

const lastLine = (traceback: string): string => {
  const lines = traceback.split("\n").map((l) => l.trim()).filter((l) => l !== "")
  return lines.at(-1) ?? ""
}

const errorLine = (traceback: string): Option.Option<number> => {
  const lines = Array.from(traceback.matchAll(/File "main\.py", line (\d+)/g), (m) => Number(m[1]))
  return Option.fromNullishOr(lines.at(-1))
}

const levenshtein = (a: string, b: string): number => {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current.push(Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, (previous[j - 1] ?? 0) + cost))
    }
    previous = current
  }
  return previous[b.length] ?? 0
}

/** The most similar known word: same word in other letter case, or 1–2 letters are different. */
const similar = (name: string, candidates: ReadonlyArray<string>): Option.Option<string> => {
  const sameCase = candidates.find((c) => c !== name && c.toLowerCase() === name.toLowerCase())
  if (sameCase !== undefined) return Option.some(sameCase)
  const limit = name.length <= 4 ? 1 : 2
  const scored = candidates
    .filter((c) => c !== name)
    .map((c) => ({ c, d: levenshtein(name.toLowerCase(), c.toLowerCase()) }))
    .filter((x) => x.d <= limit)
    .sort((a, b) => a.d - b.d)
  return Option.fromNullishOr(scored[0]?.c)
}

const namesInCode = (code: string): ReadonlyArray<string> =>
  Array.from(new Set(Array.from(withoutStrings(code).matchAll(/[A-Za-z_]\w*/g), (m) => m[0])))

/** The line without string contents and comments: brackets and colons in text do not count. */
const withoutStrings = (line: string): string =>
  line.replace(/"[^"\n]*"|'[^'\n]*'/g, (s) => `${s[0] ?? ""}${s[0] ?? ""}`).replace(/#.*$/gm, "")

const indentOf = (line: string): number => line.length - line.trimStart().length

const typographic = (line: string): Option.Option<string> => {
  if (TypographicQuotes.test(line)) {
    return Option.some("У рядку є друковані лапки (“ ” « » ‘ ’). Python розуміє лише прямі лапки: `\"` або `'`. Видали ці лапки й надрукуй їх знову з англійської розкладки.")
  }
  if (TypographicDashes.test(line)) return Option.some("У рядку стоїть довге тире `–` замість мінуса. Видали його й надрукуй звичайний мінус `-`.")
  if (TypographicMath.test(line)) return Option.some("Python не знає знаків `×` і `÷`. Для множення пиши `*`, для ділення `/`.")
  return Option.none()
}

const bracketBalance = (line: string): number => {
  const clean = withoutStrings(line)
  let balance = 0
  for (const ch of clean) {
    if (ch === "(" || ch === "[" || ch === "{") balance++
    if (ch === ")" || ch === "]" || ch === "}") balance--
  }
  return balance
}

const unclosedQuote = (line: string): boolean => {
  const clean = line.replace(/"[^"\n]*"|'[^'\n]*'/g, "").replace(/#.*$/, "")
  return clean.includes("\"") || clean.includes("'")
}

interface Found {
  readonly line: number
  readonly explanation: string
}

/** Finds the usual cause of a syntax error near `reported` (lines from 1). */
const syntaxCause = (lines: ReadonlyArray<string>, reported: number): Option.Option<Found> => {
  const at = (n: number): string => lines[n - 1] ?? ""
  const previous = (() => {
    for (let n = reported - 1; n >= 1; n--) if (at(n).trim() !== "") return n
    return 0
  })()
  const checks: ReadonlyArray<(n: number) => Option.Option<string>> = [
    (n) => typographic(at(n)),
    (n) => {
      if (!unclosedQuote(at(n))) return Option.none()
      return Option.some("Лапки не закриті. Текст має починатися й закінчуватися однаковими лапками: `\"Привіт\"`.")
    },
    (n) => {
      const line = withoutStrings(at(n)).trimEnd()
      const keyword = HeaderKeyword.exec(line)?.[1]
      if (keyword === undefined || line.endsWith(":")) return Option.none()
      return Option.some(`У кінці рядка з \`${keyword}\` треба поставити двокрапку \`:\`.`)
    },
    (n) => {
      const line = withoutStrings(at(n))
      if (!/^\s*(if|elif|while)\b/.test(line) || !/[^=!<>]=[^=]/.test(line)) return Option.none()
      return Option.some("Щоб порівняти два значення, пиши два знаки дорівнює: `==`. Один знак `=` дає змінній значення.")
    },
    (n) => {
      const balance = bracketBalance(at(n))
      if (balance > 0) return Option.some("Дужка не закрита: бракує `)`. Кожна `(` повинна мати свою `)`.")
      if (balance < 0) return Option.some("У рядку зайва дужка `)`. Порахуй, скільки дужок відкрито й скільки закрито.")
      return Option.none()
    },
    (n) => {
      if (!/^\s*print\s+[^\s(=]/.test(at(n))) return Option.none()
      return Option.some("Після `print` треба дужки: `print(\"Привіт\")`.")
    },
    (n) => {
      if (!/[+\-*/%=,]\s*$/.test(withoutStrings(at(n)).trimEnd())) return Option.none()
      return Option.some("Рядок закінчується знаком дії, але після нього нічого немає. Допиши вираз до кінця.")
    }
  ]
  const indentAfterColon = (): Option.Option<Found> => {
    if (previous === 0 || !withoutStrings(at(previous)).trimEnd().endsWith(":")) return Option.none()
    if (indentOf(at(reported)) > indentOf(at(previous))) return Option.none()
    return Option.some({
      line: reported,
      explanation: "Після рядка з двокрапкою `:` команди всередині треба писати з відступом: 4 пробіли на початку рядка."
    })
  }
  const run = (n: number): Option.Option<Found> => {
    for (const check of checks) {
      const found = check(n)
      if (Option.isSome(found)) return Option.some({ line: n, explanation: found.value })
    }
    return Option.none()
  }
  // MicroPython often reports the line after the error (a missing colon, a bracket that is not closed).
  return run(reported).pipe(
    Option.orElse(indentAfterColon),
    Option.orElse(() => (previous === 0 ? Option.none() : run(previous)))
  )
}

const operationNames: Record<string, string> = {
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
}

const typeNames: Record<string, string> = {
  str: "текст",
  int: "ціле число",
  float: "дробове число",
  list: "список",
  bool: "логічне значення",
  NoneType: "None (нічого)"
}

const typeName = (type: string): string => typeNames[type] ?? type

const nameError = (name: string, code: string): string => {
  const shown = codeSafe(name)
  if (TypographicQuotes.test(name)) return Option.getOrElse(typographic(name), () => "")
  if (Cyrillic.test(name) && Latin.test(name)) {
    return `У слові \`${shown}\` змішані українські й англійські літери. Перемкни розкладку на англійську й надрукуй слово знову.`
  }
  if (Cyrillic.test(name)) {
    return `Python не знає слова \`${shown}\`. Якщо це текст, візьми його в лапки: \`"${shown}"\`.`
  }
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const assignedLater = new RegExp(`^\\s*${escaped}\\s*=[^=]`, "m").test(code)
  if (assignedLater) {
    return `Змінна \`${shown}\` ще не має значення в цьому місці. Спершу дай їй значення, а потім використовуй.`
  }
  const guess = similar(name, [...KnownNames, ...namesInCode(code)])
  if (Option.isSome(guess)) {
    const caseOnly = guess.value.toLowerCase() === name.toLowerCase()
    return caseOnly
      ? `Python не знає слова \`${shown}\`. Можливо, мало бути \`${guess.value}\`? Python розрізняє великі й малі літери.`
      : `Python не знає слова \`${shown}\`. Можливо, мало бути \`${guess.value}\`?`
  }
  return `Python не знає слова \`${shown}\`. Перевір, чи правильно воно написане. Якщо це змінна, спершу дай їй значення. Якщо це текст, візьми його в лапки.`
}

const valueError = (message: string): string => {
  const integer = /invalid syntax for integer with base 10: '(.*)'/.exec(message)
  if (integer !== null) {
    const value = integer[1] ?? ""
    if (value.trim() === "") return "`int()` отримав порожній текст. Можливо, ти нічого не ввів?"
    if (/^\s*-?\d+[.,]\d*\s*$/.test(value)) return `\`int()\` не перетворює дробові числа, як \`${codeSafe(value)}\`. Для них є \`float()\`.`
    return `\`int()\` перетворює на число лише цифри, а отримав \`${codeSafe(value)}\`.`
  }
  if (message.includes("invalid syntax for number")) return "`float()` перетворює на число лише запис числа, наприклад `2.5`. Дробову частину відділяй крапкою."
  if (message.includes("math domain error")) return "Цю математичну дію не можна виконати з таким числом (наприклад, корінь з від'ємного числа)."
  return "Значення не підходить для цієї дії."
}

const typeError = (message: string): string => {
  const unsupported = /unsupported types for (\w+): '(\w+)', '(\w+)'/.exec(message)
  if (unsupported !== null) {
    const action = operationNames[unsupported[1] ?? ""] ?? "виконати дію з"
    const left = unsupported[2] ?? ""
    const right = unsupported[3] ?? ""
    const withText = left === "str" || right === "str"
    const base = `Не можна ${action} ${typeName(left)} і ${typeName(right)}.`
    return withText
      ? `${base} Пам'ятай: \`input()\` завжди дає текст. Щоб рахувати, перетвори текст на число: \`int(...)\`. Щоб склеїти з текстом, перетвори число: \`str(...)\`.`
      : base
  }
  const notCallable = /'(\w+)' object isn't callable/.exec(message)
  if (notCallable !== null) {
    return `Після значення (${typeName(notCallable[1] ?? "")}) стоять дужки, ніби це команда. Можливо, бракує знака \`*\`, або змінна має таке саме ім'я, як команда.`
  }
  const argCount = /takes (\d+) positional arguments? but (\d+) (?:were|was) given/.exec(message)
  if (argCount !== null) return `У дужках неправильна кількість значень: треба ${argCount[1] ?? ""}, а є ${argCount[2] ?? ""}.`
  const noLen = /object of type '(\w+)' has no len/.exec(message)
  if (noLen !== null) return `\`len()\` рахує довжину тексту або списку, а не ${typeName(noLen[1] ?? "")}.`
  return "Ця дія не підходить для такого типу значення."
}

/** Errors of Tk (`TclError`): the window got a wrong option or value. */
const tclError = (message: string): string => {
  const geometry = /bad geometry specifier "(.*)"/.exec(message)
  if (geometry !== null) {
    return `Розмір вікна \`${codeSafe(geometry[1] ?? "")}\` записано неправильно. Пиши ширину й висоту через малу латинську x без пробілів: \`"500x300"\`.`
  }
  const color = /(?:unknown|invalid) color name "(.*)"/.exec(message)
  if (color !== null) {
    return `Tk не знає кольору \`${codeSafe(color[1] ?? "")}\`. Перевір назву англійською, наприклад \`"yellow"\`.`
  }
  const option = /unknown option "-(\w+)"/.exec(message) ?? /bad option "-(\w+)"/.exec(message)
  if (option !== null) return `Тут немає параметра \`${codeSafe(option[1] ?? "")}\`. Перевір, чи правильно написане його ім'я.`
  const manager = /cannot use geometry manager (\w+) inside \S+ which already has slaves managed by (\w+)/.exec(message)
  if (manager !== null) {
    return `В одному вікні (або рамці) не можна змішувати \`${manager[1] ?? ""}()\` і \`${manager[2] ?? ""}()\`. Розмісти всі віджети одним способом.`
  }
  if (message.includes("bad event type or keysym")) {
    return "Подію в `bind` записано неправильно. Пиши її в кутових дужках, наприклад `\"<Button-1>\"` або `\"<Key>\"`."
  }
  if (message.includes("wrong # coordinates")) return "Для цієї фігури на полотні треба інша кількість координат."
  if (/^expected (integer|floating-point number|boolean value)/.test(message) || message.includes("bad screen distance")) {
    return "Цей параметр має бути числом, а отримав інше значення."
  }
  return "Вікно не може виконати цю команду: перевір параметри віджета."
}

const explainMessage = (message: string, code: string): string => {
  const colon = message.indexOf(":")
  const type = colon === -1 ? message : message.slice(0, colon)
  const detail = colon === -1 ? "" : message.slice(colon + 1).trim()
  switch (type) {
    case "NameError": {
      const name = /name '(.+)' isn't defined/.exec(detail)?.[1]
      return name === undefined ? "Python не знає цього слова." : nameError(name, code)
    }
    case "ValueError":
      return valueError(detail)
    case "TypeError":
      return typeError(detail)
    case "ZeroDivisionError":
      return "Ділити на нуль не можна. Перевір, на що ділиш у цьому рядку."
    case "IndexError":
      return "Номер елемента більший, ніж їх є. Нумерація починається з 0: в списку з 3 елементів є номери 0, 1 і 2."
    case "KeyError":
      return `У словнику немає ключа \`${codeSafe(detail)}\`.`
    case "AttributeError": {
      const attribute = /has no attribute '(\w+)'/.exec(detail)?.[1] ?? ""
      return `Тут немає команди \`${codeSafe(attribute)}\`. Перевір, чи правильно написане слово після крапки.`
    }
    case "ImportError": {
      const module = /no module named '([\w.]+)'/.exec(detail)?.[1] ?? ""
      const guess = similar(module, AvailableModules)
      return Option.isSome(guess)
        ? `Python не знає модуля \`${codeSafe(module)}\`. Можливо, \`${guess.value}\`?`
        : `Модуля \`${codeSafe(module)}\` тут немає. Можна підключати \`turtle\`, \`tkinter\`, \`random\` і \`math\`.`
    }
    case "IndentationError":
      return detail.includes("unexpected indent")
        ? "Зайвий відступ на початку рядка. Прибери пробіли перед командою, або перевір, чи вона має бути всередині `if`, `for` чи `while`."
        : "Відступ цього рядка не збігається з відступами рядків вище. Пиши однакові відступи: 4 пробіли."
    case "TclError":
      return tclError(detail)
    case "NotImplementedError":
      return detail.includes("run the program in IDLE")
        ? "Ця команда tkinter поки не працює на сайті. Запусти програму в IDLE на комп'ютері."
        : "Ця дія поки не працює."
    case "RuntimeError":
      if (detail.includes("input()") && detail.includes("mainloop")) {
        return "У віконній програмі `input()` не працює після `mainloop()`. Щоб отримати дані від користувача, додай поле `Entry` і читай його через `get()`."
      }
      return detail.includes("recursion")
        ? "Функція викликає сама себе без кінця."
        : "Під час роботи програми сталася помилка."
    case "MemoryError":
      return "Програмі забракло пам'яті. Можливо, список або текст росте без кінця."
    case "OverflowError":
      return "Число вийшло завеликим."
    default:
      return `Під час роботи програми сталася помилка \`${codeSafe(type)}\`.`
  }
}

export const explainError = (traceback: string, code: string): ProgramError => {
  const message = lastLine(traceback)
  const line = errorLine(traceback)
  if (message.startsWith("SyntaxError")) {
    const lines = code.split("\n")
    const found = Option.flatMap(line, (n) => syntaxCause(lines, n))
    return Option.match(found, {
      onNone: () => ({
        line,
        message,
        explanation: "Python не зрозумів цей рядок. Перевір дужки, лапки, двокрапку в кінці `if`, `for`, `while` і відступи."
      }),
      onSome: (f) => ({ line: Option.some(f.line), message, explanation: f.explanation })
    })
  }
  if (message.startsWith("TypeError") && traceback.includes("/tkinter/_events.py") && /takes 0 positional arguments but 1/.test(message)) {
    return {
      line,
      message,
      explanation: "Функція, яку викликає `bind`, отримує подію. Додай для неї параметр: `def click(event):`."
    }
  }
  const typographicFirst = Option.flatMap(line, (n) => typographic(code.split("\n")[n - 1] ?? ""))
  return {
    line,
    message,
    explanation: message.startsWith("NameError") && Option.isSome(typographicFirst) ? typographicFirst.value : explainMessage(message, code)
  }
}
