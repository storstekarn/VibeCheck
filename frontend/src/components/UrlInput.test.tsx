import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UrlInput } from './UrlInput';

describe('UrlInput', () => {
  it('should render the input and button', () => {
    render(<UrlInput onSubmit={vi.fn()} isLoading={false} />);

    expect(screen.getByPlaceholderText(/vercel\.app/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run qa/i })).toBeInTheDocument();
  });

  it('should show validation error for empty submit', async () => {
    const user = userEvent.setup();
    render(<UrlInput onSubmit={vi.fn()} isLoading={false} />);

    await user.click(screen.getByRole('button', { name: /run qa/i }));

    expect(screen.getByText(/please enter a url/i)).toBeInTheDocument();
  });

  it('should show validation error for invalid URL', async () => {
    const user = userEvent.setup();
    render(<UrlInput onSubmit={vi.fn()} isLoading={false} />);

    await user.type(screen.getByPlaceholderText(/vercel\.app/i), 'not-a-url');
    await user.click(screen.getByRole('button', { name: /run qa/i }));

    expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
  });

  it('should call onSubmit with valid URL', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<UrlInput onSubmit={onSubmit} isLoading={false} />);

    await user.type(screen.getByPlaceholderText(/vercel\.app/i), 'https://myapp.lovable.app');
    await user.click(screen.getByRole('button', { name: /run qa/i }));

    expect(onSubmit).toHaveBeenCalledWith('https://myapp.lovable.app');
  });

  it('should disable button when loading', () => {
    render(<UrlInput onSubmit={vi.fn()} isLoading={true} />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should clear error when user starts typing', async () => {
    const user = userEvent.setup();
    render(<UrlInput onSubmit={vi.fn()} isLoading={false} />);

    // Trigger error
    await user.click(screen.getByRole('button', { name: /run qa/i }));
    expect(screen.getByText(/please enter a url/i)).toBeInTheDocument();

    // Start typing — error should clear
    await user.type(screen.getByPlaceholderText(/vercel\.app/i), 'h');
    expect(screen.queryByText(/please enter a url/i)).not.toBeInTheDocument();
  });
});
