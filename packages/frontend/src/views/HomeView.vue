<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const topic = ref('');

const features = [
  {
    icon: '🤖',
    title: 'AI 智能生成',
    description: '输入主题，AI 自动生成完整的演示文稿，包含结构化内容和美观排版',
  },
  {
    icon: '✏️',
    title: '智能编辑',
    description: '使用自然语言描述修改意图，AI 理解并自动优化幻灯片内容',
  },
  {
    icon: '📊',
    title: '图表生成',
    description: '自动生成 Mermaid 图表，支持流程图、时序图、类图等多种类型',
  },
  {
    icon: '🖼️',
    title: '插图生成',
    description: '通过 AI 生成精美插图，让演示文稿更具视觉吸引力',
  },
  {
    icon: '📐',
    title: '布局检测',
    description: '自动检测文字过长、内容拥挤等问题，并给出优化建议',
  },
  {
    icon: '🔄',
    title: '自动优化',
    description: '根据检测到的问题自动重新生成内容，确保最佳展示效果',
  },
];

function startGenerate() {
  if (topic.value.trim()) {
    router.push({
      path: '/editor',
      query: { topic: topic.value }
    });
  }
}
</script>

<template>
  <div class="home">
    <!-- Hero Section -->
    <section class="hero">
      <div class="container">
        <div class="hero-content fade-in">
          <span class="hero-badge">
            <span class="badge-dot" />
            AI-Powered Presentation
          </span>
          
          <h1 class="hero-title">
            用 AI 创建<br>
            <span class="gradient-text">惊艳的演示文稿</span>
          </h1>
          
          <p class="hero-description">
            Slidev-AI 让你只需输入主题，即可自动生成专业的 Slidev 演示文稿。
            支持智能编辑、图表生成、布局优化等强大功能。
          </p>

          <div class="hero-input-group">
            <input
              v-model="topic"
              type="text"
              class="hero-input"
              placeholder="输入演示文稿主题，例如：TypeScript 入门指南"
              @keyup.enter="startGenerate"
            >
            <button
              class="btn btn-primary btn-lg"
              @click="startGenerate"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              开始生成
            </button>
          </div>

          <div class="hero-stats">
            <div class="stat">
              <span class="stat-value">10+</span>
              <span class="stat-label">支持图表类型</span>
            </div>
            <div class="stat">
              <span class="stat-value">6</span>
              <span class="stat-label">布局检测规则</span>
            </div>
            <div class="stat">
              <span class="stat-value">∞</span>
              <span class="stat-label">创意可能</span>
            </div>
          </div>
        </div>

        <div class="hero-visual">
          <div class="visual-card">
            <div class="visual-header">
              <div class="visual-dots">
                <span /><span /><span />
              </div>
              <span class="visual-title">slides.md</span>
            </div>
            <pre class="visual-code"><code>---
theme: default
title: TypeScript 入门指南
---

# TypeScript 入门指南

现代 JavaScript 开发的最佳实践

---

## 什么是 TypeScript？

- JavaScript 的超集
- 添加静态类型检查
- 编译为纯 JavaScript
- 更好的 IDE 支持</code></pre>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features">
      <div class="container">
        <div class="section-header">
          <h2>强大功能</h2>
          <p>一站式 AI 驱动的演示文稿解决方案</p>
        </div>

        <div class="features-grid">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="feature-card card"
          >
            <span class="feature-icon">{{ feature.icon }}</span>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta">
      <div class="container">
        <div class="cta-content">
          <h2>准备好开始了吗？</h2>
          <p>立即体验 AI 驱动的演示文稿生成</p>
          <router-link
            to="/editor"
            class="btn btn-primary btn-lg"
          >
            进入编辑器
          </router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  padding-bottom: var(--spacing-2xl);
}

/* Hero */
.hero {
  min-height: calc(100vh - 70px);
  display: flex;
  align-items: center;
  padding: var(--spacing-2xl) 0;
}

.hero .container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-2xl);
  align-items: center;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-bg-tertiary);
  border-radius: 100px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
}

.badge-dot {
  width: 8px;
  height: 8px;
  background: var(--color-accent-primary);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.hero-title {
  font-size: 3.5rem;
  line-height: 1.1;
  margin-bottom: var(--spacing-lg);
}

.gradient-text {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
  max-width: 500px;
  margin-bottom: var(--spacing-xl);
}

.hero-input-group {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xl);
}

.hero-input {
  flex: 1;
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: 1rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  color: var(--color-text-primary);
}

.hero-input:focus {
  outline: none;
  border-color: var(--color-accent-primary);
  box-shadow: 0 0 0 3px rgba(0, 245, 212, 0.15);
}

.hero-stats {
  display: flex;
  gap: var(--spacing-xl);
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-accent-primary);
}

.stat-label {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

/* Visual Card */
.hero-visual {
  display: flex;
  justify-content: center;
}

.visual-card {
  width: 100%;
  max-width: 500px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}

.visual-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border);
}

.visual-dots {
  display: flex;
  gap: 6px;
}

.visual-dots span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.visual-dots span:nth-child(1) { background: #ff5f56; }
.visual-dots span:nth-child(2) { background: #ffbd2e; }
.visual-dots span:nth-child(3) { background: #27c93f; }

.visual-title {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.visual-code {
  padding: var(--spacing-md);
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.6;
  overflow: auto;
  max-height: 400px;
}

/* Features */
.features {
  padding: var(--spacing-2xl) 0;
}

.section-header {
  text-align: center;
  margin-bottom: var(--spacing-2xl);
}

.section-header h2 {
  margin-bottom: var(--spacing-sm);
}

.section-header p {
  font-size: 1.1rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-lg);
}

.feature-card {
  text-align: center;
}

.feature-icon {
  display: inline-block;
  font-size: 2.5rem;
  margin-bottom: var(--spacing-md);
}

.feature-card h3 {
  margin-bottom: var(--spacing-sm);
}

/* CTA */
.cta {
  padding: var(--spacing-2xl) 0;
}

.cta-content {
  text-align: center;
  padding: var(--spacing-2xl);
  background: var(--gradient-primary);
  border-radius: var(--radius-xl);
}

.cta-content h2 {
  color: var(--color-bg-primary);
  margin-bottom: var(--spacing-sm);
}

.cta-content p {
  color: rgba(0, 0, 0, 0.7);
  margin-bottom: var(--spacing-lg);
}

.cta-content .btn {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

/* Responsive */
@media (max-width: 1024px) {
  .hero .container {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .hero-description {
    margin-left: auto;
    margin-right: auto;
  }

  .hero-input-group {
    flex-direction: column;
  }

  .hero-stats {
    justify-content: center;
  }

  .hero-visual {
    display: none;
  }

  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>

