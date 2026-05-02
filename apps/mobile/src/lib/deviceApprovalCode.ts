// Both devices in a multi-device enrollment derive their displayed
// "matching code" from the same source: the first MATCHING_CODE_LENGTH
// hex characters of the *new* device's public signing key. The new
// device knows it from `client.getKeys().public`; the approving device
// receives it as `signKey` on the pending request payload. Picking the
// pubkey (rather than requestID or approvedDeviceID) is what lets us
// show the same code on both sides at the same moment, before the
// server has even minted a deviceID for the new device.
const MATCHING_CODE_LENGTH = 4;

/** @deprecated Use {@link matchingCodeForSignKey} instead. */
export function approvalCodeForRequest(request: {
    approvedDeviceID?: string;
    requestID: string;
    signKey?: string;
}): string {
    return matchingCodeStringForSignKey(
        request.signKey ?? request.approvedDeviceID ?? request.requestID,
    );
}

export function matchingCodeForSignKey(signKey: null | string): string[] {
    if (signKey === null || signKey.length === 0) {
        return Array.from({ length: MATCHING_CODE_LENGTH }, () => "");
    }
    const normalized = signKey.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
    const raw = normalized
        .slice(0, MATCHING_CODE_LENGTH)
        .padEnd(MATCHING_CODE_LENGTH, "·");
    return raw.split("").slice(0, MATCHING_CODE_LENGTH);
}

export function matchingCodeStringForSignKey(signKey: null | string): string {
    return matchingCodeForSignKey(signKey).join("");
}
