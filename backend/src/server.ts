import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import type { QAReport, ProgressEvent } from './types.js';
import { runScan } from './orchestrator.js';
import { isApiKeyConfigured } from './prompt-generator.js';
import { getCacheStats } from './prompt-cache.js';
import { getStats } from './analytics.js';
import { adminHtml } from './admin-html.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Scan State ---

export interface ScanState {
  id: string;
  url: string;
  status: 'running' | 'complete' | 'error';
  report?: QAReport;
  error?: string;
  progressListeners: Set<(event: ProgressEvent) => void>;
  pushProgress: (event: ProgressEvent) => void;
}

export class ScanStore {
  private scans = new Map<string, ScanState>();

  create(url: string): ScanState {
    const id = uuidv4();
    const listeners = new Set<(event: ProgressEvent) => void>();

    const scan: ScanState = {
      id,
      url,
      status: 'running',
      progressListeners: listeners,
      pushProgress(event: ProgressEvent) {
        for (const listener of listeners) {
          listener(event);
        }
      },
    };

    this.scans.set(id, scan);
    return scan;
  }

  get(id: string): ScanState | undefined {
    return this.scans.get(id);
  }

  hasRunning(): boolean {
    for (const scan of this.scans.values()) {
      if (scan.status === 'running') return true;
    }
    return false;
  }

  clear(): void {
    this.scans.clear();
  }
}

// --- URL Validation ---

function validateUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'Please enter a valid URL (e.g., https://example.com)';
    }

    // Require a valid domain with TLD (e.g., example.com — not just "erik")
    const parts = parsed.hostname.split('.');
    if (parts.length < 2 || parts[parts.length - 1].length < 2) {
      return 'Please enter a valid URL (e.g., https://example.com)';
    }

    return null;
  } catch {
    return 'Please enter a valid URL (e.g., https://example.com)';
  }
}

// --- Create Express App ---

export function createApp() {
  const app = express();
  const scanStore = new ScanStore();

  app.use(cors());
  app.use(express.json());

  // POST /api/scan — start a new scan
  app.post('/api/scan', (req, res) => {
    const { url } = req.body;

    if (!url) {
      res.status(400).json({ error: 'Missing required field: url' });
      return;
    }

    const validationError = validateUrl(url);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    if (scanStore.hasRunning()) {
      res.status(429).json({ error: 'A scan already running. Please wait for it to complete.' });
      return;
    }

    const scan = scanStore.create(url);

    // Kick off the scan pipeline in the background
    runScan(url, (event) => scan.pushProgress(event))
      .then((report) => {
        scan.status = 'complete';
        scan.report = report;
      })
      .catch((err) => {
        scan.status = 'error';
        scan.error = err instanceof Error ? err.message : 'Scan failed';
      });

    res.json({ scanId: scan.id });
  });

  // GET /api/scan/:scanId/progress — SSE endpoint
  app.get('/api/scan/:scanId/progress', (req, res) => {
    const scan = scanStore.get(req.params.scanId);

    if (!scan) {
      res.status(404).json({ error: 'Scan not found' });
      return;
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Register progress listener
    const listener = (event: ProgressEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    scan.progressListeners.add(listener);

    // Clean up on disconnect
    req.on('close', () => {
      scan.progressListeners.delete(listener);
    });
  });

  // GET /api/admin/stats — analytics data (requires ADMIN_KEY)
  app.get('/api/admin/stats', (req, res) => {
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey) {
      res.status(503).json({ error: 'Admin access not configured — set the ADMIN_KEY environment variable.' });
      return;
    }
    const provided = (req.headers['x-admin-key'] as string | undefined) ?? (req.query['key'] as string | undefined);
    if (provided !== adminKey) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    res.json(getStats());
  });

  // GET /admin — dashboard UI (HTML page, password required in-browser)
  app.get('/admin', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(adminHtml());
  });

  // GET /api/scan/:scanId/report — get final report
  app.get('/api/scan/:scanId/report', (req, res) => {
    const scan = scanStore.get(req.params.scanId);

    if (!scan) {
      res.status(404).json({ error: 'Scan not found' });
      return;
    }

    if (scan.status === 'running') {
      res.status(202).json({ status: 'running', message: 'Scan still in progress' });
      return;
    }

    if (scan.status === 'error') {
      res.status(500).json({ status: 'error', error: scan.error });
      return;
    }

    res.json(scan.report);
  });

  // Serve frontend static files (production build)
  const frontendDist = join(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendDist)) {
    console.log(`Serving frontend static files from: ${frontendDist}`);
    app.use(express.static(frontendDist));
    app.get('*', (_req, res) => {
      res.sendFile(join(frontendDist, 'index.html'));
    });
  } else {
    console.warn(`Frontend dist not found at: ${frontendDist} — running in API-only mode`);
  }

  return { app, scanStore };
}

// --- Start server (only when run directly) ---

const isMainModule = process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js');

if (isMainModule) {
  const { app } = createApp();
  const PORT = process.env.PORT || 3001;

  app.listen(PORT, () => {
    console.log(`\n🚀 VibeCheck backend running on http://localhost:${PORT}\n`);

    // API key status
    if (isApiKeyConfigured()) {
      console.log('✅ ANTHROPIC_API_KEY found — AI-powered prompts enabled');
    } else {
      console.log('⚠️  ANTHROPIC_API_KEY not set — using template prompts only');
      console.log('   To enable AI prompts, set the environment variable:');
      console.log('     export ANTHROPIC_API_KEY=sk-ant-...');
      console.log('   Or create a .env file in the backend directory.');
    }

    // Cache stats
    const { entries } = getCacheStats();
    console.log(`📦 Prompt cache: ${entries} cached prompt${entries !== 1 ? 's' : ''}`);
    console.log('');
  });
}
