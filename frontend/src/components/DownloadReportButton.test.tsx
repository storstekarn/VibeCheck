import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DownloadReportButton } from './DownloadReportButton';
import type { QAReport } from '../types';

vi.mock('../lib/generateReportPdf', () => ({
  generateReportPdf: vi.fn(() => ({
    save: vi.fn(),
  })),
}));

const report: QAReport = {
  url: 'https://myapp.lovable.app',
  timestamp: '2025-01-15T12:00:00Z',
  pagesFound: 1,
  pages: [],
  summary: {
    totalBugs: 0,
    critical: 0,
    warnings: 0,
    info: 0,
    byType: { 'console-error': 0, 'network-error': 0, 'broken-link': 0, 'broken-image': 0, 'accessibility': 0, 'responsive': 0 },
  },
};

describe('DownloadReportButton', () => {
  it('should render with "Download Report" label', () => {
    render(<DownloadReportButton report={report} />);
    expect(screen.getByRole('button', { name: /download report/i })).toBeInTheDocument();
  });

  it('should call generateReportPdf and save on click', async () => {
    const user = userEvent.setup();
    const { generateReportPdf } = await import('../lib/generateReportPdf');

    render(<DownloadReportButton report={report} />);
    await user.click(screen.getByRole('button', { name: /download report/i }));

    expect(generateReportPdf).toHaveBeenCalledWith(report);
  });
});
