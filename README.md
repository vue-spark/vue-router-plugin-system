# vue-router-plugin-system

[中文文档](./README.zh_CN.md)

A lightweight solution providing standardized plugin system for Vue Router.

---

## 🌟 Core Features

| Feature                                | Description                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| 🧱 **Standardized Plugin Interface**   | Unified plugin development specification with auto-registration/uninstallation |
| 🔁 **Reactive Side-effect Management** | Automatic tracking/cleanup of plugin's reactive side-effects                   |
| ⚖️ **Dual-mode Compatibility**         | Support both Vue Router plugin system and Vue plugin system                    |

---

## 📦 Installation

```bash
npm install vue-router-plugin-system
```

---

## 🚀 Getting Started

### Mode 1: Vue Router Plugin (Recommended)

**1. Plugin Development**

```ts
import type { RouterPlugin } from 'vue-router-plugin-system'
import { ref } from 'vue'

export const NavigationStatePlugin: RouterPlugin = (ctx) => {
  // Extend reactive navigation state
  ctx.router.isNavigating = ref(false)

  // Register navigation guards
  ctx.router.beforeEach(() => {
    ctx.router.isNavigating.value = true
  })
  ctx.router.afterEach(() => {
    ctx.router.isNavigating.value = false
  })

  // Uninstall hook
  ctx.onUninstall(() => {
    ctx.router.isNavigating.value = false
  })
}
```

**2. Application Integration**

```ts
import { createWebHistory } from 'vue-router'
import { createRouter } from 'vue-router-plugin-system'
import { NavigationStatePlugin } from './plugins'

const router = createRouter({
  history: createWebHistory(),
  routes: [],
  plugins: [NavigationStatePlugin],
})

// Access extended property
router.isNavigating.value
```

### Mode 2: Vue Plugin (Compatibility)

**1. Create Vue Plugin**

```ts
import { createVueRouterPlugin } from 'vue-router-plugin-system'

export const NavigationStatePlugin = createVueRouterPlugin((ctx) => {
  // Same implementation logic as above
})
```

**2. Application Integration**

```ts
// main.ts
const app = createApp(App)
app.use(router) // Mount router first
app.use(NavigationStatePlugin) // Register plugin later
```

---

## ⚠️ Mode Comparison

| Feature                   | Vue Router Plugin                | Vue Plugin                      |
| ------------------------- | -------------------------------- | ------------------------------- |
| Initialization Order      | Prior to app logic               | Dependent on client usage order |
| Navigation Guard Priority | Higher                           | Dependent on registration order |
| Reactive Management       | Automatic cleanup                | Automatic cleanup               |
| Dependency Requirement    | Requires this lib's createRouter | No dependency required          |

---

## 📚 Type Definitions

```ts
interface RouterPluginContext {
  /**
   * Vue Router instance
   */
  router: Router
  /**
   * Execute callback with vue app instance
   */
  runWithApp: (handler: RouterPluginRunWithAppHandler) => void
  /**
   * Register uninstall callback (can be called multiple times)
   */
  onUninstall: (handler: RouterPluginUninstallHandler) => void
}

interface RouterPlugin {
  /**
   * Plugin initialization function
   */
  (ctx: RouterPluginContext): void
}

interface VueRouterPlugin extends RouterPlugin {
  /**
   * Vue plugin installation function
   */
  install: (app: App) => void
}
```

---

## 🤝 Contribution Guidelines

Contributions welcome! Please ensure:

1. Pass all unit tests
2. Maintain TypeScript type integrity
3. Add necessary documentation

## License

[MIT](./LICENSE) License © 2025 [leihaohao](https://github.com/l246804)
