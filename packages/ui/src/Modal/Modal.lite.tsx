import { Show, useDefaultProps } from "@builder.io/mitosis";

export interface ModalProps {
    children?: any;
    className?: string;
    isOpen?: boolean;
    onClose?: () => void;
    title?: string;
}

export default function Modal(props: ModalProps) {
    useDefaultProps<ModalProps>({
        className: "",
        isOpen: false,
        title: "",
    });

    return (
        <Show when={props.isOpen}>
            <div class="modal-backdrop" onClick={() => props.onClose?.()}>
                <div
                    class={`modal ${props.className}`}
                    onClick={(e: any) => e.stopPropagation()}
                >
                    <div class="modal__header">
                        <span class="modal__title">{props.title}</span>
                        <button
                            aria-label="Close"
                            class="modal__close"
                            onClick={() => props.onClose?.()}
                            type="button"
                        >
                            ✕
                        </button>
                    </div>
                    <div class="modal__body">{props.children}</div>
                </div>
            </div>
        </Show>
    );
}
