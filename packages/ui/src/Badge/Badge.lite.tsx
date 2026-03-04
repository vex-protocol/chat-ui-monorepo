import { useDefaultProps } from '@builder.io/mitosis'

export interface BadgeProps {
  variant?: 'online' | 'offline' | 'dnd' | 'idle'
  label?: string
  className?: string
}

export default function Badge(props: BadgeProps) {
  useDefaultProps<BadgeProps>({
    variant: 'offline',
    label: '',
    className: '',
  })

  return (
    <span
      class={`badge badge--${props.variant} ${props.className}`}
      aria-label={props.label}
      title={props.label}
    />
  )
}
