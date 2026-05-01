import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { vexService } from "../service.ts";

class FakeSocket {
    sendCallCount = 0;
    private messageListeners = new Set<(data: Uint8Array) => void>();

    emitMessage(data: Uint8Array): void {
        for (const listener of this.messageListeners) {
            listener(data);
        }
    }

    off(event: "message", listener: (data: Uint8Array) => void): void {
        if (event === "message") {
            this.messageListeners.delete(listener);
        }
    }

    on(event: "message", listener: (data: Uint8Array) => void): void {
        if (event === "message") {
            this.messageListeners.add(listener);
        }
    }

    send(_data: Uint8Array): void {
        this.sendCallCount += 1;
    }
}

function extractFirstArgStrings(
    calls: ReturnType<typeof vi.spyOn>["mock"]["calls"],
): string[] {
    return calls
        .map((args) => args[0])
        .filter((value): value is string => typeof value === "string");
}

describe("vexService websocket debug instrumentation", () => {
    const previousDebugEnv = process.env["VEX_DEBUG_AUTH"];

    beforeEach(() => {
        process.env["VEX_DEBUG_AUTH"] = "1";
        const svc = vexService as unknown as {
            client: null | { socket?: unknown };
            setWebsocketDebug(enabled: boolean): void;
            setWebsocketFrameDebug(enabled: boolean): void;
            setWebsocketStateDebug(enabled: boolean): void;
        };

        // Reset singleton service debug state between tests.
        svc.setWebsocketDebug(false);
        svc.setWebsocketFrameDebug(false);
        svc.setWebsocketStateDebug(false);
        svc.client = null;
    });

    afterEach(() => {
        if (previousDebugEnv === undefined) {
            delete process.env["VEX_DEBUG_AUTH"];
            return;
        }
        process.env["VEX_DEBUG_AUTH"] = previousDebugEnv;
    });

    test("emits frame logs when enabled, silent when disabled", () => {
        const svc = vexService as unknown as {
            client: null | { socket?: unknown };
            setWebsocketDebug(enabled: boolean): void;
            setWebsocketFrameDebug(enabled: boolean): void;
            setWebsocketStateDebug(enabled: boolean): void;
        };
        const socket = new FakeSocket();
        svc.client = { socket };

        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        try {
            svc.setWebsocketStateDebug(false);
            svc.setWebsocketFrameDebug(false);
            svc.setWebsocketDebug(true);

            socket.send(Uint8Array.from([1, 2, 3]));
            socket.emitMessage(Uint8Array.from([4, 5, 6]));

            let lines = extractFirstArgStrings(logSpy.mock.calls);
            expect(lines.some((line) => line.includes("ws:in"))).toBe(false);
            expect(lines.some((line) => line.includes("ws:out"))).toBe(false);

            svc.setWebsocketDebug(false);
            svc.setWebsocketFrameDebug(true);
            svc.setWebsocketDebug(true);
            logSpy.mockClear();

            socket.send(Uint8Array.from([7, 8, 9]));
            socket.emitMessage(Uint8Array.from([10, 11, 12]));

            lines = extractFirstArgStrings(logSpy.mock.calls);
            expect(lines.some((line) => line.includes("ws:out"))).toBe(true);
            expect(lines.some((line) => line.includes("ws:in"))).toBe(true);
        } finally {
            logSpy.mockRestore();
            svc.setWebsocketDebug(false);
            svc.client = null;
        }
    });

    test("state transition logs can be toggled independently", () => {
        const svc = vexService as unknown as {
            client: null | { socket?: unknown };
            setWebsocketDebug(enabled: boolean): void;
            setWebsocketFrameDebug(enabled: boolean): void;
            setWebsocketStateDebug(enabled: boolean): void;
        };
        const socket = new FakeSocket();
        svc.client = { socket };

        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        try {
            svc.setWebsocketFrameDebug(false);
            svc.setWebsocketStateDebug(false);
            svc.setWebsocketDebug(true);

            let lines = extractFirstArgStrings(logSpy.mock.calls);
            expect(
                lines.some((line) => line.includes("ws:debug:attached")),
            ).toBe(false);

            svc.setWebsocketDebug(false);
            svc.setWebsocketStateDebug(true);
            logSpy.mockClear();
            svc.setWebsocketDebug(true);
            svc.setWebsocketDebug(false);

            lines = extractFirstArgStrings(logSpy.mock.calls);
            expect(
                lines.some((line) => line.includes("ws:debug:attached")),
            ).toBe(true);
            expect(
                lines.some((line) => line.includes("ws:debug:detached")),
            ).toBe(false);
        } finally {
            logSpy.mockRestore();
            svc.setWebsocketDebug(false);
            svc.client = null;
        }
    });
});
