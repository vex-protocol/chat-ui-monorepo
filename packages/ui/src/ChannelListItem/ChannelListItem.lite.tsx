import { useDefaultProps } from '@builder.io/mitosis'

export interface ChannelListItemProps {
  name?: string
  unreadCount?: number
  isActive?: boolean
  className?: string
  onClick?: () => void
}

export default function ChannelListItem(props: ChannelListItemProps) {
  useDefaultProps<ChannelListItemProps>({
    name: '',
    unreadCount: 0,
    isActive: false,
    className: '',
  })

  return (
    <button
      class={`channel-list-item ${props.isActive ? 'channel-list-item--active' : ''} ${props.className}`}
      type="button"
      onClick={() => props.onClick?.()}
    >
      <span class="channel-list-item__prefix">#</span>
      <span class="channel-list-item__name">{props.name}</span>
      <span class="channel-list-item__badge">{props.unreadCount}</span>
    </button>
  )
}
