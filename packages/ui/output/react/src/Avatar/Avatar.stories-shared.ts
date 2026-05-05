export const meta = {
    argTypes: {
        alt: {
            control: "text",
        },
        initials: {
            control: "text",
        },
        size: {
            control: "select",
            options: ["xs", "sm", "md", "lg"],
        },
        src: {
            control: "text",
        },
    },
    title: "Avatar",
};
export const WithImage = {
    args: {
        alt: "User",
        size: "md",
        src: "https://i.pravatar.cc/64",
    },
};
export const WithInitials = {
    args: {
        initials: "AB",
        size: "md",
    },
};
export const Small = {
    args: {
        initials: "AB",
        size: "sm",
    },
};
export const Large = {
    args: {
        initials: "AB",
        size: "lg",
    },
};
