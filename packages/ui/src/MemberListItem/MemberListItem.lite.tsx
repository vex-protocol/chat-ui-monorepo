import { useDefaultProps } from '@builder.io/mitosis'
import Avatar from '../Avatar/Avatar.lite'
import StatusDot from '../StatusDot/StatusDot.lite'
import type { StatusDotStatus } from '../StatusDot/StatusDot.lite'

export interface MemberListItemProps {
  userID: string
  username?: string
  avatarSrc?: string
  status?: StatusDotStatus
  className?: string
}

export default function MemberListItem(props: MemberListItemProps) {
  useDefaultProps<MemberListItemProps>({
    userID: '',
    username: '',
    status: 'offline',
    className: '',
  })

  return (
    <div
      class={`member-list-item ${props.className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 8px',
        borderRadius: '4px',
      }}
    >
      <Avatar userID={props.userID} src={props.avatarSrc} size={24} displayName={props.username} />
      <StatusDot status={props.status} />
      <span
        class="member-list-item__name"
        style={{
          fontSize: '13px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {props.username || props.userID}
      </span>
    </div>
  )
}
