import { loadSetting, saveSetting } from './storage'

export type Theme = {
  id: string
  name: string
  /** Swatch colours shown in the picker. */
  swatch: [string, string, string]
  vars: Record<string, string>
  light?: boolean
}

/**
 * Each theme sets the same CSS custom properties. --accent-a/--accent-b form the
 * signature gradient; --glow-* tint the animated aurora behind everything.
 */
export const themes: Theme[] = [
  {
    id: 'sanctuary',
    name: 'Sanctuary',
    swatch: ['#120c2a', '#ffb547', '#ff6b9a'],
    vars: {
      '--bg': '#0b0820', '--bg-2': '#140e33', '--surface': 'rgba(255,255,255,.055)', '--surface-2': 'rgba(255,255,255,.09)',
      '--line': 'rgba(255,255,255,.10)', '--line-strong': 'rgba(255,255,255,.2)',
      '--text': '#fbf7ff', '--muted': '#b9b0d6', '--faint': '#8077a6',
      '--accent-a': '#ffc35a', '--accent-b': '#ff5e91', '--accent': '#ffb547', '--on-accent': '#1a0f00',
      '--glow-1': '#6b3cff', '--glow-2': '#ff4f8b', '--glow-3': '#ffb347',
      '--good': '#5ef0a8', '--bad': '#ff6b7f',
    },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    swatch: ['#04161c', '#3df5c8', '#7a6bff'],
    vars: {
      '--bg': '#03131a', '--bg-2': '#06222b', '--surface': 'rgba(255,255,255,.05)', '--surface-2': 'rgba(255,255,255,.085)',
      '--line': 'rgba(160,255,240,.12)', '--line-strong': 'rgba(160,255,240,.24)',
      '--text': '#effffc', '--muted': '#9fc9c4', '--faint': '#6a9792',
      '--accent-a': '#3df5c8', '--accent-b': '#7a6bff', '--accent': '#3df5c8', '--on-accent': '#00201a',
      '--glow-1': '#00c2a8', '--glow-2': '#5b4bff', '--glow-3': '#00a3ff',
      '--good': '#5ef0a8', '--bad': '#ff7a8a',
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    swatch: ['#1a0707', '#ff8a3d', '#ff3d5a'],
    vars: {
      '--bg': '#140505', '--bg-2': '#260b0b', '--surface': 'rgba(255,255,255,.05)', '--surface-2': 'rgba(255,255,255,.09)',
      '--line': 'rgba(255,200,170,.12)', '--line-strong': 'rgba(255,200,170,.24)',
      '--text': '#fff6f0', '--muted': '#d6b0a4', '--faint': '#a07b70',
      '--accent-a': '#ffb03d', '--accent-b': '#ff3d5a', '--accent': '#ff8a3d', '--on-accent': '#2a0700',
      '--glow-1': '#ff3d3d', '--glow-2': '#ff8a00', '--glow-3': '#b3002d',
      '--good': '#7cf0a0', '--bad': '#ff6b6b',
    },
  },
  {
    id: 'ocean',
    name: 'Deep Water',
    swatch: ['#050d24', '#4fb5ff', '#a7f0ff'],
    vars: {
      '--bg': '#040a1f', '--bg-2': '#0a1636', '--surface': 'rgba(255,255,255,.05)', '--surface-2': 'rgba(255,255,255,.09)',
      '--line': 'rgba(170,210,255,.12)', '--line-strong': 'rgba(170,210,255,.24)',
      '--text': '#f2f8ff', '--muted': '#a6bbdc', '--faint': '#6f84a8',
      '--accent-a': '#a7f0ff', '--accent-b': '#3d8bff', '--accent': '#6cc4ff', '--on-accent': '#001634',
      '--glow-1': '#1d4dff', '--glow-2': '#00b4ff', '--glow-3': '#6a3dff',
      '--good': '#5ef0c0', '--bad': '#ff7a90',
    },
  },
  {
    id: 'evergreen',
    name: 'Evergreen',
    swatch: ['#04140c', '#3ddc84', '#c6f432'],
    vars: {
      '--bg': '#03120b', '--bg-2': '#082316', '--surface': 'rgba(255,255,255,.05)', '--surface-2': 'rgba(255,255,255,.085)',
      '--line': 'rgba(170,255,200,.12)', '--line-strong': 'rgba(170,255,200,.24)',
      '--text': '#f0fff5', '--muted': '#a3c9b1', '--faint': '#6d947c',
      '--accent-a': '#c6f432', '--accent-b': '#1fbf75', '--accent': '#3ddc84', '--on-accent': '#022012',
      '--glow-1': '#0f9d58', '--glow-2': '#7ad321', '--glow-3': '#00b38f',
      '--good': '#7cf0a0', '--bad': '#ff7a7a',
    },
  },
  {
    id: 'gold',
    name: 'Midnight Gold',
    swatch: ['#0a0a0a', '#e9c46a', '#fff1c1'],
    vars: {
      '--bg': '#080807', '--bg-2': '#14130f', '--surface': 'rgba(255,240,200,.045)', '--surface-2': 'rgba(255,240,200,.08)',
      '--line': 'rgba(255,230,170,.12)', '--line-strong': 'rgba(255,230,170,.24)',
      '--text': '#fffaf0', '--muted': '#c9bfa6', '--faint': '#8f876f',
      '--accent-a': '#fff1c1', '--accent-b': '#d9a441', '--accent': '#e9c46a', '--on-accent': '#1d1500',
      '--glow-1': '#a8741a', '--glow-2': '#5a4410', '--glow-3': '#e9c46a',
      '--good': '#8be3a5', '--bad': '#f08a7a',
    },
  },
  {
    id: 'dawn',
    name: 'Dawn',
    light: true,
    swatch: ['#fff4ec', '#ff7a59', '#8a5cff'],
    vars: {
      '--bg': '#fff6ef', '--bg-2': '#ffe9dc', '--surface': 'rgba(255,255,255,.62)', '--surface-2': 'rgba(255,255,255,.85)',
      '--line': 'rgba(90,40,30,.10)', '--line-strong': 'rgba(90,40,30,.2)',
      '--text': '#2a1712', '--muted': '#7b5a51', '--faint': '#a88a80',
      '--accent-a': '#ff9a5a', '--accent-b': '#d14bff', '--accent': '#ff6a4a', '--on-accent': '#ffffff',
      '--glow-1': '#ffb199', '--glow-2': '#e2b6ff', '--glow-3': '#ffd59a',
      '--good': '#14a35c', '--bad': '#e0364f',
    },
  },
]

export function findTheme(id: string): Theme {
  return themes.find((theme) => theme.id === id) ?? themes[0]
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  for (const [key, value] of Object.entries(theme.vars)) root.style.setProperty(key, value)
  root.dataset.theme = theme.light ? 'light' : 'dark'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.vars['--bg'])
}

export const loadThemeId = () => loadSetting('theme', 'sanctuary')
export const saveThemeId = (id: string) => saveSetting('theme', id)
