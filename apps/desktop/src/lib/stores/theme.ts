import { writable } from 'svelte/store'

export type Theme = 'dark' | 'light'

const saved = (localStorage.getItem('vex-theme') as Theme) ?? 'dark'

export const theme = writable<Theme>(saved)

theme.subscribe((t) => {
  localStorage.setItem('vex-theme', t)
  document.documentElement.setAttribute('data-theme', t)
})

export function toggleTheme(): void {
  theme.update((t) => (t === 'dark' ? 'light' : 'dark'))
}
