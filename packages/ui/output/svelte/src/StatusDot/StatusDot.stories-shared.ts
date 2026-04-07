export const meta = {
    title: "StatusDot",
    argTypes: {
        status: {
            control: "select",
            options: ["online", "away", "offline", "dnd"],
        },
    },
};
export const Online = {
    args: {
        status: "online",
    },
};
export const Away = {
    args: {
        status: "away",
    },
};
export const DoNotDisturb = {
    args: {
        status: "dnd",
    },
};
export const Offline = {
    args: {
        status: "offline",
    },
};
