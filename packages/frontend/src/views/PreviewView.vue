<script setup lang="ts">
import { ref, computed } from 'vue';

const markdown = ref('');
const currentSlide = ref(0);

// Get markdown from localStorage or default
const savedMarkdown = localStorage.getItem('slidev-ai-markdown');
if (savedMarkdown) {
  markdown.value = savedMarkdown;
}

const slides = computed(() => {
  if (!markdown.value) return [];
  const content = markdown.value.replace(/^---[\s\S]*?---\n/, '');
  return content.split(/\n---\n/).map(s => s.trim()).filter(Boolean);
});

const totalSlides = computed(() => slides.value.length);

function prevSlide() {
  if (currentSlide.value > 0) {
    currentSlide.value--;
  }
}

function nextSlide() {
  if (currentSlide.value < totalSlides.value - 1) {
    currentSlide.value++;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    prevSlide();
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
    nextSlide();
  }
}

// Add keyboard listener
document.addEventListener('keydown', handleKeydown);
</script>

<template>
  <div class="preview-page">
    <div class="preview-container">
      <!-- Slide Display -->
      <div class="slide-display">
        <div
          v-if="slides.length"
          class="slide-content"
        >
          <pre>{{ slides[currentSlide] }}</pre>
        </div>
        <div
          v-else
          class="empty-state"
        >
          <h2>没有演示文稿内容</h2>
          <p>请先在编辑器中生成或编写内容</p>
          <router-link
            to="/editor"
            class="btn btn-primary"
          >
            前往编辑器
          </router-link>
        </div>
      </div>

      <!-- Controls -->
      <div
        v-if="slides.length"
        class="controls"
      >
        <button 
          class="btn btn-ghost" 
          :disabled="currentSlide === 0"
          @click="prevSlide"
        >
          ← 上一页
        </button>
        
        <div class="slide-indicator">
          <span class="current">{{ currentSlide + 1 }}</span>
          <span class="separator">/</span>
          <span class="total">{{ totalSlides }}</span>
        </div>
        
        <button 
          class="btn btn-ghost" 
          :disabled="currentSlide === totalSlides - 1"
          @click="nextSlide"
        >
          下一页 →
        </button>
      </div>

      <!-- Progress Bar -->
      <div
        v-if="slides.length"
        class="progress-bar"
      >
        <div 
          class="progress-fill" 
          :style="{ width: `${((currentSlide + 1) / totalSlides) * 100}%` }"
        />
      </div>
    </div>

    <!-- Keyboard Hints -->
    <div class="keyboard-hints">
      <span>← → 翻页</span>
      <span>空格键 下一页</span>
    </div>
  </div>
</template>

<style scoped>
.preview-page {
  min-height: calc(100vh - 70px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  background: var(--color-bg-primary);
}

.preview-container {
  width: 100%;
  max-width: 1200px;
  aspect-ratio: 16 / 9;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}

.slide-display {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
  overflow: auto;
}

.slide-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slide-content pre {
  font-size: 1.2rem;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  text-align: center;
  max-width: 100%;
  background: transparent;
  padding: 0;
}

.empty-state {
  text-align: center;
}

.empty-state h2 {
  margin-bottom: var(--spacing-sm);
}

.empty-state p {
  margin-bottom: var(--spacing-lg);
}

.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xl);
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
}

.slide-indicator {
  font-size: 1.1rem;
  font-weight: 500;
}

.slide-indicator .current {
  color: var(--color-accent-primary);
  font-size: 1.5rem;
}

.slide-indicator .separator {
  margin: 0 var(--spacing-xs);
  color: var(--color-text-muted);
}

.slide-indicator .total {
  color: var(--color-text-secondary);
}

.progress-bar {
  height: 3px;
  background: var(--color-bg-primary);
}

.progress-fill {
  height: 100%;
  background: var(--gradient-primary);
  transition: width var(--transition-normal);
}

.keyboard-hints {
  display: flex;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-lg);
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.keyboard-hints span {
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
}

@media (max-width: 768px) {
  .preview-container {
    aspect-ratio: auto;
    min-height: 60vh;
  }

  .slide-content pre {
    font-size: 1rem;
  }

  .controls {
    gap: var(--spacing-md);
  }

  .keyboard-hints {
    display: none;
  }
}
</style>

