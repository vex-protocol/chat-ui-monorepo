<script lang="ts">
    let {
        disabled,
        onSend,
        placeholder,
    }: {
        disabled?: boolean;
        onSend: (content: string, attachment?: File) => void;
        placeholder?: string;
    } = $props();

    let value = $state("");
    let textareaEl: HTMLTextAreaElement | null = $state(null);
    let fileInputEl: HTMLInputElement | null = $state(null);
    let attachment: File | null = $state(null);
    let previewUrl: null | string = $state(null);

    function autoResize(): void {
        if (!textareaEl) return;
        textareaEl.style.height = "auto";
        // 6 rows x 24px line-height = 144px max
        textareaEl.style.height = `${Math.min(textareaEl.scrollHeight, 144)}px`;
    }

    function handleKeyDown(e: KeyboardEvent): void {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    }

    function send(): void {
        const trimmed = value.trim();
        if ((!trimmed && !attachment) || disabled) return;
        onSend(trimmed, attachment ?? undefined);
        value = "";
        clearAttachment();
        if (textareaEl) textareaEl.style.height = "auto";
    }

    function openFilePicker(): void {
        fileInputEl?.click();
    }

    function handleFileSelect(e: Event): void {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        attachment = file;
        if (file.type.startsWith("image/")) {
            previewUrl = URL.createObjectURL(file);
        }
        // Reset input so the same file can be re-selected
        input.value = "";
    }

    function clearAttachment(): void {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        attachment = null;
        previewUrl = null;
    }

    function formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
</script>

<div class="chat-input">
    {#if attachment}
        <div class="chat-input__preview">
            {#if previewUrl}
                <img
                    src={previewUrl}
                    alt={attachment.name}
                    class="chat-input__preview-img"
                />
            {:else}
                <span class="chat-input__preview-icon">📄</span>
            {/if}
            <div class="chat-input__preview-info">
                <span class="chat-input__preview-name">{attachment.name}</span>
                <span class="chat-input__preview-size"
                    >{formatSize(attachment.size)}</span
                >
            </div>
            <button
                class="chat-input__preview-remove"
                onclick={clearAttachment}
                title="Remove attachment"
                aria-label="Remove attachment">✕</button
            >
        </div>
    {/if}

    <div class="chat-input__wrap">
        <textarea
            bind:this={textareaEl}
            bind:value
            rows={1}
            {placeholder}
            {disabled}
            onkeydown={handleKeyDown}
            oninput={autoResize}
            class="chat-input__textarea"
            aria-label="Message input"
        ></textarea>
        <div class="chat-input__icons">
            <input
                bind:this={fileInputEl}
                type="file"
                class="chat-input__file-input"
                onchange={handleFileSelect}
                tabindex={-1}
                aria-hidden="true"
            />
            <button
                class="chat-input__icon"
                title="Attach file"
                aria-label="Attach file"
                onclick={openFilePicker}
                {disabled}>📎</button
            >
            <button
                class="chat-input__icon"
                title="Emoji"
                aria-label="Emoji"
                disabled>😊</button
            >
            {#if value.trim() || attachment}
                <button
                    class="chat-input__send"
                    onclick={send}
                    disabled={(!value.trim() && !attachment) || disabled}
                    aria-label="Send message"
                    title="Send (Enter)">↑</button
                >
            {/if}
        </div>
    </div>
</div>

<style>
    .chat-input {
        padding: 10px 16px 12px;
        border-top: 1px solid var(--border);
        background: var(--bg-primary);
        flex-shrink: 0;
    }

    .chat-input__preview {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        margin-bottom: 6px;
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: 6px;
    }

    .chat-input__preview-img {
        width: 48px;
        height: 48px;
        object-fit: cover;
        border-radius: 4px;
        flex-shrink: 0;
    }

    .chat-input__preview-icon {
        font-size: 24px;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        filter: grayscale(1);
    }

    .chat-input__preview-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .chat-input__preview-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .chat-input__preview-size {
        font-size: 11px;
        color: var(--text-muted);
    }

    .chat-input__preview-remove {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: var(--text-muted);
        flex-shrink: 0;
    }

    .chat-input__preview-remove:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
    }

    .chat-input__file-input {
        display: none;
    }

    .chat-input__wrap {
        display: flex;
        align-items: flex-end;
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        transition: border-color 0.15s;
    }

    .chat-input__wrap:focus-within {
        border-color: var(--accent);
    }

    .chat-input__textarea {
        flex: 1;
        resize: none;
        line-height: 1.5;
        min-height: 40px;
        padding: 8px 12px;
        background: transparent;
        border: none;
        color: var(--text-primary);
        font-size: 14px;
        font-family: inherit;
        max-height: 144px;
        overflow-y: auto;
        width: auto;
    }

    .chat-input__textarea:focus {
        outline: none;
    }

    .chat-input__textarea:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .chat-input__icons {
        display: flex;
        align-items: center;
        gap: 2px;
        padding: 4px 6px;
        flex-shrink: 0;
    }

    .chat-input__icon {
        width: 28px;
        height: 28px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        color: var(--text-muted);
        filter: grayscale(1);
        opacity: 0.5;
        transition: opacity 0.1s;
    }

    .chat-input__icon:not(:disabled):hover {
        opacity: 0.8;
        background: var(--bg-hover);
    }

    .chat-input__icon:disabled {
        cursor: default;
    }

    .chat-input__send {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--accent);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 700;
        flex-shrink: 0;
        transition: opacity 0.15s;
    }

    .chat-input__send:not(:disabled):hover {
        opacity: 0.85;
    }

    .chat-input__send:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }
</style>
