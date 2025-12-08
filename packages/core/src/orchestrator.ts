/**
 * Orchestrator Module
 * Coordinates AI tool calls and slide operations
 */

import type {
  SlideDeck,
  Slide,
  AIConfig,
  GenerateOptions,
  EnhanceOptions,
  DiagramOptions,
  ImageOptions,
  LayoutIssue,
  EditSlideResult,
  ToolType,
  ToolCallResult,
  OrchestratorState,
  LayoutCheckConfig,
} from './types.js';

import { parseSlidev, stringifySlidev, updateSlide, insertSlide, getSlide } from './slidevParser.js';
import { generatePresentation, editSlide, fixLayoutIssues, splitSlide } from './llm.js';
import { generateDiagram, insertDiagramIntoSlide } from './diagram.js';
import { generateImage, insertImageIntoSlide } from './image.js';
import { checkSlideLayout, checkDeckLayout, shouldSplitSlide, calculateLayoutScore } from './layoutHeuristic.js';

/**
 * Default orchestrator options
 */
const DEFAULT_MAX_FIX_ITERATIONS = 3;

/**
 * Slidev-AI Orchestrator
 * Main class for coordinating all operations
 */
export class SlidevAIOrchestrator {
  private config: AIConfig;
  private layoutConfig: LayoutCheckConfig;
  private state: OrchestratorState;

  constructor(config: AIConfig, layoutConfig: Partial<LayoutCheckConfig> = {}) {
    this.config = config;
    this.layoutConfig = {
      maxCharsPerSlide: 600,
      maxBulletsPerSlide: 6,
      useHeadlessBrowser: false,
      viewportWidth: 1920,
      viewportHeight: 1080,
      ...layoutConfig,
    };
    this.state = {
      layoutIssues: [],
      history: [],
    };
  }

  /**
   * Generate a new presentation
   */
  async generatePresentation(options: GenerateOptions): Promise<ToolCallResult<SlideDeck>> {
    const startTime = Date.now();
    
    try {
      this.state.currentOperation = 'generate_slides';
      
      const markdown = await generatePresentation(options, this.config);
      const deck = parseSlidev(markdown);
      
      // Check layout issues
      const issues = checkDeckLayout(deck.slides, this.layoutConfig);
      this.state.deck = deck;
      this.state.layoutIssues = issues;

      const result: ToolCallResult<SlideDeck> = {
        tool: 'generate_slides',
        success: true,
        data: deck,
        duration: Date.now() - startTime,
      };

      this.state.history.push(result);
      return result;
    } catch (error) {
      const result: ToolCallResult<SlideDeck> = {
        tool: 'generate_slides',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
      this.state.history.push(result);
      return result;
    }
  }

  /**
   * Edit a single slide with automatic layout fixing
   */
  async editSlideWithFeedback(
    deck: SlideDeck,
    slideIndex: number,
    options: EnhanceOptions
  ): Promise<EditSlideResult> {
    const maxIterations = options.maxIterations ?? DEFAULT_MAX_FIX_ITERATIONS;
    const autoFix = options.autoFix ?? true;
    
    let currentSlide = getSlide(deck, slideIndex);
    if (!currentSlide) {
      return {
        success: false,
        content: '',
        layoutIssues: [],
        iterations: 0,
        error: `Slide ${slideIndex} not found`,
      };
    }

    let currentContent = currentSlide.content;
    let iterations = 0;
    let layoutIssues: LayoutIssue[] = [];

    try {
      // Initial edit
      currentContent = await editSlide(
        currentContent,
        options,
        this.config,
        []
      );
      iterations++;

      // Check for layout issues
      const tempSlide: Slide = { ...currentSlide, content: currentContent };
      layoutIssues = checkSlideLayout(tempSlide, this.layoutConfig);

      // Auto-fix loop
      while (autoFix && layoutIssues.length > 0 && iterations < maxIterations) {
        // Check if we need to split the slide
        if (shouldSplitSlide(layoutIssues)) {
          // For now, just try to fix without splitting
          // Splitting would return multiple slides which changes the API
        }

        // Fix the issues
        currentContent = await fixLayoutIssues(
          currentContent,
          layoutIssues,
          this.config
        );
        iterations++;

        // Re-check issues
        const updatedSlide: Slide = { ...currentSlide, content: currentContent };
        layoutIssues = checkSlideLayout(updatedSlide, this.layoutConfig);

        // Stop if score is acceptable
        const score = calculateLayoutScore(layoutIssues);
        if (score >= 80) break;
      }

      return {
        success: true,
        content: currentContent,
        layoutIssues,
        iterations,
      };
    } catch (error) {
      return {
        success: false,
        content: currentContent,
        layoutIssues,
        iterations,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Add a diagram to a slide
   */
  async addDiagramToSlide(
    deck: SlideDeck,
    slideIndex: number,
    options: DiagramOptions
  ): Promise<ToolCallResult<SlideDeck>> {
    const startTime = Date.now();

    try {
      const slide = getSlide(deck, slideIndex);
      if (!slide) {
        return {
          tool: 'generate_diagram',
          success: false,
          error: `Slide ${slideIndex} not found`,
          duration: Date.now() - startTime,
        };
      }

      const diagramResult = await generateDiagram(options, this.config);
      if (!diagramResult.success) {
        return {
          tool: 'generate_diagram',
          success: false,
          error: diagramResult.error,
          duration: Date.now() - startTime,
        };
      }

      const updatedContent = insertDiagramIntoSlide(slide.content, diagramResult);
      const updatedDeck = updateSlide(deck, slideIndex, updatedContent);

      return {
        tool: 'generate_diagram',
        success: true,
        data: updatedDeck,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        tool: 'generate_diagram',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Add an image to a slide
   */
  async addImageToSlide(
    deck: SlideDeck,
    slideIndex: number,
    options: ImageOptions
  ): Promise<ToolCallResult<SlideDeck>> {
    const startTime = Date.now();

    try {
      const slide = getSlide(deck, slideIndex);
      if (!slide) {
        return {
          tool: 'generate_image',
          success: false,
          error: `Slide ${slideIndex} not found`,
          duration: Date.now() - startTime,
        };
      }

      const imageResult = await generateImage(options, this.config);
      if (!imageResult.success) {
        return {
          tool: 'generate_image',
          success: false,
          error: imageResult.error,
          duration: Date.now() - startTime,
        };
      }

      const updatedContent = insertImageIntoSlide(slide.content, imageResult);
      const updatedDeck = updateSlide(deck, slideIndex, updatedContent);

      return {
        tool: 'generate_image',
        success: true,
        data: updatedDeck,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        tool: 'generate_image',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Check layout for a specific slide
   */
  checkSlideLayout(slide: Slide): ToolCallResult<LayoutIssue[]> {
    const startTime = Date.now();
    
    try {
      const issues = checkSlideLayout(slide, this.layoutConfig);
      
      return {
        tool: 'check_layout',
        success: true,
        data: issues,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        tool: 'check_layout',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Check layout for entire deck
   */
  checkDeckLayout(deck: SlideDeck): ToolCallResult<LayoutIssue[]> {
    const startTime = Date.now();
    
    try {
      const issues = checkDeckLayout(deck.slides, this.layoutConfig);
      this.state.layoutIssues = issues;
      
      return {
        tool: 'check_layout',
        success: true,
        data: issues,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        tool: 'check_layout',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Fix layout issues for a slide
   */
  async fixSlideLayout(
    deck: SlideDeck,
    slideIndex: number
  ): Promise<ToolCallResult<SlideDeck>> {
    const startTime = Date.now();

    try {
      const slide = getSlide(deck, slideIndex);
      if (!slide) {
        return {
          tool: 'fix_layout',
          success: false,
          error: `Slide ${slideIndex} not found`,
          duration: Date.now() - startTime,
        };
      }

      const issues = checkSlideLayout(slide, this.layoutConfig);
      if (issues.length === 0) {
        return {
          tool: 'fix_layout',
          success: true,
          data: deck,
          duration: Date.now() - startTime,
        };
      }

      const fixedContent = await fixLayoutIssues(slide.content, issues, this.config);
      const updatedDeck = updateSlide(deck, slideIndex, fixedContent);

      return {
        tool: 'fix_layout',
        success: true,
        data: updatedDeck,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        tool: 'fix_layout',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Split a crowded slide into multiple slides
   */
  async splitCrowdedSlide(
    deck: SlideDeck,
    slideIndex: number
  ): Promise<ToolCallResult<SlideDeck>> {
    const startTime = Date.now();

    try {
      const slide = getSlide(deck, slideIndex);
      if (!slide) {
        return {
          tool: 'fix_layout',
          success: false,
          error: `Slide ${slideIndex} not found`,
          duration: Date.now() - startTime,
        };
      }

      const issues = checkSlideLayout(slide, this.layoutConfig);
      const newSlideContents = await splitSlide(slide.content, issues, this.config);

      // Build new deck with split slides
      let newDeck = deck;
      
      // Update first slide
      newDeck = updateSlide(newDeck, slideIndex, newSlideContents[0]);
      
      // Insert additional slides
      for (let i = 1; i < newSlideContents.length; i++) {
        newDeck = insertSlide(newDeck, slideIndex + i, {
          content: newSlideContents[i],
        });
      }

      return {
        tool: 'fix_layout',
        success: true,
        data: newDeck,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        tool: 'fix_layout',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Get current state
   */
  getState(): OrchestratorState {
    return { ...this.state };
  }

  /**
   * Get tool call history
   */
  getHistory(): ToolCallResult[] {
    return [...this.state.history];
  }

  /**
   * Clear state
   */
  clearState(): void {
    this.state = {
      layoutIssues: [],
      history: [],
    };
  }

  /**
   * Export deck to markdown
   */
  exportToMarkdown(deck: SlideDeck): string {
    return stringifySlidev(deck);
  }

  /**
   * Import from markdown
   */
  importFromMarkdown(markdown: string): SlideDeck {
    const deck = parseSlidev(markdown);
    this.state.deck = deck;
    return deck;
  }
}

/**
 * Create an orchestrator instance
 */
export function createOrchestrator(
  config: AIConfig,
  layoutConfig?: Partial<LayoutCheckConfig>
): SlidevAIOrchestrator {
  return new SlidevAIOrchestrator(config, layoutConfig);
}

/**
 * Quick function to generate and export presentation
 */
export async function quickGenerate(
  topic: string,
  config: AIConfig,
  options?: Partial<GenerateOptions>
): Promise<string> {
  const orchestrator = createOrchestrator(config);
  
  const result = await orchestrator.generatePresentation({
    topic,
    slideCount: options?.slideCount ?? 10,
    theme: options?.theme ?? 'default',
    language: options?.language ?? 'en',
    style: options?.style ?? 'professional',
    includeNotes: options?.includeNotes ?? false,
  });

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to generate presentation');
  }

  return orchestrator.exportToMarkdown(result.data);
}

