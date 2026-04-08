import { useDefaultProps, useStore, For } from '@builder.io/mitosis'
import Avatar from '../Avatar/Avatar.lite'

export interface MessageChunkProps {
  authorID: string
  authorName?: string
  avatarSrc?: string
  timestamp?: string
  messages?: string[]
  isSelf?: boolean
  avatarSize?: number
  className?: string
}

export default function MessageChunk(props: MessageChunkProps) {
  useDefaultProps<MessageChunkProps>({
    authorID: '',
    timestamp: '',
    messages: [],
    isSelf: false,
    avatarSize: 36,
    className: '',
  })

  const state = useStore({
    get displayName(): string {
      return props.authorName || (props.authorID ? props.authorID.slice(0, 8) : '')
    },
  })

  return (
    <div class={`message-chunk ${props.className}`} style={{ display: 'flex', gap: '10px', padding: '4px 0' }}>
      <Avatar userID={props.authorID} src={props.avatarSrc} size={props.avatarSize} displayName={props.authorName} />
      <div class="message-chunk__body" style={{ flex: '1', minWidth: '0' }}>
        <div class="message-chunk__header" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
          <span
            class={`message-chunk__author ${props.isSelf ? 'message-chunk__author--self' : ''}`}
            style={{ fontWeight: '600', fontSize: '14px' }}
          >
            {state.displayName}
          </span>
          <time class="message-chunk__time" style={{ fontSize: '11px', opacity: '0.5' }}>
            {props.timestamp}
          </time>
        </div>
        <For each={props.messages}>
          {(message: string) => (
            <div
              class="message-chunk__line"
              innerHTML={message}
              style={{ fontSize: '14px', lineHeight: '1.5', paddingTop: '1px', wordBreak: 'break-word' }}
            />
          )}
        </For>
      </div>
    </div>
  )
}
