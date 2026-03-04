export const meta = {
  title: 'Modal',
  argTypes: {
    isOpen: {
      control: 'boolean'
    },
    title: {
      control: 'text'
    }
  }
};
export const Open = {
  args: {
    isOpen: true,
    title: 'Confirm Action'
  }
};
export const Closed = {
  args: {
    isOpen: false,
    title: 'Confirm Action'
  }
}