import * as React from 'react';
import { cn } from '../utils/cn';
import { Avatar, AvatarImage, AvatarFallback } from './Avatar';
import { Badge } from './Badge';

export interface MessageBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  message: {
    id: string;
    content: string;
    sender: {
      name: string;
      avatar?: string;
      initials?: string;
      type: 'customer' | 'agent' | 'system';
    };
    timestamp: Date | string;
    status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    attachments?: Array<{
      id: string;
      name: string;
      type: string;
      size: number;
      url: string;
    }>;
    metadata?: {
      channel?: 'email' | 'whatsapp' | 'chat' | 'phone';
      edited?: boolean;
      editedAt?: Date | string;
    };
  };
  isCurrentUser?: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
}

const MessageBubble = React.forwardRef<HTMLDivElement, MessageBubbleProps>(
  ({ className, message, isCurrentUser, showAvatar = true, showTimestamp = true, ...props }, ref) => {
    const timestamp = new Date(message.timestamp);
    const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const isSystem = message.sender.type === 'system';
    const alignment = isCurrentUser ? 'flex-row-reverse' : 'flex-row';

    return (
      <div
        ref={ref}
        className={cn(
          'flex gap-3',
          alignment,
          isSystem && 'justify-center',
          className
        )}
        {...props}
      >
        {showAvatar && !isSystem && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={message.sender.avatar} alt={message.sender.name} />
            <AvatarFallback>
              {message.sender.initials || message.sender.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}

        <div
          className={cn(
            'flex flex-col gap-1 max-w-[70%]',
            isCurrentUser && 'items-end',
            isSystem && 'max-w-full items-center'
          )}
        >
          {!isSystem && (
            <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', isCurrentUser && 'flex-row-reverse')}>
              <span className="font-medium">{message.sender.name}</span>
              {showTimestamp && <span>{timeString}</span>}
              {message.metadata?.edited && <span className="italic">(edited)</span>}
            </div>
          )}

          <div
            className={cn(
              'rounded-lg px-4 py-2',
              isSystem
                ? 'bg-muted text-center text-sm text-muted-foreground'
                : isCurrentUser
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground',
              message.status === 'failed' && 'opacity-50'
            )}
          >
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
            
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {message.attachments.map(attachment => (
                  <AttachmentCard key={attachment.id} attachment={attachment} />
                ))}
              </div>
            )}
          </div>

          {!isSystem && (
            <div className={cn('flex items-center gap-2 text-xs', isCurrentUser && 'flex-row-reverse')}>
              {message.metadata?.channel && (
                <Badge variant="outline" className="text-xs py-0">
                  {message.metadata.channel}
                </Badge>
              )}
              {message.status && isCurrentUser && (
                <span className="text-muted-foreground">
                  {getStatusIcon(message.status)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);
MessageBubble.displayName = 'MessageBubble';

interface AttachmentCardProps {
  attachment: {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
  };
}

function AttachmentCard({ attachment }: AttachmentCardProps) {
  const isImage = attachment.type.startsWith('image/');
  const fileSize = formatFileSize(attachment.size);

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center gap-2 p-2 rounded bg-background/10 hover:bg-background/20 transition-colors',
        'text-xs'
      )}
    >
      {isImage ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate">{attachment.name}</p>
        <p className="text-muted-foreground">{fileSize}</p>
      </div>
    </a>
  );
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'sending':
      return '○';
    case 'sent':
      return '✓';
    case 'delivered':
      return '✓✓';
    case 'read':
      return (
        <span className="text-primary">✓✓</span>
      );
    case 'failed':
      return (
        <span className="text-destructive">✗</span>
      );
    default:
      return null;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export { MessageBubble }; 