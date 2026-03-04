import { useDefaultProps } from '@builder.io/mitosis'

export interface ServerListItemProps {
  name?: string
  avatarUrl?: string
  isActive?: boolean
  className?: string
  onClick?: () => void
}

export default function ServerListItem(props: ServerListItemProps) {
  useDefaultProps<ServerListItemProps>({
    name: '',
    avatarUrl: '',
    isActive: false,
    className: '',
  })

  return (
    <button
      class={`server-list-item ${props.isActive ? 'server-list-item--active' : ''} ${props.className}`}
      type="button"
      title={props.name}
      onClick={() => props.onClick?.()}
    >
      <img
        class="server-list-item__avatar"
        src={props.avatarUrl}
        alt={props.name}
        onError={(e: any) => {
          e.currentTarget.style.display = 'none'
        }}
      />
      <span class="server-list-item__initial">{props.name ? props.name[0] : ''}</span>
    </button>
  )
}
