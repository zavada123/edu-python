/**
 * Missions of the Python tasks: a story told by steps. A lesson explains new words of Python, a program step asks
 * for a program that the trainer runs on trials, an answer step asks for a value that the student finds with a
 * program. In all texts, words in `backticks` are Python code.
 */
/** Who speaks a story line: the robot Біт (chat bubbles), the narrator or the captain of the station. */
export declare const Speakers: {
    readonly Robot: "robot";
    readonly Narrator: "narrator";
    readonly Captain: "captain";
};
export type Speaker = (typeof Speakers)[keyof typeof Speakers];
export interface StoryLine {
    readonly speaker: Speaker;
    readonly text: string;
}
/** A wrong output that the author expects, with a precise explanation (for example, numbers glued as text). */
export interface KnownMistake {
    readonly output: string;
    readonly why: string;
}
/** A console trial: the program gets `input` (one value per line) and must print `output`. */
export interface ConsoleTrial {
    readonly _tag: "Console";
    /** What the trial is, shown to the student, e.g. "Пальне 7 і 3". */
    readonly label: string;
    readonly input: string;
    readonly output: string;
    /** Why the output is wrong when it differs and no known mistake fits. Words in `backticks` are code. */
    readonly why: string;
    readonly mistakes: readonly KnownMistake[];
}
/** A user action in the window of the program. `field` is the number of an `Entry`, from 1, in the order of the program. */
export type WindowAction = {
    readonly _tag: "Type";
    readonly field: number;
    readonly text: string;
}
/** A click on the button with this text. */
 | {
    readonly _tag: "Click";
    readonly button: string;
};
/** What the window must have after the actions of a trial. */
export type WindowCheck = 
/** A window with this title. */
{
    readonly _tag: "Title";
    readonly text: string;
}
/** A widget of this kind (`Label`, `Button`, `Entry`) with this text; "" for any text. */
 | {
    readonly _tag: "Widget";
    readonly kind: string;
    readonly text: string;
}
/**
 * A `Label` or an `Entry` shows this value. A number matches the last number of the text, so
 * "Результат: 5" and "5.0" show 5. Other text matches when the widget text has it, letter case ignored.
 */
 | {
    readonly _tag: "Shows";
    readonly text: string;
};
/** A window trial: the trainer runs the program, makes the actions in its window and checks the window. */
export interface WindowTrial {
    readonly _tag: "Window";
    readonly label: string;
    readonly actions: readonly WindowAction[];
    readonly expect: readonly WindowCheck[];
    readonly why: string;
}
export type Trial = ConsoleTrial | WindowTrial;
/** A step where the student writes a program. It is solved when the program passes every trial. */
export interface ProgramStep {
    readonly kind: "program";
    readonly id: string;
    readonly title: string;
    readonly story: readonly StoryLine[];
    readonly task: string;
    /** The reference program: the tests run the trials on it. */
    readonly solution: string;
    /** The code that the editor starts with; "" for an empty editor. */
    readonly starter: string;
    readonly trials: readonly Trial[];
    /** Python words or names that the program must have, e.g. ["for"] or ["Entry"]. Empty when any program is accepted. */
    readonly mustUse: readonly string[];
    /** Hints from gentle to almost the answer. */
    readonly hints: readonly string[];
    /** A new record for the log of the mission, shown after the step is solved. */
    readonly clue: string;
}
/** A step where the student runs or changes a program and types what it found (a number or a word). */
export interface AnswerStep {
    readonly kind: "answer";
    readonly id: string;
    readonly title: string;
    readonly story: readonly StoryLine[];
    readonly question: string;
    readonly starter: string;
    /** Accepted answers. Case, extra spaces, the last full stop and the letter ґ/г are ignored. */
    readonly accepted: readonly string[];
    readonly hints: readonly string[];
    readonly clue: string;
}
/** One word of Python and what it does, for the table of a lesson. */
export interface LessonNote {
    readonly code: string;
    readonly text: string;
}
/** A step that explains new words before the tasks that use them. It is not checked and does not change the score. */
export interface LessonStep {
    readonly kind: "lesson";
    readonly id: string;
    readonly title: string;
    readonly story: readonly StoryLine[];
    readonly explain: readonly string[];
    /** The general form, e.g. "for змінна in range(n):". */
    readonly syntax: string;
    readonly notes: readonly LessonNote[];
    /** A program that the editor starts with, so that the student can run it at once. */
    readonly example: string;
}
export type TaskStep = ProgramStep | AnswerStep;
export type Step = TaskStep | LessonStep;
export interface Chapter {
    readonly id: string;
    readonly title: string;
    /** Python topics of the chapter, for the teacher, e.g. "if, elif, else". */
    readonly topics: string;
    readonly steps: readonly Step[];
}
export interface Mission {
    readonly id: string;
    readonly title: string;
    /** One paragraph for the mission card. */
    readonly summary: string;
    /** Grades the mission is made for, e.g. "5–8". */
    readonly grades: string;
    /** The name of the program file in the editor, e.g. "станція.py". */
    readonly file: string;
    readonly chapters: readonly Chapter[];
    /** The story after the last step. */
    readonly ending: readonly StoryLine[];
}
/** Progress in a mission. The same shape as the progress of the SQL trainer. */
export interface Progress {
    readonly missionId: string;
    /** Ids of solved steps (lessons too), in the order they were solved. */
    readonly solved: readonly string[];
    /** The accepted program or answer of each solved task step, so that a server can check the mission again. */
    readonly answers: Readonly<Record<string, string>>;
    /** The last code in the editor of each step. */
    readonly drafts: Readonly<Record<string, string>>;
    readonly hintsUsed: Readonly<Record<string, number>>;
}
/** What the trainer reports to the host app after each solved step. */
export interface Report {
    readonly missionId: string;
    readonly stepId: string;
    /** Solved task steps; lessons do not count. */
    readonly solvedSteps: number;
    readonly totalSteps: number;
    readonly finished: boolean;
    /** From 0 to 1: each solved task step gives 1, minus 0.25 per hint, but at least 0.5. */
    readonly score: number;
    readonly progress: Progress;
}
