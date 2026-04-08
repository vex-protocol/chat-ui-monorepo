export const meta = {
    title: "MemberListItem",
    argTypes: {
        userID: { control: "text" },
        username: { control: "text" },
        avatarSrc: { control: "text" },
        status: {
            control: "select",
            options: ["online", "away", "offline", "dnd"],
        },
    },
};

export const Online = {
    args: { userID: "abc-123", username: "alice", status: "online" },
};
export const Away = {
    args: { userID: "def-456", username: "bob", status: "away" },
};
export const Offline = {
    args: { userID: "ghi-789", username: "charlie", status: "offline" },
};
export const WithAvatar = {
    args: {
        userID: "jkl-012",
        username: "diana",
        avatarSrc: "https://i.pravatar.cc/48",
        status: "online",
    },
};
