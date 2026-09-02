import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-base font-medium transition-opacity duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] min-h-[var(--tap)] px-4',
  {
    variants: {
      variant: {
        default: 'button-primary bg-[var(--plum)] hover:bg-[var(--plum-dark)]',
        secondary: 'button-secondary bg-[var(--surface)] border border-[var(--input-border)]',
        ghost: 'bg-transparent text-[var(--ink)] hover:bg-[var(--lavender)]',
        exit: 'button-exit bg-[var(--coral)] font-semibold tracking-wide uppercase',
        link: 'button-link bg-transparent underline-offset-4 hover:underline min-h-[var(--tap)] px-0',
      },
      size: {
        default: 'w-full',
        inline: 'w-auto',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
