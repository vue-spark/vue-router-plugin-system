# vue-router-plugin-system

[中文文档](./README.zh_CN.md)

A lightweight solution providing standardized plugin system for Vue Router.

---

## 🌟 Core Features

| Feature                                | Description                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| 🧱 **Standardized Plugin Interface**   | Unified plugin development specification with auto-registration/uninstallation   |
| 🔁 **Reactive Side-effect Management** | Automatic tracking/cleanup of plugin's reactive side-effects                     |
| ⚖️ **Dual-mode Compatibility**         | Supports both Vue Router plugin system and Vue plugin system compatibility modes |

---

## 📦 Installation

```bash
npm install vue-router-plugin-system
```

---

## 🚀 Getting Started

### Mode 1: Vue Router Plugin Mode (Recommended)

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

### Mode 2: Vue Plugin Mode (Compatibility)

**1. Plugin Development**

```ts
import type { RouterPlugin } from 'vue-router-plugin-system'
import { ref } from 'vue'

export const NavigationStatePlugin: RouterPlugin = (ctx) => {
  // Implementation logic remains the same
}
```

**2. Application Integration**

```ts
// main.ts
import { asVuePlugin } from 'vue-router-plugin-system'

const app = createApp(App)
app.use(router) // Mount router first
app.use(asVuePlugin(NavigationStatePlugin)) // Register plugin later
```

---

## ⚠️ Mode Comparison

| Feature              | Vue Router Plugin Mode     | Vue Plugin Mode               |
| -------------------- | -------------------------- | ----------------------------- |
| Initialization Order | Prioritized over app logic | Depends on client usage order |
| Guard Priority       | Higher priority            | Depends on registration order |
| Reactive Management  | Auto-cleanup               | Auto-cleanup                  |

---

## 📚 Type Definitions

```ts
interface RouterPluginContext {
  /**
   * Vue Router instance
   */
  router: Router
  /**
   * Execute callback with Vue app instance
   */
  runWithApp: (handler: RouterPluginRunWithAppHandler) => void
  /**
   * Register uninstallation callback (supports multiple calls)
   */
  onUninstall: (handler: RouterPluginUninstallHandler) => void
}

interface RouterPlugin {
  /**
   * Plugin initialization function
   */
  (ctx: RouterPluginContext): void
}
```

---

## 🤝 Contribution Guide

Contributions are welcome! Please ensure:

1. All unit tests pass
2. TypeScript type integrity maintained
3. Necessary documentation added

## License

[MIT](./LICENSE) License © 2025 [leihaohao](https://github.com/l246804)
