// Component exports
export { Button, buttonVariants } from './components/Button';
export { ThemeToggle, ThemeSwitch } from './components/ThemeToggle';
export { Input } from './components/Input';
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from './components/Select';
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './components/Dialog';
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './components/Card';
export { Badge, badgeVariants } from './components/Badge';
export { Avatar, AvatarImage, AvatarFallback } from './components/Avatar';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './components/DropdownMenu';

// Layout components
export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarItem,
  SidebarSection,
  SidebarLabel,
} from './components/Sidebar';
export {
  Header,
  HeaderContent,
  HeaderLeft,
  HeaderCenter,
  HeaderRight,
  HeaderTitle,
  HeaderNav,
  HeaderNavItem,
} from './components/Header';
export {
  PageContainer,
  PageHeader,
  PageTitle,
  PageDescription,
  PageContent,
  PageActions,
} from './components/PageContainer';

// Specialized components
export { TicketCard } from './components/TicketCard';
export type { TicketCardProps } from './components/TicketCard';
export { MessageBubble } from './components/MessageBubble';
export type { MessageBubbleProps } from './components/MessageBubble';
export { ChannelIcon } from './components/ChannelIcon';
export type { ChannelIconProps } from './components/ChannelIcon';

// Context exports
export { ThemeProvider, useTheme } from './context/ThemeProvider';

// Utility exports
export { cn } from './utils/cn';

// Type exports
export type { Theme } from './context/ThemeProvider'; 