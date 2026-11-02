import { Option } from "effect"
import { Link2 } from "lucide-react"
import { StrictMode, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { browserWorker, shareFragmentOf, sharedCodeOf } from "../core.ts"
import { PythonIde, PythonRunner } from "../react.ts"
import "../ui/python.css"
import "./demo.css"

// Demo of edu-python: the Online IDE with the code in this browser and a share link, and the compact runner.

const worker = browserWorker(() => new Worker(new URL("./python-worker.ts", import.meta.url), { type: "module" }))

const StorageKey = "edu-python-demo:main"

const sample = `# Напиши програму і натисни «Запустити» (або Ctrl + Enter).
name = input("Як тебе звати? ")
print("Привіт,", name + "!")

for i in range(1, 4):
    print(i, "×", i, "=", i * i)
`

const turtleSample = `import turtle

t = turtle.Turtle()
t.color("crimson")
for i in range(5):
    t.forward(120)
    t.right(144)
`

const readCode = (): string => {
  const shared = sharedCodeOf(window.location.hash)
  if (Option.isSome(shared)) return shared.value
  try {
    return localStorage.getItem(StorageKey) ?? sample
  } catch {
    return sample
  }
}

function Demo() {
  const [initial] = useState(readCode)
  const code = useRef(initial)
  const [note, setNote] = useState("Код зберігається в цьому браузері")

  const share = () => {
    Option.match(shareFragmentOf(code.current), {
      onNone: () => setNote("Код задовгий для посилання"),
      onSome: (fragment) => {
        const link = `${window.location.origin}${window.location.pathname}#${fragment}`
        navigator.clipboard.writeText(link).then(() => setNote("Посилання скопійовано"), () => setNote(link))
      }
    })
  }

  return (
    <main className="demo">
      <h1>Онлайн-редактор Python</h1>
      <p>MicroPython працює просто в браузері: input(), turtle, вікна tkinter і пояснення помилок українською.</p>
      <PythonIde
        worker={worker}
        fileName="main.py"
        initialCode={initial}
        onCodeChange={(next) => {
          code.current = next
          try {
            localStorage.setItem(StorageKey, next)
          } catch {
            // Without storage the code lives only on the page.
          }
        }}
        saveNote={note}
        actions={(
          <button type="button" className="epy-btn epy-btn--ghost epy-btn--sm" onClick={share}>
            <Link2 aria-hidden /> Поділитися
          </button>
        )}
        sidebar={null}
      />
      <h2>Компактний запуск для уроку чи завдання</h2>
      <PythonRunner worker={worker} initialCode={turtleSample} resetCode={turtleSample} onCodeChange={() => undefined} onEditorReady={() => undefined} note="" />
    </main>
  )
}

const root = document.getElementById("root")
if (root !== null) {
  createRoot(root).render(
    <StrictMode>
      <Demo />
    </StrictMode>
  )
}
