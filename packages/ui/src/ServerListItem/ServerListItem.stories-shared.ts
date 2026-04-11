export const meta = {
    argTypes: {
        avatarUrl: { control: "text" },
        isActive: { control: "boolean" },
        name: { control: "text" },
    },
    title: "ServerListItem",
};

export const Default = { args: { isActive: false, name: "My Server" } };
export const Active = { args: { isActive: true, name: "My Server" } };
export const WithAvatar = {
    args: {
        avatarUrl: "https://i.pravatar.cc/48",
        isActive: false,
        name: "My Server",
    },
};
