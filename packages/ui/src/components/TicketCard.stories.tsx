import type { Meta, StoryObj } from '@storybook/react';
import { TicketCard } from './TicketCard';

const meta: Meta<typeof TicketCard> = {
  title: 'Components/TicketCard',
  component: TicketCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    selected: {
      control: { type: 'boolean' },
      description: 'Whether the ticket is selected',
    },
    onClick: {
      action: 'clicked',
      description: 'Called when the ticket is clicked',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const baseTicket = {
  id: '1',
  number: 1234,
  subject: 'Cannot access my account',
  preview: "I'm having trouble logging into my account. When I enter my credentials, I get an error message saying 'Invalid username or password' even though I'm sure they're correct.",
  status: 'open' as const,
  priority: 'normal' as const,
  customer: {
    name: 'John Doe',
    avatar: 'https://i.pravatar.cc/150?u=john',
    initials: 'JD',
  },
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
};

export const Default: Story = {
  args: {
    ticket: baseTicket,
  },
};

export const UnreadTicket: Story = {
  args: {
    ticket: {
      ...baseTicket,
      unread: true,
      status: 'new',
      createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    },
  },
};

export const SelectedTicket: Story = {
  args: {
    ticket: baseTicket,
    selected: true,
  },
};

export const WithAssignee: Story = {
  args: {
    ticket: {
      ...baseTicket,
      assignee: {
        name: 'Sarah Johnson',
        avatar: 'https://i.pravatar.cc/150?u=sarah',
        initials: 'SJ',
      },
    },
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="space-y-4 max-w-2xl">
      <TicketCard
        ticket={{
          ...baseTicket,
          id: '1',
          status: 'new',
          unread: true,
          subject: 'New customer inquiry',
          preview: 'I would like to know more about your enterprise pricing plans...',
          createdAt: new Date(Date.now() - 10 * 60 * 1000),
        }}
      />
      <TicketCard
        ticket={{
          ...baseTicket,
          id: '2',
          status: 'open',
          subject: 'Feature request: Dark mode',
          preview: 'It would be great if the application supported a dark mode for better visibility in low light...',
          assignee: {
            name: 'Mike Chen',
            avatar: 'https://i.pravatar.cc/150?u=mike',
          },
        }}
      />
      <TicketCard
        ticket={{
          ...baseTicket,
          id: '3',
          status: 'pending',
          subject: 'Waiting for customer response',
          preview: 'Thanks for the information. We are waiting for you to provide the error logs...',
          priority: 'low',
        }}
      />
      <TicketCard
        ticket={{
          ...baseTicket,
          id: '4',
          status: 'resolved',
          subject: 'Password reset completed',
          preview: 'Your password has been successfully reset. You should now be able to log in...',
          priority: 'normal',
        }}
      />
      <TicketCard
        ticket={{
          ...baseTicket,
          id: '5',
          status: 'closed',
          subject: 'Thank you for your feedback',
          preview: 'We appreciate your suggestions and will consider them for future updates...',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        }}
      />
    </div>
  ),
};

export const AllPriorities: Story = {
  render: () => (
    <div className="space-y-4 max-w-2xl">
      <TicketCard
        ticket={{
          ...baseTicket,
          id: '1',
          priority: 'low',
          subject: 'Question about documentation',
          preview: 'I noticed a small typo in the API documentation...',
        }}
      />
      <TicketCard
        ticket={{
          ...baseTicket,
          id: '2',
          priority: 'normal',
          subject: 'Account settings update',
          preview: 'I need to update my billing information...',
        }}
      />
      <TicketCard
        ticket={{
          ...baseTicket,
          id: '3',
          priority: 'high',
          status: 'open',
          subject: 'Integration not working',
          preview: 'Our Slack integration stopped working this morning...',
          unread: true,
        }}
      />
      <TicketCard
        ticket={{
          ...baseTicket,
          id: '4',
          priority: 'urgent',
          status: 'new',
          subject: 'Complete system outage',
          preview: 'None of our team members can access the platform. This is affecting our entire operation...',
          unread: true,
          customer: {
            name: 'Enterprise Corp',
            initials: 'EC',
          },
        }}
      />
    </div>
  ),
};

export const WithChannels: Story = {
  render: () => (
    <div className="space-y-4 max-w-2xl">
      <TicketCard
        ticket={{
          ...baseTicket,
          id: '1',
          channel: 'email',
          subject: 'Re: Order confirmation',
        }}
      />
      <TicketCard
        ticket={{
          ...baseTicket,
          id: '2',
          channel: 'whatsapp',
          subject: 'Quick question about delivery',
          customer: {
            name: '+1 234-567-8900',
            initials: 'WA',
          },
        }}
      />
      <TicketCard
        ticket={{
          ...baseTicket,
          id: '3',
          channel: 'chat',
          subject: 'Live chat conversation',
          preview: 'Customer started a chat session from the pricing page...',
        }}
      />
      <TicketCard
        ticket={{
          ...baseTicket,
          id: '4',
          channel: 'phone',
          subject: 'Follow-up from phone call',
          preview: 'As discussed in our call, I need help with...',
        }}
      />
    </div>
  ),
};

export const WithTags: Story = {
  args: {
    ticket: {
      ...baseTicket,
      tags: ['billing', 'enterprise', 'priority-customer'],
    },
  },
};

export const LongContent: Story = {
  args: {
    ticket: {
      ...baseTicket,
      subject: 'Very long subject line that should be truncated when it exceeds the available space in the card header',
      preview: 'This is a very long preview text that demonstrates how the ticket card handles extensive content. The preview should be limited to a reasonable number of lines to maintain a clean and consistent layout across all ticket cards in the list view. Any text beyond the limit should be truncated with an ellipsis.',
      customer: {
        name: 'Customer With A Very Long Name That Should Also Be Truncated',
        initials: 'CW',
      },
    },
  },
}; 