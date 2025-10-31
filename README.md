# vue-router-plugin-system

**A standardized plugin system and unified installation mechanism for Vue Router.**

[![npm version](https://badge.fury.io/js/vue-router-plugin-system.svg)](https://badge.fury.io/js/vue-router-plugin-system)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[中文文档](./README.zh_CN.md)

---

## Installation

```bash
npm install vue-router-plugin-system
```

## Background

When developing Vue applications, we often need to build features that are tightly coupled with routing, such as permission control and page caching. However, Vue Router doesn't officially support a plugin mechanism, forcing us to develop these features as Vue plugins instead. This approach introduces several challenges:

- Plugin responsibilities become unclear—they need to extend Vue Router but can't guarantee installation order after the router
  ```ts
  // Cannot ensure MyPlugin is installed after Vue Router
  app.use(MyPlugin).use(router)
  ```
- Vue Router's `createRouter` and `app.use(router)` are separated, preventing immediate plugin installation at router creation time. This can lead to plugin functionality being called before initialization

  ```ts
  // router.ts
  const router = createRouter({
    history: createWebHistory(),
    routes: [],
  })

  // When used in router.ts or other file's top-level scope,
  // the plugin's type extensions exist, but the plugin may not be initialized yet
  router.myPlugin.fn()

  // main.ts
  Promise.resolve().then(() => {
    app.use(router).use(MyPlugin)
  })
  ```

### Solution

**vue-router-plugin-system** provides standardized plugin interfaces and multiple installation strategies, making router extension development and integration simple, efficient, and reusable.

---

## Core Features

### Standardized Plugin Interface

Provides a unified `RouterPlugin` interface that gives all router extensions a standard implementation pattern:

```ts
type RouterPlugin = (ctx: RouterPluginContext) => void

interface RouterPluginContext {
  router: Router // Vue Router instance
  runWithAppContext: (handler: (app: App) => void) => void // Execute within App context
  onUninstall: (handler: () => void) => void // Register cleanup callback
}
```

### Reactive Side Effect Management

Reactive side effects (`watch`, `computed`, etc.) created within the plugin function scope and `runWithAppContext` callbacks are automatically cleaned up when the plugin is uninstalled—no manual handling required.

```ts
import { watch } from 'vue'

const MyPlugin: RouterPlugin = ({ router }) => {
  router.myPlugin = {
    data: ref([]),
  }

  watch(router.currentRoute, (route) => {
    router.myPlugin.data.value = route.matched.map(match => match.meta.title)
  })
}
```

---

## Integration Approaches

### Approach 1: Plugin Library Integration

#### Plugin Library Development

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
    "vue-router-plugin-system": "^1.0.0"
  }
}
```

#### Application-Side Installation

```ts
import MyRouterPlugin from 'some-plugin-package'

// Option A: Install directly to router instance, recommended immediately after createRouter
MyRouterPlugin.install(router)

// Option B: Register as a Vue plugin, must be after Vue Router or it will throw an error
app.use(router)
app.use(MyRouterPlugin)
```

---

### Approach 2: Internal Application Plugin Integration

For router plugins developed internally within your application that you want to register and manage centrally.

#### Internal Plugin Development

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

#### Application-Side Installation

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

## Plugin Development Guide

```ts
import type { RouterPlugin } from 'vue-router-plugin-system'
import { inject, watch } from 'vue'

const LoggerPlugin: RouterPlugin = ({
  router,
  runWithAppContext,
  onUninstall,
}) => {
  console.log('Plugin initialized:', router)

  // Add route guards
  router.beforeEach((to, from, next) => {
    console.log(`Route navigation: ${from.path} → ${to.path}`)
    next()
  })

  // Use when Vue App context is needed
  runWithAppContext((app) => {
    console.log('Vue app is ready:', app)

    // Can use inject, provide, and other Vue context APIs
    const theme = inject('theme', 'light')
    console.log('Current theme:', theme)

    // Create reactive effects (automatically cleaned up)
    watch(router.currentRoute, (route) => {
      console.log('Current route:', route.path)
    })
  })

  // Register cleanup logic
  onUninstall(() => {
    console.log('Plugin is being cleaned up')
  })
}
```

### Practical Plugin Examples

#### Page Title Plugin

```ts
export interface TitlePluginOptions {
  titleTemplate?: (title: string) => string
}

// When a plugin needs configuration options, use a factory function to create it
export function TitlePlugin({
  titleTemplate = t => t,
}: TitlePluginOptions): RouterPlugin {
  return ({ router, runWithAppContext }) => {
    // Listen for route changes and update title after App installation is ready
    runWithAppContext(() => {
      watchEffect(() => {
        const title = router.currentRoute.value.meta.title
        if (!title) {
          return
        }

        document.title = titleTemplate(title)
      })
    })
  }
}
```

#### Progress Bar Plugin

```ts
const ProgressPlugin: RouterPlugin = ({ router }) => {
  router.beforeEach((to, from, next) => {
    NProgress.start()
    next()
  })

  router.afterEach(() => {
    NProgress.done()
  })
}
```

---

## API Reference

### RouterPlugin

Plugin function type definition:

```ts
type RouterPlugin = (ctx: RouterPluginContext) => void
```

### RouterPluginContext

Plugin context object:

```ts
interface RouterPluginContext {
  router: Router
  runWithAppContext: (handler: (app: App) => void) => void
  onUninstall: (handler: () => void) => void
}
```

#### `router: Router`

Vue Router instance, which can be used to:

- Add route guards
- Access current route information
- Perform programmatic navigation

#### `runWithAppContext(handler)`

Execute code within the Vue App context:

- **When to use**: When you need to use dependency injection APIs like `inject()`. This is useful for injecting global properties like `pinia stores`.
  ```ts
  runWithAppContext(() => {
    const global = inject('global') // 'hello injections'
    // Get pinia store
    const userStore = useAuthStore()
    // ...
  })
  ```
- **Auto cleanup**: The callback function executes within a dedicated `effectScope`, and reactive side effects created within it are automatically cleaned up.

#### `onUninstall(handler)`

Register cleanup callback:

- **Execution timing**: Called when the application unmounts
- **Execution order**: Executed in registration order

### createRouter(options)

Extended router creation function:

```ts
interface RouterOptions extends VueRouter.RouterOptions {
  // New plugins option
  plugins?: RouterPlugin[]
}

function createRouter(options: RouterOptions): VueRouter.Router
```

### withInstall(plugin)

Wraps a `RouterPlugin` to support two installation modes:

```ts
interface RouterPluginInstall {
  install: (instance: App | Router) => void
}

function withInstall(plugin: RouterPlugin): RouterPlugin & RouterPluginInstall
```

**Features**:

- Supports Vue plugin system: `app.use(Plugin)`
- Supports direct installation to router: `Plugin.install(router)`

### batchInstall(router, plugins)

Batch install multiple plugins to a router instance, equivalent to calling `plugin.install(router)` for each plugin:

```ts
function batchInstall(router: Router, plugins: RouterPlugin[]): void
```

### Lifecycle and Cleanup Mechanism

#### EffectScope Management

- All plugins on the same Router instance run within a shared `effectScope`
- When `app.unmount()` is called:
  1. First, stop the `effectScope`
  2. Then, call all `onUninstall` handlers in registration order
- Ensures reactive side effects created by plugins (`watch`, `computed`, etc.) are reliably cleaned up

#### Installation Order and Idempotency

- Plugins initialize in registration order
- `runWithAppContext` handlers execute in registration order after `app.use(router)`
- Each Router instance's `install` is only wrapped once
- This library does not deduplicate multiple registrations of the same plugin—if deduplication is needed, implement it at the call site

---

## 📄 License

[MIT](./LICENSE) © 2025 [leihaohao](https://github.com/l246804)
