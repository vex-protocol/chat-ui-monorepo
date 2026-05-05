export const meta = {
    argTypes: {
        disabled: {
            control: "boolean",
        },
        placeholder: {
            control: "text",
        },
    },
    title: "MessageInput",
};
export const Default = {
    args: {
        placeholder: "Type a message...",
    },
};
export const Disabled = {
    args: {
        disabled: true,
        placeholder: "Read only",
    },
};
