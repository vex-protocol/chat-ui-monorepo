export const meta = {
    title: "Button",
    argTypes: {
        variant: {
            control: "select",
            options: ["primary", "secondary", "ghost"],
        },
        size: { control: "select", options: ["sm", "md", "lg"] },
        disabled: { control: "boolean" },
        children: { control: "text" },
    },
};

export const Primary = { args: { variant: "primary", children: "Click me" } };
export const Secondary = {
    args: { variant: "secondary", children: "Click me" },
};
export const Ghost = { args: { variant: "ghost", children: "Click me" } };
export const Small = {
    args: { variant: "primary", size: "sm", children: "Small" },
};
export const Large = {
    args: { variant: "primary", size: "lg", children: "Large" },
};
export const Disabled = {
    args: { variant: "primary", disabled: true, children: "Disabled" },
};
