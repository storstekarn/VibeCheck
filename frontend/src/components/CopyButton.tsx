import { useState } from 'react';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  'aria-label'?: string;
}

export function CopyButton({ text, label = 'Copy', className = '', 'aria-label': ariaLabel }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      aria-label={ariaLabel ?? label}
      className={`px-3 py-1.5 text-xs font-code font-medium rounded-lg transition-all duration-200
        ${copied
          ? 'bg-brand/15 text-brand scale-105'
          : 'bg-surface text-ink-dim border border-line hover:bg-hover hover:text-ink copy-btn-pulse'
        } ${className}`}
    >
      {/* aria-live="polite" announces the state change to screen readers without interrupting (SC 4.1.3) */}
      <span aria-live="polite" aria-atomic="true">
        {copied ? '✓ Copied!' : label}
      </span>
    </button>
  );
}
