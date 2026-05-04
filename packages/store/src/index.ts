// ── VexService (primary API for apps) ───────────────────────────────────────

export { parseInviteID, parseVexLink } from "./deeplink.ts";
export type { VexLink } from "./deeplink.ts";

// ── Domain atoms (readonly — apps can subscribe, not write) ─────────────────

export {
    $authStatus,
    $avatarHash,
    $avatarVersions,
    $devices,
    $familiars,
    $keyReplaced,
    $pendingApprovalStage,
    $signedOutIntent,
    $user,
} from "./domains/identity.ts";
export type { AuthStatus, PendingApprovalStage } from "./domains/identity.ts";
export {
    $channelUnreadCounts,
    $dmUnreadCounts,
    $groupMessages,
    $messages,
    $totalChannelUnread,
    $totalDmUnread,
} from "./domains/messaging.ts";

export {
    $channels,
    $onlineLists,
    $permissions,
    $servers,
} from "./domains/servers.ts";

export {
    $localMessageRetentionDays,
    $localMessageRetentionDaysWritable,
    clampLocalMessageRetentionDays,
    MAX_LOCAL_MESSAGE_RETENTION_DAYS,
    setLocalMessageRetentionDaysPreference,
} from "./domains/settings.ts";

// ── Utilities (pure functions, no state) ────────────────────────────────────

export {
    applyEmoji,
    avatarHue,
    chunkMessages,
    formatFileSize,
    formatTime,
    isImageType,
    parseFileExtra,
} from "./message-utils.ts";
export type { FileAttachment, MessageChunk } from "./message-utils.ts";

export {
    formatDmNotificationSubtitle,
    formatGroupNotificationSubtitle,
    shouldNotify,
} from "./notifications.ts";
export type { NotificationPayload } from "./notifications.ts";

export { vexService } from "./service.ts";
export type {
    AuthProbeStatus,
    AuthResult,
    BackgroundNetworkFetchResult,
    BootstrapConfig,
    CreateServerResult,
    DeviceApprovalRequest,
    OperationResult,
    PasskeySignInBegin,
    ResumeNetworkStatus,
    ServerOptions,
    SessionInfo,
} from "./service.ts";
