/**
 * Pictures for `PhotoImage` (`tkinter/_images.py`): as Tk 8.6, the engine reads PNG and GIF files. The page
 * shows a picture only from these bytes (a `data:` address with the type found here), never from text that
 * the program gives: an SVG or HTML file is not a picture for it.
 */
export declare const ImageTypes: {
    readonly Png: "image/png";
    readonly Gif: "image/gif";
};
export type ImageType = (typeof ImageTypes)[keyof typeof ImageTypes];
export interface ImageInfo {
    readonly mime: ImageType;
    readonly width: number;
    readonly height: number;
}
/** Type and size of a PNG or GIF file, or null. */
export declare const imageInfo: (bytes: Uint8Array) => ImageInfo | null;
export declare const toBase64: (bytes: Uint8Array) => string;
/** JSON for Python: type, size and base64 of the file; null when it is not a PNG or GIF picture. */
export declare const imageOf: (bytes: Uint8Array) => string | null;
