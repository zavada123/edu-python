import { type ReactNode } from "react";
import type { WorkerFactory } from "../core/session.ts";
import type { Mission, Progress, Report } from "../quests/types.ts";
export interface PythonQuestProps {
    readonly mission: Mission;
    readonly worker: WorkerFactory;
    /** Saved progress to continue; `emptyProgress(mission)` for a new start. Progress of another mission is ignored. */
    readonly initialProgress: Progress;
    /** After every change (a solved step, a hint, a draft), to save it. */
    readonly onChange: (progress: Progress) => void;
    /** After every solved step. `report.finished` is true when every task step is solved. */
    readonly onStepSolved: (report: Report) => void;
    /** Shown on the final screen under the result, for example a link to the next mission. */
    readonly endExtra: ReactNode;
}
export declare function PythonQuest(props: PythonQuestProps): import("react").JSX.Element;
