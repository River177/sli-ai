import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { streamSSE } from 'hono/streaming'
import { spawn, type ChildProcess } from 'node:child_process'
import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import * as core from '@slidev-ai/core'

config()

const PORT = Number(process.env.PORT || 3000)
const SLIDEV_PORT = Number(process.env.SLIDEV_PORT || 3030)
const __dirname = dirname(fileURLToPath(import.meta.url))
const SLIDES_DIR = join(__dirname, '../.slidev-preview')
const SLIDES_FILE = join(SLIDES_DIR, 'slides.md')

// Slidev process management
let slidevProcess: ChildProcess | null = null
let slidevReady = false

// Types
interface ModelConfig {
  provider: string
  model: string
  apiKey: string
  baseUrl?: string
  temperature?: number
  maxTokens?: number
}

// Helper functions
async function saveSlides(markdown: string): Promise<void> {
  if (!existsSync(SLIDES_DIR)) {
    await mkdir(SLIDES_DIR, { recursive: true })
  }
  await writeFile(SLIDES_FILE, markdown, 'utf-8')
}

async function startSlidev(): Promise<{ url: string; started: boolean }> {
  const slidevUrl = `http://localhost:${SLIDEV_PORT}`
  
  if (slidevProcess && slidevReady) {
    return { url: slidevUrl, started: false }
  }
  
  if (slidevProcess) {
    slidevProcess.kill()
    slidevProcess = null
    slidevReady = false
  }
  
  return new Promise((resolve, reject) => {
    console.log('🎬 Starting Slidev dev server...')
    
    slidevProcess = spawn('npx', [
      'slidev',
      SLIDES_FILE,
      '--port', String(SLIDEV_PORT),
      '--open', 'false',
      '--remote',
    ], {
      cwd: __dirname,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    
    let output = ''
    const timeout = setTimeout(() => {
      if (!slidevReady) {
        slidevReady = true
        console.log('✅ Slidev server assumed ready')
        resolve({ url: slidevUrl, started: true })
      }
    }, 10000)
    
    slidevProcess.stdout?.on('data', (data) => {
      output += data.toString()
      console.log('[Slidev]', data.toString().trim())
      
      if (output.includes('http://localhost:') || output.includes('slidev started')) {
        clearTimeout(timeout)
        slidevReady = true
        console.log('✅ Slidev server ready')
        resolve({ url: slidevUrl, started: true })
      }
    })
    
    slidevProcess.stderr?.on('data', (data) => {
      console.error('[Slidev Error]', data.toString().trim())
    })
    
    slidevProcess.on('error', (err) => {
      clearTimeout(timeout)
      console.error('❌ Failed to start Slidev:', err)
      slidevProcess = null
      slidevReady = false
      reject(err)
    })
    
    slidevProcess.on('exit', (code) => {
      clearTimeout(timeout)
      console.log(`Slidev exited with code ${code}`)
      slidevProcess = null
      slidevReady = false
    })
  })
}

function stopSlidev() {
  if (slidevProcess) {
    slidevProcess.kill()
    slidevProcess = null
    slidevReady = false
    console.log('🛑 Slidev server stopped')
  }
}

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
  ]

  return slides.slice(0, slideCount).join('\n\n---\n\n')
}

// Process cleanup
process.on('exit', stopSlidev)
process.on('SIGINT', () => {
  stopSlidev()
  process.exit()
})
process.on('SIGTERM', () => {
  stopSlidev()
  process.exit()
})

// App setup
const app = new Hono()

// Middleware
app.use('/*', cors())

// Routes
app.get('/', (c) => c.text('Slidev AI Backend is running'))

app.get('/api/health', (c) => {
  return c.json({ success: true, data: { status: 'ok' } })
})

app.get('/api/slidev-ai/providers', (c) => {
  const providers = core.getAvailableProviders()
  return c.json({ success: true, data: providers })
})

app.post('/api/slidev-ai/test-model', async (c) => {
  const body = await c.req.json()
  const modelConfig = body as ModelConfig
  
  if (!modelConfig.apiKey) {
    return c.json({ success: false, error: 'API key is required' }, 400)
  }
  
  console.log(`🔌 Testing connection to ${modelConfig.provider} (${modelConfig.model})...`)
  
  const result = await core.testModelConnection(modelConfig as any)
  
  if (result.success) {
    console.log(`✅ Connection successful (${result.latency}ms)`)
  } else {
    console.log(`❌ Connection failed: ${result.error}`)
  }
  
  return c.json(result, result.success ? 200 : 400)
})

app.post('/api/slidev-ai/generate', async (c) => {
  const body = await c.req.json()
  const { 
    topic, 
    slideCount = 8, 
    language = 'zh', 
    style = 'professional', 
    modelConfig: clientModelConfig,
    stream
  } = body
  
  if (!clientModelConfig?.apiKey) {
    const markdown = generateSampleMarkdown(topic, slideCount)
    return c.json({ success: true, data: { markdown } })
  }

  console.log(`📝 Generating: "${topic}" with ${clientModelConfig.provider}/${clientModelConfig.model}`)
  
  const generateOptions: core.GenerateOptions = {
    topic,
    slideCount,
    language,
    style,
  }

  if (stream) {
    return streamSSE(c, async (stream) => {
      try {
        const generator = core.generatePresentationStream(generateOptions, clientModelConfig)
        let fullText = ''
        
        for await (const chunk of generator) {
          fullText += chunk
          await stream.writeSSE({ event: 'chunk', data: JSON.stringify({ content: chunk }) })
        }
        
        const cleanedMarkdown = core.cleanMarkdownOutput(fullText)
        await stream.writeSSE({ event: 'done', data: JSON.stringify({ markdown: cleanedMarkdown }) })
        console.log('✅ Generation complete (streaming)')
      } catch (error: any) {
        await stream.writeSSE({ event: 'error', data: JSON.stringify({ message: error.message }) })
        console.error('❌ Generation error:', error.message)
      }
    })
  } else {
    try {
      const markdown = await core.generatePresentation(generateOptions, clientModelConfig)
      console.log('✅ Generation complete')
      return c.json({ success: true, data: { markdown } })
    } catch (error: any) {
      console.error('❌ Generation error:', error.message)
      return c.json({ success: false, error: error.message }, 500)
    }
  }
})

app.post('/api/slidev-ai/edit-slide', async (c) => {
  const body = await c.req.json()
  const { 
    markdown, 
    slideIndex, 
    instruction, 
    modelConfig: clientModelConfig,
    stream
  } = body
  
  if (!clientModelConfig?.apiKey) {
    return c.json({ success: true, data: { markdown, layoutIssues: [] } })
  }

  console.log(`✏️ Editing slide ${slideIndex}: "${instruction}"`)
  
  const deck = core.parseSlidev(markdown)
  const currentSlide = deck.slides[slideIndex]
  
  if (!currentSlide) {
    return c.json({ success: false, error: `Slide ${slideIndex} not found` }, 400)
  }

  const layoutIssues = core.checkSlideLayout(currentSlide)

  if (stream) {
    return streamSSE(c, async (stream) => {
      try {
        const generator = core.editSlideStream(
          currentSlide.content,
          { instruction },
          clientModelConfig,
          layoutIssues
        )
        
        let fullText = ''
        for await (const chunk of generator) {
          fullText += chunk
          await stream.writeSSE({ event: 'chunk', data: JSON.stringify({ content: chunk }) })
        }
        
        const newContent = core.cleanMarkdownOutput(fullText)
        deck.slides[slideIndex] = { ...currentSlide, content: newContent }
        const updatedMarkdown = core.stringifySlidev(deck)
        const newIssues = core.checkSlideLayout(deck.slides[slideIndex])
        
        await stream.writeSSE({ 
          event: 'done', 
          data: JSON.stringify({ markdown: updatedMarkdown, layoutIssues: newIssues }) 
        })
        console.log('✅ Edit complete (streaming)')
      } catch (error: any) {
        await stream.writeSSE({ event: 'error', data: JSON.stringify({ message: error.message }) })
        console.error('❌ Edit error:', error.message)
      }
    })
  } else {
    try {
      const newContent = await core.editSlide(
        currentSlide.content,
        { instruction },
        clientModelConfig,
        layoutIssues
      )
      
      deck.slides[slideIndex] = { ...currentSlide, content: newContent }
      const updatedMarkdown = core.stringifySlidev(deck)
      const newIssues = core.checkSlideLayout(deck.slides[slideIndex])
      
      console.log('✅ Edit complete')
      return c.json({ 
        success: true, 
        data: { markdown: updatedMarkdown, layoutIssues: newIssues } 
      })
    } catch (error: any) {
      console.error('❌ Edit error:', error.message)
      return c.json({ success: false, error: error.message }, 500)
    }
  }
})

app.post('/api/slidev-ai/generate-diagram', async (c) => {
  const body = await c.req.json()
  const { 
    markdown, 
    slideIndex, 
    description, 
    type = 'flowchart', 
    modelConfig: clientModelConfig 
  } = body

  if (!clientModelConfig?.apiKey) {
    const sampleDiagram = `\`\`\`mermaid
flowchart TD
    A[开始] --> B{${description}}
    B -->|是| C[继续]
    B -->|否| D[结束]
\`\`\``
    const deck = core.parseSlidev(markdown)
    const slide = deck.slides[slideIndex]
    if (slide) {
      deck.slides[slideIndex] = { ...slide, content: `${slide.content}\n\n${sampleDiagram}` }
      const updatedMarkdown = core.stringifySlidev(deck)
      return c.json({ success: true, data: { markdown: updatedMarkdown } })
    } else {
      return c.json({ success: true, data: { markdown: `${markdown}\n\n${sampleDiagram}` } })
    }
  }

  console.log(`📊 Generating ${type} diagram: "${description}"`)

  try {
    const result = await core.generateDiagram(
      { description, type: type as any },
      clientModelConfig
    )
    
    if (result.success) {
      const deck = core.parseSlidev(markdown)
      const slide = deck.slides[slideIndex]
      if (slide) {
        deck.slides[slideIndex] = { ...slide, content: `${slide.content}\n\n${result.markdown}` }
        const updatedMarkdown = core.stringifySlidev(deck)
        console.log('✅ Diagram generated')
        return c.json({ success: true, data: { markdown: updatedMarkdown } })
      } else {
        return c.json({ success: true, data: { markdown: `${markdown}\n\n${result.markdown}` } })
      }
    } else {
      return c.json({ success: false, error: result.error }, 500)
    }
  } catch (error: any) {
    console.error('❌ Diagram error:', error.message)
    return c.json({ success: false, error: error.message }, 500)
  }
})

app.post('/api/slidev-ai/check-layout', async (c) => {
  const body = await c.req.json()
  const { markdown, slideIndex } = body
  
  const deck = core.parseSlidev(markdown)
  const issues = slideIndex !== undefined 
    ? core.checkSlideLayout(deck.slides[slideIndex])
    : core.checkDeckLayout(deck.slides)
  const score = core.calculateLayoutScore(issues)
  
  return c.json({ success: true, data: { issues, score } })
})

app.post('/api/slidev-ai/suggest-improvements', async (c) => {
  const body = await c.req.json()
  const { markdown, slideIndex, modelConfig: clientModelConfig } = body
  
  if (!clientModelConfig?.apiKey) {
    return c.json({ success: true, data: { suggestions: [] } })
  }

  const deck = core.parseSlidev(markdown)
  const slide = deck.slides[slideIndex]
  
  if (!slide) {
    return c.json({ success: false, error: `Slide ${slideIndex} not found` }, 400)
  }

  try {
    const suggestions = await core.suggestImprovements(slide.content, clientModelConfig)
    return c.json({ success: true, data: { suggestions } })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

app.post('/api/slidev-ai/preview', async (c) => {
  const body = await c.req.json()
  const { markdown } = body
  
  if (!markdown) {
    return c.json({ success: false, error: 'Markdown content is required' }, 400)
  }

  try {
    await saveSlides(markdown)
    console.log('📄 Slides saved to:', SLIDES_FILE)
    
    const { url, started } = await startSlidev()
    
    return c.json({ 
      success: true, 
      data: { 
        url,
        port: SLIDEV_PORT,
        started,
        message: started ? 'Slidev server started' : 'Using existing Slidev server'
      } 
    })
  } catch (error: any) {
    console.error('❌ Preview error:', error.message)
    return c.json({ success: false, error: error.message }, 500)
  }
})

app.post('/api/slidev-ai/update-slides', async (c) => {
  const body = await c.req.json()
  const { markdown } = body
  
  if (!markdown) {
    return c.json({ success: false, error: 'Markdown content is required' }, 400)
  }

  try {
    await saveSlides(markdown)
    console.log('🔄 Slides updated')
    return c.json({ success: true, data: { updated: true } })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

app.post('/api/slidev-ai/stop-preview', (c) => {
  stopSlidev()
  return c.json({ success: true, data: { stopped: true } })
})

app.get('/api/slidev-ai/preview-status', (c) => {
  return c.json({ 
    success: true, 
    data: { 
      running: slidevReady,
      url: slidevReady ? `http://localhost:${SLIDEV_PORT}` : null,
      port: SLIDEV_PORT
    } 
  })
})

// Start server
serve({
  fetch: app.fetch,
  port: PORT
}, (info) => {
  console.log(`
🚀 Slidev-AI API Server (Hono)
━━━━━━━━━━━━━━━━━━━━━━
📡 API Server: http://localhost:${info.port}
🎬 Slidev Preview: http://localhost:${SLIDEV_PORT} (on demand)
📦 Using: @slidev-ai/core with Vercel AI SDK

API Endpoints:
  GET  /api/slidev-ai/providers          - List available AI providers
  POST /api/slidev-ai/test-model         - Test model connection
  POST /api/slidev-ai/generate           - Generate presentation
  POST /api/slidev-ai/edit-slide         - Edit a slide
  POST /api/slidev-ai/generate-diagram   - Generate Mermaid diagram
  POST /api/slidev-ai/check-layout       - Check layout issues
  POST /api/slidev-ai/preview            - Start Slidev preview server
  POST /api/slidev-ai/update-slides      - Update slides (hot reload)
  POST /api/slidev-ai/stop-preview       - Stop preview server
  GET  /api/slidev-ai/preview-status     - Check preview server status
`)
})
