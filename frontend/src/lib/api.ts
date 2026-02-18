import type { QAReport, ProgressEvent } from '../types';

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
    return null;
  } catch {
    return 'Please enter a valid URL (e.g., https://your-app.lovable.app)';
  }
}

/**
 * Start a new scan by posting a URL to the backend.
 */
export async function startScan(url: string): Promise<{ scanId: string }> {
  const res = await fetch('/api/scan', {
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
  const eventSource = new EventSource(`/api/scan/${scanId}/progress`);

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
  const res = await fetch(`/api/scan/${scanId}/report`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch report');
  }

  return data;
}
