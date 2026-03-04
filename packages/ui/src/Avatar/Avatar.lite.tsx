import { useDefaultProps } from '@builder.io/mitosis'

export interface AvatarProps {
  src?: string
  alt?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  initials?: string
  className?: string
}

export default function Avatar(props: AvatarProps) {
  useDefaultProps<AvatarProps>({
    size: 'md',
    alt: '',
    initials: '?',
    className: '',
  })

  return (
    <div class={`avatar avatar--${props.size} ${props.className}`}>
      <img
        class="avatar__img"
        src={props.src}
        alt={props.alt}
        onError={(e: any) => {
          e.currentTarget.style.display = 'none'
        }}
      />
      <span class="avatar__fallback">{props.initials}</span>
    </div>
  )
}
