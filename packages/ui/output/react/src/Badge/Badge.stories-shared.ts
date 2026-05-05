export const meta = {
    argTypes: {
        label: {
            control: "text",
        },
        variant: {
            control: "select",
            options: ["online", "offline", "dnd", "idle"],
        },
    },
    title: "Badge",
};
export const Online = {
    args: {
        label: "Online",
        variant: "online",
    },
};
export const Offline = {
    args: {
        label: "Offline",
        variant: "offline",
    },
};
export const DoNotDisturb = {
    args: {
        label: "Do Not Disturb",
        variant: "dnd",
    },
};
export const Idle = {
    args: {
        label: "Idle",
        variant: "idle",
    },
};
