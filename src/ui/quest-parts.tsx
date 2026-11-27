import type { TrialResult } from "../quests/check.ts"
import { CodeText } from "./code-text.tsx"
import { cn } from "./kit.tsx"

/** Біт, the robot who guides the student through the missions. An original drawing. */
export function QuestRobot(props: Readonly<{ size: number; happy: boolean }>) {
  return (
    <svg width={props.size} height={props.size} viewBox="0 0 64 64" aria-hidden className="epq-robot">
      <line x1="32" y1="5" x2="32" y2="13" stroke="#a5b4fc" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="5" r="3.5" fill="#fbbf24" />
      <rect x="9" y="13" width="46" height="34" rx="12" fill="#a5b4fc" />
      <rect x="15" y="19" width="34" height="20" rx="8" fill="#1e1b4b" />
      {props.happy ? (
        <>
          <path d="M21 30 q4 -5 8 0" fill="none" stroke="#67e8f9" strokeWidth="3" strokeLinecap="round" />
          <path d="M35 30 q4 -5 8 0" fill="none" stroke="#67e8f9" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <rect x="21" y="24" width="7" height="9" rx="3.5" fill="#67e8f9" />
          <rect x="36" y="24" width="7" height="9" rx="3.5" fill="#67e8f9" />
        </>
      )}
      <rect x="4" y="25" width="5" height="11" rx="2.5" fill="#6366f1" />
      <rect x="55" y="25" width="5" height="11" rx="2.5" fill="#6366f1" />
      <rect x="20" y="49" width="24" height="11" rx="5" fill="#6366f1" />
      <circle cx="32" cy="54.5" r="2.5" fill="#fbbf24" />
    </svg>
  )
}

const shown = (text: string): string => (text === "" ? "(нічого)" : text)

/** The trials of a check: ✓ or ✗ for each, and for a wrong one the explanation and the output next to the wanted one. */
export function TrialList(props: Readonly<{ trials: readonly TrialResult[] }>) {
  const passed = props.trials.filter((t) => t._tag === "Passed").length
  return (
    <div className="epq-trials" role="status">
      <p className="epq-trials-title"><span aria-hidden>🧪</span> Випробування: {passed} з {props.trials.length}</p>
      <ul>
        {props.trials.map((t, i) => (
          <li key={i} className={cn(t._tag === "Passed" ? "is-ok" : "is-bad")}>
            <span className="epq-trial-mark" aria-label={t._tag === "Passed" ? "пройдено" : "не пройдено"}>{t._tag === "Passed" ? "✓" : "✗"}</span>
            <span className="epq-trial-label">{t.label}</span>
            {t._tag === "Wrong" && (
              <div className="epq-trial-why">
                <p><CodeText text={t.message} /></p>
                {t.compare._tag === "Output" && (
                  <div className="epq-compare">
                    <div><span>Програма вивела</span><pre>{shown(t.compare.got)}</pre></div>
                    <div><span>Треба</span><pre>{shown(t.compare.want)}</pre></div>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
