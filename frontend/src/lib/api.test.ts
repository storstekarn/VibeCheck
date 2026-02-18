import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateUrl, startScan } from './api';

describe('validateUrl', () => {
  it('should return null for a valid https URL', () => {
    expect(validateUrl('https://example.com')).toBeNull();
  });

  it('should return null for a valid http URL', () => {
    expect(validateUrl('http://example.com')).toBeNull();
  });

  it('should return an error for empty input', () => {
    expect(validateUrl('')).toBe('Please enter a URL');
  });

  it('should return an error for invalid URL', () => {
    expect(validateUrl('not-a-url')).toBe('Please enter a valid URL (e.g., https://your-app.lovable.app)');
  });

  it('should return an error for non-http protocols', () => {
    expect(validateUrl('ftp://example.com')).toBe('URL must start with http:// or https://');
  });
});

describe('startScan', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should POST to /api/scan and return scanId', async () => {
    const mockResponse = { scanId: 'test-id-123' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await startScan('https://example.com');

    expect(fetch).toHaveBeenCalledWith('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    });
    expect(result).toEqual({ scanId: 'test-id-123' });
  });

  it('should throw on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'A scan already running' }),
    } as Response);

    await expect(startScan('https://example.com')).rejects.toThrow('A scan already running');
  });
});
