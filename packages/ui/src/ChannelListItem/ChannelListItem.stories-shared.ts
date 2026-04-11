export const meta = {
    argTypes: {
        isActive: { control: "boolean" },
        name: { control: "text" },
        unreadCount: { control: "number" },
    },
    title: "ChannelListItem",
};

export const Default = {
    args: { isActive: false, name: "general", unreadCount: 0 },
};
export const Active = {
    args: { isActive: true, name: "general", unreadCount: 0 },
};
export const WithUnread = {
    args: { isActive: false, name: "announcements", unreadCount: 5 },
};
