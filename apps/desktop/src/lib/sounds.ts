/**
 * Sound effects using Web Audio API synthesis.
 * No binary assets needed — each sound is generated programmatically.
 *
 * Sounds are guarded by the 'vex-sounds-enabled' localStorage preference.
 * Toggle with setSoundsEnabled(bool) or read with getSoundsEnabled().
 */

const SOUNDS_KEY = "vex-sounds-enabled";

export function getSoundsEnabled(): boolean {
    return localStorage.getItem(SOUNDS_KEY) !== "false";
}

export function setSoundsEnabled(enabled: boolean): void {
    localStorage.setItem(SOUNDS_KEY, String(enabled));
}

// Lazy AudioContext — created on first use to avoid autoplay policy issues
let ctx: AudioContext | null = null;

type OscType = "sawtooth" | "sine" | "square" | "triangle";

interface Tone {
    duration: number; // seconds
    endFreq?: number; // if set, sweep from freq to endFreq
    freq: number;
    gain?: number;
    start: number; // seconds from now
    type?: OscType;
}

/** Played on auth error / failed login — short descending buzz. */
export function playError(): void {
    play([
        {
            duration: 0.12,
            endFreq: 180,
            freq: 220,
            gain: 0.1,
            start: 0,
            type: "square",
        },
        {
            duration: 0.12,
            endFreq: 150,
            freq: 180,
            gain: 0.08,
            start: 0.14,
            type: "square",
        },
    ]);
}

/** Played on logout — single falling tone. */
export function playLock(): void {
    play([{ duration: 0.25, endFreq: 330, freq: 440, gain: 0.14, start: 0 }]);
}

/** Played on incoming message — soft two-tone ping. */
export function playNotify(): void {
    play([
        { duration: 0.1, freq: 880, gain: 0.12, start: 0 },
        { duration: 0.14, freq: 1046, gain: 0.1, start: 0.08 },
    ]);
}

/** Played on successful login / registration — rising two-note chime. */
export function playUnlock(): void {
    play([
        { duration: 0.12, freq: 523, start: 0 }, // C5
        { duration: 0.18, freq: 784, start: 0.1 }, // G5
    ]);
}

function getCtx(): AudioContext {
    if (!ctx || ctx.state === "closed") {
        ctx = new AudioContext();
    }
    return ctx;
}

function play(tones: Tone[]): void {
    if (!getSoundsEnabled()) return;
    const ac = getCtx();
    const now = ac.currentTime;

    for (const t of tones) {
        const osc = ac.createOscillator();
        const gain = ac.createGain();

        osc.type = t.type ?? "sine";
        osc.frequency.setValueAtTime(t.freq, now + t.start);
        if (t.endFreq !== undefined) {
            osc.frequency.linearRampToValueAtTime(
                t.endFreq,
                now + t.start + t.duration,
            );
        }

        const g = t.gain ?? 0.18;
        gain.gain.setValueAtTime(0, now + t.start);
        gain.gain.linearRampToValueAtTime(g, now + t.start + 0.01);
        gain.gain.setValueAtTime(g, now + t.start + t.duration - 0.04);
        gain.gain.linearRampToValueAtTime(0, now + t.start + t.duration);

        osc.connect(gain);
        gain.connect(ac.destination);

        osc.start(now + t.start);
        osc.stop(now + t.start + t.duration);
    }
}
