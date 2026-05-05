export const meta = {
    argTypes: {
        avatarSrc: {
            control: "text",
        },
        status: {
            control: "select",
            options: ["online", "away", "offline", "dnd"],
        },
        userID: {
            control: "text",
        },
        username: {
            control: "text",
        },
    },
    title: "MemberListItem",
};
export const Online = {
    args: {
        status: "online",
        userID: "abc-123",
        username: "alice",
    },
};
export const Away = {
    args: {
        status: "away",
        userID: "def-456",
        username: "bob",
    },
};
export const Offline = {
    args: {
        status: "offline",
        userID: "ghi-789",
        username: "charlie",
    },
};
export const WithAvatar = {
    args: {
        avatarSrc: "https://i.pravatar.cc/48",
        status: "online",
        userID: "jkl-012",
        username: "diana",
    },
};
