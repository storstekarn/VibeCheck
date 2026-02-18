import { describe, it, expect, beforeEach } from 'vitest';
import { cacheKey, getCachedPrompt, setCachedPrompt, clearCache, getCacheStats } from './prompt-cache.js';

describe('Prompt Cache', () => {
  beforeEach(() => {
    clearCache();
  });

  it('should generate consistent cache keys for same input', () => {
    const key1 = cacheKey('console-error', 'TypeError', 'Cannot read undefined');
    const key2 = cacheKey('console-error', 'TypeError', 'Cannot read undefined');
    expect(key1).toBe(key2);
  });

  it('should generate different keys for different details', () => {
    const key1 = cacheKey('console-error', 'TypeError', 'Cannot read undefined');
    const key2 = cacheKey('console-error', 'TypeError', 'Different error details');
    expect(key1).not.toBe(key2);
  });

  it('should generate different keys for different types', () => {
    const key1 = cacheKey('console-error', 'Error', 'details');
    const key2 = cacheKey('network-error', 'Error', 'details');
    expect(key1).not.toBe(key2);
  });

  it('should return undefined for uncached keys', () => {
    const result = getCachedPrompt('nonexistent::key');
    expect(result).toBeUndefined();
  });

  it('should store and retrieve cached prompts', () => {
    const key = cacheKey('console-error', 'TypeError', 'Cannot read undefined');
    setCachedPrompt(key, 'Fix the TypeError by adding null checks.');

    const result = getCachedPrompt(key);
    expect(result).toBe('Fix the TypeError by adding null checks.');
  });

  it('should overwrite existing cached prompts', () => {
    const key = cacheKey('console-error', 'TypeError', 'Cannot read undefined');
    setCachedPrompt(key, 'Old prompt');
    setCachedPrompt(key, 'New prompt');

    expect(getCachedPrompt(key)).toBe('New prompt');
  });

  it('should report cache stats', () => {
    expect(getCacheStats().entries).toBe(0);

    setCachedPrompt('key1', 'prompt1');
    setCachedPrompt('key2', 'prompt2');

    expect(getCacheStats().entries).toBe(2);
  });

  it('should clear the cache', () => {
    setCachedPrompt('key1', 'prompt1');
    expect(getCacheStats().entries).toBe(1);

    clearCache();
    expect(getCacheStats().entries).toBe(0);
    expect(getCachedPrompt('key1')).toBeUndefined();
  });
});
