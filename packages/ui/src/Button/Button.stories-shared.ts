export const meta = {
    argTypes: {
        children: { control: "text" },
        disabled: { control: "boolean" },
        size: { control: "select", options: ["sm", "md", "lg"] },
        variant: {
            control: "select",
            options: ["primary", "secondary", "ghost"],
        },
    },
    title: "Button",
};

export const Primary = { args: { children: "Click me", variant: "primary" } };
export const Secondary = {
    args: { children: "Click me", variant: "secondary" },
};
export const Ghost = { args: { children: "Click me", variant: "ghost" } };
export const Small = {
    args: { children: "Small", size: "sm", variant: "primary" },
};
export const Large = {
    args: { children: "Large", size: "lg", variant: "primary" },
};
export const Disabled = {
    args: { children: "Disabled", disabled: true, variant: "primary" },
};
