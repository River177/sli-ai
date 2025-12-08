/**
 * @slidev-ai/layout-checker
 * Layout detection utilities for Slidev presentations
 */

// Re-export core layout checking utilities
export {
  checkSlideLayout,
  checkDeckLayout,
  calculateLayoutScore,
  getSeverityColor,
  formatIssuesForDisplay,
  shouldSplitSlide,
  getFixPriority,
} from '@slidev-ai/core';

// Export types
export type {
  LayoutIssue,
  LayoutIssueType,
  IssueSeverity,
  LayoutCheckConfig,
  Slide,
} from '@slidev-ai/core';

// Playwright-based checking (stub)
export {
  checkSlideWithBrowser,
  checkSlidesWithBrowser,
  isPlaywrightAvailable,
  getPlaywrightInstallInstructions,
  type ViewportConfig,
  type PlaywrightCheckOptions,
  type BrowserCheckResult,
} from './playwright-check.js';

/**
 * Unified layout check API
 * Uses heuristic checks by default, with optional browser-based checking
 */
export interface UnifiedCheckOptions {
  /** Use browser-based checking */
  useBrowser?: boolean;
  /** Slidev dev server URL (required if useBrowser is true) */
  serverUrl?: string;
  /** Heuristic check configuration */
  heuristicConfig?: {
    maxCharsPerSlide?: number;
    maxBulletsPerSlide?: number;
  };
}

import {
  checkSlideLayout as heuristicCheck,
  type Slide,
  type LayoutIssue,
} from '@slidev-ai/core';
import {
  checkSlideWithBrowser,
  isPlaywrightAvailable,
} from './playwright-check.js';

/**
 * Check layout using the best available method
 */
export async function checkLayout(
  slide: Slide,
  options: UnifiedCheckOptions = {}
): Promise<LayoutIssue[]> {
  const issues: LayoutIssue[] = [];

  // Always run heuristic checks
  const heuristicIssues = heuristicCheck(slide, options.heuristicConfig);
  issues.push(...heuristicIssues);

  // Optionally run browser checks
  if (options.useBrowser && options.serverUrl) {
    if (isPlaywrightAvailable()) {
      const browserResult = await checkSlideWithBrowser(slide.index, {
        baseUrl: options.serverUrl,
      });
      issues.push(...browserResult.issues);
    } else {
      console.warn('[layout-checker] Browser check requested but Playwright not available');
    }
  }

  // Deduplicate issues
  return deduplicateIssues(issues);
}

/**
 * Remove duplicate issues
 */
function deduplicateIssues(issues: LayoutIssue[]): LayoutIssue[] {
  const seen = new Set<string>();
  return issues.filter(issue => {
    const key = `${issue.slideIndex}-${issue.type}-${issue.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Create a layout checker instance with preset configuration
 */
export function createLayoutChecker(defaultOptions: UnifiedCheckOptions = {}) {
  return {
    /**
     * Check a single slide
     */
    async check(slide: Slide, options?: Partial<UnifiedCheckOptions>) {
      return checkLayout(slide, { ...defaultOptions, ...options });
    },

    /**
     * Check multiple slides
     */
    async checkMany(slides: Slide[], options?: Partial<UnifiedCheckOptions>) {
      const allIssues: LayoutIssue[] = [];
      for (const slide of slides) {
        const issues = await checkLayout(slide, { ...defaultOptions, ...options });
        allIssues.push(...issues);
      }
      return allIssues;
    },

    /**
     * Get configuration
     */
    getConfig() {
      return { ...defaultOptions };
    },
  };
}

