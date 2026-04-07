export const meta = {
    title: "TextInput",
    argTypes: {
        type: {
            control: "select",
            options: ["text", "password", "email", "search"],
        },
        placeholder: {
            control: "text",
        },
        label: {
            control: "text",
        },
        disabled: {
            control: "boolean",
        },
    },
};
export const Default = {
    args: {
        label: "Username",
        placeholder: "Enter username",
    },
};
export const Password = {
    args: {
        label: "Password",
        placeholder: "Enter password",
        type: "password",
    },
};
export const Disabled = {
    args: {
        label: "Disabled",
        placeholder: "Cannot edit",
        disabled: true,
    },
};
