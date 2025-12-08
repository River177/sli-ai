/**
 * Slidev AI Plugin - Client Module
 * API client for Slidev AI integration
 */

/**
 * Response types
 */
export interface EditSlideResponse {
  markdown: string;
  slideContent: string;
  layoutIssues: LayoutIssue[];
  iterations: number;
}

export interface DiagramResponse {
  markdown: string;
  slideContent: string;
}

export interface ImageResponse {
  markdown: string;
  slideContent: string;
}

export interface LayoutCheckResponse {
  issues: LayoutIssue[];
  score: number;
  slideCount: number;
}

export interface LayoutIssue {
  type: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  slideIndex: number;
  suggestion?: string;
  meta?: Record<string, unknown>;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * API client for communicating with the Slidev AI server
 */
export class SlidevAIClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Edit a slide with AI
   */
  async editSlide(
    markdown: string,
    slideIndex: number,
    instruction: string,
    autoFix: boolean = true
  ): Promise<EditSlideResponse> {
    return this.post<EditSlideResponse>('/api/slidev-ai/edit-slide', {
      markdown,
      slideIndex,
      instruction,
      autoFix,
    });
  }

  /**
   * Generate a diagram
   */
  async generateDiagram(
    markdown: string,
    slideIndex: number,
    description: string,
    type: string = 'flowchart'
  ): Promise<DiagramResponse> {
    return this.post<DiagramResponse>('/api/slidev-ai/generate-diagram', {
      markdown,
      slideIndex,
      description,
      type,
    });
  }

  /**
   * Generate an image
   */
  async generateImage(
    markdown: string,
    slideIndex: number,
    prompt: string
  ): Promise<ImageResponse> {
    return this.post<ImageResponse>('/api/slidev-ai/generate-image', {
      markdown,
      slideIndex,
      prompt,
    });
  }

  /**
   * Check layout issues
   */
  async checkLayout(
    markdown: string,
    slideIndex?: number
  ): Promise<LayoutCheckResponse> {
    return this.post<LayoutCheckResponse>('/api/slidev-ai/check-layout', {
      markdown,
      slideIndex,
    });
  }

  /**
   * Check server health
   */
  async health(): Promise<{ status: string; version: string }> {
    const response = await fetch(`${this.baseUrl}/api/slidev-ai/health`);
    const data = await response.json() as ApiResponse<{ status: string; version: string }>;
    if (!data.data) {
      throw new Error('Invalid health response');
    }
    return data.data;
  }

  /**
   * Make POST request
   */
  private async post<T>(endpoint: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json() as ApiResponse<unknown>;
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json() as ApiResponse<T>;
    if (!data.success || !data.data) {
      throw new Error(data.error || 'Unknown error');
    }

    return data.data;
  }
}

/**
 * Create a client instance
 */
export function createClient(baseUrl: string = ''): SlidevAIClient {
  return new SlidevAIClient(baseUrl);
}

/**
 * Vue composable for Slidev AI
 */
export function useSlidevAI(baseUrl: string = '') {
  const client = createClient(baseUrl);

  return {
    client,
    editSlide: client.editSlide.bind(client),
    generateDiagram: client.generateDiagram.bind(client),
    generateImage: client.generateImage.bind(client),
    checkLayout: client.checkLayout.bind(client),
    health: client.health.bind(client),
  };
}
