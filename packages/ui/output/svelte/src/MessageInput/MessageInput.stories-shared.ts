export const meta = {
    title: "MessageInput",
    argTypes: {
        placeholder: {
            control: "text",
        },
        disabled: {
            control: "boolean",
        },
    },
};
export const Default = {
    args: {
        placeholder: "Type a message...",
    },
};
export const Disabled = {
    args: {
        placeholder: "Read only",
        disabled: true,
    },
};
