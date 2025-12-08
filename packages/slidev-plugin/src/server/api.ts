/**
 * Slidev Plugin Server API
 * Provides REST endpoints for AI features
 */

import type { IncomingMessage, ServerResponse } from 'http';
import {
  createOrchestrator,
  parseSlidev,
  stringifySlidev,
  getConfigFromEnv,
  type AIConfig,
  type SlideDeck,
  type EnhanceOptions,
  type DiagramOptions,
  type ImageOptions,
} from '@slidev-ai/core';

/**
 * API request body types
 */
export interface EditSlideRequest {
  markdown: string;
  slideIndex: number;
  instruction: string;
  autoFix?: boolean;
}

export interface GenerateDiagramRequest {
  markdown: string;
  slideIndex: number;
  description: string;
  type?: DiagramOptions['type'];
}

export interface GenerateImageRequest {
  markdown: string;
  slideIndex: number;
  prompt: string;
  size?: ImageOptions['size'];
}

export interface CheckLayoutRequest {
  markdown: string;
  slideIndex?: number;
}

/**
 * API response type
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Create API handler for Slidev plugin
 */
export function createApiHandler(config?: Partial<AIConfig>) {
  // Get config from env or provided config
  let aiConfig: AIConfig;
  
  try {
    aiConfig = config?.apiKey 
      ? { ...getConfigFromEnv(), ...config }
      : getConfigFromEnv();
  } catch {
    // Config will be checked when API is called
    aiConfig = config as AIConfig;
  }

  /**
   * Handle API requests
   */
  return async function handleRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<boolean> {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const path = url.pathname;

    // Only handle /api/slidev-ai/* routes
    if (!path.startsWith('/api/slidev-ai/')) {
      return false;
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return true;
    }

    // Parse request body for POST requests
    let body: unknown = {};
    if (req.method === 'POST') {
      try {
        body = await parseBody(req);
      } catch (error) {
        sendJson(res, 400, { success: false, error: 'Invalid JSON body' });
        return true;
      }
    }

    // Route handling
    const endpoint = path.replace('/api/slidev-ai/', '');

    try {
      switch (endpoint) {
        case 'edit-slide':
          return await handleEditSlide(body as EditSlideRequest, aiConfig, res);
        
        case 'generate-diagram':
          return await handleGenerateDiagram(body as GenerateDiagramRequest, aiConfig, res);
        
        case 'generate-image':
          return await handleGenerateImage(body as GenerateImageRequest, aiConfig, res);
        
        case 'check-layout':
          return await handleCheckLayout(body as CheckLayoutRequest, res);
        
        case 'health':
          sendJson(res, 200, { success: true, data: { status: 'ok', version: '0.1.0' } });
          return true;
        
        default:
          sendJson(res, 404, { success: false, error: 'Endpoint not found' });
          return true;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      sendJson(res, 500, { success: false, error: message });
      return true;
    }
  };
}

/**
 * Handle edit-slide endpoint
 */
async function handleEditSlide(
  body: EditSlideRequest,
  config: AIConfig,
  res: ServerResponse
): Promise<boolean> {
  if (!config?.apiKey) {
    sendJson(res, 401, { success: false, error: 'API key not configured' });
    return true;
  }

  const { markdown, slideIndex, instruction, autoFix } = body;

  if (!markdown || slideIndex === undefined || !instruction) {
    sendJson(res, 400, {
      success: false,
      error: 'Missing required fields: markdown, slideIndex, instruction',
    });
    return true;
  }

  const orchestrator = createOrchestrator(config);
  const deck = parseSlidev(markdown);

  const options: EnhanceOptions = {
    instruction,
    autoFix: autoFix ?? true,
  };

  const result = await orchestrator.editSlideWithFeedback(deck, slideIndex, options);

  if (!result.success) {
    sendJson(res, 500, { success: false, error: result.error });
    return true;
  }

  // Build updated markdown
  const updatedDeck = {
    ...deck,
    slides: deck.slides.map((s, i) =>
      i === slideIndex ? { ...s, content: result.content } : s
    ),
  };
  const updatedMarkdown = stringifySlidev(updatedDeck);

  sendJson(res, 200, {
    success: true,
    data: {
      markdown: updatedMarkdown,
      slideContent: result.content,
      layoutIssues: result.layoutIssues,
      iterations: result.iterations,
    },
  });

  return true;
}

/**
 * Handle generate-diagram endpoint
 */
async function handleGenerateDiagram(
  body: GenerateDiagramRequest,
  config: AIConfig,
  res: ServerResponse
): Promise<boolean> {
  if (!config?.apiKey) {
    sendJson(res, 401, { success: false, error: 'API key not configured' });
    return true;
  }

  const { markdown, slideIndex, description, type } = body;

  if (!markdown || slideIndex === undefined || !description) {
    sendJson(res, 400, {
      success: false,
      error: 'Missing required fields: markdown, slideIndex, description',
    });
    return true;
  }

  const orchestrator = createOrchestrator(config);
  const deck = parseSlidev(markdown);

  const options: DiagramOptions = {
    description,
    type: type || 'flowchart',
  };

  const result = await orchestrator.addDiagramToSlide(deck, slideIndex, options);

  if (!result.success || !result.data) {
    sendJson(res, 500, { success: false, error: result.error });
    return true;
  }

  const updatedMarkdown = stringifySlidev(result.data);

  sendJson(res, 200, {
    success: true,
    data: {
      markdown: updatedMarkdown,
      slideContent: result.data.slides[slideIndex].content,
    },
  });

  return true;
}

/**
 * Handle generate-image endpoint
 */
async function handleGenerateImage(
  body: GenerateImageRequest,
  config: AIConfig,
  res: ServerResponse
): Promise<boolean> {
  if (!config?.apiKey) {
    sendJson(res, 401, { success: false, error: 'API key not configured' });
    return true;
  }

  const { markdown, slideIndex, prompt, size } = body;

  if (!markdown || slideIndex === undefined || !prompt) {
    sendJson(res, 400, {
      success: false,
      error: 'Missing required fields: markdown, slideIndex, prompt',
    });
    return true;
  }

  const orchestrator = createOrchestrator(config);
  const deck = parseSlidev(markdown);

  const options: ImageOptions = {
    prompt,
    size: size || '1024x1024',
  };

  const result = await orchestrator.addImageToSlide(deck, slideIndex, options);

  if (!result.success || !result.data) {
    sendJson(res, 500, { success: false, error: result.error });
    return true;
  }

  const updatedMarkdown = stringifySlidev(result.data);

  sendJson(res, 200, {
    success: true,
    data: {
      markdown: updatedMarkdown,
      slideContent: result.data.slides[slideIndex].content,
    },
  });

  return true;
}

/**
 * Handle check-layout endpoint
 */
async function handleCheckLayout(
  body: CheckLayoutRequest,
  res: ServerResponse
): Promise<boolean> {
  const { markdown, slideIndex } = body;

  if (!markdown) {
    sendJson(res, 400, {
      success: false,
      error: 'Missing required field: markdown',
    });
    return true;
  }

  const { checkSlideLayout, checkDeckLayout, calculateLayoutScore } = await import('@slidev-ai/core');
  const deck = parseSlidev(markdown);

  let issues;
  if (slideIndex !== undefined) {
    const slide = deck.slides[slideIndex];
    if (!slide) {
      sendJson(res, 400, { success: false, error: `Slide ${slideIndex} not found` });
      return true;
    }
    issues = checkSlideLayout(slide);
  } else {
    issues = checkDeckLayout(deck.slides);
  }

  const score = calculateLayoutScore(issues);

  sendJson(res, 200, {
    success: true,
    data: {
      issues,
      score,
      slideCount: deck.slides.length,
    },
  });

  return true;
}

/**
 * Parse request body as JSON
 */
async function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send JSON response
 */
function sendJson(res: ServerResponse, status: number, data: ApiResponse): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

