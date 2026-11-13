/**
 * Letter shortcuts (A replay, D +1s, H help) share keys with typing a search.
 * The search box decides which one a press was (see GuessBox) and announces
 * real shortcuts here, so the player and the app don't each guess on their own.
 */
export type ShortcutKey = 'a' | 'd' | 'h'
export const SHORTCUT_KEYS = new Set<string>(['a', 'd', 'h'])

/** How long a lone A/D/H waits to see whether more letters follow (ms). */
export const TAP_WINDOW = 280

const EVENT = 'praise:shortcut'

export function emitShortcut(key: ShortcutKey) {
  window.dispatchEvent(new CustomEvent<ShortcutKey>(EVENT, { detail: key }))
}

export function onShortcut(handler: (key: ShortcutKey) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<ShortcutKey>).detail)
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}

export function typingInField(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
}
