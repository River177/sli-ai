<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const isActive = (path: string) => route.path === path;
</script>

<template>
  <nav class="navbar">
    <div class="container navbar-container">
      <!-- Logo -->
      <router-link to="/" class="logo">
        <span class="logo-icon">🎯</span>
        <span class="logo-text">Slidev-AI</span>
      </router-link>

      <!-- Navigation Links -->
      <div class="nav-links">
        <router-link 
          to="/" 
          class="nav-link"
          :class="{ active: isActive('/') }"
        >
          首页
        </router-link>
        <router-link 
          to="/editor" 
          class="nav-link"
          :class="{ active: isActive('/editor') }"
        >
          编辑器
        </router-link>
        <router-link 
          to="/preview" 
          class="nav-link"
          :class="{ active: isActive('/preview') }"
        >
          预览
        </router-link>
      </div>

      <!-- Actions -->
      <div class="nav-actions">
        <a href="https://github.com" target="_blank" class="btn btn-ghost">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
          GitHub
        </a>
        <button class="btn btn-primary">
          开始使用
        </button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 70px;
  background: rgba(10, 10, 15, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--color-border);
  z-index: 1000;
}

.navbar-container {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  text-decoration: none;
}

.logo-icon {
  font-size: 1.5rem;
}

.logo-text {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.nav-link {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.nav-link:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-tertiary);
}

.nav-link.active {
  color: var(--color-accent-primary);
  background: rgba(0, 245, 212, 0.1);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
}
</style>

