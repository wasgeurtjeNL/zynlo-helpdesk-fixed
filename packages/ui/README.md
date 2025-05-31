# @zynlo/ui

A modern, accessible component library for the Zynlo Helpdesk ticketing system built with React, TypeScript, and Tailwind CSS.

## Features

- 🎨 **25+ UI Components** - Comprehensive set of components for building ticket management interfaces
- 🌓 **Dark/Light Theme** - Built-in theme system with automatic detection and persistence
- ♿ **Fully Accessible** - WCAG compliant with proper ARIA labels and keyboard navigation
- 📱 **Responsive Design** - Mobile-first approach with responsive layouts
- 🎭 **Customizable** - Tailwind-based styling with CSS variables for easy theming
- 📚 **Storybook Documentation** - Interactive component documentation and testing

## Installation

```bash
# From the monorepo root
pnpm install

# Build the UI package
pnpm -F ui build
```

## Usage

```tsx
import { Button, Card, Badge, ThemeProvider } from '@zynlo/ui';
import '@zynlo/ui/styles/globals.css';

function App() {
  return (
    <ThemeProvider>
      <Card>
        <Button variant="primary">Click me</Button>
        <Badge variant="success">Active</Badge>
      </Card>
    </ThemeProvider>
  );
}
```

## Components

### Core Components
- **Button** - Multiple variants (default, secondary, destructive, outline, ghost, link)
- **Input** - Text input with focus states
- **Select** - Dropdown selection with keyboard navigation
- **Badge** - Status and priority indicators
- **Card** - Container component with header, content, and footer sections
- **Dialog** - Modal dialogs with backdrop
- **Avatar** - User avatars with fallback initials
- **DropdownMenu** - Context menus with sub-menus support

### Layout Components
- **Sidebar** - Collapsible navigation sidebar
- **Header** - Page header with navigation sections
- **PageContainer** - Responsive page wrapper

### Specialized Components
- **TicketCard** - Complete ticket display with status, priority, and metadata
- **MessageBubble** - Chat message display with attachments and status indicators
- **ChannelIcon** - Icons for communication channels (email, WhatsApp, chat, etc.)
- **ThemeToggle** - Theme switcher components

## Theming

The UI library uses CSS variables for theming, making it easy to customize colors:

```css
/* Light theme colors */
--primary: 220 90% 56%;
--secondary: 210 40% 96%;
--destructive: 0 84% 60%;

/* Status colors */
--status-new: 199 89% 48%;
--status-open: 217 91% 60%;
--status-pending: 38 92% 50%;
--status-resolved: 142 76% 36%;
--status-closed: 215 20% 65%;

/* Priority colors */
--priority-low: 197 37% 24%;
--priority-normal: 215 20% 65%;
--priority-high: 27 96% 61%;
--priority-urgent: 0 84% 60%;
```

## Development

### Running Storybook

```bash
# From the UI package directory
cd packages/ui
pnpm storybook

# Or from the monorepo root
pnpm -F ui storybook
```

Storybook will start at `http://localhost:6006`

### Building for Production

```bash
# Build the library
pnpm -F ui build

# Build Storybook for deployment
pnpm -F ui build-storybook
```

### Testing Components

All components include:
- TypeScript type definitions
- Accessibility compliance (ARIA labels, keyboard navigation)
- Dark/light theme support
- Responsive design
- Interactive Storybook stories

## Contributing

1. Create new components in `src/components/`
2. Export from `src/index.ts`
3. Add Storybook stories in `src/components/ComponentName.stories.tsx`
4. Ensure accessibility with proper ARIA labels
5. Test in both light and dark themes
6. Document props and usage in stories

## License

Part of the Zynlo Helpdesk system. 