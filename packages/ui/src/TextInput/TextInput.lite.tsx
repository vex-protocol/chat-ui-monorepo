import { useDefaultProps } from '@builder.io/mitosis'

export interface TextInputProps {
  value?: string
  placeholder?: string
  type?: 'text' | 'password' | 'email' | 'search'
  label?: string
  disabled?: boolean
  className?: string
  onInput?: (value: string) => void
  onChange?: (value: string) => void
}

export default function TextInput(props: TextInputProps) {
  useDefaultProps<TextInputProps>({
    value: '',
    placeholder: '',
    type: 'text',
    label: '',
    disabled: false,
    className: '',
  })

  return (
    <div class={`text-input ${props.className}`}>
      <label class="text-input__label">{props.label}</label>
      <input
        class="text-input__field"
        type={props.type}
        value={props.value}
        placeholder={props.placeholder}
        disabled={props.disabled}
        onInput={(e: any) => props.onInput?.(e.target.value)}
        onChange={(e: any) => props.onChange?.(e.target.value)}
      />
    </div>
  )
}
