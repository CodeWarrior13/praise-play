import { useEffect, useRef, useState } from 'react'
import { themes } from '../lib/theme'

export function ThemePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  return (
    <div className="theme-picker" ref={ref}>
      <button className="icon-button" onClick={() => setOpen((v) => !v)} aria-label="Change theme" aria-expanded={open}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 3a9 9 0 0 0 0 18c1.1 0 1.8-.9 1.8-1.9 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" /></svg>
      </button>
      {open && (
        <div className="theme-menu" role="menu">
          <p>Theme</p>
          {themes.map((theme) => (
            <button key={theme.id} role="menuitemradio" aria-checked={theme.id === value} className={theme.id === value ? 'active' : ''} onClick={() => { onChange(theme.id); setOpen(false) }}>
              <span className="swatch" style={{ background: `linear-gradient(135deg, ${theme.swatch[1]}, ${theme.swatch[2]})`, boxShadow: `0 0 0 3px ${theme.swatch[0]}` }} />
              {theme.name}
              {theme.id === value && <span className="check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
