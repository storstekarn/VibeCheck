import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressTracker } from './ProgressTracker';
import type { ProgressEvent } from '../types';

function makeEvent(overrides: Partial<ProgressEvent> = {}): ProgressEvent {
  return {
    phase: 'crawling',
    message: 'Discovering pages...',
    progress: 25,
    ...overrides,
  };
}

describe('ProgressTracker', () => {
  it('should show "Scanning..." heading', () => {
    render(<ProgressTracker progress={[]} />);
    expect(screen.getByText(/scanning/i)).toBeInTheDocument();
  });

  it('should render a progress bar', () => {
    render(<ProgressTracker progress={[makeEvent({ progress: 50 })]} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toBeInTheDocument();
    expect(bar.getAttribute('aria-valuenow')).toBe('50');
  });

  it('should show the latest progress message', () => {
    const events = [
      makeEvent({ message: 'Starting crawl...', progress: 0 }),
      makeEvent({ message: 'Found page: Home', progress: 30 }),
    ];
    render(<ProgressTracker progress={events} />);
    expect(screen.getByText('Found page: Home')).toBeInTheDocument();
  });

  it('should show completed steps with checkmarks', () => {
    const events = [
      makeEvent({ message: 'Starting crawl...', progress: 0 }),
      makeEvent({ message: 'Found page: Home', progress: 30 }),
      makeEvent({ message: 'Testing /home...', progress: 60 }),
    ];
    render(<ProgressTracker progress={events} />);

    // All past messages should be visible
    expect(screen.getByText('Starting crawl...')).toBeInTheDocument();
    expect(screen.getByText('Found page: Home')).toBeInTheDocument();
    expect(screen.getByText('Testing /home...')).toBeInTheDocument();
  });

  it('should show a spinner for current step', () => {
    render(<ProgressTracker progress={[makeEvent({ progress: 50 })]} />);
    // The last step should have a spinner (animated element)
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('should handle empty progress array', () => {
    render(<ProgressTracker progress={[]} />);
    expect(screen.getByText(/scanning/i)).toBeInTheDocument();
    expect(screen.getByText(/waiting for updates/i)).toBeInTheDocument();
  });

  it('should show 0% progress when no events', () => {
    render(<ProgressTracker progress={[]} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('0');
  });
});
