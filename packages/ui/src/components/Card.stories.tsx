import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here. This is where you put the main information.</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
};

export const SimpleCard: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Simple Card</CardTitle>
      </CardHeader>
      <CardContent>
        <p>A simple card with just a title and content.</p>
      </CardContent>
    </Card>
  ),
};

export const WithBadges: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Ticket #1234</CardTitle>
          <div className="flex gap-1">
            <Badge variant="open">Open</Badge>
            <Badge variant="high">High</Badge>
          </div>
        </div>
        <CardDescription>Customer: John Doe</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          I'm having trouble accessing my account. When I try to login, I get an error message saying...
        </p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <span className="text-xs text-muted-foreground">2 hours ago</span>
        <Button size="sm">Assign to me</Button>
      </CardFooter>
    </Card>
  ),
};

export const ListOfCards: Story = {
  render: () => (
    <div className="space-y-4 w-[400px]">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">New Feature Request</CardTitle>
            <Badge variant="new">New</Badge>
          </div>
          <CardDescription>From: alice@example.com</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Would it be possible to add a dark mode option to the dashboard?
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Login Issues</CardTitle>
            <Badge variant="urgent">Urgent</Badge>
          </div>
          <CardDescription>From: bob@company.com</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Multiple users reporting they cannot access the system this morning.
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Billing Question</CardTitle>
            <Badge variant="resolved">Resolved</Badge>
          </div>
          <CardDescription>From: carol@business.org</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Thanks for clarifying the invoice details. Everything looks good now.
          </p>
        </CardContent>
      </Card>
    </div>
  ),
};

export const InteractiveCard: Story = {
  render: () => (
    <Card className="w-[350px] cursor-pointer transition-all hover:shadow-lg">
      <CardHeader>
        <CardTitle>Interactive Card</CardTitle>
        <CardDescription>Click me to see the hover effect</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This card has hover effects and appears clickable.</p>
      </CardContent>
    </Card>
  ),
};

export const CardWithForm: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>Contact Support</CardTitle>
        <CardDescription>
          Fill out this form and we'll get back to you as soon as possible.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Subject</label>
          <input 
            type="text" 
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Brief description of your issue"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Message</label>
          <textarea 
            className="w-full rounded-md border px-3 py-2 text-sm"
            rows={4}
            placeholder="Provide more details about your request..."
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Submit</Button>
      </CardFooter>
    </Card>
  ),
}; 