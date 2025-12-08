/**
 * @slidev-ai/slidev-plugin
 * Slidev plugin for AI-powered slide editing
 */

// Server exports
export { slidevAIPlugin, createApiHandler } from './server/index.js';
export type {
  SlidevAIPluginOptions,
  EditSlideRequest,
  GenerateDiagramRequest,
  GenerateImageRequest,
  CheckLayoutRequest,
  ApiResponse,
} from './server/index.js';

// Default export for easy plugin usage
export { slidevAIPlugin as default } from './server/index.js';

