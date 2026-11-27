import { parser } from "@lezer/python"

/**
 * The Python topics of the school course (grades 5–9) in the order of the lessons, and the Python words that each
 * topic teaches first. A step of a base mission names the topic after which it can be given, and its programs may
 * use only words of that topic and the topics before it. So students do not see code that they learn two lessons
 * later. The order and the words come from the Python code of the topics, their tasks and their works.
 */

export interface Topic {
  /** "5-27" is grade 5, paragraph 27. */
  readonly id: string
  readonly grade: number
  readonly paragraph: number
  readonly title: string
  /**
   * Words first taught in this topic. A plain word matches a name or a method (`forward`, `x.forward`), a word that
   * starts with a dot matches only a method (`.get`), and a word in angle brackets is a form of syntax (`<list>`).
   */
  readonly words: readonly string[]
}

const topic = (grade: number, paragraph: number, title: string, words: readonly string[]): Topic => ({
  id: `${grade}-${paragraph}`,
  grade,
  paragraph,
  title,
  words
})

export const topics: readonly Topic[] = [
  topic(5, 20, "Середовище опису та виконання алгоритмів", ["print"]),
  topic(5, 21, "Основні поняття мови Python", []),
  topic(5, 22, "Лінійні алгоритми", ["input", "int"]),
  topic(5, 23, "Математичні оператори Python", ["from", "import", "random", "randint"]),
  topic(5, 24, "«Черепашача» графіка", [
    "turtle", "forward", "fd", "back", "bk", "left", "lt", "right", "rt", "up", "down", "goto", "circle", "dot",
    "width", "home"
  ]),
  topic(5, 25, "Алгоритми створення зображень", [
    "setup", "bgcolor", "color", "begin_fill", "end_fill", "fillcolor", "write", "shape", "stamp", "shapesize"
  ]),
  topic(5, 26, "Логічні вирази", ["and", "or", "not", "True", "False"]),
  topic(5, 27, "Команда if", ["if", "str"]),
  topic(5, 28, "Команда if...else", ["else", "float"]),
  topic(5, 29, "Цикл із параметром", ["for", "in", "range", "pass", "<list>"]),
  topic(5, 30, "Цикли для побудови зображень", ["<index>", "hideturtle", "speed"]),
  topic(6, 18, "Величини. Команда присвоювання", ["<+=>"]),
  topic(6, 19, "Вкладені цикли з лічильником", ["penup", "pendown", "Turtle", "end"]),
  topic(6, 20, "Вкладені розгалуження", ["elif"]),
  topic(6, 21, "Цикли з передумовою", ["while", "xcor", "ycor"]),
  topic(6, 22, "Вкладені цикли та розгалуження", ["break"]),
  topic(7, 8, "Мова Python. Лінійні проєкти", ["round", "abs"]),
  topic(7, 9, "Розгалуження. Проєкти з розгалуженнями", []),
  topic(7, 10, "Підпрограми", ["def", "return", "len", "sum"]),
  topic(7, 11, "Проєкти з вікнами", ["tkinter", "Tk", ".title", ".geometry", ".mainloop"]),
  topic(7, 12, "Події. Обробники подій. Вікна повідомлень", ["<f-string>", "messagebox", "showinfo", ".bind"]),
  topic(7, 13, "Графічні зображення на вікні", [
    "Canvas", ".pack", "create_line", "create_rectangle", "create_oval", "create_polygon", ".delete"
  ]),
  topic(8, 12, "Кнопка", ["Button", ".place"]),
  topic(8, 13, "Напис", ["Label"]),
  topic(8, 14, "Поле. Вхідні та вихідні дані", ["Entry", ".get", ".insert", "focus_set", "END"]),
  topic(8, 15, "Логічні вирази. Логічні змінні", []),
  topic(8, 16, "Віконні проєкти з розгалуженнями", ["showerror", "showwarning"]),
  topic(8, 17, "Прапорці та перемикачі", ["Checkbutton", "Radiobutton", "IntVar", "BooleanVar", ".set"]),
  topic(8, 18, "Цикли з лічильником", ["list"]),
  topic(8, 19, "Цикли з передумовою", []),
  topic(9, 9, "Списки в Python", [".append", ".split", "map", ".join", "<comprehension>"]),
  topic(9, 10, "Опрацювання списків", ["<slice>", "max", "min", ".remove", ".pop", ".index"]),
  topic(9, 11, "Сортування та пошук у списках", ["sorted", ".sort", ".reverse", "reverse"]),
  topic(9, 12, "Рядкові величини", [
    ".replace", ".find", ".startswith", ".endswith", ".upper", ".lower", ".strip", ".count", ".isdigit"
  ]),
  topic(9, 13, "Модулі", ["math", "sqrt", "pi", "ceil", "floor", "hypot"])
]

/** Words that no topic of the course teaches. Base missions must not use them. */
export const notTaught: readonly string[] = [
  "try", "except", "finally", "raise", "lambda", "eval", "exec", "global", "nonlocal", "class", "with", "yield",
  "assert", "del", "is", "continue", "async", "await", ".grid", ".config", ".configure", ".after", ".destroy",
  "StringVar", "enumerate", "zip", "<dict>"
]

/** The topic with this id. The tests check that every id in the missions is known. */
export const topicById = (id: string): Topic | undefined => topics.find((t) => t.id === id)

/** "5 клас, §27" for the map of the mission. */
export const topicLabel = (id: string): string => {
  const t = topicById(id)
  return t === undefined ? id : `${t.grade} клас, §${t.paragraph}`
}

/**
 * Names, methods (with a dot), keywords and forms of syntax of the code: `x.get()` gives "x" and ".get",
 * `s[1:3]` gives "<slice>".
 */
export const featuresOf = (code: string): ReadonlySet<string> => {
  const found = new Set<string>()
  parser.parse(code).iterate({
    enter: (node) => {
      const text = code.slice(node.from, node.to)
      switch (node.name) {
        case "VariableName":
          found.add(text)
          return
        case "PropertyName":
          found.add(`.${text}`)
          return
        case "ArrayExpression":
          found.add("<list>")
          return
        case "ArrayComprehensionExpression":
          found.add("<comprehension>")
          return
        case "DictionaryExpression":
          found.add("<dict>")
          return
        case "FormatString":
          found.add("<f-string>")
          return
        case "UpdateStatement":
          found.add("<+=>")
          return
        case "MemberExpression":
          if (text.endsWith("]")) found.add(text.slice(text.indexOf("[")).includes(":") ? "<slice>" : "<index>")
          return
        default:
          if (node.name === "Boolean") found.add(text)
          else if (/^[a-z]+$/.test(node.name)) found.add(node.name)
      }
    }
  })
  return found
}

/** The index of the topic that first teaches the feature; -1 for a word that is never taught; undefined for a name of the program. */
const topicIndexOf = (feature: string): number | undefined => {
  const plain = feature.startsWith(".") ? feature.slice(1) : feature
  const variants = feature.startsWith(".") ? [feature, plain] : [feature]
  for (const variant of variants) {
    if (notTaught.includes(variant)) return -1
    const index = topics.findIndex((t) => t.words.includes(variant))
    if (index >= 0) return index
  }
  return undefined
}

/**
 * Words of the code that students do not know after the topic `after`: words of later topics and words that the
 * course never teaches. `taught` are the words that the lessons of a bonus mission explain.
 */
export const unknownWords = (code: string, after: string, taught: readonly string[]): readonly string[] => {
  const limit = topics.findIndex((t) => t.id === after)
  return [...featuresOf(code)].filter((feature) => {
    if (taught.includes(feature)) return false
    const index = topicIndexOf(feature)
    return index !== undefined && (index === -1 || index > limit)
  })
}
