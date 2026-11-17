import { Option } from "effect"
import { Check, ChevronDown, ChevronRight } from "lucide-react"
import { type CSSProperties, useCallback, useRef, useState } from "react"
import { TkIdAttribute } from "../core/tk-input.ts"
import { type TkMenuEntry, TkMenuEntryTypes, type TkScene, type TkWidget, windowOf } from "../core/tk-scene.ts"
import { useTk } from "./tk-context.ts"
import { useWidgetEvents } from "./tk-events.ts"
import { textBox } from "./tk-field.ts"
import { useOutsideClose } from "./tk-lists.tsx"

// Menus of a window: the menu bar (`root.config(menu=bar)`), drop-down menus, popup menus (`tk_popup`) and
// Menubutton. The page opens and closes them itself; a chosen entry goes to the program (MenuItem).

const entriesOf = (scene: TkScene, menu: number): ReadonlyArray<TkMenuEntry> => {
  const found = scene.widgets.find((w) => w.id === menu)
  return found === undefined ? [] : Option.match(found.menu, { onNone: () => [], onSome: (m) => m.entries })
}

/** A place on the page for a drop-down menu: `left` and `top` of the viewport. */
interface Place {
  readonly left: number
  readonly top: number
}

const MenuWidth = 180

/** Keeps a menu inside the viewport. */
const inView = (place: Place): Place => ({
  left: Math.max(4, Math.min(place.left, window.innerWidth - MenuWidth - 4)),
  top: Math.max(4, place.top)
})

/** A drop-down menu. Cascades open to the right; the menu closes after a click outside or Escape. */
export function MenuList(props: Readonly<{ menu: number; place: Place; onClose: () => void; depth?: number }>) {
  const tk = useTk()
  const list = useRef<HTMLDivElement>(null)
  const [sub, setSub] = useState<{ readonly menu: number; readonly place: Place } | null>(null)
  const depth = props.depth ?? 0
  const inside = useCallback(() => [list.current, ...Array.from(document.querySelectorAll(".epy-tk-menu"))], [])
  useOutsideClose(depth === 0, props.onClose, inside)
  const entries = entriesOf(tk.scene, props.menu)
  const place = inView(props.place)
  return (
    <>
      <div ref={list} role="menu" className="epy-tk-popup epy-tk-menu" style={{ position: "fixed", left: place.left, top: place.top, minWidth: 140, zIndex: 20 + depth }}>
        {entries.map((entry, i) => {
          if (entry.type === TkMenuEntryTypes.Separator) return <div key={i} role="separator" className="epy-tk-menu__separator" />
          const cascade = entry.type === TkMenuEntryTypes.Cascade
          const role = entry.type === TkMenuEntryTypes.Check ? "menuitemcheckbox" : entry.type === TkMenuEntryTypes.Radio ? "menuitemradio" : "menuitem"
          return (
            <button
              key={i}
              type="button"
              role={role}
              aria-checked={role === "menuitem" ? undefined : entry.checked}
              aria-haspopup={cascade ? "menu" : undefined}
              disabled={!entry.enabled || !tk.active}
              className="epy-tk-popup__item epy-tk-menu__item"
              style={entry.fg === "" ? undefined : { color: entry.fg }}
              onClick={(e) => {
                if (cascade) {
                  const box = e.currentTarget.getBoundingClientRect()
                  setSub(sub?.menu === entry.submenu ? null : { menu: entry.submenu, place: { left: box.right, top: box.top } })
                  return
                }
                props.onClose()
                tk.send({ _tag: "MenuItem", widget: props.menu, index: i })
              }}
            >
              <span className="epy-tk-menu__mark" aria-hidden>
                {entry.checked && (entry.type === TkMenuEntryTypes.Radio ? "●" : <Check size={12} />)}
              </span>
              <span className="epy-tk-menu__label">{entry.label}</span>
              <span className="epy-tk-menu__accelerator">{cascade ? <ChevronRight aria-hidden size={12} /> : entry.accelerator}</span>
            </button>
          )
        })}
      </div>
      {sub !== null && sub.menu !== 0 && <MenuList menu={sub.menu} place={sub.place} onClose={props.onClose} depth={depth + 1} />}
    </>
  )
}

/** The menu bar under the title of a window. */
export function MenuBar(props: Readonly<{ menu: number }>) {
  const tk = useTk()
  const [open, setOpen] = useState<{ readonly index: number; readonly place: Place } | null>(null)
  const close = useCallback(() => {
    setOpen(null)
  }, [])
  const entries = entriesOf(tk.scene, props.menu)
  return (
    <div role="menubar" className="epy-tk-menubar">
      {entries.map((entry, i) => {
        if (entry.type === TkMenuEntryTypes.Separator) return null
        const cascade = entry.type === TkMenuEntryTypes.Cascade
        return (
          <button
            key={i}
            type="button"
            role="menuitem"
            aria-haspopup={cascade ? "menu" : undefined}
            aria-expanded={cascade ? open?.index === i : undefined}
            disabled={!entry.enabled || !tk.active}
            className="epy-tk-menubar__item"
            onClick={(e) => {
              if (!cascade) {
                tk.send({ _tag: "MenuItem", widget: props.menu, index: i })
                return
              }
              const box = e.currentTarget.getBoundingClientRect()
              setOpen(open?.index === i ? null : { index: i, place: { left: box.left, top: box.bottom } })
            }}
          >
            {entry.label}
          </button>
        )
      })}
      {open !== null && <MenuList menu={entries[open.index]?.submenu ?? 0} place={open.place} onClose={close} />}
    </div>
  )
}

/** Menus that the program opened with `tk_popup(x, y)`: at the place on the "screen" of their window. */
export function PopupMenus(props: Readonly<{ root: HTMLElement | null }>) {
  const tk = useTk()
  const [closed, setClosed] = useState<ReadonlyMap<number, number>>(new Map())
  return (
    <>
      {tk.scene.widgets.flatMap((w) => {
        const posted = Option.match(w.menu, { onNone: () => null, onSome: (m) => m.posted })
        if (posted === null || closed.get(w.id) === posted[2]) return []
        const place = Option.match(windowOf(tk.scene, w.id), {
          onNone: () => null,
          onSome: (window) => {
            const client = props.root?.querySelector(`[${TkIdAttribute}="${window.id}"]`)?.getBoundingClientRect()
            return client === undefined ? null : { left: client.left + posted[0] - window.x, top: client.top + posted[1] - window.y }
          }
        })
        if (place === null) return []
        const close = (): void => {
          setClosed(new Map([...closed, [w.id, posted[2]]]))
        }
        return [<MenuList key={`${w.id}-${posted[2]}`} menu={w.id} place={place} onClose={close} />]
      })}
    </>
  )
}

export function MenubuttonView(props: Readonly<{ widget: TkWidget; layout: CSSProperties }>) {
  const tk = useTk()
  const events = useWidgetEvents(props.widget.id)
  const w = props.widget
  const [place, setPlace] = useState<Place | null>(null)
  const close = useCallback(() => {
    setPlace(null)
  }, [])
  const disabled = w.state === "disabled" || !tk.active || w.opens === 0
  return (
    <>
      <button
        type="button"
        {...{ [TkIdAttribute]: w.id }}
        {...events}
        aria-haspopup="menu"
        aria-expanded={place !== null}
        aria-disabled={disabled}
        onClick={(e) => {
          if (disabled) return
          const box = e.currentTarget.getBoundingClientRect()
          setPlace(place === null ? { left: box.left, top: box.bottom } : null)
        }}
        style={{ ...textBox(w), gap: 6, cursor: disabled ? "default" : "pointer", ...props.layout }}
      >
        <span>{w.text}</span>
        {w.indicator && <ChevronDown aria-hidden size={12} style={{ flex: "none" }} />}
      </button>
      {place !== null && <MenuList menu={w.opens} place={place} onClose={close} />}
    </>
  )
}
