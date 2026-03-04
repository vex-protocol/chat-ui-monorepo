import { useDefaultProps, Show } from '@builder.io/mitosis'

export interface ModalProps {
  isOpen?: boolean
  title?: string
  className?: string
  onClose?: () => void
  children?: any
}

export default function Modal(props: ModalProps) {
  useDefaultProps<ModalProps>({
    isOpen: false,
    title: '',
    className: '',
  })

  return (
    <Show when={props.isOpen}>
      <div
        class="modal-backdrop"
        onClick={() => props.onClose?.()}
      >
        <div
          class={`modal ${props.className}`}
          onClick={(e: any) => e.stopPropagation()}
        >
          <div class="modal__header">
            <span class="modal__title">{props.title}</span>
            <button
              class="modal__close"
              type="button"
              aria-label="Close"
              onClick={() => props.onClose?.()}
            >
              ✕
            </button>
          </div>
          <div class="modal__body">{props.children}</div>
        </div>
      </div>
    </Show>
  )
}
