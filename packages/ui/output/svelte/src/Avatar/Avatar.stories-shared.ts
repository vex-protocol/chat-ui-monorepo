export const meta = {
    title: "Avatar",
    argTypes: {
        size: {
            control: "select",
            options: ["xs", "sm", "md", "lg"],
        },
        src: {
            control: "text",
        },
        alt: {
            control: "text",
        },
        initials: {
            control: "text",
        },
    },
};
export const WithImage = {
    args: {
        src: "https://i.pravatar.cc/64",
        alt: "User",
        size: "md",
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
