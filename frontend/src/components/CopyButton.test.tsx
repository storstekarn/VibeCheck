import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyButton } from './CopyButton';

describe('CopyButton', () => {
  it('should render with default label', () => {
    render(<CopyButton text="hello" />);
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('should render with custom label', () => {
    render(<CopyButton text="hello" label="Copy Prompt" />);
    expect(screen.getByRole('button', { name: /copy prompt/i })).toBeInTheDocument();
  });

  it('should show "Copied!" feedback after click', async () => {
    const user = userEvent.setup();
    render(<CopyButton text="hello" />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText(/copied/i)).toBeInTheDocument();
  });
});
