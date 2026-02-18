import { useState } from 'react';
import { validateUrl } from '../lib/api';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export function UrlInput({ onSubmit, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateUrl(url);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onSubmit(url);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUrl(e.target.value);
    if (error) setError(null);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      {/* Visible label — clear instruction, visible at a glance (SC 3.3.2) */}
      <label
        htmlFor="url-input"
        className="block text-xs font-code text-ink-faint tracking-widest uppercase mb-1 pl-1"
      >
        Your app URL
      </label>
      <div>
        <div className="relative">
          {/* Globe icon — universally understood "web" cue, aria-hidden (SC 1.1.1) */}
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2 text-base pointer-events-none select-none"
            aria-hidden="true"
          >
            🌐
          </span>
          <input
            id="url-input"
            type="text"
            value={url}
            onChange={handleChange}
            placeholder="https://your-app.vercel.app"
            aria-describedby={error ? 'url-error' : undefined}
            aria-invalid={error ? 'true' : undefined}
            className={`w-full pl-11 pr-4 py-4 font-code text-sm rounded-xl
              bg-raised text-ink placeholder:text-ink-dim
              border transition-all duration-200
              focus:outline-none
              url-input-glow
              ${error
                ? 'border-crit/50 url-input-error'
                : 'border-brand/30 hover:border-brand/50 focus-visible:border-brand/65'
              }`}
            disabled={isLoading}
            autoComplete="url"
            spellCheck={false}
          />
        </div>
        {error && (
          <p id="url-error" role="alert" className="mt-2 text-xs text-crit font-code pl-1">
            {error}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="block w-1/2 mx-auto py-3.5 px-6 font-display font-bold text-sm text-on-brand rounded-xl
          bg-brand hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-200
          hover:shadow-[0_0_24px_rgba(245,166,35,0.25)]
          active:scale-[0.98]"
      >
        {isLoading ? 'Starting scan...' : 'Run QA Test →'}
      </button>
    </form>
  );
}
