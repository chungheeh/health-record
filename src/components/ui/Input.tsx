'use client'

import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  unit?: string
}

export default function Input({
  label,
  error,
  unit,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id ?? (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined)

  return (
    <div className="flex flex-col w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm text-text-secondary mb-1"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          id={inputId}
          className={[
            'bg-bg-tertiary border border-we-border rounded-[12px] px-3 py-3',
            'text-text-primary placeholder:text-text-muted',
            'focus:border-accent outline-none w-full',
            'transition-colors duration-150',
            unit ? 'pr-10' : '',
            error ? 'border-we-danger' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {unit && (
          <span className="absolute right-3 text-text-secondary text-sm pointer-events-none">
            {unit}
          </span>
        )}
      </div>

      {error && (
        <span className="text-we-danger text-xs mt-1">{error}</span>
      )}
    </div>
  )
}
