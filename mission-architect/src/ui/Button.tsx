'use client';

import type { ButtonHTMLAttributes, MouseEvent } from 'react';

import { soundEngine } from '@/audio/soundEngine';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

const BASE =
  'rounded-full border px-7 py-3 text-base font-bold tracking-[0.16em] transition ' +
  'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS = {
  primary: 'border-accent bg-accent/15 text-ink shadow-[0_0_26px_rgb(92_225_255/0.28)] hover:bg-accent/30',
  secondary: 'border-line bg-panel text-muted hover:border-accent hover:text-ink',
};

export function Button({ variant = 'primary', className = '', type = 'button', onClick, ...props }: ButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    soundEngine.playSfx('tick');
    onClick?.(event);
  };
  return <button type={type} className={`${BASE} ${VARIANTS[variant]} ${className}`} onClick={handleClick} {...props} />;
}
