import { beforeAll, describe, expect, test } from "vitest"
import { type Engine, type EngineSink, type RunResult, silentSink } from "../src/engine/engine.ts"
import { loadNodeEngine } from "../src/engine/sources.ts"
import type { Chunk, ProgramFile, TkInput } from "../src/engine/protocol.ts"

// The widgets and dialogs of tkinter for window projects: Text with tags, lists, menus, pictures, and the
// dialogs that wait for the student (questions, values, files).

let engine: Engine

beforeAll(async () => {
  engine = await loadNodeEngine()
})

type Json = Record<string, unknown>

interface Captured {
  readonly result: RunResult
  readonly output: string
  readonly scene: Json | null
  readonly images: ReadonlyArray<Json>
  readonly downloads: ReadonlyArray<ProgramFile>
}

const capture = (call: (sink: EngineSink) => RunResult): Captured => {
  const chunks: Array<Chunk> = []
  const scenes: Array<string> = []
  const images: Array<Json> = []
  const downloads: Array<ProgramFile> = []
  const result = call({
    ...silentSink,
    chunk: (c) => chunks.push(c),
    scene: (s) => scenes.push(s),
    image: (i) => images.push(JSON.parse(i) as Json),
    download: (f) => downloads.push(f)
  })
  const last = scenes.at(-1)
  return { result, output: chunks.map((c) => c.text).join(""), scene: last === undefined ? null : (JSON.parse(last) as Json), images, downloads }
}

const start = (code: string, answers: ReadonlyArray<unknown> = [], files: ReadonlyArray<ProgramFile> = []) =>
  capture((sink) => engine.run({ _tag: "Run", code, inputs: [], seed: 1, answers: answers.map((a) => JSON.stringify(a)), files }, sink))

const send = (input: TkInput, answers: ReadonlyArray<unknown> = [], files: ReadonlyArray<ProgramFile> = []) =>
  capture((sink) => engine.event({ _tag: "Event", input, layout: [], answers: answers.map((a) => JSON.stringify(a)), files }, sink))

const widgets = (scene: Json | null): ReadonlyArray<Json> => (scene?.widgets as ReadonlyArray<Json> | undefined) ?? []

const widget = (scene: Json | null, kind: string, text = ""): Json => {
  const found = widgets(scene).find((w) => w.kind === kind && (text === "" || w.text === text))
  if (found === undefined) throw new Error(`no ${kind} "${text}"`)
  return found
}

const idOf = (w: Json): number => w.id as number

const dialogOf = (r: Captured): Json => {
  if (r.result._tag !== "Asking") throw new Error(`not asking: ${JSON.stringify(r.result)}`)
  return JSON.parse(r.result.dialog) as Json
}

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text)

/** A PNG of 2 × 3 pixels: only the signature and the header matter for the engine. */
const tinyPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 2, 0, 0, 0, 3, 8, 6, 0, 0, 0])

describe("Text with tags", () => {
  const Editor = `from tkinter import *
root = Tk()
t = Text(root, undo=True)
t.pack()
t.insert(END, "Привіт, світе!")
t.tag_configure("red", foreground="red", font=("Arial", 12, "bold"))
t.tag_add("red", "1.0", "1.6")
def find():
    t.tag_remove("found", "1.0", END)
    at = t.search("світ", "1.0", stopindex=END)
    if at:
        t.tag_add("found", at, at + "+4c")
        t.tag_config("found", background="yellow")
    print(at, t.tag_ranges("found"))
Button(root, text="Знайти", command=find).pack()
def copy():
    print(repr(t.get(SEL_FIRST, SEL_LAST)), t.index(INSERT))
    t.event_generate("<<Copy>>")
    t.event_generate("<<Paste>>")
    print(t.get("1.0", "end-1c"))
Button(root, text="Копія", command=copy).pack()
root.mainloop()
`

  test("sends the coloured parts of the text to the page", () => {
    // Act
    const r = start(Editor)

    // Assert
    const text = widget(r.scene, "Text")
    const style = text.textStyle as Json
    expect(style.parts).toEqual([[0, 6, "red", "", expect.stringContaining("bold"), false, false]])
  })

  test("finds a word, keeps tags when the student types before them", () => {
    // Arrange
    const scene = start(Editor).scene
    const text = idOf(widget(scene, "Text"))

    // Act
    send({ _tag: "Edit", widget: text, text: ">> Привіт, світе!" })
    const r = send({ _tag: "Invoke", widget: idOf(widget(scene, "Button", "Знайти")) })

    // Assert
    expect(r.output).toBe("1.11 ('1.11', '1.15')\n")
    const parts = (widget(r.scene, "Text").textStyle as Json).parts
    expect(parts).toEqual([
      [3, 9, "red", "", expect.any(String), false, false],
      [11, 15, "", "yellow", "", false, false]
    ])
  })

  test("copies and pastes the selection of the student", () => {
    // Arrange
    const scene = start(Editor).scene
    const text = idOf(widget(scene, "Text"))

    // Act
    send({ _tag: "Selection", widget: text, start: 0, end: 6, caret: 6 })
    const r = send({ _tag: "Invoke", widget: idOf(widget(scene, "Button", "Копія")) })

    // Assert
    expect(r.output).toBe("'Привіт' 1.6\nПривіт, світе!\n")
  })

  test("undoes the last change and reports <<Modified>>", () => {
    // Act
    const r = start(`from tkinter import *
root = Tk()
t = Text(root, undo=True)
t.bind("<<Modified>>", lambda e: print("змінено"))
t.insert("1.0", "a")
t.insert(END, "b")
t.edit_undo()
print(t.get("1.0", "end-1c"), t.edit_modified())
`)

    // Assert
    expect(r.output).toBe("змінено\na True\n")
  })
})

describe("lists", () => {
  test("Listbox gives the chosen rows and <<ListboxSelect>>", () => {
    // Arrange
    const scene = start(`from tkinter import *
root = Tk()
lb = Listbox(root, selectmode=MULTIPLE)
for name in ["Київ", "Львів", "Одеса"]:
    lb.insert(END, name)
lb.delete(0)
lb.insert(0, "Дніпро")
lb.bind("<<ListboxSelect>>", lambda e: print([lb.get(i) for i in lb.curselection()]))
lb.pack()
root.mainloop()
`).scene
    const list = widget(scene, "Listbox")

    // Act
    const r = send({ _tag: "Pick", widget: idOf(list), items: [0, 2] })

    // Assert
    expect((list.list as Json).rows).toEqual([["Дніпро", "", ""], ["Львів", "", ""], ["Одеса", "", ""]])
    expect(r.output).toBe("['Дніпро', 'Одеса']\n")
  })

  test("Spinbox goes to the next value and calls its command", () => {
    // Arrange
    const scene = start(`from tkinter import *
root = Tk()
s = Spinbox(root, from_=1, to=3, command=lambda: print(s.get()))
s.pack()
root.mainloop()
`).scene
    const spin = idOf(widget(scene, "Spinbox"))

    // Act
    send({ _tag: "Spin", widget: spin, up: true })
    send({ _tag: "Spin", widget: spin, up: true })
    const r = send({ _tag: "Spin", widget: spin, up: true })

    // Assert
    expect(r.output).toBe("3\n")
  })

  test("Combobox sets its text and sends <<ComboboxSelected>>", () => {
    // Arrange
    const scene = start(`from tkinter import *
from tkinter import ttk
root = Tk()
c = ttk.Combobox(root, values=["5 клас", "6 клас"], state="readonly")
c.current(0)
c.bind("<<ComboboxSelected>>", lambda e: print(c.get(), c.current()))
c.pack()
root.mainloop()
`).scene
    const combo = widget(scene, "Combobox", "5 клас")

    // Act
    const r = send({ _tag: "Pick", widget: idOf(combo), items: [1] })

    // Assert
    expect(r.output).toBe("6 клас 1\n")
  })

  test("Scrollbar knows the widget it scrolls", () => {
    // Act
    const r = start(`from tkinter import *
from tkinter.scrolledtext import ScrolledText
root = Tk()
t = Text(root)
bar = Scrollbar(root, command=t.yview)
t.config(yscrollcommand=bar.set)
bar.pack(side=RIGHT, fill=Y)
t.pack()
st = ScrolledText(root, width=30, height=5)
st.pack()
root.mainloop()
`)

    // Assert
    const texts = widgets(r.scene).filter((w) => w.kind === "Text").map(idOf)
    const bars = widgets(r.scene).filter((w) => w.kind === "Scrollbar").map((w) => (w.scroll as Json).target)
    expect(bars).toEqual(texts)
  })
})

describe("menus", () => {
  const MenuProgram = `from tkinter import *
root = Tk()
bar = Menu(root)
file = Menu(bar, tearoff=0)
file.add_command(label="Новий", command=lambda: print("новий"), accelerator="Ctrl+N")
file.add_separator()
dark = BooleanVar()
file.add_checkbutton(label="Темна тема", variable=dark, command=lambda: print(dark.get()))
bar.add_cascade(label="Файл", menu=file)
root.config(menu=bar)
size = StringVar(value="12")
OptionMenu(root, size, "10", "12", "14", command=lambda v: print("розмір", v)).pack()
root.mainloop()
`

  test("shows the menu bar of the window", () => {
    // Act
    const r = start(MenuProgram)

    // Assert
    const windows = r.scene?.windows as ReadonlyArray<Json>
    const bar = widgets(r.scene).find((w) => w.id === windows[0]?.menu)
    const entries = (bar?.menu as Json).entries as ReadonlyArray<Json>
    expect(entries.map((e) => [e.type, e.label])).toEqual([["cascade", "Файл"]])
  })

  test("runs the command of an entry and toggles a check entry", () => {
    // Arrange
    const scene = start(MenuProgram).scene
    const file = widgets(scene).find((w) => w.kind === "Menu" && ((w.menu as Json).entries as ReadonlyArray<Json>).length === 3)
    const id = idOf(file ?? {})

    // Act
    const first = send({ _tag: "MenuItem", widget: id, index: 0 })
    const second = send({ _tag: "MenuItem", widget: id, index: 2 })

    // Assert
    expect(first.output).toBe("новий\n")
    expect(second.output).toBe("True\n")
  })

  test("OptionMenu sets the variable and calls the command", () => {
    // Arrange
    const scene = start(MenuProgram).scene
    const button = widget(scene, "Menubutton", "12")

    // Act
    const r = send({ _tag: "MenuItem", widget: button.opens as number, index: 2 })

    // Assert
    expect(r.output).toBe("розмір 14\n")
    expect(widget(r.scene, "Menubutton").text).toBe("14")
  })
})

describe("dialogs", () => {
  test("a question before mainloop() waits, then the program runs again with the answer", () => {
    // Arrange
    const code = `from tkinter import messagebox, simpledialog
if messagebox.askyesno("Гра", "Почати?"):
    print("Ім'я:", simpledialog.askstring("Гра", "Як тебе звати?"))
`

    // Act
    const first = start(code)
    const second = start(code, ["yes"])
    const third = start(code, ["yes", "Оля"])

    // Assert
    expect(dialogOf(first)).toMatchObject({ kind: "question", title: "Гра", message: "Почати?", buttons: ["yes", "no"] })
    expect(dialogOf(second)).toMatchObject({ kind: "value", message: "Як тебе звати?" })
    expect(third.output).toBe("Ім'я: Оля\n")
  })

  test("a handler asks: the page sends the same action with the answer", () => {
    // Arrange
    const scene = start(`from tkinter import *
from tkinter import simpledialog, colorchooser
root = Tk()
def ask():
    n = simpledialog.askinteger("Вік", "Скільки тобі років?", minvalue=1, maxvalue=120)
    rgb, color = colorchooser.askcolor("red")
    print(n, rgb, color)
Button(root, text="Питати", command=ask).pack()
root.mainloop()
`).scene
    const button: TkInput = { _tag: "Invoke", widget: idOf(widget(scene, "Button", "Питати")) }

    // Act
    const first = send(button)
    const second = send(button, ["12"])
    const third = send(button, ["12", "#00ff00"])

    // Assert
    expect(dialogOf(first)).toMatchObject({ kind: "value", number: "int", min: 1, max: 120 })
    expect(dialogOf(second)).toMatchObject({ kind: "color", initial: "#ff0000" })
    expect(third.output).toBe("12 (0, 255, 0) #00ff00\n")
    expect(third.result).toEqual({ _tag: "Waiting" })
  })

  test("opens a file that the student gave and offers the saved file for download", () => {
    // Arrange
    const scene = start(`from tkinter import *
from tkinter import filedialog
root = Tk()
t = Text(root)
t.pack()
def open_file():
    name = filedialog.askopenfilename(filetypes=[("Текст", "*.txt")])
    if name:
        with open(name, encoding="utf-8") as f:
            t.insert("1.0", f.read())
        root.title(name)
def save_file():
    f = filedialog.asksaveasfile(defaultextension=".txt")
    if f:
        f.write(t.get("1.0", "end-1c") + "!")
Button(root, text="Відкрити", command=open_file).pack()
Button(root, text="Зберегти", command=save_file).pack()
root.mainloop()
`).scene
    const open: TkInput = { _tag: "Invoke", widget: idOf(widget(scene, "Button", "Відкрити")) }
    const save: TkInput = { _tag: "Invoke", widget: idOf(widget(scene, "Button", "Зберегти")) }

    // Act
    const asked = send(open)
    const opened = send(open, ["вірш.txt"], [{ name: "../вірш.txt", data: bytes("Садок вишневий") }])
    const saved = send(save, ["копія"])

    // Assert
    expect(dialogOf(asked)).toMatchObject({ kind: "open", filetypes: [["Текст", "*.txt"]] })
    expect((opened.scene?.windows as ReadonlyArray<Json>)[0]?.title).toBe("/вірш.txt")
    expect(saved.downloads.map((f) => [f.name, new TextDecoder().decode(f.data)])).toEqual([["копія.txt", "Садок вишневий!"]])
  })

  test("a test check cannot answer a dialog: the program needs input", () => {
    // Act
    const r = start(`from tkinter import messagebox
messagebox.askokcancel("?", "?")`)

    // Assert
    expect(r.result._tag).toBe("Asking")
  })
})

describe("PhotoImage", () => {
  test("reads a PNG file of the program and shows it in a label and on a canvas", () => {
    // Act
    const r = start(
      `from tkinter import *
root = Tk()
img = PhotoImage(file="pic.png")
big = img.zoom(2)
Label(root, image=img, text="Кіт", compound=TOP).pack()
c = Canvas(root)
c.create_image(10, 10, image=big, anchor=NW)
c.pack()
print(img.width(), img.height(), big.width(), c.bbox(1))
root.mainloop()
`,
      [],
      [{ name: "pic.png", data: tinyPng }]
    )

    // Assert
    expect(r.output).toBe("2 3 4 (10, 10, 14, 16)\n")
    expect(r.images.map((i) => [i.id, i.shownWidth, (i.base as Json).mime])).toEqual([[1, 2, "image/png"], [2, 4, "image/png"]])
    expect(widget(r.scene, "Label", "Кіт").image).toBe(1)
  })

  test("paints pixels and refuses a file that is not a picture", () => {
    // Act
    const r = start(`from tkinter import *
root = Tk()
img = PhotoImage(width=3, height=2)
img.put("red", to=(0, 0, 2, 2))
print(img.get(1, 1), img.get(2, 0))
with open("page.svg", "w") as f:
    f.write("<svg onload='alert(1)'></svg>")
try:
    PhotoImage(file="page.svg")
except TclError as e:
    print(e)
root.mainloop()
`)

    // Assert
    expect(r.output).toBe('(255, 0, 0) (0, 0, 0)\ncouldn\'t recognize data in image file "page.svg"\n')
    expect(r.images[0]?.pixels).toEqual([["red", 2, "", 1], ["red", 2, "", 1]])
  })
})
