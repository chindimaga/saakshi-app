import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide',
  {
    variants: {
      variant: {
        default: 'bg-[var(--lavender)] text-[var(--plum-dark)]',
        demo: 'bg-[var(--gap-bg)] text-[var(--warning)]',
        success: 'text-[var(--success)] bg-[color-mix(in_srgb,var(--success)_16%,transparent)]',
        current: 'bg-[var(--plum)] text-[var(--focus-on-brand)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
