import type { TrialResult } from "../quests/check.ts";
/** Біт, the robot who guides the student through the missions. An original drawing. */
export declare function QuestRobot(props: Readonly<{
    size: number;
    happy: boolean;
}>): import("react").JSX.Element;
/** The trials of a check: ✓ or ✗ for each, and for a wrong one the explanation and the output next to the wanted one. */
export declare function TrialList(props: Readonly<{
    trials: readonly TrialResult[];
}>): import("react").JSX.Element;
