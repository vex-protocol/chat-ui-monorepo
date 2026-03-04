<script context="module" lang="ts">
  export interface ModalProps {
    isOpen?: boolean;
    title?: string;
    className?: string;
    onClose?: () => void;
    children?: any;
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
          class="modal__close"
          type="button"
          aria-label="Close"
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