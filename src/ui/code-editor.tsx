import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands"
import { python } from "@codemirror/lang-python"
import { HighlightStyle, indentUnit, syntaxHighlighting } from "@codemirror/language"
import { EditorState, type Extension, StateEffect, StateField } from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view"
import { tags } from "@lezer/highlight"
import { Option } from "effect"
import { useEffect, useRef } from "react"
import { plainPunctuation } from "../core/punctuation.ts"

// Python code editor (CodeMirror 6): syntax colors from the `--epy-code-*` variables of `python.css`, line numbers,
// indent of 4 spaces, and the error line in red.

const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.bool, tags.null, tags.self], color: "var(--epy-code-keyword)" },
  { tag: [tags.string, tags.special(tags.string)], color: "var(--epy-code-string)" },
  { tag: [tags.number], color: "var(--epy-code-number)" },
  { tag: [tags.comment], color: "var(--epy-code-comment)", fontStyle: "italic" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.definition(tags.function(tags.variableName))], color: "var(--epy-code-title)" }
])

const theme = EditorView.theme({
  "&": { fontSize: "16px", backgroundColor: "var(--epy-card)", color: "var(--epy-text)" },
  "&.cm-focused": { outline: "none" },
  ".cm-content": { fontFamily: "var(--epy-font-mono)", padding: "8px 0", caretColor: "var(--epy-text)" },
  // The editor grows with the code and long lines wrap: no scroll area inside the page (phones, WCAG 2.1.1).
  ".cm-scroller": { fontFamily: "var(--epy-font-mono)", lineHeight: "1.6", minHeight: "8rem" },
  ".cm-gutters": { backgroundColor: "var(--epy-muted)", color: "var(--epy-muted-text)", border: "none" },
  ".cm-activeLine": { backgroundColor: "color-mix(in oklab, var(--epy-primary) 6%, transparent)" },
  ".cm-error-line": { backgroundColor: "color-mix(in oklab, var(--epy-danger) 18%, transparent)" },
  ".cm-cursor": { borderLeftColor: "var(--epy-text)", borderLeftWidth: "2px" }
})

const setErrorLine = StateEffect.define<number | null>()

const errorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update: (decorations, tr) => {
    for (const effect of tr.effects) {
      if (!effect.is(setErrorLine)) continue
      const line = effect.value
      if (line === null || line < 1 || line > tr.state.doc.lines) return Decoration.none
      return Decoration.set([Decoration.line({ class: "cm-error-line" }).range(tr.state.doc.line(line).from)])
    }
    // The student edits the code: the old error line is not correct any more.
    return tr.docChanged ? Decoration.none : decorations.map(tr.changes)
  },
  provide: (field) => EditorView.decorations.from(field)
})

const plainInput: Extension = [
  EditorView.inputHandler.of((view, from, to, text) => {
    const plain = plainPunctuation(text)
    if (plain === text) return false
    view.dispatch({ changes: { from, to, insert: plain }, selection: { anchor: from + plain.length }, userEvent: "input.type" })
    return true
  }),
  EditorView.clipboardInputFilter.of((text) => plainPunctuation(text))
]

/** `Grow`: the editor grows with the code (tasks, topics). `Fill`: it fills the parent and scrolls (Online IDE). */
export const EditorHeights = { Grow: "grow", Fill: "fill" } as const
export type EditorHeight = (typeof EditorHeights)[keyof typeof EditorHeights]

const fillTheme = EditorView.theme({
  "&": { height: "100%" },
  ".cm-scroller": { overflow: "auto" }
})

export interface EditorHandle {
  /** Inserts text at the cursor (symbol buttons for phones). */
  readonly insert: (text: string) => void
  readonly moveCursor: (by: number) => void
  readonly setCode: (code: string) => void
  readonly focus: () => void
}

export function CodeEditor(props: Readonly<{
  initialCode: string
  label: string
  height: EditorHeight
  errorLine: Option.Option<number>
  onChange: (code: string) => void
  onRun: () => void
  onReady: (handle: EditorHandle) => void
}>) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  // Callbacks change on each render; the editor is created once and reads the current ones.
  const callbacks = useRef({ onChange: props.onChange, onRun: props.onRun })
  useEffect(() => {
    callbacks.current = { onChange: props.onChange, onRun: props.onRun }
  })
  // The editor is created once: a new `initialCode` does not replace the code that the student typed.
  const setup = useRef({ code: props.initialCode, label: props.label, height: props.height, onReady: props.onReady })

  useEffect(() => {
    if (host.current === null) return
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
            { key: "Mod-Enter", run: () => { callbacks.current.onRun(); return true }, preventDefault: true },
            ...defaultKeymap,
            ...historyKeymap,
            indentWithTab
          ]),
          EditorView.contentAttributes.of({ "aria-label": setup.current.label, autocapitalize: "off", autocorrect: "off", spellcheck: "false" }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) callbacks.current.onChange(update.state.doc.toString())
          })
        ]
      })
    })
    view.current = editor
    setup.current.onReady({
      insert: (text) => {
        const { from, to } = editor.state.selection.main
        editor.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length }, userEvent: "input.type" })
        editor.focus()
      },
      moveCursor: (by) => {
        const head = Math.max(0, Math.min(editor.state.doc.length, editor.state.selection.main.head + by))
        editor.dispatch({ selection: { anchor: head } })
        editor.focus()
      },
      setCode: (code) => {
        editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: code } })
      },
      focus: () => {
        editor.focus()
      }
    })
    return () => {
      editor.destroy()
      view.current = null
    }
  }, [])

  const errorLine = Option.getOrNull(props.errorLine)
  useEffect(() => {
    view.current?.dispatch({ effects: setErrorLine.of(errorLine) })
  }, [errorLine])

  return (
    <div
      ref={host}
      className={props.height === EditorHeights.Fill ? "epy-editor epy-editor--fill" : "epy-editor epy-editor--grow"}
    />
  )
}
