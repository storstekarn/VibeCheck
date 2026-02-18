import { describe, it, expect, beforeEach } from 'vitest';
import { generateFixPrompts, generateTemplatePrompts, isApiKeyConfigured } from './prompt-generator.js';
import { clearCache, getCachedPrompt, cacheKey } from './prompt-cache.js';
import type { Bug } from './types.js';

function makeBug(overrides: Partial<Bug> = {}): Bug {
  return {
    id: 'bug-1',
    type: 'console-error',
    severity: 'critical',
    title: 'Uncaught exception: TypeError',
    details: "Cannot read properties of undefined (reading 'map')",
    page: 'https://myapp.lovable.app/dashboard',
    fixPrompt: '',
    ...overrides,
  };
}

describe('generateTemplatePrompts', () => {
  it('should generate a template prompt for console-error bugs', () => {
    const bugs = [makeBug({ type: 'console-error' })];
    const result = generateTemplatePrompts(bugs);

    expect(result[0].fixPrompt).toBeTruthy();
    expect(result[0].fixPrompt.length).toBeGreaterThan(10);
  });

  it('should generate a template prompt for network-error bugs', () => {
    const bugs = [makeBug({ type: 'network-error', title: 'Server error 500 on /api/data', details: 'GET /api/data returned 500' })];
    const result = generateTemplatePrompts(bugs);

    expect(result[0].fixPrompt).toBeTruthy();
  });

  it('should generate a template prompt for broken-link bugs', () => {
    const bugs = [makeBug({ type: 'broken-link', title: 'Broken link: /about', details: 'Link to /about returned 404' })];
    const result = generateTemplatePrompts(bugs);

    expect(result[0].fixPrompt).toBeTruthy();
  });

  it('should generate a template prompt for broken-image bugs', () => {
    const bugs = [makeBug({ type: 'broken-image', title: 'Broken image: logo.png', details: 'Image failed to load: /logo.png' })];
    const result = generateTemplatePrompts(bugs);

    expect(result[0].fixPrompt).toBeTruthy();
  });

  it('should generate a template prompt for accessibility bugs', () => {
    const bugs = [makeBug({ type: 'accessibility', title: 'image-alt: Images must have alternate text', details: 'Missing alt on 3 images' })];
    const result = generateTemplatePrompts(bugs);

    expect(result[0].fixPrompt).toBeTruthy();
  });

  it('should generate a template prompt for responsive bugs', () => {
    const bugs = [makeBug({ type: 'responsive', title: 'Horizontal overflow at Mobile (375px)', details: 'Content width: 1200px' })];
    const result = generateTemplatePrompts(bugs);

    expect(result[0].fixPrompt).toBeTruthy();
  });

  it('should not mutate the original bugs', () => {
    const bugs = [makeBug()];
    const result = generateTemplatePrompts(bugs);

    expect(bugs[0].fixPrompt).toBe('');
    expect(result[0].fixPrompt).not.toBe('');
  });

  it('should handle multiple bugs', () => {
    const bugs = [
      makeBug({ id: '1', type: 'console-error' }),
      makeBug({ id: '2', type: 'broken-link' }),
      makeBug({ id: '3', type: 'accessibility' }),
    ];
    const result = generateTemplatePrompts(bugs);

    expect(result.length).toBe(3);
    expect(result.every((b) => b.fixPrompt.length > 0)).toBe(true);
  });
});

describe('generateFixPrompts', () => {
  beforeEach(() => {
    clearCache();
  });

  it('should fall back to templates when no API key is set', async () => {
    const bugs = [makeBug()];
    const result = await generateFixPrompts(bugs);

    expect(result.bugs[0].fixPrompt).toBeTruthy();
    expect(result.bugs[0].fixPrompt.length).toBeGreaterThan(10);
    expect(result.usedFallback).toBe(true);
    expect(result.fallbackReason).toBeTruthy();
  });

  it('should return usedFallback false for empty bug list', async () => {
    const result = await generateFixPrompts([]);

    expect(result.bugs).toEqual([]);
    expect(result.usedFallback).toBe(false);
    expect(result.cacheHits).toBe(0);
    expect(result.cacheMisses).toBe(0);
  });

  it('should include page-specific context in template prompts', () => {
    const bugs = [makeBug({ page: 'https://myapp.lovable.app/settings' })];
    const result = generateTemplatePrompts(bugs);

    expect(result[0].fixPrompt).toContain('/settings');
  });

  it('should cache prompts after first generation', async () => {
    const bug = makeBug();
    const result1 = await generateFixPrompts([bug]);

    // First call: cache miss
    expect(result1.cacheMisses).toBe(1);
    expect(result1.cacheHits).toBe(0);

    // Verify it was cached
    const key = cacheKey(bug.type, bug.title, bug.details);
    expect(getCachedPrompt(key)).toBeTruthy();

    // Second call: cache hit
    const result2 = await generateFixPrompts([bug]);
    expect(result2.cacheHits).toBe(1);
    expect(result2.cacheMisses).toBe(0);
    expect(result2.usedFallback).toBe(false);
  });

  it('should use cached prompts and only generate for uncached bugs', async () => {
    const bug1 = makeBug({ id: '1', title: 'Error A', details: 'Detail A' });
    const bug2 = makeBug({ id: '2', title: 'Error B', details: 'Detail B' });

    // Generate for bug1 first (gets cached)
    await generateFixPrompts([bug1]);

    // Now generate for both — bug1 should be cached, bug2 is new
    const result = await generateFixPrompts([bug1, bug2]);
    expect(result.cacheHits).toBe(1);
    expect(result.cacheMisses).toBe(1);
    expect(result.bugs.length).toBe(2);
    expect(result.bugs[0].fixPrompt).toBeTruthy();
    expect(result.bugs[1].fixPrompt).toBeTruthy();
  });
});

describe('isApiKeyConfigured', () => {
  it('should return false when no API key is set', () => {
    expect(isApiKeyConfigured()).toBe(false);
  });
});
