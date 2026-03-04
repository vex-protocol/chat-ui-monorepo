export const meta = {
  title: 'Badge',
  argTypes: {
    variant: { control: 'select', options: ['online', 'offline', 'dnd', 'idle'] },
    label: { control: 'text' },
  },
}

export const Online = { args: { variant: 'online', label: 'Online' } }
export const Offline = { args: { variant: 'offline', label: 'Offline' } }
export const DoNotDisturb = { args: { variant: 'dnd', label: 'Do Not Disturb' } }
export const Idle = { args: { variant: 'idle', label: 'Idle' } }
