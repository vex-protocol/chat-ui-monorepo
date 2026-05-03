import { Vibration } from "react-native";

/**
 * Centralized haptic vocabulary. Keeping the magnitudes in one place
 * means we can tune the "feel" of the app without hunting through every
 * screen — and means callers don't have to remember the right number
 * for "light tap" vs "selection blip" vs "primary action".
 *
 * Patterns are millisecond durations (single number) or pause/duration
 * arrays as accepted by `Vibration.vibrate`.
 */
type HapticPattern = number | number[];

const PATTERNS: Record<HapticKind, HapticPattern> = {
    /** Confirming a primary, intentional action (send, login, submit). */
    confirm: 24,
    /** Heavier two-pulse used after a destructive confirmation. */
    destructive: [0, 22, 80, 22],
    /**
     * Fallback for a clearly *failed* action; used by the device-add
     * flow when verification fails so the user feels something is off.
     */
    error: [0, 35, 80, 35, 80, 35],
    /** A short blip used for picking something out of a list (DM/channel/server). */
    selection: 12,
    /** Success patterns — used after auth, after avatar upload, etc. */
    success: [0, 22, 60, 22],
    /** Lightest available — used to acknowledge any nav/drawer tap. */
    tap: 8,
};

export type HapticKind =
    | "confirm"
    | "destructive"
    | "error"
    | "selection"
    | "success"
    | "tap";

/**
 * Fire a haptic pulse. Cheap and fire-and-forget — never throws, never
 * blocks rendering. Devices without a vibrator (most tablets, the
 * iOS simulator) will silently no-op.
 */
export function haptic(kind: HapticKind = "tap"): void {
    const pattern = PATTERNS[kind];
    if (Array.isArray(pattern)) {
        // Copy to a fresh mutable array — Vibration.vibrate's RN typings
        // are non-readonly even though it never mutates the input.
        Vibration.vibrate([...pattern]);
        return;
    }
    Vibration.vibrate(pattern);
}
