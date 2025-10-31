# vue-router-plugin-system

**A standardized plugin system and unified installation mechanism for Vue Router.**

[![npm version](https://badge.fury.io/js/vue-router-plugin-system.svg)](https://badge.fury.io/js/vue-router-plugin-system)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[中文文档](./README.zh_CN.md)

---

## Background

When developing Vue applications, we often need to build various features around Vue Router, such as page navigation direction, cross-page communication, scroll position restoration, etc. These features could be developed independently as Vue Router extensions, but since Vue Router doesn't officially support a plugin mechanism, we have to implement them as Vue plugins instead, which brings the following issues:

<details>
<summary><b>Unclear Plugin Responsibilities</b></summary>

Take a page caching plugin as an example. It should provide functionality for Vue Router, but it has to be developed as a Vue plugin, which feels like a misalignment of concerns:

```ts
import type { ComputedRef, Plugin } from 'vue'

declare module 'vue-router' {
  interface Router {
    keepAlive: {
      pages: ComputedRef<string[]>
      add: (page: string) => void
      remove: (page: string) => void
    }
  }
}

export const KeepAlivePlugin: Plugin = (app) => {
  const router = app.config.globalProperties.$router
  if (!router) {
    throw new Error('[KeepAlivePlugin] Please install Vue Router first.')
  }

  const keepAlivePageSet = shallowReactive(new Set<string>())
  const keepAlivePages = computed(() => Array.from(keepAlivePageSet))

  router.keepAlive = {
    pages: keepAlivePages,
    add: (page: string) => keepAlivePageSet.add(page),
    remove: (page: string) => keepAlivePageSet.delete(page),
  }

  // Automatically update cache list on route changes
  router.afterEach((to, from) => {
    if (to.meta.keepAlive) {
      keepAlivePageSet.add(to.fullPath)
    }
  })
}
```

</details>

<details>
<summary><b>Manual Cleanup of Reactive Side Effects</b></summary>

Continuing with the page caching plugin example, we need to use `effectScope` to create reactive side effects and manually stop them when the app unmounts:

```ts
import { effectScope } from 'vue'

// ...

export const KeepAlivePlugin: Plugin = (app) => {
  // ...

  const scope = effectScope(true)
  const keepAlivePageSet = scope.run(() => shallowReactive(new Set<string>()))!
  const keepAlivePages = scope.run(() =>
    computed(() => Array.from(keepAlivePageSet)),
  )!

  // ...

  app.onUnmount(() => {
    scope.stop()
    keepAlivePageSet.clear()
  })
}
```

</details>

<details>
<summary><b>Plugin Initialization Timing Issues</b></summary>

Vue Router's `createRouter()` and `app.use(router)` are separate, making it impossible to install extension plugins immediately when creating the Router. This can lead to plugin functionality being called before initialization:

```ts
// src/router/index.ts
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/home',
      component: HomeView,
    },
  ],
})

// KeepAlivePlugin's type extension is in effect, but the plugin may not be initialized yet
// Manually calling plugin methods
router.keepAlive.add('/home')
```

```ts
// main.ts
app.use(router).use(KeepAlivePlugin)
```

</details>

<br>

This library aims to provide a standardized plugin interface and multiple installation strategies, making the development and integration of router extension features simple, efficient, and reusable.

---

## Quick Start

### Installation

```bash
npm install vue-router-plugin-system
```

### Plugin Development

A complete plugin example:

```ts
import type { RouterPlugin } from 'vue-router-plugin-system'
import { inject, watch } from 'vue'

const LoggerPlugin: RouterPlugin = ({
  router,
  runWithAppContext,
  onUninstall,
}) => {
  // Add route guards
  router.beforeEach((to, from, next) => {
    console.log(`Route navigation: ${from.path} → ${to.path}`)
    next()
  })

  // Use when App context is needed (e.g., inject, pinia store, etc.)
  runWithAppContext(() => {
    const theme = inject('theme', 'light')
    watch(router.currentRoute, (route) => {
      console.log('Current route:', route.path, 'Theme:', theme)
    })
  })

  // Register cleanup logic
  onUninstall(() => {
    console.log('Plugin is being cleaned up')
  })
}
```

### Integration Approaches

#### Approach 1: Plugin Library Integration

##### Plugin Library Development

```ts
// Add this package as a dev dependency, wrap the plugin with withInstall, and bundle to dist
import { withInstall } from 'vue-router-plugin-system'

const MyRouterPlugin = withInstall(
  ({ router, runWithAppContext, onUninstall }) => {
    // Plugin implementation
  },
)

export default MyRouterPlugin
```

```json
// package.json
{
  "devDependencies": {
    "vue-router-plugin-system": "latest"
  }
}
```

##### Application-Side Installation

```ts
import MyRouterPlugin from 'some-plugin-package'

// Option A: Install directly to router instance, recommended immediately after createRouter
MyRouterPlugin.install(router)

// Option B: Register as a Vue plugin, must be after Vue Router or it will throw an error
app.use(router)
app.use(MyRouterPlugin)
```

#### Approach 2: Internal Application Plugin Integration

For router plugins developed internally within your application that you want to register and manage centrally.

##### Internal Plugin Development

```ts
// Simply export the RouterPlugin implementation
import type { RouterPlugin } from 'vue-router-plugin-system'

// src/router/plugins/auth.ts
export const AuthPlugin: RouterPlugin = ({
  router,
  runWithAppContext,
  onUninstall,
}) => {
  // Plugin implementation
  router.beforeEach((to, from, next) => {
    // Permission check logic
    next()
  })
}

// src/router/plugins/cache.ts
export const CachePlugin: RouterPlugin = ({
  router,
  runWithAppContext,
  onUninstall,
}) => {
  // Cache management logic
}
```

##### Application-Side Installation

**Using `batchInstall`**

```ts
// router.ts
import { batchInstall } from 'vue-router-plugin-system'
import { AuthPlugin, CachePlugin } from './plugins'

const router = createRouter({
  history: createWebHistory(),
  routes: [],
})

// Call immediately after createRouter
batchInstall(router, [AuthPlugin, CachePlugin])
```

**Using `createRouter`**

```ts
import { createWebHistory } from 'vue-router'
import { createRouter } from 'vue-router-plugin-system'
import { AuthPlugin, CachePlugin } from './plugins'

const router = createRouter({
  history: createWebHistory(),
  routes: [],
  // New plugins option
  plugins: [AuthPlugin, CachePlugin],
})
```

---

## Core Features

### Standardized Plugin Interface

Provides a unified `RouterPlugin` interface:

```ts
type RouterPlugin = (ctx: RouterPluginContext) => void

interface RouterPluginContext {
  router: Router // Vue Router instance
  runWithAppContext: (handler: (app: App) => void) => void // Execute within App context
  onUninstall: (handler: () => void) => void // Register cleanup callback
}
```

### Automatic Cleanup of Reactive Side Effects

Reactive side effects (`watch`, `computed`, etc.) created within plugins are automatically cleaned up on unmount, without manual `effectScope` management.

---

## API Reference

### Core APIs

**`createRouter(options)`** - Extended router creation function with `plugins` option support

**`withInstall(plugin)`** - Wraps a plugin to support both `app.use()` and `Plugin.install(router)` installation methods

**`batchInstall(router, plugins)`** - Batch install multiple plugins

### Plugin Context

```ts
interface RouterPluginContext {
  router: Router // Vue Router instance
  runWithAppContext: (handler: (app: App) => void) => void // Execute within App context
  onUninstall: (handler: () => void) => void // Register cleanup callback
}
```

- **`router`** - Used for adding route guards, accessing route information, programmatic navigation
- **`runWithAppContext`** - Use when you need App context APIs like `inject()`, pinia store, etc.
- **`onUninstall`** - Register cleanup callbacks, executed in order when the app unmounts

### Lifecycle

- All plugins run within a shared `effectScope`, reactive side effects are automatically cleaned up
- Plugins initialize and clean up in registration order
- Each Router instance's `install` is only wrapped once

---

## 📄 License

[MIT](./LICENSE) © 2025 [leihaohao](https://github.com/l246804)
