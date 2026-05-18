import Constants from "expo-constants";
import * as Updates from "expo-updates";

function normalize(value: null | string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

const expoVersion = normalize(Constants.expoConfig?.version);
const publicVersion = normalize(process.env.EXPO_PUBLIC_VEX_APP_VERSION);
const commit = normalize(process.env.EXPO_PUBLIC_VEX_COMMIT_SHA) ?? "local";
const shortCommit =
    commit === "local" ? commit : commit.slice(0, 8).toLowerCase();
const updateId = Updates.updateId ?? undefined;
const shortUpdateId = updateId?.slice(0, 8);
const createdAt = Updates.createdAt?.toISOString();

export const buildInfo = {
    channel: Updates.channel ?? "embedded",
    commit,
    createdAt,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    label: `${publicVersion ?? expoVersion ?? "0.0.0"}+${shortCommit}`,
    runtimeVersion: Updates.runtimeVersion ?? "unknown",
    shortCommit,
    shortUpdateId,
    updateId,
    version: publicVersion ?? expoVersion ?? "0.0.0",
} as const;
