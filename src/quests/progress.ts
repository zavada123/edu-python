/** Progress in a mission: the order of the steps, the next step, the score and the report for the host app. */
import { answerIsRight, checkProgram } from "./check.ts"
import type { DriverFactory } from "./run.ts"
import type { Mission, Progress, Report, Step, TaskStep } from "./types.ts"

export const allSteps = (m: Mission): readonly Step[] => m.chapters.flatMap((c) => c.steps)

/** Steps that the student must solve: lessons do not count. */
export const taskSteps = (m: Mission): readonly TaskStep[] => allSteps(m).flatMap((s) => (s.kind === "lesson" ? [] : [s]))

export const emptyProgress = (m: Mission): Progress => ({ missionId: m.id, solved: [], answers: {}, drafts: {}, hintsUsed: {} })

export const isStepDone = (p: Progress, stepId: string): boolean => p.solved.includes(stepId)

/** The first step that is not done, or `undefined` when the mission is complete. Steps open one by one. */
export const currentStep = (m: Mission, p: Progress): Step | undefined => allSteps(m).find((s) => !isStepDone(p, s.id))

/** The progress with one more solved step and its accepted program or answer ("" for a lesson). */
export const markSolved = (p: Progress, stepId: string, accepted: string): Progress =>
  isStepDone(p, stepId)
    ? p
    : {
      ...p,
      solved: [...p.solved, stepId],
      answers: accepted === "" ? p.answers : { ...p.answers, [stepId]: accepted }
    }

const HINT_COST = 0.25
const MIN_STEP_POINTS = 0.5

/** Score from 0 to 1 for the solved task steps: 1 per step, minus 0.25 per hint, but at least 0.5 per step. */
export const missionScore = (m: Mission, solved: readonly string[], hintsUsed: Readonly<Record<string, number>>): number => {
  const steps = taskSteps(m)
  const points = steps
    .filter((s) => solved.includes(s.id))
    .reduce((sum, s) => sum + Math.max(MIN_STEP_POINTS, 1 - HINT_COST * Math.max(0, hintsUsed[s.id] ?? 0)), 0)
  return steps.length === 0 ? 0 : Number((points / steps.length).toFixed(2))
}

export const makeReport = (m: Mission, p: Progress, stepId: string): Report => {
  const tasks = taskSteps(m)
  const solvedSteps = tasks.filter((s) => p.solved.includes(s.id)).length
  return {
    missionId: m.id,
    stepId,
    solvedSteps,
    totalSteps: tasks.length,
    finished: solvedSteps === tasks.length,
    score: missionScore(m, p.solved, p.hintsUsed),
    progress: p
  }
}

/** One task step after `checkMission` checked the saved answer again. */
export interface StepCheck {
  readonly stepId: string
  readonly passed: boolean
}

/**
 * Checks every task step of a mission again with the saved answers, for example on a server before it gives a
 * certificate. A step without an answer does not pass.
 */
export const checkMission = async (drivers: DriverFactory, m: Mission, answers: Readonly<Record<string, string>>): Promise<readonly StepCheck[]> => {
  const checks: StepCheck[] = []
  for (const step of taskSteps(m)) {
    const answer = Object.hasOwn(answers, step.id) ? answers[step.id] : undefined
    const passed = answer === undefined
      ? false
      : step.kind === "answer"
        ? answerIsRight(step, answer)
        : (await checkProgram(drivers, step, answer))._tag === "Solved"
    checks.push({ stepId: step.id, passed })
  }
  return checks
}
