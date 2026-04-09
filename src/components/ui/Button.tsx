'use client'

import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
  children: React.ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const variantClasses: Record<string, string> = {
    primary: 'bg-accent text-bg-primary font-semibold',
    ghost: 'bg-transparent border border-we-border text-text-primary',
    danger: 'bg-we-danger text-white font-semibold',
  }

  const sizeClasses: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm rounded-[10px]',
    md: 'px-4 py-2.5 text-sm rounded-[12px]',
    lg: 'px-6 py-3.5 text-base rounded-[12px]',
  }

  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center gap-2',
        'active:scale-95 transition-transform duration-100',
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        fullWidth ? 'w-full' : '',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading && (
        <span
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  )
}
