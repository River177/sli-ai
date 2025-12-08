<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';

// Types
interface ProviderModel {
  id: string;
  name: string;
  description?: string;
  maxTokens?: number;
}

interface Provider {
  id: string;
  name: string;
  description: string;
  website: string;
  models: ProviderModel[];
  requiresApiKey: boolean;
  supportsCustomBaseUrl: boolean;
  defaultBaseUrl?: string;
}

interface ModelConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  displayName?: string;
  temperature: number;
  maxTokens: number;
}

// Props & Emits
const props = defineProps<{
  modelValue?: ModelConfig;
  showAdvanced?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', config: ModelConfig): void;
  (e: 'save'): void;
  (e: 'test'): void;
}>();

// Providers data
const PROVIDERS: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-3.5 等模型',
    website: 'https://platform.openai.com',
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', description: '最强大的模型', maxTokens: 128000 },
      { id: 'gpt-4o', name: 'GPT-4o', description: '多模态模型', maxTokens: 128000 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '快速且经济', maxTokens: 128000 },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: '快速响应', maxTokens: 16385 },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 系列模型',
    website: 'https://www.anthropic.com',
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
    defaultBaseUrl: 'https://api.anthropic.com',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: '最新最强', maxTokens: 200000 },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: '最强推理', maxTokens: 200000 },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: '平衡性能', maxTokens: 200000 },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: '快速响应', maxTokens: 200000 },
    ],
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Gemini 系列模型',
    website: 'https://ai.google.dev',
    requiresApiKey: true,
    supportsCustomBaseUrl: false,
    models: [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: '最强大', maxTokens: 2000000 },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: '快速', maxTokens: 1000000 },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: '深度求索 AI',
    website: 'https://platform.deepseek.com',
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
    defaultBaseUrl: 'https://api.deepseek.com',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', description: '对话模型', maxTokens: 64000 },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', description: '代码模型', maxTokens: 64000 },
    ],
  },
  {
    id: 'moonshot',
    name: 'Moonshot (Kimi)',
    description: '月之暗面 Kimi',
    website: 'https://platform.moonshot.cn',
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    models: [
      { id: 'moonshot-v1-128k', name: 'Moonshot 128K', description: '超长上下文', maxTokens: 128000 },
      { id: 'moonshot-v1-32k', name: 'Moonshot 32K', description: '长上下文', maxTokens: 32000 },
      { id: 'moonshot-v1-8k', name: 'Moonshot 8K', description: '标准', maxTokens: 8000 },
    ],
  },
  {
    id: 'zhipu',
    name: '智谱 AI',
    description: 'GLM 系列模型',
    website: 'https://open.bigmodel.cn',
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-4-plus', name: 'GLM-4 Plus', description: '最强', maxTokens: 128000 },
      { id: 'glm-4', name: 'GLM-4', description: '通用', maxTokens: 128000 },
      { id: 'glm-4-flash', name: 'GLM-4 Flash', description: '快速', maxTokens: 128000 },
    ],
  },
  {
    id: 'qwen',
    name: '通义千问',
    description: '阿里云 Qwen 系列',
    website: 'https://dashscope.aliyun.com',
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: [
      { id: 'qwen-max', name: 'Qwen Max', description: '最强', maxTokens: 32000 },
      { id: 'qwen-plus', name: 'Qwen Plus', description: '增强', maxTokens: 32000 },
      { id: 'qwen-turbo', name: 'Qwen Turbo', description: '快速', maxTokens: 8000 },
    ],
  },
  {
    id: 'custom',
    name: '自定义',
    description: '兼容 OpenAI 格式的自定义端点',
    website: '',
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
    models: [
      { id: 'custom', name: '自定义模型', description: '输入模型名称' },
    ],
  },
];

// State
const config = ref<ModelConfig>({
  provider: 'openai',
  model: 'gpt-4-turbo-preview',
  apiKey: '',
  baseUrl: '',
  temperature: 0.7,
  maxTokens: 4096,
});

const showPassword = ref(false);
const showAdvancedOptions = ref(props.showAdvanced ?? false);
const customModelName = ref('');
const testStatus = ref<'idle' | 'testing' | 'success' | 'error'>('idle');
const testMessage = ref('');
const saveStatus = ref<'idle' | 'saved'>('idle');

// Computed
const selectedProvider = computed(() => {
  return PROVIDERS.find(p => p.id === config.value.provider);
});

const availableModels = computed(() => {
  return selectedProvider.value?.models || [];
});

const isCustomProvider = computed(() => config.value.provider === 'custom');

const selectedModel = computed(() => {
  return availableModels.value.find(m => m.id === config.value.model);
});

// Watch provider changes
watch(() => config.value.provider, (newProvider) => {
  const provider = PROVIDERS.find(p => p.id === newProvider);
  if (provider) {
    // Set default model
    if (provider.models.length > 0) {
      config.value.model = provider.models[0].id;
    }
    // Set default base URL
    if (provider.defaultBaseUrl) {
      config.value.baseUrl = provider.defaultBaseUrl;
    } else {
      config.value.baseUrl = '';
    }
  }
  emitUpdate();
});

// Watch model changes for custom
watch(() => customModelName.value, (name) => {
  if (isCustomProvider.value) {
    config.value.model = name;
    emitUpdate();
  }
});

// Watch all config changes
watch(config, () => {
  emitUpdate();
}, { deep: true });

// Methods
function emitUpdate() {
  emit('update:modelValue', { ...config.value });
}

function saveConfig() {
  // Save to localStorage
  localStorage.setItem('slidev-ai-model-config', JSON.stringify(config.value));
  
  // Show save success feedback
  saveStatus.value = 'saved';
  setTimeout(() => {
    saveStatus.value = 'idle';
  }, 2000);
  
  emit('save');
}

function loadConfig() {
  const saved = localStorage.getItem('slidev-ai-model-config');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      config.value = { ...config.value, ...parsed };
      if (isCustomProvider.value && config.value.model) {
        customModelName.value = config.value.model;
      }
    } catch {
      console.error('Failed to load saved config');
    }
  }
}

async function testConnection() {
  testStatus.value = 'testing';
  testMessage.value = '正在测试连接...';

  try {
    const response = await fetch('/api/slidev-ai/test-model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config.value),
    });

    const data = await response.json();
    
    if (data.success) {
      testStatus.value = 'success';
      testMessage.value = '连接成功！模型响应正常。';
    } else {
      testStatus.value = 'error';
      testMessage.value = data.error || '连接失败';
    }
  } catch (error) {
    testStatus.value = 'error';
    testMessage.value = '网络错误，请检查 API 地址是否正确';
  }

  setTimeout(() => {
    testStatus.value = 'idle';
    testMessage.value = '';
  }, 5000);
}

// Initialize
onMounted(() => {
  loadConfig();
  if (props.modelValue) {
    config.value = { ...config.value, ...props.modelValue };
  }
});
</script>

<template>
  <div class="model-settings">
    <div class="settings-header">
      <h3>🤖 AI 模型配置</h3>
      <p class="description">选择并配置你的 AI 模型提供商</p>
    </div>

    <!-- Provider Selection -->
    <div class="form-section">
      <label class="label">模型提供商</label>
      <div class="provider-grid">
        <button
          v-for="provider in PROVIDERS"
          :key="provider.id"
          class="provider-card"
          :class="{ active: config.provider === provider.id }"
          @click="config.provider = provider.id"
        >
          <span class="provider-name">{{ provider.name }}</span>
          <span class="provider-desc">{{ provider.description }}</span>
        </button>
      </div>
    </div>

    <!-- Model Selection -->
    <div v-if="!isCustomProvider" class="form-section">
      <label class="label">模型</label>
      <select v-model="config.model" class="select">
        <option v-for="model in availableModels" :key="model.id" :value="model.id">
          {{ model.name }} - {{ model.description }}
        </option>
      </select>
      <p v-if="selectedModel?.maxTokens" class="hint">
        最大 Token: {{ selectedModel.maxTokens.toLocaleString() }}
      </p>
    </div>

    <!-- Custom Model Name -->
    <div v-if="isCustomProvider" class="form-section">
      <label class="label">模型名称</label>
      <input
        v-model="customModelName"
        type="text"
        class="input"
        placeholder="例如: llama-3-70b, mixtral-8x7b"
      />
    </div>

    <!-- API Key -->
    <div class="form-section">
      <label class="label">
        API Key
        <a v-if="selectedProvider?.website" :href="selectedProvider.website" target="_blank" class="link">
          获取密钥 ↗
        </a>
      </label>
      <div class="input-with-action">
        <input
          v-model="config.apiKey"
          :type="showPassword ? 'text' : 'password'"
          class="input"
          placeholder="输入 API Key"
        />
        <button class="btn btn-ghost" @click="showPassword = !showPassword">
          {{ showPassword ? '🙈' : '👁' }}
        </button>
      </div>
    </div>

    <!-- Base URL -->
    <div v-if="selectedProvider?.supportsCustomBaseUrl" class="form-section">
      <label class="label">
        API 地址
        <span class="optional">(可选)</span>
      </label>
      <input
        v-model="config.baseUrl"
        type="text"
        class="input"
        :placeholder="selectedProvider?.defaultBaseUrl || '自定义 API 地址'"
      />
      <p class="hint">使用代理或私有部署时可修改此地址</p>
    </div>

    <!-- Advanced Options -->
    <div class="form-section">
      <button class="toggle-advanced" @click="showAdvancedOptions = !showAdvancedOptions">
        {{ showAdvancedOptions ? '▼' : '▶' }} 高级选项
      </button>
      
      <div v-if="showAdvancedOptions" class="advanced-options">
        <!-- Temperature -->
        <div class="form-group">
          <label class="label">
            Temperature
            <span class="value">{{ config.temperature }}</span>
          </label>
          <input
            v-model.number="config.temperature"
            type="range"
            min="0"
            max="1"
            step="0.1"
            class="slider"
          />
          <p class="hint">较低值更确定，较高值更有创意</p>
        </div>

        <!-- Max Tokens -->
        <div class="form-group">
          <label class="label">Max Tokens</label>
          <input
            v-model.number="config.maxTokens"
            type="number"
            class="input"
            min="100"
            max="128000"
          />
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions">
      <button class="btn btn-secondary" @click="testConnection" :disabled="!config.apiKey || testStatus === 'testing'">
        <span v-if="testStatus === 'testing'" class="spinner"></span>
        {{ testStatus === 'testing' ? '测试中...' : '🧪 测试连接' }}
      </button>
      <button 
        class="btn" 
        :class="saveStatus === 'saved' ? 'btn-success' : 'btn-primary'"
        @click="saveConfig" 
        :disabled="!config.apiKey"
      >
        {{ saveStatus === 'saved' ? '✅ 已保存' : '💾 保存配置' }}
      </button>
    </div>

    <!-- Test Result -->
    <div v-if="testMessage" class="test-result" :class="testStatus">
      {{ testMessage }}
    </div>
  </div>
</template>

<style scoped>
.model-settings {
  padding: var(--spacing-lg);
}

.settings-header {
  margin-bottom: var(--spacing-xl);
}

.settings-header h3 {
  margin: 0 0 var(--spacing-xs);
}

.settings-header .description {
  margin: 0;
  font-size: 0.9rem;
}

.form-section {
  margin-bottom: var(--spacing-lg);
}

.label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  font-size: 0.9rem;
  font-weight: 500;
}

.label .link {
  font-size: 0.8rem;
  font-weight: normal;
}

.label .optional {
  font-size: 0.8rem;
  font-weight: normal;
  color: var(--color-text-muted);
}

.label .value {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-accent-primary);
}

/* Provider Grid */
.provider-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--spacing-sm);
}

.provider-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: var(--spacing-md);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
}

.provider-card:hover {
  border-color: var(--color-border-hover);
  background: var(--color-bg-elevated);
}

.provider-card.active {
  border-color: var(--color-accent-primary);
  background: rgba(0, 245, 212, 0.1);
}

.provider-name {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 4px;
}

.provider-desc {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* Input with action */
.input-with-action {
  display: flex;
  gap: var(--spacing-sm);
}

.input-with-action .input {
  flex: 1;
}

/* Advanced Options */
.toggle-advanced {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  padding: var(--spacing-sm) 0;
}

.toggle-advanced:hover {
  color: var(--color-text-primary);
}

.advanced-options {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group:last-child {
  margin-bottom: 0;
}

/* Slider */
.slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--color-bg-elevated);
  border-radius: 3px;
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: var(--color-accent-primary);
  border-radius: 50%;
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

/* Hint */
.hint {
  margin-top: var(--spacing-xs);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* Actions */
.actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-xl);
}

.actions .btn {
  flex: 1;
}

/* Test Result */
.test-result {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  text-align: center;
}

.test-result.success {
  background: rgba(0, 245, 160, 0.15);
  color: var(--color-success);
}

.test-result.error {
  background: rgba(255, 77, 109, 0.15);
  color: var(--color-error);
}

.test-result.testing {
  background: rgba(0, 245, 212, 0.1);
  color: var(--color-accent-primary);
}

/* Success button */
.btn-success {
  background: var(--color-success) !important;
  color: var(--color-bg-primary) !important;
}
</style>

