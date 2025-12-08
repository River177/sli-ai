/**
 * Slidev Parser
 * Parse and stringify Slidev markdown files
 */

import matter from 'gray-matter';
import type { SlideDeck, Slide, SlidevFrontmatter } from './types.js';

/** Slide separator regex - matches --- on its own line */
const SLIDE_SEPARATOR = /^---$/gm;

/** Frontmatter with optional YAML content */
const SLIDE_FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n?/;

/**
 * Parse a Slidev markdown file into a structured SlideDeck
 * 
 * @param content - Raw markdown content
 * @returns Parsed SlideDeck object
 */
export function parseSlidev(content: string): SlideDeck {
  // Normalize line endings
  const normalizedContent = content.replace(/\r\n/g, '\n').trim();
  
  // Extract global frontmatter
  const { data: frontmatter, content: bodyContent } = matter(normalizedContent);
  
  // Split content into slides by ---
  const slideContents = splitIntoSlides(bodyContent);
  
  // Parse each slide
  const slides: Slide[] = slideContents.map((slideContent, index) => {
    return parseSlide(slideContent, index);
  });
  
  return {
    frontmatter: frontmatter as SlidevFrontmatter,
    slides,
    raw: normalizedContent,
  };
}

/**
 * Split the body content into individual slides
 */
function splitIntoSlides(content: string): string[] {
  // Remove leading/trailing whitespace
  const trimmed = content.trim();
  
  if (!trimmed) {
    return [];
  }
  
  // Split by --- separator (must be on its own line)
  const parts = trimmed.split(/\n---\n/);
  
  return parts.map(part => part.trim()).filter(part => part.length > 0);
}

/**
 * Parse a single slide's content
 */
function parseSlide(content: string, index: number): Slide {
  const slide: Slide = {
    index,
    content: content,
  };
  
  // Check for slide-level frontmatter
  const frontmatterMatch = content.match(SLIDE_FRONTMATTER_REGEX);
  if (frontmatterMatch) {
    try {
      const { data } = matter(`---\n${frontmatterMatch[1]}\n---`);
      slide.frontmatter = data;
      slide.content = content.slice(frontmatterMatch[0].length).trim();
      
      // Extract layout if present
      if (data.layout) {
        slide.layout = data.layout as string;
      }
    } catch {
      // If frontmatter parsing fails, keep content as-is
    }
  }
  
  // Extract speaker notes (content after <!--  --> or specific marker)
  const notesMatch = content.match(/<!--\s*notes?\s*-->\s*([\s\S]*?)(?:<!--|$)/i);
  if (notesMatch) {
    slide.notes = notesMatch[1].trim();
  }
  
  return slide;
}

/**
 * Stringify a SlideDeck back to markdown
 * 
 * @param deck - The SlideDeck to stringify
 * @returns Markdown string
 */
export function stringifySlidev(deck: SlideDeck): string {
  const parts: string[] = [];
  
  // Add global frontmatter
  if (Object.keys(deck.frontmatter).length > 0) {
    parts.push(stringifyFrontmatter(deck.frontmatter));
  }
  
  // Add each slide
  deck.slides.forEach((slide, index) => {
    if (index > 0 || parts.length > 0) {
      parts.push('---');
    }
    parts.push(stringifySlide(slide));
  });
  
  return parts.join('\n\n');
}

/**
 * Stringify frontmatter to YAML block
 */
function stringifyFrontmatter(frontmatter: SlidevFrontmatter): string {
  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => {
      if (typeof value === 'object') {
        return `${key}:\n${stringifyNestedYaml(value as Record<string, unknown>, 2)}`;
      }
      return `${key}: ${formatYamlValue(value)}`;
    })
    .join('\n');
  
  return `---\n${yaml}\n---`;
}

/**
 * Stringify nested YAML objects
 */
function stringifyNestedYaml(obj: Record<string, unknown>, indent: number): string {
  const spaces = ' '.repeat(indent);
  return Object.entries(obj)
    .map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return `${spaces}${key}:\n${stringifyNestedYaml(value as Record<string, unknown>, indent + 2)}`;
      }
      return `${spaces}${key}: ${formatYamlValue(value)}`;
    })
    .join('\n');
}

/**
 * Format a value for YAML output
 */
function formatYamlValue(value: unknown): string {
  if (typeof value === 'string') {
    // Quote strings that might need it
    if (value.includes(':') || value.includes('#') || value.includes('\n')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }
  return JSON.stringify(value);
}

/**
 * Stringify a single slide
 */
function stringifySlide(slide: Slide): string {
  const parts: string[] = [];
  
  // Add slide-level frontmatter if present
  if (slide.frontmatter && Object.keys(slide.frontmatter).length > 0) {
    const yaml = Object.entries(slide.frontmatter)
      .map(([key, value]) => `${key}: ${formatYamlValue(value)}`)
      .join('\n');
    parts.push(`---\n${yaml}\n---`);
  }
  
  // Add content
  parts.push(slide.content);
  
  // Add speaker notes if present
  if (slide.notes) {
    parts.push(`\n<!-- notes -->\n${slide.notes}`);
  }
  
  return parts.join('\n');
}

/**
 * Get a specific slide by index
 */
export function getSlide(deck: SlideDeck, index: number): Slide | undefined {
  return deck.slides[index];
}

/**
 * Update a specific slide's content
 */
export function updateSlide(deck: SlideDeck, index: number, content: string): SlideDeck {
  const newSlides = [...deck.slides];
  
  if (index < 0 || index >= newSlides.length) {
    throw new Error(`Invalid slide index: ${index}`);
  }
  
  newSlides[index] = {
    ...newSlides[index],
    content,
  };
  
  return {
    ...deck,
    slides: newSlides,
  };
}

/**
 * Insert a new slide at a specific position
 */
export function insertSlide(deck: SlideDeck, index: number, slide: Partial<Slide>): SlideDeck {
  const newSlides = [...deck.slides];
  
  const newSlide: Slide = {
    index,
    content: slide.content || '',
    frontmatter: slide.frontmatter,
    layout: slide.layout,
    notes: slide.notes,
  };
  
  newSlides.splice(index, 0, newSlide);
  
  // Re-index slides
  const reindexedSlides = newSlides.map((s, i) => ({ ...s, index: i }));
  
  return {
    ...deck,
    slides: reindexedSlides,
  };
}

/**
 * Remove a slide at a specific position
 */
export function removeSlide(deck: SlideDeck, index: number): SlideDeck {
  const newSlides = deck.slides.filter((_, i) => i !== index);
  
  // Re-index slides
  const reindexedSlides = newSlides.map((s, i) => ({ ...s, index: i }));
  
  return {
    ...deck,
    slides: reindexedSlides,
  };
}

/**
 * Count the number of slides in a deck
 */
export function getSlideCount(deck: SlideDeck): number {
  return deck.slides.length;
}

/**
 * Extract all code blocks from a slide
 */
export function extractCodeBlocks(slide: Slide): Array<{ language: string; code: string }> {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const blocks: Array<{ language: string; code: string }> = [];
  
  let match;
  while ((match = codeBlockRegex.exec(slide.content)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2].trim(),
    });
  }
  
  return blocks;
}

/**
 * Extract all images from a slide
 */
export function extractImages(slide: Slide): Array<{ alt: string; src: string }> {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images: Array<{ alt: string; src: string }> = [];
  
  let match;
  while ((match = imageRegex.exec(slide.content)) !== null) {
    images.push({
      alt: match[1],
      src: match[2],
    });
  }
  
  return images;
}

/**
 * Check if a slide has Mermaid diagrams
 */
export function hasMermaidDiagram(slide: Slide): boolean {
  return /```mermaid/i.test(slide.content);
}

/**
 * Extract Mermaid diagram code from a slide
 */
export function extractMermaidDiagrams(slide: Slide): string[] {
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  const diagrams: string[] = [];
  
  let match;
  while ((match = mermaidRegex.exec(slide.content)) !== null) {
    diagrams.push(match[1].trim());
  }
  
  return diagrams;
}

