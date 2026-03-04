export const meta = {
  title: 'MessageBubble',
  argTypes: {
    author: {
      control: 'text'
    },
    content: {
      control: 'text'
    },
    timestamp: {
      control: 'text'
    },
    isOwn: {
      control: 'boolean'
    }
  }
};
export const Default = {
  args: {
    author: 'alice',
    content: 'Hello! How are you?',
    timestamp: '12:34 PM',
    isOwn: false
  }
};
export const Own = {
  args: {
    author: 'me',
    content: 'Doing great, thanks!',
    timestamp: '12:35 PM',
    isOwn: true
  }
}