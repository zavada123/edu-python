import { CheckCheck, Lightbulb, RotateCcw } from "lucide-react"
import { type FormEvent, type ReactNode, useMemo, useRef, useState } from "react"
import type { WorkerFactory } from "../core/session.ts"
import { answerIsRight, checkProgram, type ProgramVerdict, verdictMessage } from "../quests/check.ts"
import { allSteps, currentStep, emptyProgress, isStepDone, makeReport, markSolved, taskSteps } from "../quests/progress.ts"
import { workerDriver } from "../quests/run.ts"
import { topicLabel } from "../quests/curriculum.ts"
import { Levels } from "../quests/types.ts"
import type { LessonStep, Mission, Progress, Report, Step, StoryLine } from "../quests/types.ts"
import { CodeText } from "./code-text.tsx"
import { Button, ButtonSizes, ButtonVariants, cn } from "./kit.tsx"
import { PythonRunner } from "./python-runner.tsx"
import { QuestRobot, TrialList } from "./quest-parts.tsx"

// Missions of Python tasks (`edu-python/quests`): the map of the mission, the story of the robot Біт, the task with
// hints, and the compact runner. «Перевірити» runs the program on the trials of the step and shows each one with
// ✓ or ✗ and an explanation. The page keeps the progress: it gets every change in `onChange`.

export interface PythonQuestProps {
  readonly mission: Mission
  readonly worker: WorkerFactory
  /** Saved progress to continue; `emptyProgress(mission)` for a new start. Progress of another mission is ignored. */
  readonly initialProgress: Progress
  /** After every change (a solved step, a hint, a draft), to save it. */
  readonly onChange: (progress: Progress) => void
  /** After every solved step. `report.finished` is true when every task step is solved. */
  readonly onStepSolved: (report: Report) => void
  /** Shown on the final screen under the result, for example a link to the next mission. */
  readonly endExtra: ReactNode
}

const END = "end"

type Check =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "Checking" }
  | { readonly _tag: "Done"; readonly verdict: ProgramVerdict }
  | { readonly _tag: "WrongAnswer" }

const idle: Check = { _tag: "Idle" }

function Story(props: Readonly<{ lines: readonly StoryLine[] }>) {
  return (
    <div className="epq-story">
      {props.lines.map((line, i) =>
        line.speaker === "narrator" ? (
          <p key={i} className="epq-narrator"><CodeText text={line.text} /></p>
        ) : (
          <div key={i} className="epq-say">
            {line.speaker === "robot" ? <QuestRobot size={40} happy={false} /> : <span className="epq-captain" aria-hidden>👩‍🚀</span>}
            <div className="epq-bubble">
              <span className="epq-who">{line.speaker === "robot" ? "Біт · робот-помічник" : "Капітан"}</span>
              <p><CodeText text={line.text} /></p>
            </div>
          </div>
        )
      )}
    </div>
  )
}

function Lesson(props: Readonly<{ step: LessonStep }>) {
  return (
    <div className="epq-lesson">
      <p className="epq-kicker"><span aria-hidden>📘</span> Урок</p>
      {props.step.explain.map((p, i) => <p key={i}><CodeText text={p} /></p>)}
      <div className="epq-syntax">
        <span>Як пишеться</span>
        <pre>{props.step.syntax}</pre>
      </div>
      <table className="epq-notes">
        <tbody>
          {props.step.notes.map((n) => (
            <tr key={n.code}>
              <th scope="row"><code>{n.code}</code></th>
              <td><CodeText text={n.text} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="epq-muted"><span aria-hidden>👉</span> Приклад уже в редакторі. Натисни «Запустити», а потім зміни програму й подивись, що вийде.</p>
    </div>
  )
}

function QuestMap(props: Readonly<{ mission: Mission; progress: Progress; viewing: string; onOpen: (id: string) => void }>) {
  const tasks = taskSteps(props.mission)
  const done = tasks.filter((s) => isStepDone(props.progress, s.id)).length
  const current = currentStep(props.mission, props.progress)
  const percent = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100)
  return (
    <header className="epq-head">
      <div className="epq-head-top">
        <div className="epq-head-text">
          <p className="epq-kicker">
            {props.mission.level === Levels.Bonus ? <span className="epq-bonus">⭐ Для сильніших</span> : null}
            Місія · {props.mission.grades} клас
          </p>
          <h2 className="epq-title">{props.mission.title}</h2>
        </div>
        <div className="epq-meter" aria-label={`Виконано ${done} з ${tasks.length}`}>
          <span><strong>{done}</strong>/{tasks.length}</span>
          <span className="epq-meter-bar"><span style={{ width: `${percent}%` }} /></span>
        </div>
      </div>
      <nav className="epq-map" aria-label="Розділи місії">
        {props.mission.chapters.map((ch, i) => {
          const chDone = ch.steps.every((s) => isStepDone(props.progress, s.id))
          const active = ch.steps.some((s) => s.id === props.viewing)
          return (
            <div key={ch.id} className={cn("epq-chapter", chDone && "is-done", active && "is-active")}>
              <span className="epq-chapter-title">
                <span className="epq-chapter-num">{chDone ? "✓" : i + 1}</span>
                {ch.title}
              </span>
              <span className="epq-chapter-topics">{ch.topics}</span>
              <span className="epq-chapter-after">Після теми: {topicLabel(ch.after)}</span>
              <span className="epq-dots">
                {ch.steps.map((s) => {
                  const solved = isStepDone(props.progress, s.id)
                  const open = solved || s.id === current?.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={!open}
                      onClick={() => props.onOpen(s.id)}
                      className={cn("epq-dot", s.kind === "lesson" && "is-lesson", solved && "is-done", s.id === props.viewing && "is-here")}
                      aria-label={`${s.title}${solved ? " (виконано)" : open ? " (поточний крок)" : " (ще закрито)"}`}
                      title={s.title}
                    />
                  )
                })}
              </span>
            </div>
          )
        })}
      </nav>
    </header>
  )
}

const codeOf = (step: Step): string => (step.kind === "lesson" ? step.example : step.starter)

export function PythonQuest(props: PythonQuestProps) {
  const m = props.mission
  const [progress, setProgress] = useState<Progress>(() => (props.initialProgress.missionId === m.id ? props.initialProgress : emptyProgress(m)))
  const [viewing, setViewing] = useState<string>(() => currentStep(m, progress)?.id ?? END)
  const [check, setCheck] = useState<Check>(idle)
  const [answer, setAnswer] = useState("")
  const code = useRef("")
  /** The progress after the last change: a check ends later, when the student may have typed more. */
  const latest = useRef(progress)
  const drivers = useMemo(() => workerDriver(props.worker), [props.worker])
  const steps = allSteps(m)
  const step = steps.find((s) => s.id === viewing)

  const update = (next: Progress) => {
    latest.current = next
    setProgress(next)
    props.onChange(next)
  }

  const open = (id: string) => {
    setViewing(id)
    setCheck(idle)
    setAnswer("")
  }

  const solve = (s: Step, accepted: string) => {
    const solved = markSolved(latest.current, s.id, accepted)
    update(solved)
    props.onStepSolved(makeReport(m, solved, s.id))
  }

  const restart = () => {
    const fresh = emptyProgress(m)
    update(fresh)
    open(steps[0]?.id ?? END)
  }

  if (step === undefined) {
    const report = makeReport(m, progress, "")
    const hints = Object.values(progress.hintsUsed).reduce((a, b) => a + b, 0)
    return (
      <div className="epy epq">
        <QuestMap mission={m} progress={progress} viewing={viewing} onOpen={open} />
        <section className="epq-end">
          <QuestRobot size={72} happy />
          <p className="epq-stamp">Місію виконано</p>
          <Story lines={m.ending} />
          <dl className="epq-stats">
            <div><dt>Завдань</dt><dd>{report.solvedSteps}/{report.totalSteps}</dd></div>
            <div><dt>Підказок</dt><dd>{hints}</dd></div>
            <div><dt>Оцінка</dt><dd>{Math.round(report.score * 100)}%</dd></div>
          </dl>
          {props.endExtra}
          <Button variant={ButtonVariants.Ghost} size={ButtonSizes.Sm} disabled={false} onClick={restart}>
            <RotateCcw aria-hidden /> Пройти місію знову
          </Button>
        </section>
      </div>
    )
  }

  const solved = isStepDone(progress, step.id)
  const hintsShown = progress.hintsUsed[step.id] ?? 0
  const draft = progress.drafts[step.id] ?? codeOf(step)
  const chapter = m.chapters.find((ch) => ch.steps.some((s) => s.id === step.id))
  const next = currentStep(m, progress)

  const runCheck = async () => {
    if (step.kind !== "program") return
    const checked = code.current
    setCheck({ _tag: "Checking" })
    const verdict = await checkProgram(drivers, step, checked)
    setCheck({ _tag: "Done", verdict })
    if (verdict._tag === "Solved") solve(step, checked)
  }

  const submitAnswer = (e: FormEvent) => {
    e.preventDefault()
    if (step.kind !== "answer" || solved) return
    if (answerIsRight(step, answer)) solve(step, answer.trim())
    else setCheck({ _tag: "WrongAnswer" })
  }

  const showHint = () => update({ ...latest.current, hintsUsed: { ...latest.current.hintsUsed, [step.id]: hintsShown + 1 } })

  const finishLesson = () => {
    const read = markSolved(progress, step.id, "")
    if (read !== progress) update(read)
    open(currentStep(m, read)?.id ?? END)
  }

  const saveDraft = (text: string) => {
    code.current = text
    if (text === draft) return
    update({ ...latest.current, drafts: { ...latest.current.drafts, [step.id]: text } })
  }

  const clues = steps.flatMap((s) => (s.kind !== "lesson" && isStepDone(progress, s.id) ? [s.clue] : []))
  const verdict = check._tag === "Done" ? check.verdict : null

  return (
    <div className="epy epq">
      <QuestMap mission={m} progress={progress} viewing={viewing} onOpen={open} />
      <div className="epq-grid">
        <section className="epq-task" aria-label="Завдання">
          <p className="epq-step-label">{chapter?.title} · крок {steps.indexOf(step) + 1} з {steps.length}</p>
          <h3 className="epq-step-title">{step.title}</h3>
          <Story lines={step.story} />
          {step.kind === "lesson" ? (
            <>
              <Lesson step={step} />
              <Button variant={ButtonVariants.Primary} size={ButtonSizes.Md} disabled={false} onClick={finishLesson}>
                {solved ? "Далі →" : "Зрозуміло, далі →"}
              </Button>
            </>
          ) : (
            <>
              <div className="epq-goal">
                <span aria-hidden>{step.kind === "program" ? "🎯" : "❓"}</span>
                <div>
                  <strong>{step.kind === "program" ? "Завдання" : "Питання"}</strong>
                  <p><CodeText text={step.kind === "program" ? step.task : step.question} /></p>
                </div>
              </div>
              {step.kind === "program" && !solved && (
                <Button variant={ButtonVariants.Primary} size={ButtonSizes.Md} disabled={check._tag === "Checking"} onClick={() => void runCheck()}>
                  <CheckCheck aria-hidden /> {check._tag === "Checking" ? "Перевіряю…" : "Перевірити"}
                </Button>
              )}
              {step.kind === "answer" && (
                <form className="epq-answer" onSubmit={submitAnswer}>
                  <input
                    value={solved ? (progress.answers[step.id] ?? step.accepted[0] ?? "") : answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={solved}
                    aria-label="Відповідь"
                    placeholder="Твоя відповідь…"
                  />
                  <button type="submit" className="epy-btn epy-btn--primary epy-btn--md" disabled={solved || answer.trim() === ""}>
                    Відповісти
                  </button>
                </form>
              )}
              {check._tag === "WrongAnswer" && <p className="epq-wrong" role="status"><span aria-hidden>🤔</span> Ні, не так. Запусти програму ще раз і уважно подивись на результат.</p>}
              {verdict !== null && verdict._tag !== "Solved" && <p className="epq-wrong" role="status"><span aria-hidden>🤔</span> <CodeText text={verdictMessage(verdict)} /></p>}
              {verdict !== null && (verdict._tag === "Solved" || verdict._tag === "Failed") && <TrialList trials={verdict.trials} />}
              {!solved && step.hints.length > 0 && (
                <div className="epq-hints">
                  {step.hints.slice(0, hintsShown).map((h, i) => <p key={i} className="epq-hint"><Lightbulb aria-hidden /> <CodeText text={h} /></p>)}
                  {hintsShown < step.hints.length && (
                    <button type="button" className="epq-link" onClick={showHint}>
                      {hintsShown === 0 ? "Потрібна підказка" : "Ще одна підказка"} ({hintsShown + 1}/{step.hints.length})
                    </button>
                  )}
                </div>
              )}
              {solved && (
                <div className="epq-clue" role="status">
                  <div className="epq-clue-head"><QuestRobot size={40} happy /><strong>Виконано!</strong></div>
                  <p><CodeText text={step.clue} /></p>
                  <Button variant={ButtonVariants.Primary} size={ButtonSizes.Md} disabled={false} onClick={() => open(next?.id ?? END)}>
                    {next === undefined ? "До фіналу →" : "Далі →"}
                  </Button>
                </div>
              )}
            </>
          )}
          {clues.length > 0 && (
            <details className="epq-log">
              <summary><span aria-hidden>📒</span> Журнал місії ({clues.length})</summary>
              <ol>{clues.map((c, i) => <li key={i}><CodeText text={c} /></li>)}</ol>
            </details>
          )}
        </section>
        <section className="epq-work" aria-label="Редактор програми">
          <p className="epq-file">{m.file}</p>
          <PythonRunner
            key={step.id}
            worker={props.worker}
            initialCode={draft}
            resetCode={codeOf(step)}
            onCodeChange={saveDraft}
            onEditorReady={() => undefined}
            note=""
          />
        </section>
      </div>
    </div>
  )
}
