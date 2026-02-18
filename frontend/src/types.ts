export interface QAReport {
  url: string;
  timestamp: string;
  pagesFound: number;
  pages: PageReport[];
  summary: ReportSummary;
  warnings?: string[];
}

export interface PageReport {
  url: string;
  title: string;
  bugs: Bug[];
  screenshot?: string; // base64
}

export interface Bug {
  id: string;
  type: BugType;
  severity: Severity;
  title: string;
  details: string;
  page: string;
  fixPrompt: string;
}

export type BugType =
  | 'console-error'
  | 'network-error'
  | 'broken-link'
  | 'broken-image'
  | 'accessibility'
  | 'responsive';

export type Severity = 'critical' | 'warning' | 'info';

export interface ProgressEvent {
  phase: string;
  message: string;
  progress: number; // 0-100
}

export interface ReportSummary {
  totalBugs: number;
  critical: number;
  warnings: number;
  info: number;
  byType: Record<BugType, number>;
}
