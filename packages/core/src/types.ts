/**
 * Slidev-AI Type Definitions
 * Core types for the entire slidev-ai ecosystem
 */

/**
 * Frontmatter configuration for a Slidev presentation
 */
export interface SlidevFrontmatter {
  theme?: string;
  title?: string;
  info?: string;
  author?: string;
  class?: string;
  highlighter?: string;
  drawings?: {
    persist?: boolean;
  };
  transition?: string;
  mdc?: boolean;
  [key: string]: unknown;
}

/**
 * Represents a single slide in a presentation
 */
export interface Slide {
  /** Slide index (0-based) */
  index: number;
  /** Raw markdown content of the slide */
  content: string;
  /** Slide-specific frontmatter (if any) */
  frontmatter?: Record<string, unknown>;
  /** Optional layout type */
  layout?: string;
  /** Optional speaker notes */
  notes?: string;
}

/**
 * Represents a complete Slidev deck
 */
export interface SlideDeck {
  /** Global frontmatter at the top of the file */
  frontmatter: SlidevFrontmatter;
  /** Array of slides */
  slides: Slide[];
  /** Raw markdown content */
  raw: string;
}

/**
 * Types of layout issues that can be detected
 */
export type LayoutIssueType =
  | 'too-long-text'
  | 'too-many-bullets'
  | 'image-text-crowded'
  | 'overflow-detected'
  | 'font-too-small'
  | 'empty-slide'
  | 'missing-title';

/**
 * Severity levels for layout issues
 */
export type IssueSeverity = 'error' | 'warning' | 'info';

/**
 * Represents a detected layout issue
 */
export interface LayoutIssue {
  /** Type of the issue */
  type: LayoutIssueType;
  /** Human-readable description */
  message: string;
  /** Severity level */
  severity: IssueSeverity;
  /** Slide index where the issue was detected */
  slideIndex: number;
  /** Suggested fix */
  suggestion?: string;
  /** Additional metadata */
  meta?: {
    /** Character count if text-related */
    charCount?: number;
    /** Bullet count if bullet-related */
    bulletCount?: number;
    /** Image count */
    imageCount?: number;
    /** Detected overflow in pixels */
    overflowPixels?: number;
  };
}

/**
 * Result of editing a slide
 */
export interface EditSlideResult {
  /** Whether the edit was successful */
  success: boolean;
  /** The updated slide content */
  content: string;
  /** Any layout issues detected after edit */
  layoutIssues: LayoutIssue[];
  /** Number of fix iterations performed */
  iterations: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Options for generating a new presentation
 */
export interface GenerateOptions {
  /** Topic or title for the presentation */
  topic: string;
  /** Number of slides to generate */
  slideCount?: number;
  /** Theme to use */
  theme?: string;
  /** Language for content */
  language?: string;
  /** Style preferences */
  style?: 'professional' | 'casual' | 'academic' | 'creative';
  /** Include speaker notes */
  includeNotes?: boolean;
}

/**
 * Options for enhancing/editing a slide
 */
export interface EnhanceOptions {
  /** The instruction for enhancement */
  instruction: string;
  /** Whether to auto-fix layout issues */
  autoFix?: boolean;
  /** Maximum fix iterations */
  maxIterations?: number;
}

/**
 * Options for diagram generation
 */
export interface DiagramOptions {
  /** Description of the diagram */
  description: string;
  /** Type of diagram */
  type?: 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'gantt' | 'pie' | 'mindmap';
  /** Mermaid theme */
  theme?: 'default' | 'forest' | 'dark' | 'neutral';
}

/**
 * Result of diagram generation
 */
export interface DiagramResult {
  /** Whether generation was successful */
  success: boolean;
  /** The generated Mermaid code */
  mermaidCode: string;
  /** Markdown block to insert */
  markdown: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Options for image generation
 */
export interface ImageOptions {
  /** Description/prompt for the image */
  prompt: string;
  /** Image size */
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  /** Image style */
  style?: 'vivid' | 'natural';
  /** Quality */
  quality?: 'standard' | 'hd';
}

/**
 * Result of image generation
 */
export interface ImageResult {
  /** Whether generation was successful */
  success: boolean;
  /** URL of the generated image */
  url?: string;
  /** Local path if saved */
  localPath?: string;
  /** Markdown to insert */
  markdown: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Configuration for the AI provider
 */
export interface AIConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Model to use for text generation */
  model?: string;
  /** Model to use for image generation */
  imageModel?: string;
  /** Base URL for API */
  baseUrl?: string;
  /** Temperature for generation */
  temperature?: number;
  /** Maximum tokens */
  maxTokens?: number;
}

/**
 * Layout check configuration
 */
export interface LayoutCheckConfig {
  /** Maximum characters per slide */
  maxCharsPerSlide?: number;
  /** Maximum bullet points per slide */
  maxBulletsPerSlide?: number;
  /** Enable headless browser check */
  useHeadlessBrowser?: boolean;
  /** Browser viewport width */
  viewportWidth?: number;
  /** Browser viewport height */
  viewportHeight?: number;
}

/**
 * Tool call types for orchestrator
 */
export type ToolType = 
  | 'generate_slides'
  | 'edit_slide'
  | 'generate_diagram'
  | 'generate_image'
  | 'check_layout'
  | 'fix_layout';

/**
 * Tool call result
 */
export interface ToolCallResult<T = unknown> {
  /** Tool that was called */
  tool: ToolType;
  /** Whether the call succeeded */
  success: boolean;
  /** Result data */
  data?: T;
  /** Error if failed */
  error?: string;
  /** Execution time in ms */
  duration: number;
}

/**
 * Orchestrator state
 */
export interface OrchestratorState {
  /** Current slide deck */
  deck?: SlideDeck;
  /** Pending layout issues */
  layoutIssues: LayoutIssue[];
  /** History of tool calls */
  history: ToolCallResult[];
  /** Current operation */
  currentOperation?: string;
}

