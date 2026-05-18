import type { Channel, Message, Permission, Server } from "@vex-chat/libvex";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { $groupMessagesWritable } from "../domains/messaging.ts";
import {
    $channelsWritable,
    $permissionsWritable,
    $serversWritable,
} from "../domains/servers.ts";
import { vexService } from "../service.ts";

type TestClient = {
    close: ReturnType<typeof vi.fn>;
    servers: {
        leave: ReturnType<typeof vi.fn>;
    };
};

const serviceInternals = vexService as unknown as {
    client: null | TestClient;
};

function makeMessage(channelID: string, mailID: string): Message {
    return {
        authorID: "user-a",
        direction: "incoming",
        group: channelID,
        mailID,
        message: "hello",
        recipientID: "user-me",
        timestamp: "2026-01-01T00:00:00.000Z",
    } as unknown as Message;
}

describe("vexService.leaveServer", () => {
    beforeEach(async () => {
        await vexService.close();
        serviceInternals.client = null;
        $serversWritable.set({});
        $channelsWritable.set({});
        $permissionsWritable.set({});
        $groupMessagesWritable.set({});
    });

    test("leaves the server and removes local server state", async () => {
        const targetServer: Server = {
            name: "Blood Group",
            serverID: "server-blood",
        };
        const otherServer: Server = {
            name: "Other Group",
            serverID: "server-other",
        };
        const targetChannel: Channel = {
            channelID: "channel-blood",
            name: "general",
            serverID: targetServer.serverID,
        };
        const otherChannel: Channel = {
            channelID: "channel-other",
            name: "general",
            serverID: otherServer.serverID,
        };
        const targetPermission: Permission = {
            permissionID: "permission-blood",
            powerLevel: 10,
            resourceID: targetServer.serverID,
            resourceType: "server",
            userID: "user-me",
        };
        const otherPermission: Permission = {
            permissionID: "permission-other",
            powerLevel: 10,
            resourceID: otherServer.serverID,
            resourceType: "server",
            userID: "user-me",
        };
        const client: TestClient = {
            close: vi.fn(async () => undefined),
            servers: {
                leave: vi.fn(async () => undefined),
            },
        };

        serviceInternals.client = client;
        $serversWritable.set({
            [otherServer.serverID]: otherServer,
            [targetServer.serverID]: targetServer,
        });
        $channelsWritable.set({
            [otherServer.serverID]: [otherChannel],
            [targetServer.serverID]: [targetChannel],
        });
        $permissionsWritable.set({
            [otherPermission.permissionID]: otherPermission,
            [targetPermission.permissionID]: targetPermission,
        });
        $groupMessagesWritable.set({
            [otherChannel.channelID]: [
                makeMessage(otherChannel.channelID, "mail-other"),
            ],
            [targetChannel.channelID]: [
                makeMessage(targetChannel.channelID, "mail-blood"),
            ],
        });

        const result = await vexService.leaveServer(targetServer.serverID);

        expect(result).toEqual({ ok: true });
        expect(client.servers.leave).toHaveBeenCalledWith(
            targetServer.serverID,
        );
        expect($serversWritable.get()).toEqual({
            [otherServer.serverID]: otherServer,
        });
        expect($channelsWritable.get()).toEqual({
            [otherServer.serverID]: [otherChannel],
        });
        expect($permissionsWritable.get()).toEqual({
            [otherPermission.permissionID]: otherPermission,
        });
        expect($groupMessagesWritable.get()).toEqual({
            [otherChannel.channelID]: [
                makeMessage(otherChannel.channelID, "mail-other"),
            ],
        });
    });
});
