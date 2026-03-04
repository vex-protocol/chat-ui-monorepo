import { useDefaultProps } from '@builder.io/mitosis'

export interface SearchBarProps {
  value?: string
  placeholder?: string
  className?: string
  onInput?: (value: string) => void
}

export default function SearchBar(props: SearchBarProps) {
  useDefaultProps<SearchBarProps>({
    value: '',
    placeholder: 'Search...',
    className: '',
  })

  return (
    <div class={`search-bar ${props.className}`}>
      <span class="search-bar__icon" aria-hidden="true">
        🔍
      </span>
      <input
        class="search-bar__input"
        type="search"
        value={props.value}
        placeholder={props.placeholder}
        onInput={(e: any) => props.onInput?.(e.target.value)}
      />
    </div>
  )
}
