/**
 * Slidev Plugin Server
 * Vite plugin for adding AI capabilities to Slidev
 */

import type { Plugin, ViteDevServer, Connect } from 'vite';
import { createApiHandler } from './api.js';
import type { AIConfig } from '@slidev-ai/core';

/**
 * Plugin options
 */
export interface SlidevAIPluginOptions {
  /** OpenAI API key (can also use OPENAI_API_KEY env var) */
  apiKey?: string;
  /** OpenAI model to use */
  model?: string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Create Slidev AI plugin for Vite
 */
export function slidevAIPlugin(options: SlidevAIPluginOptions = {}): Plugin {
  const config: Partial<AIConfig> = {
    apiKey: options.apiKey,
    model: options.model,
  };

  const apiHandler = createApiHandler(config);

  return {
    name: 'slidev-ai-plugin',
    
    configureServer(server: ViteDevServer) {
      // Add API middleware
      server.middlewares.use(async (
        req: Connect.IncomingMessage,
        res: import('http').ServerResponse,
        next: Connect.NextFunction
      ) => {
        const handled = await apiHandler(req, res);
        if (!handled) {
          next();
        }
      });

      if (options.debug) {
        console.log('[slidev-ai] Plugin initialized');
        console.log('[slidev-ai] API endpoints:');
        console.log('  POST /api/slidev-ai/edit-slide');
        console.log('  POST /api/slidev-ai/generate-diagram');
        console.log('  POST /api/slidev-ai/generate-image');
        console.log('  POST /api/slidev-ai/check-layout');
        console.log('  GET  /api/slidev-ai/health');
      }
    },
  };
}

export { createApiHandler };
export type { EditSlideRequest, GenerateDiagramRequest, GenerateImageRequest, CheckLayoutRequest, ApiResponse } from './api.js';
