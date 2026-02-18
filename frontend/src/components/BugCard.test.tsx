import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BugCard } from './BugCard';
import type { Bug } from '../types';

function makeBug(overrides: Partial<Bug> = {}): Bug {
  return {
    id: 'bug-1',
    type: 'console-error',
    severity: 'critical',
    title: 'Uncaught exception: TypeError',
    details: "Cannot read properties of undefined (reading 'map')",
    page: 'https://myapp.lovable.app/dashboard',
    fixPrompt: 'Fix the TypeError on the dashboard page.',
    ...overrides,
  };
}

describe('BugCard', () => {
  it('should display bug title', () => {
    render(<BugCard bug={makeBug()} />);
    expect(screen.getByText(/uncaught exception/i)).toBeInTheDocument();
  });

  it('should display bug details', () => {
    render(<BugCard bug={makeBug()} />);
    expect(screen.getByText(/cannot read properties/i)).toBeInTheDocument();
  });

  it('should display the page URL', () => {
    render(<BugCard bug={makeBug()} />);
    expect(screen.getByText(/\/dashboard/)).toBeInTheDocument();
  });

  it('should display severity badge', () => {
    render(<BugCard bug={makeBug({ severity: 'critical' })} />);
    expect(screen.getByText(/critical/i)).toBeInTheDocument();
  });

  it('should display bug type', () => {
    render(<BugCard bug={makeBug({ type: 'console-error' })} />);
    expect(screen.getByText(/console error/i)).toBeInTheDocument();
  });

  it('should display fix prompt', () => {
    render(<BugCard bug={makeBug({ fixPrompt: 'Fix the TypeError on the dashboard page.' })} />);
    expect(screen.getByText(/fix the typeerror/i)).toBeInTheDocument();
  });

  it('should have a copy button for the fix prompt', () => {
    render(<BugCard bug={makeBug()} />);
    expect(screen.getByRole('button', { name: /copy prompt/i })).toBeInTheDocument();
  });

  it('should toggle fix prompt visibility', async () => {
    const user = userEvent.setup();
    render(<BugCard bug={makeBug()} />);

    // Prompt is visible by default
    expect(screen.getByText(/fix the typeerror/i)).toBeInTheDocument();

    // Click toggle to hide
    await user.click(screen.getByRole('button', { name: /fix prompt/i }));
    expect(screen.queryByText(/fix the typeerror/i)).not.toBeInTheDocument();

    // Click toggle to show again
    await user.click(screen.getByRole('button', { name: /fix prompt/i }));
    expect(screen.getByText(/fix the typeerror/i)).toBeInTheDocument();
  });

  it('should show warning severity label', () => {
    render(<BugCard bug={makeBug({ severity: 'warning' })} />);
    expect(screen.getByText(/warning/i)).toBeInTheDocument();
  });

  it('should show info severity label', () => {
    render(<BugCard bug={makeBug({ severity: 'info' })} />);
    expect(screen.getByText(/info/i)).toBeInTheDocument();
  });
});
