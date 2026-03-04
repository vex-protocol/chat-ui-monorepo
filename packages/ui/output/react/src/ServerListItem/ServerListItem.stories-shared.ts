export const meta = {
  title: 'ServerListItem',
  argTypes: {
    name: {
      control: 'text'
    },
    avatarUrl: {
      control: 'text'
    },
    isActive: {
      control: 'boolean'
    }
  }
};
export const Default = {
  args: {
    name: 'My Server',
    isActive: false
  }
};
export const Active = {
  args: {
    name: 'My Server',
    isActive: true
  }
};
export const WithAvatar = {
  args: {
    name: 'My Server',
    avatarUrl: 'https://i.pravatar.cc/48',
    isActive: false
  }
}