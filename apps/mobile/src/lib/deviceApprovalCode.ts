const APPROVAL_CODE_LENGTH = 6;

export function approvalCodeForRequest(request: {
    approvedDeviceID?: string;
    requestID: string;
    signKey?: string;
}): string {
    const source =
        request.approvedDeviceID ?? request.signKey ?? request.requestID;
    return formatApprovalCode(source);
}

export function approvalCodeFromRequestID(requestID: string): string {
    return formatApprovalCode(requestID);
}

function formatApprovalCode(rawValue: string): string {
    const normalized = rawValue.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const raw = normalized.slice(0, APPROVAL_CODE_LENGTH);
    if (raw.length <= 3) {
        return raw;
    }
    return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}
