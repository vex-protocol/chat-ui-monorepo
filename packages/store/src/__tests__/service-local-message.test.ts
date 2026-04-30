import type { Message } from "@vex-chat/libvex";

import { beforeEach, describe, expect, test } from "vitest";

import {
    $groupMessagesWritable,
    $messagesWritable,
} from "../domains/messaging.ts";
import { vexService } from "../service.ts";

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

describe("vexService.deleteLocalMessage", () => {
    beforeEach(() => {
        $messagesWritable.set({});
        $groupMessagesWritable.set({});
    });

    test("removes DM message by mailID", () => {
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

        const deleted = vexService.deleteLocalMessage("user-a", "m1", false);

        expect(deleted).toBe(true);
        expect(
            $messagesWritable.get()["user-a"]?.map((msg) => msg.mailID),
        ).toEqual(["m2"]);
    });

    test("removes group message by mailID", () => {
        $groupMessagesWritable.set({
            "channel-1": [
                makeMessage({
                    group: "channel-1",
                    mailID: "g1",
                    message: "first",
                }),
            ],
        });

        const deleted = vexService.deleteLocalMessage("channel-1", "g1", true);

        expect(deleted).toBe(true);
        expect($groupMessagesWritable.get()["channel-1"]).toEqual([]);
    });

    test("returns false when mailID does not exist", () => {
        $messagesWritable.set({
            "user-a": [makeMessage()],
        });

        const deleted = vexService.deleteLocalMessage(
            "user-a",
            "missing",
            false,
        );

        expect(deleted).toBe(false);
        expect(
            $messagesWritable.get()["user-a"]?.map((msg) => msg.mailID),
        ).toEqual(["m1"]);
    });
});
