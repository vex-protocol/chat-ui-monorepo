import { useDefaultProps } from '@builder.io/mitosis'

export interface MessageBubbleProps {
  author?: string
  content?: string
  timestamp?: string
  isOwn?: boolean
  className?: string
}

export default function MessageBubble(props: MessageBubbleProps) {
  useDefaultProps<MessageBubbleProps>({
    author: '',
    content: '',
    timestamp: '',
    isOwn: false,
    className: '',
  })

  return (
    <div class={`message-bubble ${props.isOwn ? 'message-bubble--own' : ''} ${props.className}`}>
      <span class="message-bubble__author">{props.author}</span>
      <p class="message-bubble__content">{props.content}</p>
      <time class="message-bubble__timestamp">{props.timestamp}</time>
    </div>
  )
}
