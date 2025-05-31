import type { Meta, StoryObj } from '@storybook/react';
import { ThemeToggle, ThemeSwitch } from './ThemeToggle';
import { ThemeProvider } from '../context/ThemeProvider';

// Decorator to wrap stories with ThemeProvider
const withThemeProvider = (Story: any) => (
  <ThemeProvider>
    <div className="flex items-center justify-center min-h-[200px] p-8">
      <Story />
    </div>
  </ThemeProvider>
);

const meta = {
  title: 'Components/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    layout: 'centered',
  },
  decorators: [withThemeProvider],
  tags: ['autodocs'],
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'md',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
  },
};

export const WithLabel: Story = {
  args: {
    size: 'md',
    showLabel: true,
  },
};

export const CustomClass: Story = {
  args: {
    size: 'md',
    className: 'bg-primary text-primary-foreground hover:bg-primary/90',
  },
};

// Stories for ThemeSwitch
export const SwitchDefault: StoryObj<typeof ThemeSwitch> = {
  render: (args) => <ThemeSwitch {...args} />,
  args: {},
};

export const SwitchWithLabels: StoryObj<typeof ThemeSwitch> = {
  render: (args) => <ThemeSwitch {...args} />,
  args: {
    showLabels: true,
  },
};

// Combined story showing both variants
export const BothVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-8 items-center">
      <div className="flex gap-4 items-center">
        <ThemeToggle size="sm" />
        <ThemeToggle size="md" />
        <ThemeToggle size="lg" />
      </div>
      <div className="flex flex-col gap-4 items-center">
        <ThemeSwitch />
        <ThemeSwitch showLabels />
      </div>
    </div>
  ),
}; 