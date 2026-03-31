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
          className="text-sm text-[#888888] mb-1"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          id={inputId}
          className={[
            'bg-[#242424] border border-[#2a2a2a] rounded-[12px] px-3 py-3',
            'text-[#f0f0f0] placeholder:text-[#555555]',
            'focus:border-[#C8FF00] outline-none w-full',
            'transition-colors duration-150',
            unit ? 'pr-10' : '',
            error ? 'border-[#FF4B4B]' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {unit && (
          <span className="absolute right-3 text-[#888888] text-sm pointer-events-none">
            {unit}
          </span>
        )}
      </div>

      {error && (
        <span className="text-[#FF4B4B] text-xs mt-1">{error}</span>
      )}
    </div>
  )
}
