import type { Message } from "@vex-chat/libvex";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
    $channelUnreadCountsWritable,
    $dmUnreadCountsWritable,
    $groupMessagesWritable,
    $messagesWritable,
} from "../domains/messaging.ts";
import { vexService } from "../service.ts";

function installClient({
    deleteMessage = vi.fn(async (_mailID: string) => {}),
    deleteThread = vi.fn(async (_conversationKey: string) => {}),
}: {
    deleteMessage?: (mailID: string) => Promise<void>;
    deleteThread?: (conversationKey: string) => Promise<void>;
} = {}) {
    (vexService as unknown as { client: unknown }).client = {
        database: {
            deleteMessage,
        },
        messages: {
            delete: deleteThread,
        },
    };
    return { deleteMessage, deleteThread };
}

function makeMessage(overrides: Partial<Message> = {}): Message {
    return {
        authorID: "user-a",
        direction: "incoming",
        group: null,
        mailID: "m1",
        message: "hello",
        recipientID: "me",
        timestamp: "2026-01-01T00:00:00.000Z",
        ...overrides,
    } as Message;
}

function resetClient(): void {
    (vexService as unknown as { client: null }).client = null;
}

describe("vexService.deleteLocalMessage", () => {
    beforeEach(() => {
        $messagesWritable.set({});
        $groupMessagesWritable.set({});
        $dmUnreadCountsWritable.set({});
        $channelUnreadCountsWritable.set({});
    });

    afterEach(() => {
        resetClient();
    });

    test("removes DM message by mailID", async () => {
        const { deleteMessage } = installClient();
        $messagesWritable.set({
            "user-a": [
                makeMessage(),
                makeMessage({
                    mailID: "m2",
                    message: "world",
                    timestamp: "2026-01-01T00:00:01.000Z",
                }),
            ],
        });

        const deleted = await vexService.deleteLocalMessage(
            "user-a",
            "m1",
            false,
        );

        expect(deleted).toBe(true);
        expect(deleteMessage).toHaveBeenCalledWith("m1");
        expect(
            $messagesWritable.get()["user-a"]?.map((msg) => msg.mailID),
        ).toEqual(["m2"]);
    });

    test("removes group message by mailID", async () => {
        const { deleteMessage } = installClient();
        $groupMessagesWritable.set({
            "channel-1": [
                makeMessage({
                    group: "channel-1",
                    mailID: "g1",
                    message: "first",
                }),
            ],
        });

        const deleted = await vexService.deleteLocalMessage(
            "channel-1",
            "g1",
            true,
        );

        expect(deleted).toBe(true);
        expect(deleteMessage).toHaveBeenCalledWith("g1");
        expect($groupMessagesWritable.get()["channel-1"]).toEqual([]);
    });

    test("returns false when mailID does not exist", async () => {
        const { deleteMessage } = installClient();
        $messagesWritable.set({
            "user-a": [makeMessage()],
        });

        const deleted = await vexService.deleteLocalMessage(
            "user-a",
            "missing",
            false,
        );

        expect(deleted).toBe(false);
        expect(
            $messagesWritable.get()["user-a"]?.map((msg) => msg.mailID),
        ).toEqual(["m1"]);
        expect(deleteMessage).not.toHaveBeenCalled();
    });

    test("keeps the thread when the persisted message delete fails", async () => {
        installClient({
            deleteMessage: vi.fn(async (_mailID: string) => {
                throw new Error("database locked");
            }),
        });
        $messagesWritable.set({
            "user-a": [makeMessage()],
        });

        const deleted = await vexService.deleteLocalMessage(
            "user-a",
            "m1",
            false,
        );

        expect(deleted).toBe(false);
        expect(
            $messagesWritable.get()["user-a"]?.map((msg) => msg.mailID),
        ).toEqual(["m1"]);
    });
});

describe("vexService.deleteLocalThread", () => {
    beforeEach(() => {
        $messagesWritable.set({});
        $groupMessagesWritable.set({});
        $dmUnreadCountsWritable.set({});
        $channelUnreadCountsWritable.set({});
    });

    afterEach(() => {
        resetClient();
    });

    test("removes a persisted DM thread and clears unread count", async () => {
        const { deleteThread } = installClient();
        $messagesWritable.set({
            "user-a": [makeMessage()],
            "user-b": [
                makeMessage({
                    mailID: "m2",
                }),
            ],
        });
        $dmUnreadCountsWritable.set({
            "user-a": 3,
            "user-b": 1,
        });

        const deleted = await vexService.deleteLocalThread("user-a", false);

        expect(deleted).toBe(true);
        expect(deleteThread).toHaveBeenCalledWith("user-a");
        expect($messagesWritable.get()).toEqual({
            "user-b": [
                expect.objectContaining({
                    mailID: "m2",
                }),
            ],
        });
        expect($dmUnreadCountsWritable.get()["user-a"]).toBe(0);
        expect($dmUnreadCountsWritable.get()["user-b"]).toBe(1);
    });

    test("removes a persisted group thread and clears unread count", async () => {
        const { deleteThread } = installClient();
        $groupMessagesWritable.set({
            "channel-1": [
                makeMessage({
                    group: "channel-1",
                    mailID: "g1",
                }),
            ],
        });
        $channelUnreadCountsWritable.set({
            "channel-1": 2,
        });

        const deleted = await vexService.deleteLocalThread("channel-1", true);

        expect(deleted).toBe(true);
        expect(deleteThread).toHaveBeenCalledWith("channel-1");
        expect($groupMessagesWritable.get()).toEqual({});
        expect($channelUnreadCountsWritable.get()["channel-1"]).toBe(0);
    });

    test("returns false when the thread does not exist locally", async () => {
        const { deleteThread } = installClient();

        const deleted = await vexService.deleteLocalThread("missing", false);

        expect(deleted).toBe(false);
        expect(deleteThread).not.toHaveBeenCalled();
    });
});
