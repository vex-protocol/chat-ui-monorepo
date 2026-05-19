import type { EncryptedFileAttachment } from "@vex-chat/store";

import { formatFileAttachmentMarkdown } from "@vex-chat/store";

interface AttachmentUploadService {
    uploadFileAttachment(input: {
        contentType: string;
        data: Uint8Array;
        fileName: string;
        fileSize?: number;
    }): Promise<{
        attachment?: EncryptedFileAttachment;
        error?: string;
        ok: boolean;
    }>;
}

export async function buildMessageBodyWithAttachment(
    service: AttachmentUploadService,
    content: string,
    attachment?: File,
): Promise<{ body: string; ok: true } | { error: string; ok: false }> {
    if (!attachment) {
        return { body: content, ok: true };
    }

    const data = new Uint8Array(await attachment.arrayBuffer());
    const uploaded = await service.uploadFileAttachment({
        contentType: attachment.type || "application/octet-stream",
        data,
        fileName: attachment.name || `attachment-${Date.now()}`,
        fileSize: attachment.size,
    });
    if (!uploaded.ok || !uploaded.attachment) {
        return {
            error: uploaded.error ?? "Failed to upload attachment",
            ok: false,
        };
    }

    const attachmentMarkdown = formatFileAttachmentMarkdown(
        uploaded.attachment,
    );
    return {
        body: content
            ? `${content}\n\n${attachmentMarkdown}`
            : attachmentMarkdown,
        ok: true,
    };
}
