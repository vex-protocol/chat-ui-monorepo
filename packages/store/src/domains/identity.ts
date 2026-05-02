import type { Device, User } from "@vex-chat/libvex";

import { atom, map, readonlyType } from "nanostores";

export type AuthStatus =
    | "authenticated"
    | "checking"
    | "offline"
    | "signed_out"
    | "unauthorized";

// Sub-status for the multi-device enrollment flow on the *new* (requesting)
// device. Lets the AuthenticateScreen show distinct UI states between
// "still waiting for the existing device to approve", "approval landed —
// signing in", and "signed in — loading your account" before the
// navigator swaps to the App stack on $user.
export type PendingApprovalStage =
    | "idle"
    | "loading_account"
    | "signing_in"
    | "waiting";

// ── Writable (internal — only VexService imports these) ─────────────────────

export const $userWritable = atom<null | User>(null);
export const $familiarsWritable = map<Record<string, User>>({});
export const $devicesWritable = map<Record<string, Device[]>>({});
export const $avatarHashWritable = atom<number>(0);
export const $authStatusWritable = atom<AuthStatus>("signed_out");
export const $keyReplacedWritable = atom<boolean>(false);
// True only after an explicit user sign-out. Lets the auth UI distinguish
// "fresh boot, never tried" from "user just hit Sign Out" so we don't loop
// straight back into autoLogin from the kept keychain credentials.
export const $signedOutIntentWritable = atom<boolean>(false);
export const $pendingApprovalStageWritable = atom<PendingApprovalStage>("idle");

// ── Readable (public — components subscribe to these) ───────────────────────

export const $user = readonlyType($userWritable);
export const $familiars = readonlyType($familiarsWritable);
export const $devices = readonlyType($devicesWritable);
export const $avatarHash = readonlyType($avatarHashWritable);
export const $authStatus = readonlyType($authStatusWritable);
export const $keyReplaced = readonlyType($keyReplacedWritable);
export const $signedOutIntent = readonlyType($signedOutIntentWritable);
export const $pendingApprovalStage = readonlyType(
    $pendingApprovalStageWritable,
);
