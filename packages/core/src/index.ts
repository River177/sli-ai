/**
 * @slidev-ai/core
 * Core library for AI-powered Slidev presentation generation and editing
 */

// Types
export type {
  SlidevFrontmatter,
  Slide,
  SlideDeck,
  LayoutIssueType,
  IssueSeverity,
  LayoutIssue,
  EditSlideResult,
  GenerateOptions,
  EnhanceOptions,
  DiagramOptions,
  DiagramResult,
  ImageOptions,
  ImageResult,
  AIConfig,
  LayoutCheckConfig,
  ToolType,
  ToolCallResult,
  OrchestratorState,
} from './types.js';

// Parser
export {
  parseSlidev,
  stringifySlidev,
  getSlide,
  updateSlide,
  insertSlide,
  removeSlide,
  getSlideCount,
  extractCodeBlocks,
  extractImages,
  hasMermaidDiagram,
  extractMermaidDiagrams,
} from './slidevParser.js';

// LLM
export {
  generatePresentation,
  generatePresentationStream,
  createPresentationStream,
  editSlide,
  editSlideStream,
  fixLayoutIssues,
  splitSlide,
  generateCustom,
  generateCustomStream,
  suggestImprovements,
  cleanMarkdownOutput,
  validateConfig,
  getConfigFromEnv,
  createConfigFromModel,
  getModel,
} from './llm.js';

// Providers
export {
  createModel,
  createStreamingModel,
  getProviderInfo,
  getAvailableProviders,
  getProviderBaseUrl,
  validateModelConfig,
  createDefaultConfig,
  testModelConnection,
  PROVIDERS,
  type AIProvider,
  type ModelConfig,
  type ProviderInfo,
} from './providers.js';

// Diagram
export {
  generateDiagram,
  generateDiagramFromTemplate,
  formatMermaidMarkdown,
  insertDiagramIntoSlide,
  updateDiagramsInSlide,
  getAvailableDiagramTypes,
} from './diagram.js';

// Image
export {
  generateImage,
  generateAndSaveImage,
  formatImageMarkdown,
  insertImageIntoSlide,
  createImageSlide,
  extractImagesFromSlide,
  replaceImageInSlide,
  hasImages,
  getImageCount,
  getPlaceholderImage,
} from './image.js';

// Layout Heuristic
export {
  checkSlideLayout,
  checkDeckLayout,
  calculateLayoutScore,
  getSeverityColor,
  formatIssuesForDisplay,
  shouldSplitSlide,
  getFixPriority,
} from './layoutHeuristic.js';

// Orchestrator
export {
  SlidevAIOrchestrator,
  createOrchestrator,
  quickGenerate,
} from './orchestrator.js';

// Prompts
export {
  SLIDEV_SYSTEM_PROMPT,
  ORCHESTRATOR_SYSTEM_PROMPT,
  getGeneratePrompt,
  getEditSlidePrompt,
  getLayoutFixPrompt,
  getDiagramPrompt,
  getImagePrompt,
  getSplitSlidePrompt,
  getSuggestImprovementsPrompt,
} from './prompts/systemPrompt.js';

