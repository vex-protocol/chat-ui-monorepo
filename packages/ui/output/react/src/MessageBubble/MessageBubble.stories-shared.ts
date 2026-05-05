export const meta = {
    argTypes: {
        author: {
            control: "text",
        },
        content: {
            control: "text",
        },
        isOwn: {
            control: "boolean",
        },
        timestamp: {
            control: "text",
        },
    },
    title: "MessageBubble",
};
export const Default = {
    args: {
        author: "alice",
        content: "Hello! How are you?",
        isOwn: false,
        timestamp: "12:34 PM",
    },
};
export const Own = {
    args: {
        author: "me",
        content: "Doing great, thanks!",
        isOwn: true,
        timestamp: "12:35 PM",
    },
};
