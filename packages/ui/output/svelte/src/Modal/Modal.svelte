<script context="module" lang="ts">
  export interface ModalProps {
    children?: any;
    className?: string;
    isOpen?: boolean;
    onClose?: () => void;
    title?: string;
  }
</script>

<script lang="ts">
  export let isOpen: ModalProps["isOpen"] = false;
  export let onClose: ModalProps["onClose"] = undefined;
  export let className: ModalProps["className"] = "";
  export let title: ModalProps["title"] = "";
</script>

{#if isOpen}
  <div
    class="modal-backdrop"
    on:click={(event) => {
      onClose?.();
    }}
  >
    <div
      class={`modal ${className}`}
      on:click={(e) => {
        e.stopPropagation();
      }}
    >
      <div class="modal__header">
        <span class="modal__title">{title}</span><button
          aria-label="Close"
          class="modal__close"
          type="button"
          on:click={(event) => {
            onClose?.();
          }}
        >
          ✕
        </button>
      </div>
      <div class="modal__body"><slot /></div>
    </div>
  </div>
{/if}