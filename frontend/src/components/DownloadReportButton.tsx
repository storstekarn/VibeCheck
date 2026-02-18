import type { QAReport } from '../types';
import { generateReportPdf } from '../lib/generateReportPdf';

interface DownloadReportButtonProps {
  report: QAReport;
}

export function DownloadReportButton({ report }: DownloadReportButtonProps) {
  function handleClick() {
    const doc = generateReportPdf(report);
    doc.save('vibecheck-report.pdf');
  }

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 text-sm font-display font-bold text-on-brand rounded-lg bg-brand
        hover:bg-brand-dark transition-all duration-200 hover:shadow-[0_0_16px_rgba(245,166,35,0.2)]"
    >
      Download PDF
    </button>
  );
}
