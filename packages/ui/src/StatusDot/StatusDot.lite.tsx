import { useDefaultProps, useStore } from '@builder.io/mitosis'

export type StatusDotStatus = 'online' | 'away' | 'offline' | 'dnd'

export interface StatusDotProps {
  status?: StatusDotStatus
  className?: string
}

export default function StatusDot(props: StatusDotProps) {
  useDefaultProps<StatusDotProps>({
    status: 'offline',
    className: '',
  })

  const state = useStore({
    get color(): string {
      if (props.status === 'online') return '#43a047'
      if (props.status === 'away') return '#fb8c00'
      if (props.status === 'dnd') return '#e53935'
      return '#666666'
    },
  })

  return (
    <span
      class={`status-dot ${props.className}`}
      style={{
        display: 'inline-block',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: state.color,
        flexShrink: '0',
      }}
      aria-label={props.status}
    />
  )
}
