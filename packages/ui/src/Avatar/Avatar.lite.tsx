import { useDefaultProps, useStore } from '@builder.io/mitosis'

export interface AvatarProps {
  src?: string
  alt?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | number
  userID?: string
  displayName?: string
  className?: string
}

export default function Avatar(props: AvatarProps) {
  useDefaultProps<AvatarProps>({
    size: 'md',
    alt: '',
    className: '',
  })

  const state = useStore({
    imgFailed: false,
    get px(): number {
      const s = props.size
      if (typeof s === 'number') return s
      if (s === 'xs') return 20
      if (s === 'sm') return 28
      if (s === 'lg') return 48
      return 36
    },
    get initials(): string {
      if (props.displayName) return props.displayName.slice(0, 2).toUpperCase()
      if (props.userID) return props.userID.slice(0, 2).toUpperCase()
      return '?'
    },
    get fallbackBg(): string {
      const id = props.userID
      if (!id) return 'hsl(0, 0%, 40%)'
      let h = 0
      for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
      return `hsl(${Math.abs(h) % 360}, 45%, 40%)`
    },
    handleError() {
      state.imgFailed = true
    },
  })

  return (
    <div
      class={`avatar ${props.className}`}
      style={{
        width: `${state.px}px`,
        height: `${state.px}px`,
        borderRadius: '50%',
        flexShrink: '0',
        display: 'inline-flex',
        overflow: 'hidden',
      }}
    >
      {props.src && !state.imgFailed ? (
        <img
          class="avatar__img"
          src={props.src}
          alt={props.alt}
          width={state.px}
          height={state.px}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '50%',
          }}
          onError={() => state.handleError()}
        />
      ) : (
        <div
          class="avatar__fallback"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: state.fallbackBg,
            color: '#fff',
            fontWeight: '700',
            fontSize: `${Math.round(state.px * 0.4)}px`,
            letterSpacing: '0.02em',
            userSelect: 'none',
            borderRadius: '50%',
          }}
        >
          {state.initials}
        </div>
      )}
    </div>
  )
}
