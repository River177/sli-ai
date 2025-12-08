import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import './styles/main.css';
import 'virtual:uno.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('./views/HomeView.vue'),
    },
    {
      path: '/editor',
      name: 'editor',
      component: () => import('./views/EditorView.vue'),
    },
    {
      path: '/preview',
      name: 'preview',
      component: () => import('./views/PreviewView.vue'),
    },
  ],
});

const app = createApp(App);
app.use(router);
app.mount('#app');

