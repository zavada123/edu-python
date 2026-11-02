import { CircleAlert, Info, TriangleAlert, type LucideIcon } from "lucide-react"
import type { MouseEventHandler, ReactNode } from "react"

// Small building blocks of the package UI: a button and a message. Colors come from the `--epy-*` variables of
// `python.css`, so the page can give its own theme.

/** Joins class names; `false`, `null` and `""` are left out. */
export const cn = (...names: ReadonlyArray<string | false | null>): string => names.filter((n) => typeof n === "string" && n !== "").join(" ")

export const ButtonVariants = { Primary: "primary", Outline: "outline", Ghost: "ghost", Danger: "danger" } as const
export type ButtonVariant = (typeof ButtonVariants)[keyof typeof ButtonVariants]

export const ButtonSizes = { Sm: "sm", Md: "md" } as const
export type ButtonSize = (typeof ButtonSizes)[keyof typeof ButtonSizes]

export function Button(props: Readonly<{
  variant: ButtonVariant
  size: ButtonSize
  disabled: boolean
  onClick: MouseEventHandler<HTMLButtonElement>
  children: ReactNode
}>) {
  return (
    <button type="button" className={`epy-btn epy-btn--${props.variant} epy-btn--${props.size}`} disabled={props.disabled} onClick={props.onClick}>
      {props.children}
    </button>
  )
}

export const AlertTones = { Info: "info", Warning: "warning", Error: "error" } as const
export type AlertTone = (typeof AlertTones)[keyof typeof AlertTones]

const icons: Record<AlertTone, LucideIcon> = { info: Info, warning: TriangleAlert, error: CircleAlert }

export function Alert(props: Readonly<{ tone: AlertTone; children: ReactNode }>) {
  const Icon = icons[props.tone]
  return (
    <div role={props.tone === AlertTones.Error ? "alert" : "status"} className={`epy-alert epy-alert--${props.tone}`}>
      <Icon className="epy-alert__icon" aria-hidden />
      <div className="epy-alert__body">{props.children}</div>
    </div>
  )
}
