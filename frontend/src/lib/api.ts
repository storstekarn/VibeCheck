import type { QAReport, ProgressEvent } from '../types';

// Base URL for all API calls.
// Set VITE_API_URL at build time if the backend is on a different origin
// (e.g. VITE_API_URL=https://backend.railway.app).
// Leave unset when frontend and backend are served from the same host — the
// default empty string makes all paths relative, which is the correct setup
// for the single-service Railway deployment where Express serves the frontend.
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

/**
 * Validate a URL string on the client side.
 * Returns null if valid, or an error message string.
 */
export function validateUrl(url: string): string | null {
  if (!url.trim()) {
    return 'Please enter a URL';
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'URL must start with http:// or https://';
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

/**
 * Start a new scan by posting a URL to the backend.
 */
export async function startScan(url: string): Promise<{ scanId: string }> {
  const res = await fetch(`${API_BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Failed to start scan');
  }

  return data;
}

/**
 * Connect to the SSE progress stream for a scan.
 * Calls onProgress for each event, onDone when the stream ends.
 */
export function connectProgress(
  scanId: string,
  onProgress: (event: ProgressEvent) => void,
  onError: (error: string) => void,
): () => void {
  const eventSource = new EventSource(`${API_BASE}/api/scan/${scanId}/progress`);

  eventSource.onmessage = (event) => {
    try {
      const data: ProgressEvent = JSON.parse(event.data);
      onProgress(data);
    } catch {
      // Ignore parse errors
    }
  };

  eventSource.onerror = () => {
    onError('Connection to server lost');
    eventSource.close();
  };

  // Return cleanup function
  return () => eventSource.close();
}

/**
 * Fetch the completed scan report.
 */
export async function getReport(scanId: string): Promise<QAReport> {
  const res = await fetch(`${API_BASE}/api/scan/${scanId}/report`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch report');
  }

  return data;
}
