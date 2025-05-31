import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: [
        'default',
        'secondary',
        'destructive',
        'outline',
        'new',
        'open',
        'pending',
        'resolved',
        'closed',
        'low',
        'normal',
        'high',
        'urgent',
      ],
      description: 'The visual style of the badge',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Badge',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold">Basic Variants</h3>
        <div className="flex gap-2">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </div>
      
      <div>
        <h3 className="mb-2 text-sm font-semibold">Status Variants</h3>
        <div className="flex gap-2">
          <Badge variant="new">New</Badge>
          <Badge variant="open">Open</Badge>
          <Badge variant="pending">Pending</Badge>
          <Badge variant="resolved">Resolved</Badge>
          <Badge variant="closed">Closed</Badge>
        </div>
      </div>
      
      <div>
        <h3 className="mb-2 text-sm font-semibold">Priority Variants</h3>
        <div className="flex gap-2">
          <Badge variant="low">Low</Badge>
          <Badge variant="normal">Normal</Badge>
          <Badge variant="high">High</Badge>
          <Badge variant="urgent">Urgent</Badge>
        </div>
      </div>
    </div>
  ),
};

export const InContext: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm">Ticket #1234</span>
        <Badge variant="open">Open</Badge>
        <Badge variant="high">High</Badge>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm">Ticket #5678</span>
        <Badge variant="resolved">Resolved</Badge>
        <Badge variant="low">Low</Badge>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm">Ticket #9012</span>
        <Badge variant="new">New</Badge>
        <Badge variant="urgent">Urgent</Badge>
      </div>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge variant="new">
        <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
        </svg>
        New Ticket
      </Badge>
      
      <Badge variant="resolved">
        Resolved
        <svg className="ml-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </Badge>
    </div>
  ),
};

export const Counts: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge variant="secondary">12</Badge>
      <Badge variant="destructive">3</Badge>
      <Badge variant="outline">99+</Badge>
    </div>
  ),
}; 