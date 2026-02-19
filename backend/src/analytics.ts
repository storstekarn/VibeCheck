import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BugType } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATS_PATH = join(__dirname, '..', 'analytics.json');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScanRecord {
  /** Hostname only — never a full URL (e.g. "myapp.vercel.app") */
  domain: string;
  pagesScanned: number;
  totalBugs: number;
  bugsByType: Partial<Record<BugType, number>>;
  bugsBySeverity: { critical: number; warning: number; info: number };
  /** True when prompts fell back to templates (API unavailable / no key) */
  usedTemplates: boolean;
  /**
   * Per-type count of bugs that received a template prompt this scan.
   * Used to rank which templates are exercised most often → improvement candidates.
   */
  templateTypeUsage: Partial<Record<BugType, number>>;
}

interface AnalyticsStore {
  totalScans: number;
  totalBugs: number;
  bugsByType: Record<string, number>;
  bugsBySeverity: Record<string, number>;
  topDomains: Record<string, number>;
  /** Total times each bug type used a template prompt */
  templateUsageByType: Record<string, number>;
  lastUpdated: string;
}

export type StatsResponse = AnalyticsStore & {
  /** Sorted [type, count] pairs — top 10 */
  topBugTypes: [string, number][];
  /** Sorted [domain, scans] pairs — top 10 */
  topDomainsRanked: [string, number][];
  /** Sorted [type, count] — types most relying on templates = improvement candidates */
  templateCandidates: [string, number][];
  avgBugsPerScan: number;
};

// ---------------------------------------------------------------------------
// Storage helpers (same lazy-load + write-through pattern as prompt-cache.ts)
// ---------------------------------------------------------------------------

let store: AnalyticsStore | null = null;

function empty(): AnalyticsStore {
  return {
    totalScans: 0,
    totalBugs: 0,
    bugsByType: {},
    bugsBySeverity: { critical: 0, warning: 0, info: 0 },
    topDomains: {},
    templateUsageByType: {},
    lastUpdated: new Date().toISOString(),
  };
}

function load(): AnalyticsStore {
  if (store) return store;
  if (existsSync(STATS_PATH)) {
    try {
      store = JSON.parse(readFileSync(STATS_PATH, 'utf-8')) as AnalyticsStore;
      return store;
    } catch {
      console.warn('[Analytics] Corrupt analytics file, starting fresh');
    }
  }
  store = empty();
  return store;
}

function persist(): void {
  if (!store) return;
  try {
    store.lastUpdated = new Date().toISOString();
    writeFileSync(STATS_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Analytics] Failed to persist stats:', err);
  }
}

function inc(obj: Record<string, number>, key: string, by = 1) {
  obj[key] = (obj[key] ?? 0) + by;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Record a completed scan.
 * Emits a structured JSON log line (visible in Railway logs) and persists
 * aggregated totals to analytics.json.
 */
export function recordScan(scan: ScanRecord): void {
  const s = load();

  s.totalScans++;
  s.totalBugs += scan.totalBugs;

  for (const [type, count] of Object.entries(scan.bugsByType)) {
    if (count) inc(s.bugsByType, type, count);
  }

  inc(s.bugsBySeverity, 'critical', scan.bugsBySeverity.critical);
  inc(s.bugsBySeverity, 'warning',  scan.bugsBySeverity.warning);
  inc(s.bugsBySeverity, 'info',     scan.bugsBySeverity.info);

  inc(s.topDomains, scan.domain);

  for (const [type, count] of Object.entries(scan.templateTypeUsage)) {
    if (count) inc(s.templateUsageByType, type, count);
  }

  persist();

  // Structured log line — searchable / filterable in Railway log explorer
  console.log(JSON.stringify({
    event: 'scan_complete',
    domain: scan.domain,
    pagesScanned: scan.pagesScanned,
    totalBugs: scan.totalBugs,
    bugsByType: scan.bugsByType,
    bugsBySeverity: scan.bugsBySeverity,
    usedTemplates: scan.usedTemplates,
    ts: new Date().toISOString(),
  }));
}

/**
 * Return aggregated stats, including pre-sorted ranking arrays.
 */
export function getStats(): StatsResponse {
  const s = load();

  const topBugTypes = Object.entries(s.bugsByType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10) as [string, number][];

  const topDomainsRanked = Object.entries(s.topDomains)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10) as [string, number][];

  const templateCandidates = Object.entries(s.templateUsageByType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10) as [string, number][];

  const avgBugsPerScan = s.totalScans > 0
    ? Math.round((s.totalBugs / s.totalScans) * 10) / 10
    : 0;

  return { ...s, topBugTypes, topDomainsRanked, templateCandidates, avgBugsPerScan };
}

/** Reset in-memory store (test helper). */
export function resetAnalytics(): void {
  store = empty();
}
