import { Platform, Vibration } from "react-native";

import * as Haptics from "expo-haptics";

/**
 * Tactile feedback vocabulary, dispatched through the platform's
 * dedicated haptics API on each side of the wire:
 *
 *   - **iOS** uses `expo-haptics`, which wraps the Taptic Engine via
 *     `UIImpactFeedbackGenerator` / `UISelectionFeedbackGenerator` /
 *     `UINotificationFeedbackGenerator`. iOS does *not* expose
 *     vibration *duration* — every feedback is one of a small set of
 *     calibrated styles. `Vibration.vibrate(<ms>)` on iOS triggers the
 *     full system "alert buzz" regardless of the number you pass,
 *     which is why a hand-tuned 8 ms / 12 ms / 24 ms pattern feels
 *     way too strong on iPhone but right on Android.
 *
 *   - **Android** keeps the existing `Vibration.vibrate(<ms>)` patterns
 *     since the Android Vibrator API does honor durations and our
 *     existing intensities are already dialed in.
 *
 * Add new kinds here rather than calling `Vibration.vibrate` directly
 * from screens — keeps the "feel" tunable from one file.
 */

export type HapticKind =
    | "confirm"
    | "destructive"
    | "error"
    | "selection"
    | "slotIn"
    | "slotOut"
    | "success"
    | "tap";

interface PlatformPattern {
    /** Android: Vibration.vibrate(<ms>) or pattern array. */
    android: number | number[];
    /**
     * iOS: a function so we can pick the right `expo-haptics` family
     * (`impactAsync` / `selectionAsync` / `notificationAsync`).
     */
    ios: () => Promise<unknown>;
}

// Overall intensities skew quieter than the originals — the previous
// pass landed too loud on iPhone 15+ (which has a more sensitive
// Taptic Engine than older phones). Heavier cadences are reserved for
// destructive / success / error semantics where the user explicitly
// needs to feel "something important happened".
const PATTERNS: Record<HapticKind, PlatformPattern> = {
    /** Confirming an intentional primary action (send, login, submit). */
    confirm: {
        android: 14,
        ios: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    },
    /** Destructive confirmation. */
    destructive: {
        android: [0, 14, 60, 18],
        ios: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    },
    /** Failed action — e.g. device verification mismatch. */
    error: {
        android: [0, 22, 60, 22, 60, 22],
        ios: () =>
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    },
    /** Picking from a list (DM / channel / server). */
    selection: {
        android: 8,
        ios: () => Haptics.selectionAsync(),
    },
    /**
     * The opening half of a "click ... CLICK" pair — the moment the
     * sidebar (or any drawer/panel) starts moving. The "Soft" iOS
     * style is muted/cushioned, deliberately quieter than slotOut so
     * the *landing* feels like the heavier event.
     */
    slotIn: {
        android: 4,
        ios: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft),
    },
    /**
     * The closing half — a clean, sharp "rigid" tick on iOS that
     * feels like a machined part snapping into place. Rigid is the
     * sharpest impact style on iOS (more focused than Heavy, less
     * thuddy) which gives the "CLICK" of a precision detent.
     */
    slotOut: {
        android: 12,
        ios: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),
    },
    /** Success cadence (auth complete, avatar uploaded). */
    success: {
        android: [0, 14, 50, 18],
        ios: () =>
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    },
    /** Lightest available — generic nav/drawer ack. */
    tap: {
        android: 4,
        ios: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft),
    },
};

/**
 * Fire a haptic pulse immediately. Cheap, fire-and-forget, never
 * throws. iOS no-ops in Low Power Mode, when the camera is active,
 * during dictation, or if the user disabled the Taptic Engine in
 * Settings — by design.
 */
export function haptic(kind: HapticKind = "tap"): void {
    const pattern = PATTERNS[kind];
    if (Platform.OS === "ios") {
        // Promise rejections from expo-haptics are non-fatal; swallow.
        void pattern.ios().catch(() => {
            /* ignore */
        });
        return;
    }
    const android = pattern.android;
    if (Array.isArray(android)) {
        Vibration.vibrate([...android]);
    } else {
        Vibration.vibrate(android);
    }
}

/**
 * Schedule a haptic to fire `delayMs` from now. Returns a cancel
 * function — useful when an animation gets interrupted.
 *
 * This is the building block for "click ... CLICK" cadences synced
 * to a sliding panel: fire `haptic("slotIn")` at the start of the
 * animation, then `haptic.scheduled("slotOut", duration)` so the
 * landing tick lands exactly when the panel does.
 */
haptic.scheduled = function scheduled(
    kind: HapticKind,
    delayMs: number,
): () => void {
    if (delayMs <= 0) {
        haptic(kind);
        return () => {
            /* nothing to cancel */
        };
    }
    const handle = setTimeout(() => {
        haptic(kind);
    }, delayMs);
    return () => {
        clearTimeout(handle);
    };
};
