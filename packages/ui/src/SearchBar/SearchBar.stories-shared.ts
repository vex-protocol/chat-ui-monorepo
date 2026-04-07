export const meta = {
    title: "SearchBar",
    argTypes: {
        placeholder: { control: "text" },
        value: { control: "text" },
    },
};

export const Default = { args: { placeholder: "Search users..." } };
export const WithValue = { args: { placeholder: "Search...", value: "alice" } };
