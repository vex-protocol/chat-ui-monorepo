import { API_BASE } from "$lib/config";
import type { PageServerLoad } from "./$types";

export const prerender = false;

interface InviteResponse {
    inviteID: string;
    serverID: string;
    serverName: string | null;
    expiration: string | null;
}

export const load: PageServerLoad = async ({ params, fetch }) => {
    try {
        const res = await fetch(`${API_BASE}/invite/${params.id}`);

        if (!res.ok) {
            return {
                invite: null,
                error: res.status === 404 ? "not_found" : "error",
            } as const;
        }

        const data: InviteResponse = await res.json();

        const expired =
            data.expiration && new Date(data.expiration) < new Date();

        return {
            invite: {
                inviteID: data.inviteID,
                serverID: data.serverID,
                serverName: data.serverName ?? "Unknown Server",
                expiration: data.expiration,
                expired: !!expired,
            },
            error: expired ? "expired" : null,
        };
    } catch {
        return {
            invite: null,
            error: "error",
        } as const;
    }
};
