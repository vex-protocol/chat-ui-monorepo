export const meta = {
  title: 'ChannelListItem',
  argTypes: {
    name: { control: 'text' },
    unreadCount: { control: 'number' },
    isActive: { control: 'boolean' },
  },
}

export const Default = { args: { name: 'general', unreadCount: 0, isActive: false } }
export const Active = { args: { name: 'general', unreadCount: 0, isActive: true } }
export const WithUnread = { args: { name: 'announcements', unreadCount: 5, isActive: false } }
