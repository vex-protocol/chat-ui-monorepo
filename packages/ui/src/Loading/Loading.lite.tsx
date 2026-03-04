import { useDefaultProps } from '@builder.io/mitosis'

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

export default function Loading(props: LoadingProps) {
  useDefaultProps<LoadingProps>({
    size: 'md',
    label: 'Loading...',
    className: '',
  })

  return (
    <div
      class={`loading loading--${props.size} ${props.className}`}
      role="status"
      aria-label={props.label}
    >
      <span class="loading__spinner" />
      <span class="loading__label">{props.label}</span>
    </div>
  )
}
