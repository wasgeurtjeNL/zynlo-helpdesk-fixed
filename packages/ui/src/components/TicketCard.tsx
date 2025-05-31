import * as React from 'react';
import { cn } from '../utils/cn';
import { Card, CardHeader, CardContent } from './Card';
import { Badge } from './Badge';
import { Avatar, AvatarImage, AvatarFallback } from './Avatar';

export interface TicketCardProps extends React.HTMLAttributes<HTMLDivElement> {
  ticket: {
    id: string;
    number: number;
    subject: string;
    preview?: string;
    status: 'new' | 'open' | 'pending' | 'resolved' | 'closed';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    assignee?: {
      name: string;
      avatar?: string;
      initials?: string;
    };
    customer: {
      name: string;
      avatar?: string;
      initials?: string;
    };
    channel?: 'email' | 'whatsapp' | 'chat' | 'phone';
    createdAt: Date | string;
    updatedAt?: Date | string;
    unread?: boolean;
    tags?: string[];
  };
  selected?: boolean;
  onClick?: () => void;
}

const TicketCard = React.forwardRef<HTMLDivElement, TicketCardProps>(
  ({ className, ticket, selected, onClick, ...props }, ref) => {
    const createdDate = new Date(ticket.createdAt);
    const timeAgo = getTimeAgo(createdDate);

    return (
      <Card
        ref={ref}
        className={cn(
          'cursor-pointer transition-all hover:shadow-md',
          selected && 'ring-2 ring-primary',
          ticket.unread && 'border-l-4 border-l-primary',
          className
        )}
        onClick={onClick}
        {...props}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={ticket.customer.avatar} alt={ticket.customer.name} />
                <AvatarFallback>{ticket.customer.initials || ticket.customer.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={cn(
                    'font-semibold text-sm truncate',
                    ticket.unread && 'font-bold'
                  )}>
                    {ticket.customer.name}
                  </h3>
                  <span className="text-xs text-muted-foreground">#{ticket.number}</span>
                </div>
                <p className={cn(
                  'text-sm truncate',
                  ticket.unread ? 'font-semibold' : 'text-foreground'
                )}>
                  {ticket.subject}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={ticket.status}>{ticket.status}</Badge>
              <Badge variant={ticket.priority}>{ticket.priority}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {ticket.preview && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {ticket.preview}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              {ticket.channel && (
                <span className="flex items-center gap-1">
                  {getChannelIcon(ticket.channel)}
                  <span className="capitalize">{ticket.channel}</span>
                </span>
              )}
              <span>{timeAgo}</span>
            </div>
            {ticket.assignee && (
              <div className="flex items-center gap-1">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={ticket.assignee.avatar} alt={ticket.assignee.name} />
                  <AvatarFallback className="text-xs">
                    {ticket.assignee.initials || ticket.assignee.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span>{ticket.assignee.name}</span>
              </div>
            )}
          </div>
          {ticket.tags && ticket.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-3">
              {ticket.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);
TicketCard.displayName = 'TicketCard';

// Helper function to get channel icon
function getChannelIcon(channel: string) {
  switch (channel) {
    case 'email':
      return (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      );
    case 'chat':
      return (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case 'phone':
      return (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      );
    default:
      return null;
  }
}

// Helper function to get time ago string
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return 'just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export { TicketCard }; 