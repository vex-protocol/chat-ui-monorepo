export const meta = {
    argTypes: {
        disabled: { control: "boolean" },
        label: { control: "text" },
        placeholder: { control: "text" },
        type: {
            control: "select",
            options: ["text", "password", "email", "search"],
        },
    },
    title: "TextInput",
};

export const Default = {
    args: { label: "Username", placeholder: "Enter username" },
};
export const Password = {
    args: {
        label: "Password",
        placeholder: "Enter password",
        type: "password",
    },
};
export const Disabled = {
    args: { disabled: true, label: "Disabled", placeholder: "Cannot edit" },
};
