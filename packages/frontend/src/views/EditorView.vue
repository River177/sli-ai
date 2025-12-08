<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import ModelSettings from '../components/ModelSettings.vue';

const route = useRoute();

// Model config type
interface ModelConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
}

// State
const markdown = ref('');
const topic = ref('');
const isGenerating = ref(false);
const currentSlide = ref(0);
const layoutIssues = ref<any[]>([]);
const activeTab = ref<'generate' | 'edit' | 'diagram' | 'settings'>('generate');

// Slidev preview state
const previewUrl = ref('');
const isPreviewRunning = ref(false);
const isStartingPreview = ref(false);

// Model config
const modelConfig = ref<ModelConfig>({
  provider: 'openai',
  model: 'gpt-4-turbo-preview',
  apiKey: '',
  baseUrl: '',
  temperature: 0.7,
  maxTokens: 4096,
});

// AI options
const slideCount = ref(8);
const language = ref('zh');
const style = ref('professional');

// Load saved model config
function loadModelConfig() {
  const saved = localStorage.getItem('slidev-ai-model-config');
  if (saved) {
    try {
      modelConfig.value = JSON.parse(saved);
    } catch {
      console.error('Failed to load model config');
    }
  }
}

// Check if model is configured
const isModelConfigured = computed(() => {
  return !!modelConfig.value.apiKey;
});

// Edit options
const editInstruction = ref('');

// Diagram options
const diagramType = ref('flowchart');
const diagramDescription = ref('');

// Computed
const slides = computed(() => {
  if (!markdown.value) return [];
  const content = markdown.value.replace(/^---[\s\S]*?---\n/, '');
  return content.split(/\n---\n/).map(s => s.trim()).filter(Boolean);
});

const currentSlideContent = computed(() => {
  return slides.value[currentSlide.value] || '';
});

const issuesForCurrentSlide = computed(() => {
  return layoutIssues.value.filter(i => i.slideIndex === currentSlide.value);
});

// Streaming state
const streamingText = ref('');

// Methods
async function generatePresentation() {
  if (!topic.value.trim()) return;
  
  if (!isModelConfigured.value) {
    activeTab.value = 'settings';
    return;
  }
  
  isGenerating.value = true;
  streamingText.value = '';
  markdown.value = '';
  
  try {
    const response = await fetch('/api/slidev-ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: topic.value,
        slideCount: slideCount.value,
        language: language.value,
        style: style.value,
        modelConfig: modelConfig.value,
        stream: true, // Enable streaming
      }),
    });
    
    // Handle SSE streaming response
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = decoder.decode(value);
          const lines = text.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.content) {
                  streamingText.value += data.content;
                  markdown.value = streamingText.value;
                }
                
                if (data.markdown) {
                  markdown.value = data.markdown;
                  currentSlide.value = 0;
                  await checkLayout();
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } else {
      // Non-streaming fallback
      const data = await response.json();
      if (data.success) {
        markdown.value = data.data.markdown;
        currentSlide.value = 0;
        await checkLayout();
      }
    }
  } catch (error) {
    console.error('Generation failed:', error);
    // Demo mode: generate sample content
    markdown.value = generateSampleContent(topic.value);
  } finally {
    isGenerating.value = false;
    streamingText.value = '';
  }
}

async function editSlide() {
  if (!editInstruction.value.trim()) return;
  
  if (!isModelConfigured.value) {
    activeTab.value = 'settings';
    return;
  }
  
  isGenerating.value = true;
  
  try {
    const response = await fetch('/api/slidev-ai/edit-slide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        markdown: markdown.value,
        slideIndex: currentSlide.value,
        instruction: editInstruction.value,
        modelConfig: modelConfig.value,
        stream: true,
      }),
    });
    
    // Handle SSE streaming response
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = decoder.decode(value);
          const lines = text.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.markdown) {
                  markdown.value = data.markdown;
                  layoutIssues.value = data.layoutIssues || [];
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } else {
      // Non-streaming fallback
      const data = await response.json();
      if (data.success) {
        markdown.value = data.data.markdown;
        layoutIssues.value = data.data.layoutIssues || [];
      }
    }
  } catch (error) {
    console.error('Edit failed:', error);
  } finally {
    isGenerating.value = false;
    editInstruction.value = '';
  }
}

async function generateDiagram() {
  if (!diagramDescription.value.trim()) return;
  
  if (!isModelConfigured.value) {
    activeTab.value = 'settings';
    return;
  }
  
  isGenerating.value = true;
  
  try {
    const response = await fetch('/api/slidev-ai/generate-diagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        markdown: markdown.value,
        slideIndex: currentSlide.value,
        description: diagramDescription.value,
        type: diagramType.value,
        modelConfig: modelConfig.value,
      }),
    });
    
    const data = await response.json();
    if (data.success) {
      markdown.value = data.data.markdown;
    }
  } catch (error) {
    console.error('Diagram generation failed:', error);
  } finally {
    isGenerating.value = false;
    diagramDescription.value = '';
  }
}

async function checkLayout() {
  try {
    const response = await fetch('/api/slidev-ai/check-layout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        markdown: markdown.value,
      }),
    });
    
    const data = await response.json();
    if (data.success) {
      layoutIssues.value = data.data.issues || [];
    }
  } catch (error) {
    console.error('Layout check failed:', error);
  }
}

function generateSampleContent(topic: string): string {
  return `---
theme: default
title: ${topic}
highlighter: shiki
transition: slide-left
---

# ${topic}

AI 生成的演示文稿

---

## 概述

- 这是一个示例演示文稿
- 由 Slidev-AI 自动生成
- 支持实时编辑和预览

---

## 主要内容

### 特点一
详细说明内容...

### 特点二
详细说明内容...

---

## 图表示例

\`\`\`mermaid
flowchart TD
    A[开始] --> B{判断}
    B -->|是| C[操作1]
    B -->|否| D[操作2]
    C --> E[结束]
    D --> E
\`\`\`

---

## 代码示例

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
\`\`\`

---

## 总结

- 要点一
- 要点二
- 要点三

---

# 谢谢！

有问题请随时提问
`;
}

function selectSlide(index: number) {
  currentSlide.value = index;
}

function downloadMarkdown() {
  const blob = new Blob([markdown.value], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'slides.md';
  a.click();
  URL.revokeObjectURL(url);
}

// Handle settings saved
function onSettingsSaved() {
  loadModelConfig();
  // Switch to generate tab after saving
  activeTab.value = 'generate';
}

// Slidev preview functions
async function startPreview() {
  if (!markdown.value) return;
  
  isStartingPreview.value = true;
  
  try {
    const response = await fetch('/api/slidev-ai/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown: markdown.value }),
    });
    
    const data = await response.json();
    if (data.success) {
      previewUrl.value = data.data.url;
      isPreviewRunning.value = true;
      console.log('Slidev preview started at:', data.data.url);
    }
  } catch (error) {
    console.error('Failed to start preview:', error);
  } finally {
    isStartingPreview.value = false;
  }
}

async function updatePreview() {
  if (!isPreviewRunning.value || !markdown.value) return;
  
  try {
    await fetch('/api/slidev-ai/update-slides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown: markdown.value }),
    });
  } catch (error) {
    console.error('Failed to update preview:', error);
  }
}

async function checkPreviewStatus() {
  try {
    const response = await fetch('/api/slidev-ai/preview-status');
    const data = await response.json();
    if (data.success && data.data.running) {
      previewUrl.value = data.data.url;
      isPreviewRunning.value = true;
    }
  } catch {
    // Ignore errors
  }
}

// Auto-update preview when markdown changes
let updateDebounce: ReturnType<typeof setTimeout> | null = null;
watch(markdown, () => {
  if (isPreviewRunning.value) {
    if (updateDebounce) clearTimeout(updateDebounce);
    updateDebounce = setTimeout(updatePreview, 1000);
  }
});

// Open preview in new tab
function openPreviewInNewTab() {
  if (previewUrl.value) {
    window.open(previewUrl.value, '_blank');
  }
}

// Initialize
onMounted(() => {
  loadModelConfig();
  checkPreviewStatus();
  const queryTopic = route.query.topic as string;
  if (queryTopic) {
    topic.value = queryTopic;
    if (isModelConfigured.value) {
      generatePresentation();
    }
  }
});
</script>

<template>
  <div class="editor">
    <div class="editor-layout">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <h3>AI 工具</h3>
        </div>

        <!-- Tabs -->
        <div class="sidebar-tabs">
          <button 
            :class="{ active: activeTab === 'generate' }"
            @click="activeTab = 'generate'"
          >
            生成
          </button>
          <button 
            :class="{ active: activeTab === 'edit' }"
            @click="activeTab = 'edit'"
          >
            编辑
          </button>
          <button 
            :class="{ active: activeTab === 'diagram' }"
            @click="activeTab = 'diagram'"
          >
            图表
          </button>
          <button 
            :class="{ active: activeTab === 'settings', warning: !isModelConfigured }"
            @click="activeTab = 'settings'"
          >
            ⚙️
          </button>
        </div>

        <!-- Generate Tab -->
        <div
          v-if="activeTab === 'generate'"
          class="sidebar-content"
        >
          <div class="form-group">
            <label class="label">主题</label>
            <input 
              v-model="topic"
              type="text"
              class="input"
              placeholder="输入演示文稿主题"
            >
          </div>

          <div class="form-group">
            <label class="label">幻灯片数量</label>
            <select
              v-model="slideCount"
              class="select"
            >
              <option :value="5">
                5 页
              </option>
              <option :value="8">
                8 页
              </option>
              <option :value="10">
                10 页
              </option>
              <option :value="15">
                15 页
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="label">语言</label>
            <select
              v-model="language"
              class="select"
            >
              <option value="zh">
                中文
              </option>
              <option value="en">
                English
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="label">风格</label>
            <select
              v-model="style"
              class="select"
            >
              <option value="professional">
                专业
              </option>
              <option value="casual">
                轻松
              </option>
              <option value="academic">
                学术
              </option>
              <option value="creative">
                创意
              </option>
            </select>
          </div>

          <button 
            class="btn btn-primary" 
            style="width: 100%"
            :disabled="isGenerating || !topic.trim()"
            @click="generatePresentation"
          >
            <span
              v-if="isGenerating"
              class="spinner"
            />
            <span v-else>🚀 生成演示文稿</span>
          </button>
        </div>

        <!-- Edit Tab -->
        <div
          v-if="activeTab === 'edit'"
          class="sidebar-content"
        >
          <div class="current-slide-info">
            <span class="badge">当前: 第 {{ currentSlide + 1 }} 页</span>
          </div>

          <div class="form-group">
            <label class="label">编辑指令</label>
            <textarea 
              v-model="editInstruction"
              class="textarea"
              placeholder="例如：添加更多示例、让内容更简洁..."
              rows="4"
            />
          </div>

          <button 
            class="btn btn-primary" 
            style="width: 100%"
            :disabled="isGenerating || !editInstruction.trim() || !markdown"
            @click="editSlide"
          >
            <span
              v-if="isGenerating"
              class="spinner"
            />
            <span v-else>✏️ 应用修改</span>
          </button>

          <!-- Layout Issues -->
          <div
            v-if="issuesForCurrentSlide.length > 0"
            class="layout-issues"
          >
            <h4>布局问题</h4>
            <div 
              v-for="issue in issuesForCurrentSlide" 
              :key="issue.type + issue.slideIndex"
              class="issue-item"
              :class="issue.severity"
            >
              <span class="issue-icon">
                {{ issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️' }}
              </span>
              <div class="issue-content">
                <strong>{{ issue.type }}</strong>
                <p>{{ issue.message }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Diagram Tab -->
        <div
          v-if="activeTab === 'diagram'"
          class="sidebar-content"
        >
          <div class="current-slide-info">
            <span class="badge">当前: 第 {{ currentSlide + 1 }} 页</span>
          </div>

          <div class="form-group">
            <label class="label">图表类型</label>
            <select
              v-model="diagramType"
              class="select"
            >
              <option value="flowchart">
                流程图
              </option>
              <option value="sequence">
                时序图
              </option>
              <option value="class">
                类图
              </option>
              <option value="state">
                状态图
              </option>
              <option value="er">
                ER 图
              </option>
              <option value="gantt">
                甘特图
              </option>
              <option value="pie">
                饼图
              </option>
              <option value="mindmap">
                思维导图
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="label">图表描述</label>
            <textarea 
              v-model="diagramDescription"
              class="textarea"
              placeholder="描述你想要的图表内容..."
              rows="4"
            />
          </div>

          <button 
            class="btn btn-primary" 
            style="width: 100%"
            :disabled="isGenerating || !diagramDescription.trim() || !markdown"
            @click="generateDiagram"
          >
            <span
              v-if="isGenerating"
              class="spinner"
            />
            <span v-else>📊 生成图表</span>
          </button>
        </div>

        <!-- Settings Tab -->
        <div
          v-if="activeTab === 'settings'"
          class="sidebar-content settings-panel"
        >
          <ModelSettings 
            v-model="modelConfig" 
            @save="onSettingsSaved"
          />
        </div>

        <!-- Config Warning -->
        <div
          v-if="!isModelConfigured && activeTab !== 'settings'"
          class="config-warning"
        >
          <span class="warning-icon">⚠️</span>
          <span>请先配置 AI 模型</span>
          <button
            class="btn btn-ghost btn-sm"
            @click="activeTab = 'settings'"
          >
            去配置
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main">
        <!-- Toolbar -->
        <div class="toolbar">
          <div class="toolbar-left">
            <span class="toolbar-title">
              {{ topic || '未命名演示文稿' }}
            </span>
            <span
              v-if="slides.length"
              class="badge"
            >
              {{ slides.length }} 页
            </span>
          </div>
          <div class="toolbar-right">
            <button 
              class="btn btn-secondary" 
              :disabled="!markdown"
              @click="checkLayout"
            >
              📐 检查布局
            </button>
            <button 
              class="btn btn-secondary" 
              :disabled="!markdown"
              @click="downloadMarkdown"
            >
              💾 下载
            </button>
            <router-link 
              to="/preview" 
              class="btn btn-primary"
              :class="{ disabled: !markdown }"
            >
              👁 预览
            </router-link>
          </div>
        </div>

        <!-- Editor Area -->
        <div class="editor-area">
          <!-- Slide List -->
          <div class="slide-list">
            <div 
              v-for="(slide, index) in slides" 
              :key="index"
              class="slide-thumb"
              :class="{ active: currentSlide === index }"
              @click="selectSlide(index)"
            >
              <span class="slide-number">{{ index + 1 }}</span>
              <div class="slide-preview">
                {{ slide.substring(0, 100) }}...
              </div>
            </div>
            
            <div
              v-if="!slides.length"
              class="empty-state"
            >
              <p>还没有内容</p>
              <p class="text-muted">
                使用左侧工具生成演示文稿
              </p>
            </div>
          </div>

          <!-- Code Editor -->
          <div class="code-editor">
            <div class="editor-header">
              <span>Markdown</span>
            </div>
            <textarea 
              v-model="markdown"
              class="code-textarea"
              placeholder="在此编辑 Markdown 内容，或使用 AI 工具生成..."
              spellcheck="false"
            />
          </div>

          <!-- Preview Panel -->
          <div class="preview-panel">
            <div class="preview-header">
              <span>Slidev 预览</span>
              <div class="preview-actions">
                <button 
                  v-if="isPreviewRunning"
                  class="btn btn-ghost btn-sm"
                  title="在新窗口打开"
                  @click="openPreviewInNewTab"
                >
                  ↗
                </button>
              </div>
            </div>
            <div class="preview-content">
              <!-- Slidev iframe -->
              <iframe 
                v-if="isPreviewRunning && previewUrl"
                :src="`${previewUrl}/${currentSlide + 1}`"
                class="slidev-iframe"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              />
              
              <!-- Start preview button -->
              <div
                v-else
                class="preview-placeholder"
              >
                <div class="placeholder-content">
                  <span class="placeholder-icon">🎬</span>
                  <p>启动 Slidev 预览</p>
                  <p class="text-muted">
                    实时渲染真实的 Slidev 效果
                  </p>
                  <button 
                    class="btn btn-primary"
                    :disabled="!markdown || isStartingPreview"
                    @click="startPreview"
                  >
                    <span
                      v-if="isStartingPreview"
                      class="spinner"
                    />
                    <span v-else>▶ 启动预览</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.editor {
  height: calc(100vh - 70px);
  overflow: hidden;
}

.editor-layout {
  display: flex;
  height: 100%;
}

/* Sidebar */
.sidebar {
  width: 320px;
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.sidebar-header h3 {
  font-size: 1rem;
  margin: 0;
}

.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
}

.sidebar-tabs button {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.sidebar-tabs button:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-tertiary);
}

.sidebar-tabs button.active {
  color: var(--color-accent-primary);
  background: rgba(0, 245, 212, 0.1);
}

.sidebar-content {
  flex: 1;
  padding: var(--spacing-md);
  overflow-y: auto;
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.current-slide-info {
  margin-bottom: var(--spacing-md);
}

/* Layout Issues */
.layout-issues {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}

.layout-issues h4 {
  font-size: 0.85rem;
  margin-bottom: var(--spacing-sm);
  color: var(--color-text-secondary);
}

.issue-item {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-sm);
  font-size: 0.8rem;
}

.issue-item.error {
  background: rgba(255, 77, 109, 0.1);
}

.issue-item.warning {
  background: rgba(255, 195, 0, 0.1);
}

.issue-item.info {
  background: rgba(0, 245, 212, 0.1);
}

.issue-icon {
  flex-shrink: 0;
}

.issue-content strong {
  display: block;
  margin-bottom: 2px;
}

.issue-content p {
  margin: 0;
  font-size: 0.75rem;
}

/* Main */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.toolbar-title {
  font-weight: 500;
}

.toolbar-right {
  display: flex;
  gap: var(--spacing-sm);
}

/* Editor Area */
.editor-area {
  flex: 1;
  display: grid;
  grid-template-columns: 160px 1fr 1fr;
  overflow: hidden;
}

/* Slide List */
.slide-list {
  background: var(--color-bg-tertiary);
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  padding: var(--spacing-sm);
}

.slide-thumb {
  padding: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.slide-thumb:hover {
  border-color: var(--color-border-hover);
}

.slide-thumb.active {
  border-color: var(--color-accent-primary);
  background: rgba(0, 245, 212, 0.05);
}

.slide-number {
  display: block;
  font-size: 0.7rem;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.slide-preview {
  font-size: 0.65rem;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  line-height: 1.4;
}

/* Code Editor */
.code-editor {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-border);
}

.editor-header,
.preview-header {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.code-textarea {
  flex: 1;
  padding: var(--spacing-md);
  background: var(--color-bg-primary);
  border: none;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 1.6;
  resize: none;
}

.code-textarea:focus {
  outline: none;
}

/* Preview Panel */
.preview-panel {
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  border-left: 1px solid var(--color-border);
}

.preview-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.preview-content {
  flex: 1;
  overflow: hidden;
  background: var(--color-bg-primary);
  border-left: 1px solid var(--color-border);
}

/* Slidev iframe */
.slidev-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #121212;
}

/* Preview placeholder */
.preview-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0a0a0f 0%, #16213e 100%);
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  text-align: center;
  padding: var(--spacing-xl);
}

.placeholder-icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-sm);
}

.placeholder-content p {
  margin: 0;
}

.placeholder-content .text-muted {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-md);
}

.preview-content pre {
  white-space: pre-wrap;
  word-break: break-word;
  background: transparent;
  padding: 0;
  font-size: 0.85rem;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text-muted);
}

.empty-state p {
  margin: var(--spacing-xs) 0;
}

.text-muted {
  font-size: 0.85rem;
}

/* Responsive */
@media (max-width: 1200px) {
  .editor-area {
    grid-template-columns: 120px 1fr;
  }

  .preview-panel {
    display: none;
  }
}

@media (max-width: 768px) {
  .editor-layout {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    height: auto;
    max-height: 300px;
  }

  .editor-area {
    grid-template-columns: 1fr;
  }

  .slide-list {
    display: none;
  }
}

/* Settings Panel */
.settings-panel {
  padding: 0;
}

/* Config Warning */
.config-warning {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: rgba(255, 195, 0, 0.1);
  border-top: 1px solid var(--color-border);
  font-size: 0.85rem;
  color: var(--color-warning);
}

.config-warning .warning-icon {
  font-size: 1rem;
}

.config-warning .btn-sm {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: 0.75rem;
  margin-left: auto;
}

/* Warning state for tabs */
.sidebar-tabs button.warning {
  color: var(--color-warning);
  animation: pulse 2s infinite;
}
</style>

