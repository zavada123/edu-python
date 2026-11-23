import { beforeAll, describe, expect, test } from "vitest"
import { type Engine, type EngineSink, type RunResult, silentSink } from "../src/engine/engine.ts"
import { loadNodeEngine } from "../src/engine/sources.ts"
import type { Chunk, TkInput } from "../src/engine/protocol.ts"
import { decodeScene } from "../src/core/tk-scene.ts"

// Window programs of the textbooks that need more than the basic widgets: the place of a window on the screen,
// colours of pressed buttons, ttk styles, tabs, tables, progress bars, named fonts and widgets on a canvas.

let engine: Engine

beforeAll(async () => {
  engine = await loadNodeEngine()
})

type Json = Record<string, unknown>

interface Captured {
  readonly result: RunResult
  readonly output: string
  readonly raw: string | undefined
  readonly scene: Json | null
  readonly timers: ReadonlyArray<number>
}

const capture = (call: (sink: EngineSink) => RunResult): Captured => {
  const chunks: Array<Chunk> = []
  const scenes: Array<string> = []
  const timers: Array<number> = []
  const result = call({ ...silentSink, chunk: (c) => chunks.push(c), scene: (s) => scenes.push(s), timer: (id) => timers.push(id) })
  const raw = scenes.at(-1)
  return { result, output: chunks.map((c) => c.text).join(""), raw, scene: raw === undefined ? null : (JSON.parse(raw) as Json), timers }
}

const start = (code: string) => capture((sink) => engine.run({ _tag: "Run", code, inputs: [], seed: 1 }, sink))
const send = (input: TkInput) => capture((sink) => engine.event({ _tag: "Event", input, layout: [] }, sink))

const listOf = (scene: Json | null, key: "widgets" | "windows"): ReadonlyArray<Json> => (scene?.[key] as ReadonlyArray<Json> | undefined) ?? []

const widget = (scene: Json | null, kind: string, text = ""): Json => {
  const found = listOf(scene, "widgets").find((w) => w.kind === kind && (text === "" || w.text === text))
  if (found === undefined) throw new Error(`no ${kind} "${text}"`)
  return found
}

const windowOf = (scene: Json | null, title: string): Json => {
  const found = listOf(scene, "windows").find((w) => w.title === title)
  if (found === undefined) throw new Error(`no window "${title}"`)
  return found
}

const idOf = (w: Json): number => w.id as number

describe("windows on the screen", () => {
  test("geometry puts the window on the screen; a new window goes a little lower and to the right", () => {
    // Act
    const r = start(`from tkinter import *
root = Tk()
root.title("Головне")
root.geometry("300x200+780+410")
top = Toplevel(root)
top.title("Друге")
print(top.winfo_x(), top.winfo_y())
root.mainloop()`)

    // Assert
    expect(r.output).toBe("810 440\n")
    expect(windowOf(r.scene, "Головне")).toMatchObject({ x: 780, y: 410, placed: true })
    expect(windowOf(r.scene, "Друге")).toMatchObject({ x: 810, y: 440, placed: false })
  })

  test("the student drags a window: the program gets <Configure> and the new place", () => {
    // Arrange
    const r = start(`from tkinter import *
root = Tk()
root.geometry("200x100+10+20")
def moved(e):
    if e.widget is root:
        print("place", root.winfo_x(), root.winfo_y(), root.geometry())
root.bind("<Configure>", moved)
root.mainloop()`)
    const root = idOf(listOf(r.scene, "windows")[0] ?? {})

    // Act
    const moved = send({ _tag: "Move", widget: root, x: 150, y: 90 })

    // Assert
    expect(moved.output).toBe("place 150 90 200x100+150+90\n")
    expect(listOf(moved.scene, "windows")[0]).toMatchObject({ x: 150, y: 90, placed: true })
  })

  test("minsize, maxsize, attributes and lift go to the page", () => {
    // Act
    const r = start(`from tkinter import *
root = Tk()
root.minsize(300, 200)
root.maxsize(800, 600)
root.attributes("-alpha", 0.5)
root.attributes("-topmost", True)
second = Toplevel(root)
second.lift()
print(root.minsize(), root.attributes("-alpha"), root.attributes("-topmost"))
root.state("zoomed")
print(root.state())
root.mainloop()`)

    // Assert
    expect(r.output).toBe("(300, 200) 0.5 1\nzoomed\n")
    const main = windowOf(r.scene, "tk")
    expect(main).toMatchObject({ minSize: [300, 200], maxSize: [800, 600], alpha: 0.5, zoomed: true })
    // -topmost keeps the main window above the window that the program lifted later.
    expect(main.z as number).toBeGreaterThan(listOf(r.scene, "windows")[1]?.z as number)
  })
})

describe("buttons", () => {
  test("sends the colours of a pressed button, overrelief and the cursor", () => {
    // Act
    const r = start(`from tkinter import *
root = Tk()
Button(root, text="OK", fg="white", bg="green", activebackground="yellow", activeforeground="red", overrelief=GROOVE, cursor="hand2").pack()
Entry(root, insertbackground="red").pack()
root.mainloop()`)

    // Assert
    expect(widget(r.scene, "Button", "OK")).toMatchObject({ fg: "white", bg: "green", activeBg: "yellow", activeFg: "red", overrelief: "groove", cursor: "pointer" })
    expect(widget(r.scene, "Entry")).toMatchObject({ caret: "red" })
  })
})

describe("ttk", () => {
  test("Style gives colours and fonts to the widgets of its class and of its name", () => {
    // Act
    const r = start(`from tkinter import *
from tkinter import ttk
root = Tk()
s = ttk.Style()
s.theme_use("clam")
s.configure("TButton", foreground="red", background="yellow", padding=6)
s.configure("Big.TLabel", foreground="blue", font=("Arial", 20, "bold"))
s.map("TButton", background=[("active", "green")])
ttk.Button(root, text="Звичайна").pack()
ttk.Button(root, text="Своя", foreground="black").pack()
ttk.Label(root, text="Заголовок", style="Big.TLabel").pack()
print(s.lookup("TButton", "foreground"), s.theme_use())
root.mainloop()`)

    // Assert
    expect(r.output).toBe("red clam\n")
    expect(widget(r.scene, "Button", "Звичайна")).toMatchObject({ fg: "red", bg: "yellow", activeBg: "green", padx: 6, pady: 6 })
    expect(widget(r.scene, "Button", "Своя")).toMatchObject({ fg: "black", bg: "yellow" })
    expect(widget(r.scene, "Label", "Заголовок")).toMatchObject({ fg: "blue", font: "normal bold 27px/1.2 \"Arial\", sans-serif" })
  })

  test("Notebook shows one tab; a click on another tab sends <<NotebookTabChanged>>", () => {
    // Arrange
    const r = start(`from tkinter import *
from tkinter import ttk
root = Tk()
nb = ttk.Notebook(root)
one = ttk.Frame(nb)
two = ttk.Frame(nb)
nb.add(one, text="Перша")
nb.add(two, text="Друга")
nb.pack()
nb.bind("<<NotebookTabChanged>>", lambda e: print("tab", nb.index(nb.select())))
root.mainloop()`)
    const notebook = widget(r.scene, "Notebook")

    // Act
    const picked = send({ _tag: "Pick", widget: idOf(notebook), items: [1] })

    // Assert
    expect(notebook.tabs).toMatchObject({ current: 0, tabs: [[expect.any(Number), "Перша", "normal"], [expect.any(Number), "Друга", "normal"]] })
    expect(picked.output).toBe("tab 1\n")
    expect(widget(picked.scene, "Notebook").tabs).toMatchObject({ current: 1 })
  })

  test("Treeview keeps rows, gives the chosen row and opens a branch", () => {
    // Arrange
    const r = start(`from tkinter import *
from tkinter import ttk
root = Tk()
tree = ttk.Treeview(root, columns=("name", "mark"), show="tree headings")
tree.heading("name", text="Ім'я")
tree.heading("mark", text="Оцінка")
group = tree.insert("", END, text="7-А")
tree.insert(group, END, values=("Оля", 12))
tree.insert(group, END, values=("Петро", 9))
def chosen(e):
    item = tree.focus()
    print(tree.item(item)["values"], tree.selection() == (item,))
tree.bind("<<TreeviewSelect>>", chosen)
tree.pack()
print(len(tree.get_children(group)), tree.parent(tree.get_children(group)[0]) == group)
root.mainloop()`)
    const tree = widget(r.scene, "Treeview")

    // Act
    const opened = send({ _tag: "Toggle", widget: idOf(tree), index: 0 })
    const picked = send({ _tag: "Pick", widget: idOf(tree), items: [2] })

    // Assert
    expect(r.output).toBe("2 True\n")
    expect((tree.tree as Json).rows).toHaveLength(1)
    expect((widget(opened.scene, "Treeview").tree as Json).rows).toHaveLength(3)
    expect(picked.output).toBe("['Петро', 9] True\n")
  })

  test("Progressbar shows its value; start() moves it with a timer", () => {
    // Arrange
    const r = start(`from tkinter import *
from tkinter import ttk
root = Tk()
v = IntVar(value=40)
bar = ttk.Progressbar(root, length=200, variable=v)
bar.pack()
bar.start(100)
ttk.Separator(root, orient="horizontal").pack(fill="x")
root.mainloop()`)

    // Act
    const ticked = send({ _tag: "Timer", timer: r.timers[0] ?? 0 })

    // Assert
    expect(widget(r.scene, "Progressbar").progress).toMatchObject({ value: 40, maximum: 100, length: 200, running: true })
    expect(widget(ticked.scene, "Progressbar").progress).toMatchObject({ value: 41 })
    expect(widget(r.scene, "Separator").orient).toBe("horizontal")
  })

  test("every new widget decodes on the page", () => {
    // Act
    const r = start(`from tkinter import *
from tkinter import ttk
root = Tk()
nb = ttk.Notebook(root)
f = ttk.Frame(nb)
nb.add(f, text="A")
nb.pack()
t = ttk.Treeview(f, columns=("a",))
t.insert("", END, text="x", values=(1,))
t.pack()
ttk.Progressbar(root, mode="indeterminate").pack()
ttk.Separator(root).pack()
pw = PanedWindow(root)
pw.pack()
pw.add(Label(pw, text="ліво"))
c = Canvas(root)
c.pack()
c.create_window(10, 10, window=Button(c, text="на полотні"))
root.mainloop()`)

    // Assert
    expect(decodeScene(r.raw ?? "")._tag).toBe("Scene")
  })
})

describe("fonts and options", () => {
  test("a Font changes the widgets that use it", () => {
    // Arrange
    const r = start(`from tkinter import *
import tkinter.font as tkfont
root = Tk()
big = tkfont.Font(family="Arial", size=12, weight="bold")
b = Button(root, text="Більше", font=big, command=lambda: big.configure(size=24))
b.pack()
print(big.actual("weight"), big.measure("abc") > 0, big.metrics("linespace") > 0)
default = tkfont.nametofont("TkDefaultFont")
default.configure(size=14)
Label(root, text="Звичайна").pack()
root.mainloop()`)
    const button = widget(r.scene, "Button", "Більше")

    // Act
    const bigger = send({ _tag: "Invoke", widget: idOf(button) })

    // Assert
    expect(r.output).toBe("bold True True\n")
    expect(button.font).toBe("normal bold 16px/1.2 \"Arial\", sans-serif")
    expect(widget(bigger.scene, "Button", "Більше").font).toBe("normal bold 32px/1.2 \"Arial\", sans-serif")
    expect(widget(r.scene, "Label", "Звичайна").font).toBe("normal normal 19px/1.2 \"Segoe UI\", sans-serif")
  })

  test("option_add gives defaults to the widgets made after it", () => {
    // Act
    const r = start(`from tkinter import *
root = Tk()
root.option_add("*Font", "Arial 14")
root.option_add("*Button.Background", "pink")
Button(root, text="Рожева").pack()
Button(root, text="Своя", bg="white").pack()
Label(root, text="Текст").pack()
root.mainloop()`)

    // Assert
    expect(widget(r.scene, "Button", "Рожева")).toMatchObject({ bg: "pink", font: "normal normal 19px/1.2 \"Arial\", sans-serif" })
    expect(widget(r.scene, "Button", "Своя").bg).toBe("white")
    expect(widget(r.scene, "Label", "Текст").bg).toBe("#f0f0f0")
  })

  test("a canvas holds widgets of create_window", () => {
    // Act
    const r = start(`from tkinter import *
root = Tk()
c = Canvas(root, width=200, height=100)
c.pack()
b = Button(c, text="Старт")
item = c.create_window(100, 50, window=b, anchor=CENTER)
print(c.type(item), c.coords(item))
root.mainloop()`)

    // Assert
    expect(r.output).toBe("window [100.0, 50.0]\n")
    const items = widget(r.scene, "Canvas").items as ReadonlyArray<Json>
    expect(items[0]).toMatchObject({ type: "window", window: idOf(widget(r.scene, "Button", "Старт")), anchor: "center" })
  })
})
