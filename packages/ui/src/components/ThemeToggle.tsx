'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeProvider';
import { cn } from '../utils/cn';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
};

export function ThemeToggle({ 
  className, 
  size = 'md',
  showLabel = false 
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex items-center justify-center rounded-lg',
        'bg-secondary hover:bg-secondary/80',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        sizeClasses[size],
        className
      )}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      type="button"
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <Sun
          className={cn(
            'absolute transition-all duration-300',
            theme === 'light'
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-0'
          )}
          size={iconSizes[size]}
        />
        <Moon
          className={cn(
            'absolute transition-all duration-300',
            theme === 'dark'
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 rotate-90 scale-0'
          )}
          size={iconSizes[size]}
        />
      </div>
      {showLabel && (
        <span className="sr-only">
          {theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        </span>
      )}
    </button>
  );
}

// Alternative toggle with switch style
interface ThemeSwitchProps {
  className?: string;
  showLabels?: boolean;
}

export function ThemeSwitch({ className, showLabels = false }: ThemeSwitchProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabels && (
        <Sun className="w-4 h-4 text-muted-foreground" />
      )}
      <button
        role="switch"
        aria-checked={theme === 'dark'}
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full',
          'bg-input transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          theme === 'dark' && 'bg-primary'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full',
            'bg-background shadow-lg transition-transform duration-200',
            theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
          )}
        >
          <span className="flex h-full w-full items-center justify-center">
            {theme === 'light' ? (
              <Sun className="h-3 w-3" />
            ) : (
              <Moon className="h-3 w-3" />
            )}
          </span>
        </span>
      </button>
      {showLabels && (
        <Moon className="w-4 h-4 text-muted-foreground" />
      )}
    </div>
  );
} 