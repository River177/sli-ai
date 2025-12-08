/**
 * Image Generation Module
 * Generate images using AI (OpenAI DALL-E)
 */

import type { AIConfig, ImageOptions, ImageResult } from './types.js';
import { getImagePrompt } from './prompts/systemPrompt.js';

/**
 * Generate an image using OpenAI DALL-E
 */
export async function generateImage(
  options: ImageOptions,
  config: AIConfig
): Promise<ImageResult> {
  try {
    const enhancedPrompt = getImagePrompt(options.prompt);
    
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.imageModel || 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size: options.size || '1024x1024',
        style: options.style || 'vivid',
        quality: options.quality || 'standard',
        response_format: 'url',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json() as { error?: { message?: string } };
      return {
        success: false,
        markdown: '',
        error: errorData.error?.message || `API error: ${response.status}`,
      };
    }

    const data = await response.json() as { data?: Array<{ url?: string }> };
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      return {
        success: false,
        markdown: '',
        error: 'No image URL in response',
      };
    }

    const markdown = formatImageMarkdown(imageUrl, options.prompt);

    return {
      success: true,
      url: imageUrl,
      markdown,
    };
  } catch (error) {
    return {
      success: false,
      markdown: '',
      error: error instanceof Error ? error.message : 'Unknown error generating image',
    };
  }
}

/**
 * Generate image and save to local path
 */
export async function generateAndSaveImage(
  options: ImageOptions,
  config: AIConfig,
  outputPath: string
): Promise<ImageResult> {
  const result = await generateImage(options, config);
  
  if (!result.success || !result.url) {
    return result;
  }

  try {
    // Download the image
    const imageResponse = await fetch(result.url);
    if (!imageResponse.ok) {
      return {
        ...result,
        success: false,
        error: 'Failed to download generated image',
      };
    }

    const buffer = await imageResponse.arrayBuffer();
    
    // Save to file (Node.js environment)
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write file
    await fs.writeFile(outputPath, Buffer.from(buffer));

    // Update markdown to use local path
    const localMarkdown = formatImageMarkdown(outputPath, options.prompt);

    return {
      success: true,
      url: result.url,
      localPath: outputPath,
      markdown: localMarkdown,
    };
  } catch (error) {
    return {
      ...result,
      localPath: undefined,
      error: error instanceof Error ? error.message : 'Failed to save image',
    };
  }
}

/**
 * Format image as markdown
 */
export function formatImageMarkdown(
  src: string,
  alt: string = 'Generated image'
): string {
  // Clean alt text for markdown
  const cleanAlt = alt
    .replace(/[[\]]/g, '')
    .replace(/\n/g, ' ')
    .slice(0, 100);
  
  return `![${cleanAlt}](${src})`;
}

/**
 * Insert image into slide content
 */
export function insertImageIntoSlide(
  slideContent: string,
  image: ImageResult,
  position: 'start' | 'end' | 'after-title' = 'end'
): string {
  if (!image.success || !image.markdown) {
    return slideContent;
  }

  switch (position) {
    case 'start':
      return `${image.markdown}\n\n${slideContent}`;
    case 'end':
      return `${slideContent}\n\n${image.markdown}`;
    case 'after-title': {
      // Find the first header and insert after it
      const lines = slideContent.split('\n');
      const headerIndex = lines.findIndex(line => /^#{1,3}\s/.test(line));
      
      if (headerIndex !== -1) {
        lines.splice(headerIndex + 1, 0, '', image.markdown);
        return lines.join('\n');
      }
      // No header found, insert at start
      return `${image.markdown}\n\n${slideContent}`;
    }
    default:
      return `${slideContent}\n\n${image.markdown}`;
  }
}

/**
 * Create a layout-specific image slide
 */
export function createImageSlide(
  image: ImageResult,
  options: {
    layout?: 'image' | 'image-right' | 'image-left' | 'cover';
    title?: string;
    caption?: string;
  } = {}
): string {
  const { layout = 'image', title, caption } = options;
  const parts: string[] = [];

  // Add frontmatter
  parts.push(`---`);
  parts.push(`layout: ${layout}`);
  if (image.localPath || image.url) {
    parts.push(`image: ${image.localPath || image.url}`);
  }
  parts.push(`---`);

  // Add title if provided
  if (title) {
    parts.push('');
    parts.push(`# ${title}`);
  }

  // For layouts that show content alongside image
  if (layout === 'image-right' || layout === 'image-left') {
    if (caption) {
      parts.push('');
      parts.push(caption);
    }
  }

  return parts.join('\n');
}

/**
 * Extract images from slide content
 */
export function extractImagesFromSlide(slideContent: string): Array<{
  markdown: string;
  alt: string;
  src: string;
}> {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images: Array<{ markdown: string; alt: string; src: string }> = [];
  
  let match;
  while ((match = imageRegex.exec(slideContent)) !== null) {
    images.push({
      markdown: match[0],
      alt: match[1],
      src: match[2],
    });
  }
  
  return images;
}

/**
 * Replace image in slide content
 */
export function replaceImageInSlide(
  slideContent: string,
  oldSrc: string,
  newImage: ImageResult
): string {
  if (!newImage.success || !newImage.markdown) {
    return slideContent;
  }

  // Create pattern to match the old image
  const escapedSrc = oldSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`!\\[[^\\]]*\\]\\(${escapedSrc}\\)`, 'g');
  
  return slideContent.replace(pattern, newImage.markdown);
}

/**
 * Check if slide has images
 */
export function hasImages(slideContent: string): boolean {
  return /!\[[^\]]*\]\([^)]+\)/.test(slideContent);
}

/**
 * Get image count in slide
 */
export function getImageCount(slideContent: string): number {
  const matches = slideContent.match(/!\[[^\]]*\]\([^)]+\)/g);
  return matches ? matches.length : 0;
}

/**
 * Placeholder image for development/testing
 */
export function getPlaceholderImage(
  width: number = 800,
  height: number = 600,
  text: string = 'Placeholder'
): ImageResult {
  const url = `https://via.placeholder.com/${width}x${height}?text=${encodeURIComponent(text)}`;
  
  return {
    success: true,
    url,
    markdown: formatImageMarkdown(url, text),
  };
}

