/** Text with `code` parts (explanations of `core/errors.ts`, messages about programs). */
export function CodeText(props: Readonly<{ text: string }>) {
  return (
    <>
      {props.text.split("`").map((part, i) =>
        i % 2 === 1
          ? <code key={i} className="epy-inline-code">{part}</code>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}
