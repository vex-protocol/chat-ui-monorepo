import { atom } from "nanostores";

/**
 * Result published by `AvatarCropScreen` when the user confirms a
 * crop. Settings reads this atom on focus to pick the cropped URI
 * up and continue the upload pipeline.
 */
export interface AvatarCropResult {
    height: number;
    requestId: number;
    uri: string;
    width: number;
}

export const $avatarCropResult = atom<AvatarCropResult | null>(null);

/** Used by the settings flow to seed a fresh request before navigating. */
let nextRequestId = 1;
export function nextAvatarCropRequestId(): number {
    nextRequestId += 1;
    return nextRequestId;
}
