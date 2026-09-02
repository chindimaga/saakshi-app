import * as React from 'react';
import { cn } from '../utils';

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'w-full min-h-[var(--tap)] rounded-md border border-[var(--input-border)] bg-[var(--surface)] px-3 text-base text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-[var(--focus)]',
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'w-full min-h-40 rounded-md border border-[var(--input-border)] bg-[var(--surface)] px-3 py-3 text-base leading-relaxed text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-[var(--focus)]',
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return <label className={cn('block text-sm font-medium text-[var(--ink)] mb-1', className)} {...props} />;
}
