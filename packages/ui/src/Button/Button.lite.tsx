import { useDefaultProps } from '@builder.io/mitosis'

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
  onClick?: (event: MouseEvent) => void
  children?: any
}

export default function Button(props: ButtonProps) {
  useDefaultProps<ButtonProps>({
    variant: 'primary',
    size: 'md',
    disabled: false,
    type: 'button',
    className: '',
  })

  return (
    <button
      class={`btn btn--${props.variant} btn--${props.size} ${props.className}`}
      disabled={props.disabled}
      type={props.type}
      onClick={(event) => props.onClick?.(event)}
    >
      {props.children}
    </button>
  )
}
