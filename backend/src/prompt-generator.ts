import Anthropic from '@anthropic-ai/sdk';
import type { Bug, BugType } from './types.js';
import { cacheKey, getCachedPrompt, setCachedPrompt, getCacheStats } from './prompt-cache.js';

// --- Template-based fallback prompts ---

const TEMPLATES: Record<BugType, (bug: Bug) => string> = {
  'console-error': (bug) =>
    `On the ${getPagePath(bug.page)} page, there's a JavaScript error: "${bug.details.slice(0, 150)}". ` +
    `Please investigate and fix this error. It's likely caused by accessing data before it's loaded — ` +
    `add proper null/undefined checks and show a loading state while data is being fetched.`,

  'network-error': (bug) =>
    `On the ${getPagePath(bug.page)} page, a network request is failing: "${bug.title}". ` +
    `Check that the requested resource exists and is accessible (correct URL, server is running, no CORS or auth issues). ` +
    `Add error handling so the user sees a helpful message if the request fails.`,

  'broken-link': (bug) =>
    `On the ${getPagePath(bug.page)} page, there's a broken link: "${bug.title}". ` +
    `Please fix the link destination — either update the href to the correct URL or remove the link if the target page no longer exists.`,

  'broken-image': (bug) =>
    `On the ${getPagePath(bug.page)} page, an image is failing to load: "${bug.details}". ` +
    `Check that the image file exists at the specified path and the URL is correct. If the image was recently moved or deleted, update the src attribute to point to the right location.`,

  'accessibility': (bug) =>
    `On the ${getPagePath(bug.page)} page, there's an accessibility issue: "${bug.title}". ` +
    `${bug.details.split('.')[0]}. Please fix this to improve accessibility for all users.`,

  'responsive': (bug) =>
    `The ${getPagePath(bug.page)} page has layout issues on mobile/tablet: "${bug.title}". ` +
    `Please check for elements with fixed widths and make them responsive. ` +
    `Use responsive Tailwind classes (e.g., w-full, max-w-full, grid-cols-1 on mobile, grid-cols-3 on desktop) ` +
    `to prevent horizontal overflow.`,
};

function getPagePath(url: string): string {
  try {
    const path = new URL(url).pathname;
    return path === '/' ? 'home' : path;
  } catch {
    return url;
  }
}

/**
 * Generate fix prompts using templates (no API call needed).
 * Returns new Bug objects with fixPrompt populated.
 */
export function generateTemplatePrompts(bugs: Bug[]): Bug[] {
  return bugs.map((bug) => {
    const template = TEMPLATES[bug.type];
    return {
      ...bug,
      fixPrompt: template ? template(bug) : `Please investigate and fix: "${bug.title}" on ${bug.page}.`,
    };
  });
}

// --- LLM-powered prompt generation ---

const SYSTEM_PROMPT = `You are a QA assistant for web applications. You will receive a list of bugs found on a specific page.

For each bug, generate a short fix suggestion (2-4 sentences) that a non-technical site owner can understand and act on.

Requirements:
- Be specific and actionable — reference the exact page and error
- Use simple, plain language — the user is not necessarily a developer
- Suggest the likely root cause and a concrete fix
- Keep each prompt concise (2-4 sentences max)
- Do NOT assume a specific tech stack (e.g. Supabase, React, Next.js) unless you can clearly infer it from the bug details
- If the bug is about a third-party service (analytics, CDN, social media), note that it may not be directly fixable by the site owner

Respond with a JSON array of strings, one fix suggestion per bug, in the same order as the input bugs.`;

export interface PromptGenerationResult {
  bugs: Bug[];
  usedFallback: boolean;
  fallbackReason?: string;
  cacheHits?: number;
  cacheMisses?: number;
}

/**
 * Check if the Anthropic API key is configured.
 */
export function isApiKeyConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Generate fix prompts for bugs using a 3-tier strategy:
 * 1. Check prompt cache (free, instant)
 * 2. Call Claude API for cache misses (smart, costs tokens)
 * 3. Fall back to templates if API unavailable
 *
 * New AI-generated prompts are cached for future reuse.
 */
export async function generateFixPrompts(bugs: Bug[]): Promise<PromptGenerationResult> {
  if (bugs.length === 0) return { bugs, usedFallback: false, cacheHits: 0, cacheMisses: 0 };

  // Step 1: Check cache for each bug
  const cachedBugs: (Bug | null)[] = bugs.map((bug) => {
    const key = cacheKey(bug.type, bug.title, bug.details);
    const cached = getCachedPrompt(key);
    if (cached) {
      return { ...bug, fixPrompt: cached };
    }
    return null;
  });

  const cacheHits = cachedBugs.filter((b) => b !== null).length;
  const uncachedBugs = bugs.filter((_, i) => cachedBugs[i] === null);

  const stats = getCacheStats();
  if (cacheHits > 0) {
    console.log(`[VibeCheck] Prompt cache: ${cacheHits} hits, ${uncachedBugs.length} misses (${stats.entries} cached total)`);
  }

  // If everything was cached, return immediately
  if (uncachedBugs.length === 0) {
    return {
      bugs: cachedBugs as Bug[],
      usedFallback: false,
      cacheHits,
      cacheMisses: 0,
    };
  }

  // Step 2: Try Claude API for uncached bugs
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No API key — use templates for uncached bugs and cache them
    const templateBugs = generateTemplatePrompts(uncachedBugs);
    for (const bug of templateBugs) {
      const key = cacheKey(bug.type, bug.title, bug.details);
      setCachedPrompt(key, bug.fixPrompt);
    }

    const result = mergeResults(cachedBugs, templateBugs, bugs);
    return {
      bugs: result,
      usedFallback: true,
      fallbackReason: '✨ AI-powered prompts temporarily unavailable. Using simplified fix prompts instead.',
      cacheHits,
      cacheMisses: uncachedBugs.length,
    };
  }

  try {
    const aiBugs = await generateWithApi(apiKey, uncachedBugs);

    // Cache the new AI-generated prompts
    for (const bug of aiBugs) {
      if (bug.fixPrompt) {
        const key = cacheKey(bug.type, bug.title, bug.details);
        setCachedPrompt(key, bug.fixPrompt);
      }
    }

    const result = mergeResults(cachedBugs, aiBugs, bugs);
    return {
      bugs: result,
      usedFallback: false,
      cacheHits,
      cacheMisses: uncachedBugs.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[VibeCheck] API failed, using templates: ${message}`);

    // Fall back to templates for uncached bugs
    const templateBugs = generateTemplatePrompts(uncachedBugs);
    for (const bug of templateBugs) {
      const key = cacheKey(bug.type, bug.title, bug.details);
      setCachedPrompt(key, bug.fixPrompt);
    }

    const result = mergeResults(cachedBugs, templateBugs, bugs);
    return {
      bugs: result,
      usedFallback: true,
      fallbackReason: '✨ AI-powered prompts temporarily unavailable. Using simplified fix prompts instead.',
      cacheHits,
      cacheMisses: uncachedBugs.length,
    };
  }
}

/**
 * Merge cached results back with newly-generated results, preserving original order.
 */
function mergeResults(cachedBugs: (Bug | null)[], newBugs: Bug[], originalOrder: Bug[]): Bug[] {
  let newIndex = 0;
  return originalOrder.map((_, i) => {
    if (cachedBugs[i] !== null) return cachedBugs[i]!;
    return newBugs[newIndex++];
  });
}

/**
 * Call Claude API to generate prompts for a batch of bugs.
 */
async function generateWithApi(apiKey: string, bugs: Bug[]): Promise<Bug[]> {
  const client = new Anthropic({ apiKey });

  // Group bugs by page for efficient batching
  const bugsByPage = new Map<string, Bug[]>();
  for (const bug of bugs) {
    const existing = bugsByPage.get(bug.page) || [];
    existing.push(bug);
    bugsByPage.set(bug.page, existing);
  }

  const resultBugs: Bug[] = [];

  for (const [page, pageBugs] of bugsByPage) {
    const bugDescriptions = pageBugs.map((b, i) => `Bug ${i + 1}: [${b.type}] ${b.title}\nDetails: ${b.details}`).join('\n\n');

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Page: ${page}\n\n${bugDescriptions}\n\nGenerate a fix prompt for each bug. Respond with a JSON array of strings.`,
        },
      ],
    });

    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const prompts: string[] = JSON.parse(jsonMatch[0]);
        for (let i = 0; i < pageBugs.length; i++) {
          resultBugs.push({
            ...pageBugs[i],
            fixPrompt: prompts[i] || generateTemplatePrompts([pageBugs[i]])[0].fixPrompt,
          });
        }
        continue;
      }
    } catch {
      // JSON parsing failed
    }

    resultBugs.push(...generateTemplatePrompts(pageBugs));
  }

  return resultBugs;
}
