export const meta = {
    argTypes: {
        isOpen: { control: "boolean" },
        title: { control: "text" },
    },
    title: "Modal",
};

export const Open = { args: { isOpen: true, title: "Confirm Action" } };
export const Closed = { args: { isOpen: false, title: "Confirm Action" } };
