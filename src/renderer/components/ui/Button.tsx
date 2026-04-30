import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-on-primary hover:bg-primary-dim active:scale-[0.98]',
        secondary:
          'bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed-dim active:scale-[0.98]',
        tertiary:
          'text-on-surface-variant hover:text-on-surface bg-transparent',
        ghost:
          'text-on-surface-variant hover:bg-surface-container active:scale-[0.98]',
        danger:
          'bg-error text-on-error hover:bg-error-dim active:scale-[0.98]',
      },
      size: {
        sm: 'text-xs px-3 py-1.5 rounded-lg',
        md: 'text-sm px-4 py-2 rounded-xl',
        lg: 'text-base px-6 py-3 rounded-xl',
        icon: 'p-2 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
