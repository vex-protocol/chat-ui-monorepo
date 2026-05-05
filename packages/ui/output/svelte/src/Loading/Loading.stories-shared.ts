export const meta = {
    argTypes: {
        label: {
            control: "text",
        },
        size: {
            control: "select",
            options: ["sm", "md", "lg"],
        },
    },
    title: "Loading",
};
export const Default = {
    args: {
        label: "Loading...",
        size: "md",
    },
};
export const Small = {
    args: {
        label: "Loading...",
        size: "sm",
    },
};
export const Large = {
    args: {
        label: "Loading...",
        size: "lg",
    },
};
