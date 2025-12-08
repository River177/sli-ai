/**
 * Slidev-AI API Server
 * Uses @slidev-ai/core with Vercel AI SDK streaming support
 * 
 * @see https://ai-sdk.dev/docs/ai-sdk-core/generating-text
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { config } from 'dotenv';

config();

const PORT = process.env.PORT || 3000;

// Types
interface ModelConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

// Parse JSON body
async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

// Send JSON response
function sendJson(res: ServerResponse, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(data));
}

// Setup SSE headers for streaming
function setupSSE(res: ServerResponse) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Send SSE message
function sendSSE(res: ServerResponse, event: string, data: any) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// Generate sample markdown (fallback when no API key)
function generateSampleMarkdown(topic: string, slideCount: number): string {
  const slides = [
    `---
theme: default
title: ${topic}
highlighter: shiki
transition: slide-left
---

# ${topic}

AI 智能生成的演示文稿`,
    `## 概述

本演示文稿将介绍 ${topic} 的核心概念和实践应用。

- 背景介绍
- 核心概念
- 实际应用
- 最佳实践`,
    `## 为什么重要？

### 行业趋势
当前技术发展迅速

### 实际价值
提高效率，降低成本

### 学习路径
循序渐进，稳步提升`,
    `## 核心概念

\`\`\`mermaid
flowchart TD
    A[概念] --> B[理解]
    B --> C[实践]
    C --> D[精通]
\`\`\``,
    `## 实际应用

1. **场景一**: 具体描述
2. **场景二**: 具体描述
3. **场景三**: 具体描述`,
    `## 代码示例

\`\`\`typescript
// 示例代码
function example() {
  console.log('Hello, World!');
}
\`\`\``,
    `## 最佳实践

- ✅ 推荐做法
- ✅ 推荐做法
- ❌ 避免做法
- ❌ 避免做法`,
    `## 总结

### 关键要点
- 要点一
- 要点二
- 要点三

### 下一步
继续深入学习和实践`,
    `# 谢谢！

## 问答时间

有任何问题欢迎提问 🙋‍♂️`
  ];

  return slides.slice(0, slideCount).join('\n\n---\n\n');
}

// Main server
async function main() {
  // Dynamically import core library
  const core = await import('@slidev-ai/core');
  
  console.log('✅ @slidev-ai/core loaded successfully');

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '', `http://localhost:${PORT}`);
    const path = url.pathname;

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.statusCode = 204;
      res.end();
      return;
    }

    // Health check
    if (path === '/api/health') {
      sendJson(res, 200, { success: true, data: { status: 'ok' } });
      return;
    }

    // API routes
    if (path.startsWith('/api/slidev-ai/')) {
      const endpoint = path.replace('/api/slidev-ai/', '');
      const body = req.method === 'POST' ? await parseBody(req) : {};

      try {
        switch (endpoint) {
          // Get available providers
          case 'providers': {
            const providers = core.getAvailableProviders();
            sendJson(res, 200, { success: true, data: providers });
            break;
          }

          // Test model connection
          case 'test-model': {
            const modelConfig = body as ModelConfig;
            
            if (!modelConfig.apiKey) {
              sendJson(res, 400, { success: false, error: 'API key is required' });
              break;
            }
            
            console.log(`🔌 Testing connection to ${modelConfig.provider} (${modelConfig.model})...`);
            
            const result = await core.testModelConnection(modelConfig as any);
            
            if (result.success) {
              console.log(`✅ Connection successful (${result.latency}ms)`);
            } else {
              console.log(`❌ Connection failed: ${result.error}`);
            }
            
            sendJson(res, result.success ? 200 : 400, result);
            break;
          }

          // Generate presentation (supports streaming)
          case 'generate':
          case 'generate-stream': {
            const { 
              topic, 
              slideCount = 8, 
              language = 'zh', 
              style = 'professional', 
              modelConfig: clientModelConfig,
              stream = endpoint === 'generate-stream'
            } = body;
            
            if (!clientModelConfig?.apiKey) {
              // Return sample if no API key
              const markdown = generateSampleMarkdown(topic, slideCount);
              sendJson(res, 200, { success: true, data: { markdown } });
              break;
            }

            console.log(`📝 Generating: "${topic}" with ${clientModelConfig.provider}/${clientModelConfig.model}`);
            
            const generateOptions: core.GenerateOptions = {
              topic,
              slideCount,
              language,
              style,
            };

            if (stream) {
              // Streaming response using SSE
              setupSSE(res);
              
              try {
                const generator = core.generatePresentationStream(generateOptions, clientModelConfig);
                let fullText = '';
                
                for await (const chunk of generator) {
                  fullText += chunk;
                  sendSSE(res, 'chunk', { content: chunk });
                }
                
                const cleanedMarkdown = core.cleanMarkdownOutput(fullText);
                sendSSE(res, 'done', { markdown: cleanedMarkdown });
                console.log('✅ Generation complete (streaming)');
                res.end();
              } catch (error: any) {
                sendSSE(res, 'error', { message: error.message });
                console.error('❌ Generation error:', error.message);
                res.end();
              }
            } else {
              // Non-streaming response
              try {
                const markdown = await core.generatePresentation(generateOptions, clientModelConfig);
                console.log('✅ Generation complete');
                sendJson(res, 200, { success: true, data: { markdown } });
              } catch (error: any) {
                console.error('❌ Generation error:', error.message);
                sendJson(res, 500, { success: false, error: error.message });
              }
            }
            break;
          }

          // Edit slide (supports streaming)
          case 'edit-slide':
          case 'edit-slide-stream': {
            const { 
              markdown, 
              slideIndex, 
              instruction, 
              modelConfig: clientModelConfig,
              stream = endpoint === 'edit-slide-stream'
            } = body;
            
            if (!clientModelConfig?.apiKey) {
              sendJson(res, 200, { success: true, data: { markdown, layoutIssues: [] } });
              break;
            }

            console.log(`✏️ Editing slide ${slideIndex}: "${instruction}"`);
            
            const deck = core.parseSlidev(markdown);
            const currentSlide = deck.slides[slideIndex];
            
            if (!currentSlide) {
              sendJson(res, 400, { success: false, error: `Slide ${slideIndex} not found` });
              break;
            }

            const layoutIssues = core.checkSlideLayout(currentSlide);

            if (stream) {
              // Streaming response
              setupSSE(res);
              
              try {
                const generator = core.editSlideStream(
                  currentSlide.content,
                  { instruction },
                  clientModelConfig,
                  layoutIssues
                );
                
                let fullText = '';
                for await (const chunk of generator) {
                  fullText += chunk;
                  sendSSE(res, 'chunk', { content: chunk });
                }
                
                const newContent = core.cleanMarkdownOutput(fullText);
                deck.slides[slideIndex] = { ...currentSlide, content: newContent };
                const updatedMarkdown = core.stringifySlidev(deck);
                const newIssues = core.checkSlideLayout(deck.slides[slideIndex]);
                
                sendSSE(res, 'done', { markdown: updatedMarkdown, layoutIssues: newIssues });
                console.log('✅ Edit complete (streaming)');
                res.end();
              } catch (error: any) {
                sendSSE(res, 'error', { message: error.message });
                console.error('❌ Edit error:', error.message);
                res.end();
              }
            } else {
              // Non-streaming response
              try {
                const newContent = await core.editSlide(
                  currentSlide.content,
                  { instruction },
                  clientModelConfig,
                  layoutIssues
                );
                
                deck.slides[slideIndex] = { ...currentSlide, content: newContent };
                const updatedMarkdown = core.stringifySlidev(deck);
                const newIssues = core.checkSlideLayout(deck.slides[slideIndex]);
                
                console.log('✅ Edit complete');
                sendJson(res, 200, { 
                  success: true, 
                  data: { markdown: updatedMarkdown, layoutIssues: newIssues } 
                });
              } catch (error: any) {
                console.error('❌ Edit error:', error.message);
                sendJson(res, 500, { success: false, error: error.message });
              }
            }
            break;
          }

          // Generate diagram
          case 'generate-diagram': {
            const { 
              markdown, 
              slideIndex, 
              description, 
              type = 'flowchart', 
              modelConfig: clientModelConfig 
            } = body;

            if (!clientModelConfig?.apiKey) {
              // Return sample diagram
              const sampleDiagram = `\`\`\`mermaid
flowchart TD
    A[开始] --> B{${description}}
    B -->|是| C[继续]
    B -->|否| D[结束]
\`\`\``;
              const deck = core.parseSlidev(markdown);
              const slide = deck.slides[slideIndex];
              if (slide) {
                deck.slides[slideIndex] = { ...slide, content: slide.content + '\n\n' + sampleDiagram };
                const updatedMarkdown = core.stringifySlidev(deck);
                sendJson(res, 200, { success: true, data: { markdown: updatedMarkdown } });
              } else {
                sendJson(res, 200, { success: true, data: { markdown: markdown + '\n\n' + sampleDiagram } });
              }
              break;
            }

            console.log(`📊 Generating ${type} diagram: "${description}"`);

            try {
              const result = await core.generateDiagram(
                { description, type: type as any },
                clientModelConfig
              );
              
              if (result.success) {
                const deck = core.parseSlidev(markdown);
                const slide = deck.slides[slideIndex];
                if (slide) {
                  deck.slides[slideIndex] = { ...slide, content: slide.content + '\n\n' + result.markdown };
                  const updatedMarkdown = core.stringifySlidev(deck);
                  console.log('✅ Diagram generated');
                  sendJson(res, 200, { success: true, data: { markdown: updatedMarkdown } });
                } else {
                  sendJson(res, 200, { success: true, data: { markdown: markdown + '\n\n' + result.markdown } });
                }
              } else {
                sendJson(res, 500, { success: false, error: result.error });
              }
            } catch (error: any) {
              console.error('❌ Diagram error:', error.message);
              sendJson(res, 500, { success: false, error: error.message });
            }
            break;
          }

          // Check layout
          case 'check-layout': {
            const { markdown, slideIndex } = body;
            
            const deck = core.parseSlidev(markdown);
            const issues = slideIndex !== undefined 
              ? core.checkSlideLayout(deck.slides[slideIndex])
              : core.checkDeckLayout(deck.slides);
            const score = core.calculateLayoutScore(issues);
            
            sendJson(res, 200, { success: true, data: { issues, score } });
            break;
          }

          // Suggest improvements
          case 'suggest-improvements': {
            const { markdown, slideIndex, modelConfig: clientModelConfig } = body;
            
            if (!clientModelConfig?.apiKey) {
              sendJson(res, 200, { success: true, data: { suggestions: [] } });
              break;
            }

            const deck = core.parseSlidev(markdown);
            const slide = deck.slides[slideIndex];
            
            if (!slide) {
              sendJson(res, 400, { success: false, error: `Slide ${slideIndex} not found` });
              break;
            }

            try {
              const suggestions = await core.suggestImprovements(slide.content, clientModelConfig);
              sendJson(res, 200, { success: true, data: { suggestions } });
            } catch (error: any) {
              sendJson(res, 500, { success: false, error: error.message });
            }
            break;
          }

          default:
            sendJson(res, 404, { success: false, error: 'Not found' });
        }
      } catch (error: any) {
        console.error('❌ API Error:', error);
        sendJson(res, 500, { success: false, error: error.message });
      }
      return;
    }

    // Not found
    sendJson(res, 404, { success: false, error: 'Not found' });
  });

  server.listen(PORT, () => {
    console.log(`
🚀 Slidev-AI API Server
━━━━━━━━━━━━━━━━━━━━━━
📡 URL: http://localhost:${PORT}
📦 Using: @slidev-ai/core with Vercel AI SDK

API Endpoints:
  GET  /api/slidev-ai/providers         - List available AI providers
  POST /api/slidev-ai/test-model        - Test model connection
  POST /api/slidev-ai/generate          - Generate presentation
  POST /api/slidev-ai/generate-stream   - Generate with SSE streaming
  POST /api/slidev-ai/edit-slide        - Edit a slide
  POST /api/slidev-ai/edit-slide-stream - Edit with SSE streaming
  POST /api/slidev-ai/generate-diagram  - Generate Mermaid diagram
  POST /api/slidev-ai/check-layout      - Check layout issues
  POST /api/slidev-ai/suggest-improvements - Get AI suggestions

Press Ctrl+C to stop
`);
  });
}

main().catch(console.error);
