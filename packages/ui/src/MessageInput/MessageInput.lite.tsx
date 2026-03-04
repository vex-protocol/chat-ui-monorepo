import { useDefaultProps } from '@builder.io/mitosis'

export interface MessageInputProps {
  value?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  onInput?: (value: string) => void
  onSend?: (value: string) => void
}

export default function MessageInput(props: MessageInputProps) {
  useDefaultProps<MessageInputProps>({
    value: '',
    placeholder: 'Type a message...',
    disabled: false,
    className: '',
  })

  return (
    <div class={`message-input ${props.className}`}>
      <textarea
        class="message-input__textarea"
        value={props.value}
        placeholder={props.placeholder}
        disabled={props.disabled}
        rows={1}
        onInput={(e: any) => props.onInput?.(e.target.value)}
        onKeyDown={(e: any) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            props.onSend?.(props.value ?? '')
          }
        }}
      />
      <button
        class="message-input__send"
        disabled={props.disabled}
        type="button"
        onClick={() => props.onSend?.(props.value ?? '')}
      >
        Send
      </button>
    </div>
  )
}
