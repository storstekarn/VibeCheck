import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = join(__dirname, '..', 'prompt-cache.json');

interface CacheEntry {
  prompt: string;
  createdAt: string;
}

type CacheData = Record<string, CacheEntry>;

let cache: CacheData | null = null;

/**
 * Build a cache key from bug type + title + details.
 * Uses a short SHA-256 hash of the details to keep keys manageable.
 */
export function cacheKey(type: string, title: string, details: string): string {
  const hash = createHash('sha256').update(details).digest('hex').slice(0, 12);
  return `${type}::${title}::${hash}`;
}

function loadCache(): CacheData {
  if (cache !== null) return cache;

  if (existsSync(CACHE_PATH)) {
    try {
      cache = JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
      return cache!;
    } catch {
      console.warn('[VibeCheck] Corrupt prompt cache, starting fresh');
    }
  }

  cache = {};
  return cache;
}

function saveCache(): void {
  if (cache === null) return;
  try {
    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[VibeCheck] Failed to write prompt cache:', err);
  }
}

/**
 * Look up a cached prompt. Returns the prompt string or undefined.
 */
export function getCachedPrompt(key: string): string | undefined {
  const data = loadCache();
  return data[key]?.prompt;
}

/**
 * Store a prompt in the cache and persist to disk.
 */
export function setCachedPrompt(key: string, prompt: string): void {
  const data = loadCache();
  data[key] = { prompt, createdAt: new Date().toISOString() };
  saveCache();
}

/**
 * Get cache stats for logging.
 */
export function getCacheStats(): { entries: number } {
  const data = loadCache();
  return { entries: Object.keys(data).length };
}

/**
 * Clear the in-memory cache (useful for tests).
 */
export function clearCache(): void {
  cache = {};
}
