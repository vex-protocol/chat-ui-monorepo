export const colors = {
  bg: '#010101',
  surface: '#131313',
  surfaceLight: '#1a1a1a',
  card: '#141414',
  text: '#fafafa',
  textSecondary: '#e8e8e8',
  muted: '#737373',
  mutedDark: '#666666',
  accent: '#e70000',
  accentDark: '#800000',
  accentMuted: '#cc2a2a',
  border: '#333333',
  borderSubtle: '#2a2a2a',
  input: '#242424',
  error: '#e53935',
  transparent: 'transparent',
} as const

export type ColorToken = keyof typeof colors
