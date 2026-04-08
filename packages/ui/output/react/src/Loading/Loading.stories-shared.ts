export const meta = {
    title: "Loading",
    argTypes: {
        size: {
            control: "select",
            options: ["sm", "md", "lg"],
        },
        label: {
            control: "text",
        },
    },
};
export const Default = {
    args: {
        size: "md",
        label: "Loading...",
    },
};
export const Small = {
    args: {
        size: "sm",
        label: "Loading...",
    },
};
export const Large = {
    args: {
        size: "lg",
        label: "Loading...",
    },
};
