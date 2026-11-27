/**
 * The Python topics of the school course (grades 5–9) in the order of the lessons, and the Python words that each
 * topic teaches first. A step of a base mission names the topic after which it can be given, and its programs may
 * use only words of that topic and the topics before it. So students do not see code that they learn two lessons
 * later. The order and the words come from the Python code of the topics, their tasks and their works.
 */
export interface Topic {
    /** "5-27" is grade 5, paragraph 27. */
    readonly id: string;
    readonly grade: number;
    readonly paragraph: number;
    readonly title: string;
    /**
     * Words first taught in this topic. A plain word matches a name or a method (`forward`, `x.forward`), a word that
     * starts with a dot matches only a method (`.get`), and a word in angle brackets is a form of syntax (`<list>`).
     */
    readonly words: readonly string[];
}
export declare const topics: readonly Topic[];
/** Words that no topic of the course teaches. Base missions must not use them. */
export declare const notTaught: readonly string[];
/** The topic with this id. The tests check that every id in the missions is known. */
export declare const topicById: (id: string) => Topic | undefined;
/** "5 клас, §27" for the map of the mission. */
export declare const topicLabel: (id: string) => string;
/**
 * Names, methods (with a dot), keywords and forms of syntax of the code: `x.get()` gives "x" and ".get",
 * `s[1:3]` gives "<slice>".
 */
export declare const featuresOf: (code: string) => ReadonlySet<string>;
/**
 * Words of the code that students do not know after the topic `after`: words of later topics and words that the
 * course never teaches. `taught` are the words that the lessons of a bonus mission explain.
 */
export declare const unknownWords: (code: string, after: string, taught: readonly string[]) => readonly string[];
