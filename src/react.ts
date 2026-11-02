/**
 * `edu-python/react`: the Online IDE (`PythonIde`), the compact runner for lessons and tasks (`PythonRunner`) and
 * their parts. Import `edu-python/style.css` once on the page.
 */
import "./ui/python.css"

export { CodeEditor, type EditorHandle, type EditorHeight, EditorHeights } from "./ui/code-editor.tsx"
export { CodeText } from "./ui/code-text.tsx"
export { PythonIde, type PythonIdeProps } from "./ui/python-ide.tsx"
export { PythonRunner, type PythonRunnerProps } from "./ui/python-runner.tsx"
export {
  canStop,
  Console,
  type ConsoleLayout,
  ConsoleLayouts,
  errorLineOf,
  Problem,
  type PythonRun,
  statusLine,
  stopText,
  SymbolBar,
  usePythonRun
} from "./ui/run-output.tsx"
export { TkWindows } from "./ui/tk-window.tsx"
export { TurtleCanvas } from "./ui/turtle-canvas.tsx"
