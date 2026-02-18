import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportView } from './ReportView';
import type { QAReport } from '../types';

function makeReport(overrides: Partial<QAReport> = {}): QAReport {
  return {
    url: 'https://myapp.lovable.app',
    timestamp: '2025-01-15T12:00:00Z',
    pagesFound: 3,
    pages: [
      {
        url: 'https://myapp.lovable.app/',
        title: 'Home',
        bugs: [
          {
            id: 'bug-1',
            type: 'console-error',
            severity: 'critical',
            title: 'Uncaught exception: TypeError',
            details: "Cannot read properties of undefined",
            page: 'https://myapp.lovable.app/',
            fixPrompt: 'Fix the TypeError on the home page.',
          },
          {
            id: 'bug-2',
            type: 'accessibility',
            severity: 'info',
            title: 'Missing alt text',
            details: 'Images missing alt attributes',
            page: 'https://myapp.lovable.app/',
            fixPrompt: 'Add alt text to images.',
          },
        ],
      },
      {
        url: 'https://myapp.lovable.app/about',
        title: 'About',
        bugs: [
          {
            id: 'bug-3',
            type: 'responsive',
            severity: 'warning',
            title: 'Horizontal overflow at Mobile',
            details: 'Content overflows at 375px',
            page: 'https://myapp.lovable.app/about',
            fixPrompt: 'Fix responsive layout on about page.',
          },
        ],
      },
    ],
    summary: {
      totalBugs: 3,
      critical: 1,
      warnings: 1,
      info: 1,
      byType: {
        'console-error': 1,
        'network-error': 0,
        'broken-link': 0,
        'broken-image': 0,
        'accessibility': 1,
        'responsive': 1,
      },
    },
    ...overrides,
  };
}

describe('ReportView', () => {
  it('should display the summary header', () => {
    render(<ReportView report={makeReport()} onReset={vi.fn()} />);
    expect(screen.getByText(/bugs? found/i)).toBeInTheDocument();
    expect(screen.getByText(/3 pages/i)).toBeInTheDocument();
  });

  it('should display severity counts', () => {
    render(<ReportView report={makeReport()} onReset={vi.fn()} />);
    // Severity labels appear in pills, filters, and bug cards
    expect(screen.getAllByText(/critical/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/warning/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/info/).length).toBeGreaterThanOrEqual(1);
  });

  it('should display all bug cards', () => {
    render(<ReportView report={makeReport()} onReset={vi.fn()} />);
    expect(screen.getByText(/uncaught exception/i)).toBeInTheDocument();
    expect(screen.getByText(/missing alt text/i)).toBeInTheDocument();
    expect(screen.getByText(/horizontal overflow/i)).toBeInTheDocument();
  });

  it('should have a "New Scan" button that calls onReset', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<ReportView report={makeReport()} onReset={onReset} />);

    await user.click(screen.getByRole('button', { name: /new scan/i }));
    expect(onReset).toHaveBeenCalled();
  });

  it('should have a "Copy All Prompts" button', () => {
    render(<ReportView report={makeReport()} onReset={vi.fn()} />);
    expect(screen.getByRole('button', { name: /copy all/i })).toBeInTheDocument();
  });

  it('should show a no-bugs celebration when report is clean', () => {
    const clean = makeReport({
      pages: [{ url: 'https://myapp.lovable.app/', title: 'Home', bugs: [] }],
      summary: {
        totalBugs: 0,
        critical: 0,
        warnings: 0,
        info: 0,
        byType: { 'console-error': 0, 'network-error': 0, 'broken-link': 0, 'broken-image': 0, 'accessibility': 0, 'responsive': 0 },
      },
    });
    render(<ReportView report={clean} onReset={vi.fn()} />);
    expect(screen.getByText(/no bugs found!/i)).toBeInTheDocument();
    expect(screen.getByText(/immaculate/i)).toBeInTheDocument();
  });

  it('should have a "Download Report" button', () => {
    render(<ReportView report={makeReport()} onReset={vi.fn()} />);
    expect(screen.getByRole('button', { name: /download report/i })).toBeInTheDocument();
  });

  it('should display warnings when present in the report', () => {
    const report = makeReport({ warnings: ['\u2728 AI-powered prompts temporarily unavailable. Using simplified fix prompts instead.'] });
    render(<ReportView report={report} onReset={vi.fn()} />);
    expect(screen.getByText(/AI-powered prompts temporarily unavailable/i)).toBeInTheDocument();
  });

  it('should not display warning banner when no warnings', () => {
    render(<ReportView report={makeReport()} onReset={vi.fn()} />);
    expect(screen.queryByText(/AI-powered prompts/i)).not.toBeInTheDocument();
  });

  it('should allow filtering by severity', async () => {
    const user = userEvent.setup();
    render(<ReportView report={makeReport()} onReset={vi.fn()} />);

    // Click the "critical" filter
    await user.click(screen.getByRole('button', { name: /critical/i }));

    // Should only show the critical bug
    expect(screen.getByText(/uncaught exception/i)).toBeInTheDocument();
    expect(screen.queryByText(/missing alt text/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/horizontal overflow/i)).not.toBeInTheDocument();
  });
});
