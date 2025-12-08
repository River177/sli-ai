/**
 * LLM Module
 * AI text generation using Vercel AI SDK with multi-provider support
 * 
 * @see https://ai-sdk.dev/docs/ai-sdk-core/generating-text
 */

import { generateText, streamText, type StreamTextResult, type LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import type { AIConfig, GenerateOptions, EnhanceOptions, LayoutIssue } from './types.js';
import { createModel, type ModelConfig } from './providers.js';
import { 
  getGeneratePrompt, 
  getEditSlidePrompt, 
  getLayoutFixPrompt,
  getSplitSlidePrompt,
  SLIDEV_SYSTEM_PROMPT
} from './prompts/systemPrompt.js';

/**
 * Default AI configuration
 */
const DEFAULT_CONFIG = {
  model: 'gpt-4-turbo-preview',
  temperature: 0.7,
  maxTokens: 4096,
} as const;

/**
 * Get the AI model instance from config
 * Supports both legacy AIConfig and new ModelConfig
 */
export function getModel(config: AIConfig | ModelConfig): LanguageModel {
  // Check if it's a ModelConfig (has provider field)
  if ('provider' in config && config.provider) {
    return createModel(config as ModelConfig);
  }
  
  // Legacy AIConfig - create OpenAI provider with config
  const legacyConfig = config as AIConfig;
  const openaiProvider = createOpenAI({
    apiKey: legacyConfig.apiKey,
    baseURL: legacyConfig.baseUrl,
  });
  
  return openaiProvider(legacyConfig.model || DEFAULT_CONFIG.model);
}

/**
 * Get temperature and maxTokens from config
 */
function getModelSettings(config: AIConfig | ModelConfig) {
  return {
    temperature: config.temperature ?? DEFAULT_CONFIG.temperature,
    maxTokens: config.maxTokens ?? DEFAULT_CONFIG.maxTokens,
  };
}

/**
 * Generate a complete presentation from a topic
 */
export async function generatePresentation(
  options: GenerateOptions,
  config: AIConfig | ModelConfig
): Promise<string> {
  const model = getModel(config);
  const settings = getModelSettings(config);
  const prompt = getGeneratePrompt(options);

  const { text } = await generateText({
    model,
    system: SLIDEV_SYSTEM_PROMPT,
    prompt,
    temperature: settings.temperature,
    maxOutputTokens: settings.maxTokens,
  });

  return cleanMarkdownOutput(text);
}

/**
 * Generate presentation with streaming output
 * Returns an async generator for real-time streaming
 * 
 * @example
 * ```ts
 * const stream = generatePresentationStream(options, config);
 * for await (const chunk of stream) {
 *   process.stdout.write(chunk);
 * }
 * ```
 */
export async function* generatePresentationStream(
  options: GenerateOptions,
  config: AIConfig | ModelConfig
): AsyncGenerator<string, string, unknown> {
  const model = getModel(config);
  const settings = getModelSettings(config);
  const prompt = getGeneratePrompt(options);

  const result = streamText({
    model,
    system: SLIDEV_SYSTEM_PROMPT,
    prompt,
    temperature: settings.temperature,
    maxOutputTokens: settings.maxTokens,
  });

  let fullText = '';
  for await (const chunk of result.textStream) {
    fullText += chunk;
    yield chunk;
  }

  return cleanMarkdownOutput(fullText);
}

/**
 * Generate presentation stream with callback handlers
 * More flexible API for different use cases
 */
export function createPresentationStream(
  options: GenerateOptions,
  config: AIConfig | ModelConfig
): StreamTextResult<Record<string, never>, never> {
  const model = getModel(config);
  const settings = getModelSettings(config);
  const prompt = getGeneratePrompt(options);

  return streamText({
    model,
    system: SLIDEV_SYSTEM_PROMPT,
    prompt,
    temperature: settings.temperature,
    maxOutputTokens: settings.maxTokens,
  });
}

/**
 * Edit a single slide with AI
 */
export async function editSlide(
  currentContent: string,
  options: EnhanceOptions,
  config: AIConfig | ModelConfig,
  layoutIssues: LayoutIssue[] = []
): Promise<string> {
  const model = getModel(config);
  const settings = getModelSettings(config);
  const prompt = getEditSlidePrompt(currentContent, options.instruction, layoutIssues);

  const { text } = await generateText({
    model,
    system: SLIDEV_SYSTEM_PROMPT,
    prompt,
    temperature: settings.temperature,
    maxOutputTokens: Math.min(settings.maxTokens, 2048), // Limit for single slide
  });

  return cleanMarkdownOutput(text);
}

/**
 * Edit slide with streaming output
 */
export async function* editSlideStream(
  currentContent: string,
  options: EnhanceOptions,
  config: AIConfig | ModelConfig,
  layoutIssues: LayoutIssue[] = []
): AsyncGenerator<string, string, unknown> {
  const model = getModel(config);
  const settings = getModelSettings(config);
  const prompt = getEditSlidePrompt(currentContent, options.instruction, layoutIssues);

  const result = streamText({
    model,
    system: SLIDEV_SYSTEM_PROMPT,
    prompt,
    temperature: settings.temperature,
    maxOutputTokens: Math.min(settings.maxTokens, 2048),
  });

  let fullText = '';
  for await (const chunk of result.textStream) {
    fullText += chunk;
    yield chunk;
  }

  return cleanMarkdownOutput(fullText);
}

/**
 * Fix layout issues automatically
 */
export async function fixLayoutIssues(
  slideContent: string,
  issues: LayoutIssue[],
  config: AIConfig | ModelConfig
): Promise<string> {
  const model = getModel(config);
  const settings = getModelSettings(config);
  const prompt = getLayoutFixPrompt(slideContent, issues);

  const { text } = await generateText({
    model,
    system: SLIDEV_SYSTEM_PROMPT,
    prompt,
    temperature: settings.temperature,
    maxOutputTokens: Math.min(settings.maxTokens, 2048),
  });

  return cleanMarkdownOutput(text);
}

/**
 * Split an overcrowded slide into multiple slides
 */
export async function splitSlide(
  slideContent: string,
  issues: LayoutIssue[],
  config: AIConfig | ModelConfig
): Promise<string[]> {
  const model = getModel(config);
  const settings = getModelSettings(config);
  const prompt = getSplitSlidePrompt(slideContent, issues);

  const { text } = await generateText({
    model,
    system: SLIDEV_SYSTEM_PROMPT,
    prompt,
    temperature: settings.temperature,
    maxOutputTokens: settings.maxTokens,
  });

  // Split the result by --- separator
  const cleaned = cleanMarkdownOutput(text);
  const slides = cleaned.split(/\n---\n/).map(s => s.trim()).filter(Boolean);
  
  return slides;
}

/**
 * Generate content based on a custom prompt
 */
export async function generateCustom(
  systemPrompt: string,
  userPrompt: string,
  config: AIConfig | ModelConfig
): Promise<string> {
  const model = getModel(config);
  const settings = getModelSettings(config);

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: settings.temperature,
    maxOutputTokens: settings.maxTokens,
  });

  return text;
}

/**
 * Generate content with streaming
 */
export async function* generateCustomStream(
  systemPrompt: string,
  userPrompt: string,
  config: AIConfig | ModelConfig
): AsyncGenerator<string, string, unknown> {
  const model = getModel(config);
  const settings = getModelSettings(config);

  const result = streamText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: settings.temperature,
    maxOutputTokens: settings.maxTokens,
  });

  let fullText = '';
  for await (const chunk of result.textStream) {
    fullText += chunk;
    yield chunk;
  }

  return fullText;
}

/**
 * Suggest improvements for a slide
 */
export async function suggestImprovements(
  slideContent: string,
  config: AIConfig | ModelConfig
): Promise<Array<{ category: string; suggestion: string }>> {
  const model = getModel(config);
  const settings = getModelSettings(config);

  const { text } = await generateText({
    model,
    system: 'You are a presentation design consultant. Analyze slides and provide improvement suggestions.',
    prompt: `Analyze this slide and suggest 3-5 improvements:

\`\`\`markdown
${slideContent}
\`\`\`

Output as JSON array with objects containing "category" and "suggestion" fields.`,
    temperature: settings.temperature,
    maxOutputTokens: 1024,
  });

  try {
    // Extract JSON from the response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Clean markdown output from AI
 * Removes common artifacts like code fences wrapping the entire output
 */
export function cleanMarkdownOutput(text: string): string {
  let cleaned = text.trim();

  // Remove markdown code fence if the entire output is wrapped
  if (cleaned.startsWith('```markdown') || cleaned.startsWith('```md')) {
    cleaned = cleaned.replace(/^```(?:markdown|md)\n/, '').replace(/\n```$/, '');
  } else if (cleaned.startsWith('```slidev')) {
    cleaned = cleaned.replace(/^```slidev\n/, '').replace(/\n```$/, '');
  } else if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
    // Generic code fence
    cleaned = cleaned.slice(3, -3).trim();
    // Remove language identifier if present on first line
    const firstNewline = cleaned.indexOf('\n');
    if (firstNewline !== -1) {
      const firstLine = cleaned.slice(0, firstNewline);
      if (!firstLine.includes(' ') && !firstLine.includes('-')) {
        cleaned = cleaned.slice(firstNewline + 1);
      }
    }
  }

  // Remove any leading explanation text before frontmatter
  if (cleaned.includes('---')) {
    const frontmatterStart = cleaned.indexOf('---');
    if (frontmatterStart > 0) {
      const beforeFrontmatter = cleaned.slice(0, frontmatterStart).trim();
      // If the text before frontmatter looks like an explanation, remove it
      if (!beforeFrontmatter.includes('\n') && beforeFrontmatter.length < 100) {
        cleaned = cleaned.slice(frontmatterStart);
      }
    }
  }

  return cleaned.trim();
}

/**
 * Validate AI configuration
 */
export function validateConfig(config: Partial<AIConfig>): AIConfig {
  if (!config.apiKey) {
    throw new Error('API key is required. Set OPENAI_API_KEY environment variable or pass apiKey in config.');
  }

  return {
    apiKey: config.apiKey,
    model: config.model || DEFAULT_CONFIG.model,
    temperature: config.temperature ?? DEFAULT_CONFIG.temperature,
    maxTokens: config.maxTokens ?? DEFAULT_CONFIG.maxTokens,
    baseUrl: config.baseUrl,
    imageModel: config.imageModel,
  };
}

/**
 * Get AI configuration from environment
 */
export function getConfigFromEnv(): AIConfig {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  return {
    apiKey,
    model: process.env.OPENAI_MODEL || DEFAULT_CONFIG.model,
    imageModel: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
    baseUrl: process.env.OPENAI_BASE_URL,
    temperature: DEFAULT_CONFIG.temperature,
    maxTokens: DEFAULT_CONFIG.maxTokens,
  };
}

/**
 * Create config from ModelConfig
 */
export function createConfigFromModel(modelConfig: ModelConfig): AIConfig {
  return {
    apiKey: modelConfig.apiKey,
    model: modelConfig.model,
    baseUrl: modelConfig.baseUrl,
    temperature: modelConfig.temperature ?? DEFAULT_CONFIG.temperature,
    maxTokens: modelConfig.maxTokens ?? DEFAULT_CONFIG.maxTokens,
  };
}
