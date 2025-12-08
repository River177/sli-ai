/**
 * AI Model Providers
 * Unified interface for multiple AI providers using Vercel AI SDK
 * 
 * @see https://ai-sdk.dev/docs/introduction
 */

import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

/**
 * Supported AI providers
 */
export type AIProvider = 
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'deepseek'
  | 'moonshot'
  | 'zhipu'
  | 'qwen'
  | 'groq'
  | 'together'
  | 'custom';

/**
 * Model configuration for a specific provider
 */
export interface ModelConfig {
  /** Provider type */
  provider: AIProvider;
  /** Model name/ID */
  model: string;
  /** API key */
  apiKey: string;
  /** Base URL (for custom endpoints) */
  baseUrl?: string;
  /** Display name */
  displayName?: string;
  /** Temperature (0-2) */
  temperature?: number;
  /** Max tokens */
  maxTokens?: number;
}

/**
 * Provider metadata
 */
export interface ProviderInfo {
  id: AIProvider;
  name: string;
  description: string;
  website: string;
  models: Array<{
    id: string;
    name: string;
    description?: string;
    maxTokens?: number;
  }>;
  requiresApiKey: boolean;
  supportsCustomBaseUrl: boolean;
  defaultBaseUrl?: string;
}

/**
 * All supported providers and their models
 */
export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-3.5 等模型',
    website: 'https://platform.openai.com',
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', description: '最强大的模型', maxTokens: 128000 },
      { id: 'gpt-4', name: 'GPT-4', description: '高质量生成', maxTokens: 8192 },
      { id: 'gpt-4o', name: 'GPT-4o', description: '多模态模型', maxTokens: 128000 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '快速且经济', maxTokens: 128000 },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: '快速响应', maxTokens: 16385 },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 系列模型',
    website: 'https://www.anthropic.com',
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
    defaultBaseUrl: 'https://api.anthropic.com',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: '最新最强', maxTokens: 200000 },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: '最强推理', maxTokens: 200000 },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: '平衡性能', maxTokens: 200000 },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: '快速响应', maxTokens: 200000 },
    ],
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Gemini 系列模型',
    website: 'https://ai.google.dev',
    requiresApiKey: true,
    supportsCustomBaseUrl: false,
    models: [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: '最强大', maxTokens: 2000000 },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: '快速', maxTokens: 1000000 },
      { id: 'gemini-pro', name: 'Gemini Pro', description: '通用', maxTokens: 32000 },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: '深度求索 AI',
    website: 'https://platform.deepseek.com',
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
    defaultBaseUrl: 'https://api.deepseek.com',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', description: '对话模型', maxTokens: 64000 },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', description: '代码模型', maxTokens: 64000 },
    ],
  },
  {
    id: 'moonshot',
    name: 'Moonshot (Kimi)',
    description: '月之暗面 Kimi',
    website: 'https://platform.moonshot.cn',
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    models: [
      { id: 'moonshot-v1-128k', name: 'Moonshot 128K', description: '超长上下文', maxTokens: 128000 },
      { id: 'moonshot-v1-32k', name: 'Moonshot 32K', description: '长上下文', maxTokens: 32000 },
      { id: 'moonshot-v1-8k', name: 'Moonshot 8K', description: '标准', maxTokens: 8000 },
    ],
  },
  {
    id: 'zhipu',
    name: '智谱 AI',
    description: 'GLM 系列模型',
    website: 'https://open.bigmodel.cn',
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-4-plus', name: 'GLM-4 Plus', description: '最强', maxTokens: 128000 },
      { id: 'glm-4', name: 'GLM-4', description: '通用', maxTokens: 128000 },
      { id: 'glm-4-flash', name: 'GLM-4 Flash', description: '快速', maxTokens: 128000 },
    ],
  },
  {
    id: 'qwen',
    name: '通义千问',
    description: '阿里云 Qwen 系列',
    website: 'https://dashscope.aliyun.com',
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: [
      { id: 'qwen-max', name: 'Qwen Max', description: '最强', maxTokens: 32000 },
      { id: 'qwen-plus', name: 'Qwen Plus', description: '增强', maxTokens: 32000 },
      { id: 'qwen-turbo', name: 'Qwen Turbo', description: '快速', maxTokens: 8000 },
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    description: '超快推理',
    website: 'https://console.groq.com',
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    models: [
      { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', description: '强大通用', maxTokens: 32768 },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: '快速', maxTokens: 8192 },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'MoE 模型', maxTokens: 32768 },
    ],
  },
  {
    id: 'together',
    name: 'Together AI',
    description: '开源模型托管',
    website: 'https://www.together.ai',
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
    defaultBaseUrl: 'https://api.together.xyz/v1',
    models: [
      { id: 'meta-llama/Llama-3-70b-chat-hf', name: 'Llama 3 70B', description: 'Meta 最强', maxTokens: 8192 },
      { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B', description: 'MoE', maxTokens: 32768 },
      { id: 'Qwen/Qwen2-72B-Instruct', name: 'Qwen2 72B', description: '通义千问', maxTokens: 32768 },
    ],
  },
  {
    id: 'custom',
    name: '自定义',
    description: '兼容 OpenAI 格式的自定义端点',
    website: '',
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
    models: [
      { id: 'custom', name: '自定义模型', description: '输入模型名称' },
    ],
  },
];

/**
 * Create a language model instance from config using Vercel AI SDK
 * 
 * Uses createOpenAI() for dynamic provider configuration
 * @see https://ai-sdk.dev/providers/ai-sdk-providers/openai
 */
export function createModel(config: ModelConfig): LanguageModel {
  const { provider, model, apiKey, baseUrl } = config;
  
  // Get provider info for default base URL
  const providerInfo = getProviderInfo(provider);
  const finalBaseUrl = baseUrl || providerInfo?.defaultBaseUrl;

  // All supported providers use OpenAI-compatible API
  // Use createOpenAI to dynamically create provider with custom config
  const openaiProvider = createOpenAI({
    apiKey,
    baseURL: finalBaseUrl,
  });

  return openaiProvider(model);
}

/**
 * Create a language model with streaming support
 * Returns both the model and configuration for streamText
 */
export function createStreamingModel(config: ModelConfig) {
  const model = createModel(config);
  
  return {
    model,
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens ?? 4096,
  };
}

/**
 * Get provider info by ID
 */
export function getProviderInfo(providerId: AIProvider): ProviderInfo | undefined {
  return PROVIDERS.find(p => p.id === providerId);
}

/**
 * Get all available providers
 */
export function getAvailableProviders(): ProviderInfo[] {
  return PROVIDERS;
}

/**
 * Get default base URL for a provider
 */
export function getProviderBaseUrl(provider: AIProvider, customBaseUrl?: string): string {
  if (customBaseUrl) return customBaseUrl;
  const providerInfo = getProviderInfo(provider);
  return providerInfo?.defaultBaseUrl || 'https://api.openai.com/v1';
}

/**
 * Validate model config
 */
export function validateModelConfig(config: Partial<ModelConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.provider) {
    errors.push('Provider is required');
  }

  if (!config.model) {
    errors.push('Model is required');
  }

  if (!config.apiKey) {
    errors.push('API key is required');
  }

  const providerInfo = config.provider ? getProviderInfo(config.provider) : undefined;
  
  if (providerInfo?.supportsCustomBaseUrl === false && config.baseUrl) {
    errors.push(`${providerInfo.name} does not support custom base URL`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a default config for a provider
 */
export function createDefaultConfig(provider: AIProvider): Partial<ModelConfig> {
  const providerInfo = getProviderInfo(provider);
  
  if (!providerInfo) {
    return { provider };
  }

  return {
    provider,
    model: providerInfo.models[0]?.id || '',
    baseUrl: providerInfo.defaultBaseUrl,
    temperature: 0.7,
    maxTokens: 4096,
  };
}

/**
 * Test model connection
 */
export async function testModelConnection(config: ModelConfig): Promise<{
  success: boolean;
  error?: string;
  latency?: number;
}> {
  const startTime = Date.now();
  
  try {
    const { generateText } = await import('ai');
    const model = createModel(config);
    
    await generateText({
      model,
      prompt: 'Say "OK" in one word.',
      maxOutputTokens: 10,
    });
    
    return {
      success: true,
      latency: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Connection failed',
      latency: Date.now() - startTime,
    };
  }
}
