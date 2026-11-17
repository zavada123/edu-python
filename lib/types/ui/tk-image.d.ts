import type { TkImage } from "../core/tk-scene.ts";
/** The address of a picture for `<img>` or SVG `<image>`; null while it is drawn or when there is none. */
export declare const useImageUrl: (id: number) => {
    readonly url: string | null;
    readonly image: TkImage | undefined;
};
/** A picture in a Label or a Button. */
export declare function TkPicture(props: Readonly<{
    id: number;
}>): import("react").JSX.Element | null;
/** A picture on the canvas: `x`, `y` and `anchor` as in Tk. */
export declare function TkCanvasPicture(props: Readonly<{
    id: number;
    x: number;
    y: number;
    anchor: string;
    item: number;
}>): import("react").JSX.Element | null;
