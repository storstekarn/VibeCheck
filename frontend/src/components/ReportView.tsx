import { useState, useMemo } from 'react';
import type { QAReport, Severity } from '../types';
import { BugCard } from './BugCard';
import { CopyButton } from './CopyButton';
import { DownloadReportButton } from './DownloadReportButton';
import { AnimatedNumber } from './AnimatedNumber';
import { Confetti } from './Confetti';

interface ReportViewProps {
  report: QAReport;
  onReset: () => void;
}

export function ReportView({ report, onReset }: ReportViewProps) {
  const [severityFilter, setSeverityFilter] = useState<Severity | null>(null);

  const allBugs = useMemo(
    () => report.pages.flatMap((p) => p.bugs),
    [report],
  );

  const filteredBugs = useMemo(
    () => severityFilter ? allBugs.filter((b) => b.severity === severityFilter) : allBugs,
    [allBugs, severityFilter],
  );

  const allPrompts = allBugs
    .filter((b) => b.fixPrompt)
    .map((b) => b.fixPrompt)
    .join('\n\n');

  const { summary } = report;
  const noBugs = summary.totalBugs === 0;

  return (
    <div className="relative min-h-screen app-bg">
      {noBugs && <Confetti />}

      <div className="relative z-10 max-w-4xl mx-auto py-10 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-up">
          <div>
            <h1 className="text-2xl font-display font-bold text-ink tracking-tight">
              Vibe<span className="text-brand">Check</span>
              <span className="text-ink-faint font-body font-normal text-sm ml-2.5">/ Report</span>
            </h1>
            <p className="text-xs text-ink-faint mt-0.5 font-code">
              {noBugs
                ? 'No issues detected'
                : `${summary.totalBugs} issue${summary.totalBugs !== 1 ? 's' : ''} across ${report.pagesFound} page${report.pagesFound !== 1 ? 's' : ''}`
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DownloadReportButton report={report} />
            <button
              onClick={onReset}
              className="px-4 py-2 text-sm font-body bg-surface text-ink-dim rounded-lg border border-line
                hover:bg-raised hover:text-ink transition-all duration-200"
            >
              ← New Scan
            </button>
          </div>
        </div>

        {/* Summary card */}
        <div
          className="bg-surface border border-line rounded-2xl p-6 mb-6 animate-fade-up"
          style={{ animationDelay: '80ms' }}
        >
          <div className="flex items-start justify-between flex-wrap gap-6">
            <div>
              <p className="text-ink-faint text-xs mb-2 font-code uppercase tracking-widest">
                {report.pagesFound} page{report.pagesFound !== 1 ? 's' : ''} scanned
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-display font-extrabold text-ink tabular-nums">
                  <AnimatedNumber value={summary.totalBugs} />
                </span>
                <span className="text-xl text-ink-dim font-display">
                  bug{summary.totalBugs !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap" aria-label="Bug counts by severity">
              <SeverityPill count={summary.critical} label="critical" variant="crit" />
              <SeverityPill count={summary.warnings} label="warning" variant="warn" />
              <SeverityPill count={summary.info}     label="info"    variant="hint" />
            </div>
          </div>
        </div>

        {/* Info banner */}
        {report.warnings && report.warnings.length > 0 && (
          <div
            className="bg-hint/5 border border-hint/15 rounded-xl p-4 mb-6 animate-fade-up"
            style={{ animationDelay: '140ms' }}
          >
            {report.warnings.map((warning, i) => (
              <p key={i} className="text-xs text-hint font-code">{warning}</p>
            ))}
          </div>
        )}

        {/* No bugs — celebration */}
        {noBugs && (
          <div className="text-center py-20 animate-fade-up" style={{ animationDelay: '200ms' }}>
            {/* Decorative emoji — hidden from AT, prose below conveys the message */}
            <div className="text-6xl mb-5 animate-celebrate animate-float" aria-hidden="true">✨</div>
            <p className="text-2xl font-display font-bold text-ink mb-2">No bugs found!</p>
            <p className="text-ink-dim text-base">Your vibe is immaculate. Ship it!</p>
          </div>
        )}

        {/* Controls: filter + copy all */}
        {!noBugs && (
          <>
            <div
              className="flex items-center justify-between mb-5 flex-wrap gap-3 animate-fade-up"
              style={{ animationDelay: '200ms' }}
            >
              {/* role="group" + aria-label groups the filter controls semantically (SC 1.3.1) */}
              <div
                role="group"
                aria-label="Filter bugs by severity"
                className="flex items-center gap-1 bg-surface rounded-lg p-1 border border-line"
              >
                <FilterButton
                  label="All"
                  count={summary.totalBugs}
                  active={severityFilter === null}
                  onClick={() => setSeverityFilter(null)}
                />
                <FilterButton
                  label="Critical"
                  count={summary.critical}
                  active={severityFilter === 'critical'}
                  onClick={() => setSeverityFilter('critical')}
                  dot="bg-crit"
                />
                <FilterButton
                  label="Warning"
                  count={summary.warnings}
                  active={severityFilter === 'warning'}
                  onClick={() => setSeverityFilter('warning')}
                  dot="bg-warn"
                />
                <FilterButton
                  label="Info"
                  count={summary.info}
                  active={severityFilter === 'info'}
                  onClick={() => setSeverityFilter('info')}
                  dot="bg-hint"
                />
              </div>
              <CopyButton
                text={allPrompts}
                label="Copy All Prompts"
                aria-label="Copy all fix prompts to clipboard"
              />
            </div>

            {/* Bug list — labelled region for screen readers */}
            <section aria-label="Bug list">
              <div className="space-y-3">
                {filteredBugs.map((bug, i) => (
                  <BugCard key={bug.id} bug={bug} index={i} />
                ))}
              </div>

              {filteredBugs.length === 0 && severityFilter && (
                <div className="text-center py-12 animate-fade-up" aria-live="polite">
                  <p className="text-ink-faint text-sm font-code">
                    No {severityFilter} issues — nice! 🎉
                  </p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function SeverityPill({
  count,
  label,
  variant,
}: {
  count: number;
  label: string;
  variant: 'crit' | 'warn' | 'hint';
}) {
  const styles = {
    crit: 'bg-crit/10 text-crit border-crit/20',
    warn: 'bg-warn/10 text-warn border-warn/20',
    hint: 'bg-hint/10 text-hint border-hint/20',
  };

  return (
    <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border inline-flex items-center gap-1.5 ${styles[variant]}`}>
      <AnimatedNumber value={count} duration={600} />
      {' '}{label}
    </span>
  );
}

function FilterButton({
  label,
  count,
  active,
  onClick,
  dot,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  dot?: string;
}) {
  return (
    // aria-pressed communicates toggle state to screen readers (SC 4.1.2)
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1.5 text-xs rounded-md transition-all duration-200 inline-flex items-center gap-1.5 font-body font-medium
        ${active
          ? 'bg-brand text-on-brand shadow-sm'
          : 'text-ink-dim hover:text-ink hover:bg-raised'
        }`}
    >
      {dot && (
        // Color dot is supplementary — the text label also conveys severity (SC 1.4.1)
        <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${dot} ${active ? 'opacity-80' : 'opacity-60'}`} />
      )}
      {label}
      <span aria-hidden="true" className={`text-xs px-1.5 py-0.5 rounded font-code ${active ? 'bg-on-brand/10' : 'bg-line'}`}>
        {count}
      </span>
    </button>
  );
}
