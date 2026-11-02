/**
 * Phone keyboards change `"` to `“` and `-` to `–` (smart punctuation). Python does not accept these
 * characters, so the editor changes them back when the student types or pastes code. `«»` stays:
 * students use them inside Ukrainian text.
 */
const replacements: ReadonlyArray<readonly [RegExp, string]> = [
  [/[“”„]/g, "\""],
  [/[‘’‚]/g, "'"],
  [/[–—−]/g, "-"]
]

export const plainPunctuation = (text: string): string =>
  replacements.reduce((result, [pattern, plain]) => result.replace(pattern, plain), text)
