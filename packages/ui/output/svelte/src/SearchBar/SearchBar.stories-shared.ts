export const meta = {
    argTypes: {
        placeholder: {
            control: "text",
        },
        value: {
            control: "text",
        },
    },
    title: "SearchBar",
};
export const Default = {
    args: {
        placeholder: "Search users...",
    },
};
export const WithValue = {
    args: {
        placeholder: "Search...",
        value: "alice",
    },
};
