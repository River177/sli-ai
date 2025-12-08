/**
 * Layout Heuristic Module
 * Detect layout issues using heuristic rules
 */

import type { Slide, LayoutIssue, LayoutCheckConfig, IssueSeverity } from './types.js';
import { extractImages, hasMermaidDiagram, extractCodeBlocks } from './slidevParser.js';

/**
 * Default layout check configuration
 */
const DEFAULT_CONFIG: LayoutCheckConfig = {
  maxCharsPerSlide: 600,
  maxBulletsPerSlide: 6,
  useHeadlessBrowser: false,
  viewportWidth: 1920,
  viewportHeight: 1080,
};

/**
 * Check a slide for layout issues using heuristic rules
 */
export function checkSlideLayout(
  slide: Slide,
  config: Partial<LayoutCheckConfig> = {}
): LayoutIssue[] {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const issues: LayoutIssue[] = [];

  // Check for empty slide
  const emptyIssue = checkEmptySlide(slide);
  if (emptyIssue) issues.push(emptyIssue);

  // Check for missing title
  const titleIssue = checkMissingTitle(slide);
  if (titleIssue) issues.push(titleIssue);

  // Check text length
  const textIssues = checkTextLength(slide, mergedConfig);
  issues.push(...textIssues);

  // Check bullet count
  const bulletIssue = checkBulletCount(slide, mergedConfig);
  if (bulletIssue) issues.push(bulletIssue);

  // Check image-text crowding
  const crowdingIssue = checkImageTextCrowding(slide, mergedConfig);
  if (crowdingIssue) issues.push(crowdingIssue);

  // Check code block size
  const codeIssues = checkCodeBlocks(slide);
  issues.push(...codeIssues);

  return issues;
}

/**
 * Check multiple slides
 */
export function checkDeckLayout(
  slides: Slide[],
  config: Partial<LayoutCheckConfig> = {}
): LayoutIssue[] {
  const allIssues: LayoutIssue[] = [];

  for (const slide of slides) {
    const slideIssues = checkSlideLayout(slide, config);
    allIssues.push(...slideIssues);
  }

  return allIssues;
}

/**
 * Check if slide is empty or nearly empty
 */
function checkEmptySlide(slide: Slide): LayoutIssue | null {
  const contentWithoutFrontmatter = slide.content
    .replace(/^---[\s\S]*?---\n?/, '')
    .trim();

  // Remove markdown formatting to get actual content
  const textOnly = contentWithoutFrontmatter
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove images
    .replace(/^#+\s*/gm, '') // Remove headers
    .replace(/[*_`~]/g, '') // Remove formatting
    .trim();

  if (textOnly.length < 10) {
    return {
      type: 'empty-slide',
      message: 'Slide appears to be empty or has minimal content',
      severity: 'warning',
      slideIndex: slide.index,
      suggestion: 'Add meaningful content or consider removing this slide',
      meta: {
        charCount: textOnly.length,
      },
    };
  }

  return null;
}

/**
 * Check if slide is missing a title
 */
function checkMissingTitle(slide: Slide): LayoutIssue | null {
  // Skip check for layout slides that might not need titles
  const noTitleLayouts = ['cover', 'intro', 'center', 'quote', 'image', 'end'];
  if (slide.layout && noTitleLayouts.includes(slide.layout)) {
    return null;
  }

  // Check for any heading
  const hasHeading = /^#{1,3}\s+.+/m.test(slide.content);

  if (!hasHeading) {
    return {
      type: 'missing-title',
      message: 'Slide is missing a title or heading',
      severity: 'info',
      slideIndex: slide.index,
      suggestion: 'Add a heading to improve slide structure',
    };
  }

  return null;
}

/**
 * Check text length
 */
function checkTextLength(
  slide: Slide,
  config: LayoutCheckConfig
): LayoutIssue[] {
  const issues: LayoutIssue[] = [];
  
  // Get text content without code blocks and images
  const textContent = slide.content
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove images
    .replace(/^---[\s\S]*?---\n?/, '') // Remove frontmatter
    .trim();

  const charCount = textContent.length;

  if (charCount > config.maxCharsPerSlide!) {
    const severity: IssueSeverity = charCount > config.maxCharsPerSlide! * 1.5 ? 'error' : 'warning';
    
    issues.push({
      type: 'too-long-text',
      message: `Slide has ${charCount} characters (max recommended: ${config.maxCharsPerSlide})`,
      severity,
      slideIndex: slide.index,
      suggestion: 'Shorten text, use bullet points, or split into multiple slides',
      meta: {
        charCount,
      },
    });
  }

  // Check individual lines for length
  const lines = textContent.split('\n');
  const longLines = lines.filter(line => {
    const cleanLine = line.replace(/^[-*+]\s*/, '').trim();
    return cleanLine.length > 100;
  });

  if (longLines.length > 0) {
    issues.push({
      type: 'too-long-text',
      message: `${longLines.length} line(s) exceed recommended length (100 chars)`,
      severity: 'info',
      slideIndex: slide.index,
      suggestion: 'Break long lines into shorter phrases or bullet points',
    });
  }

  return issues;
}

/**
 * Check bullet point count
 */
function checkBulletCount(
  slide: Slide,
  config: LayoutCheckConfig
): LayoutIssue | null {
  // Count bullet points (-, *, +, or numbered)
  const bulletPattern = /^[\s]*[-*+]|\d+\./gm;
  const matches = slide.content.match(bulletPattern);
  const bulletCount = matches ? matches.length : 0;

  if (bulletCount > config.maxBulletsPerSlide!) {
    return {
      type: 'too-many-bullets',
      message: `Slide has ${bulletCount} bullet points (max recommended: ${config.maxBulletsPerSlide})`,
      severity: bulletCount > config.maxBulletsPerSlide! * 1.5 ? 'error' : 'warning',
      slideIndex: slide.index,
      suggestion: 'Consolidate bullet points or split into multiple slides',
      meta: {
        bulletCount,
      },
    };
  }

  return null;
}

/**
 * Check for image-text crowding
 */
function checkImageTextCrowding(
  slide: Slide,
  config: LayoutCheckConfig
): LayoutIssue | null {
  const images = extractImages(slide);
  const hasDiagram = hasMermaidDiagram(slide);
  
  if (images.length === 0 && !hasDiagram) {
    return null;
  }

  const imageCount = images.length + (hasDiagram ? 1 : 0);
  
  // Get text content without images and diagrams
  const textContent = slide.content
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove images
    .replace(/```mermaid[\s\S]*?```/g, '') // Remove mermaid
    .replace(/^---[\s\S]*?---\n?/, '') // Remove frontmatter
    .trim();

  const charCount = textContent.length;
  
  // If there are images/diagrams, text should be shorter
  const adjustedMaxChars = Math.floor(config.maxCharsPerSlide! * (0.6 / imageCount));
  
  if (charCount > adjustedMaxChars) {
    return {
      type: 'image-text-crowded',
      message: `Slide with ${imageCount} image(s)/diagram(s) has ${charCount} chars (recommended: ${adjustedMaxChars})`,
      severity: 'warning',
      slideIndex: slide.index,
      suggestion: 'Reduce text content when including images or diagrams',
      meta: {
        charCount,
        imageCount,
      },
    };
  }

  return null;
}

/**
 * Check code blocks for size issues
 */
function checkCodeBlocks(slide: Slide): LayoutIssue[] {
  const issues: LayoutIssue[] = [];
  const codeBlocks = extractCodeBlocks(slide);

  for (const block of codeBlocks) {
    const lineCount = block.code.split('\n').length;
    
    if (lineCount > 20) {
      issues.push({
        type: 'too-long-text',
        message: `Code block has ${lineCount} lines (max recommended: 20)`,
        severity: lineCount > 30 ? 'error' : 'warning',
        slideIndex: slide.index,
        suggestion: 'Shorten code block, highlight key parts, or split across slides',
      });
    }
  }

  return issues;
}

/**
 * Calculate overall layout score (0-100)
 */
export function calculateLayoutScore(issues: LayoutIssue[]): number {
  if (issues.length === 0) return 100;

  let score = 100;

  for (const issue of issues) {
    switch (issue.severity) {
      case 'error':
        score -= 25;
        break;
      case 'warning':
        score -= 10;
        break;
      case 'info':
        score -= 3;
        break;
    }
  }

  return Math.max(0, score);
}

/**
 * Get severity color for display
 */
export function getSeverityColor(severity: IssueSeverity): string {
  switch (severity) {
    case 'error':
      return '#ef4444'; // red
    case 'warning':
      return '#f59e0b'; // amber
    case 'info':
      return '#3b82f6'; // blue
    default:
      return '#6b7280'; // gray
  }
}

/**
 * Format issues for display
 */
export function formatIssuesForDisplay(issues: LayoutIssue[]): string {
  if (issues.length === 0) {
    return '✅ No layout issues detected';
  }

  const grouped = issues.reduce((acc, issue) => {
    if (!acc[issue.slideIndex]) {
      acc[issue.slideIndex] = [];
    }
    acc[issue.slideIndex].push(issue);
    return acc;
  }, {} as Record<number, LayoutIssue[]>);

  const lines: string[] = [];
  
  for (const [slideIndex, slideIssues] of Object.entries(grouped)) {
    lines.push(`\n📊 Slide ${Number(slideIndex) + 1}:`);
    for (const issue of slideIssues) {
      const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
      lines.push(`  ${icon} ${issue.message}`);
      if (issue.suggestion) {
        lines.push(`     💡 ${issue.suggestion}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Check if issues require slide splitting
 */
export function shouldSplitSlide(issues: LayoutIssue[]): boolean {
  return issues.some(issue => 
    issue.severity === 'error' && 
    (issue.type === 'too-long-text' || issue.type === 'too-many-bullets')
  );
}

/**
 * Get fix priority for issues
 */
export function getFixPriority(issues: LayoutIssue[]): LayoutIssue[] {
  return [...issues].sort((a, b) => {
    const severityOrder = { error: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

