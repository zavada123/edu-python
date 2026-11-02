import { Option } from "effect"

// Share link of the Online IDE: the code is in the fragment of the address (`/ide#code=…`), in UTF-8 and base64url.
// The fragment does not go to the server, so the code of a guest does not stay in the server logs.

/** Longest code that fits in a link that messengers and browsers keep whole. */
export const MAX_SHARED_CODE_LENGTH = 6_000

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

const fromBase64Url = (text: string): Option.Option<Uint8Array> => {
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"))
    return Option.some(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
  } catch {
    return Option.none()
  }
}

/** Fragment for the code; `None` when the code is too long for a link. */
export const shareFragmentOf = (code: string): Option.Option<string> =>
  code.length > MAX_SHARED_CODE_LENGTH ? Option.none() : Option.some(`code=${toBase64Url(new TextEncoder().encode(code))}`)

/** Code from the fragment of the address (`#code=…`, with or without `#`). */
export const sharedCodeOf = (hash: string): Option.Option<string> => {
  const match = /(?:^#?|&)code=([A-Za-z0-9_-]+)(?:&|$)/.exec(hash)
  if (match === null) return Option.none()
  return Option.flatMap(fromBase64Url(match[1] ?? ""), (bytes) => {
    try {
      return Option.some(new TextDecoder("utf-8", { fatal: true }).decode(bytes))
    } catch {
      return Option.none()
    }
  })
}
