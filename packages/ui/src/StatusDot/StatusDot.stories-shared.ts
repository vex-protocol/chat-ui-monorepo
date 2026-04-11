export const meta = {
    argTypes: {
        status: {
            control: "select",
            options: ["online", "away", "offline", "dnd"],
        },
    },
    title: "StatusDot",
};

export const Online = { args: { status: "online" } };
export const Away = { args: { status: "away" } };
export const DoNotDisturb = { args: { status: "dnd" } };
export const Offline = { args: { status: "offline" } };
