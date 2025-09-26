# vue-router-plugin-system

**Standardized plugin system and unified installation mechanism for Vue Router**

[![npm version](https://badge.fury.io/js/vue-router-plugin-system.svg)](https://badge.fury.io/js/vue-router-plugin-system)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[中文文档](./README.zh_CN.md)

---

## Installation

```bash
npm install vue-router-plugin-system
```

## Why Do We Need a Plugin System?

In modern Vue application development, we often need to add various functionalities to routing:

- **Permission Control** - Route guards, role verification
- **Page Caching** - keep-alive management, caching strategies
- **Analytics Tracking** - Page visit tracking, user behavior analysis
- **Progress Bar Display** - Loading states during route transitions

### Pain Points of Traditional Approaches

- **Scattered Code** - Route-related logic scattered across multiple files, difficult to manage uniformly
- **Hard to Reuse** - Same functionality repeatedly implemented in different projects, lacking standardization
- **Difficult to Maintain** - Tight coupling between features, changing one part may affect multiple others
- **Chaotic Lifecycle** - Lack of unified installation and cleanup mechanisms, prone to memory leaks

### Our Solution

**vue-router-plugin-system** provides standardized plugin interfaces and unified lifecycle management, making the development and usage of route extension features simple, reliable, and reusable.

---

## Core Features

### Standardized Plugin Interface

Provides a unified `RouterPlugin` interface, giving all route extension features a standard implementation approach:

```typescript
type RouterPlugin = (ctx: RouterPluginContext) => void

interface RouterPluginContext {
  router: Router // Vue Router instance
  runWithAppContext: (handler: (app: App) => void) => void // Execute in App context
  onUninstall: (handler: () => void) => void // Register cleanup callback
}
```

### Automated Lifecycle Management

- **Smart Initialization** - Plugins initialize in registration order
- **Reactive Cleanup** - Automatically clean up reactive side effects based on `effectScope`
- **Graceful Uninstall** - Automatically call cleanup callbacks when app unmounts, preventing memory leaks

### Type Safety

- Complete TypeScript support
- Strict type checking
- Intelligent code hints and completion

---

## Integration Approaches

### Approach 1: Plugin Library Integration

#### Plugin Library Development

```typescript
// Add this package as dev dependency, wrap plugin with withInstall and bundle to dist
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

#### Application Installation

```typescript
import MyRouterPlugin from 'some-plugin-package'

// Option A: Install directly to router instance
MyRouterPlugin.install(router)

// Option B: Register as Vue plugin
app.use(router)
app.use(MyRouterPlugin)
```

---

### Approach 2: Internal Application Plugin Integration

Route plugins developed internally within the application, intended for unified registration and management on the application side.

#### Internal Plugin Development

```typescript
// Only export RouterPlugin implementation, no need to implement installation mechanism
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

#### Application Installation

**Using `createRouter`**

```typescript
import { createWebHistory } from 'vue-router'
import { createRouter } from 'vue-router-plugin-system'
import { AuthPlugin, CachePlugin } from './plugins'

const router = createRouter({
  history: createWebHistory(),
  routes: [],
  plugins: [AuthPlugin, CachePlugin], // Register all plugins at once
})
```

## Plugin Development Guide

```typescript
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
    console.log(`Route transition: ${from.path} → ${to.path}`)
    next()
  })

  // Use when Vue App context is needed
  runWithAppContext((app) => {
    console.log('Vue app is ready:', app)

    // Can use inject, provide and other Vue context APIs
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

#### Permission Control Plugin

```typescript
const AuthPlugin: RouterPlugin = ({ router }) => {
  router.beforeEach(async (to, from, next) => {
    if (to.meta.requiresAuth) {
      // Check user authentication status (implement yourself)
      const isAuthenticated = await checkUserAuth()
      if (!isAuthenticated) {
        next('/login')
        return
      }
    }
    next()
  })
}

// Example: User authentication check function
async function checkUserAuth(): Promise<boolean> {
  // In real projects, might get auth status from localStorage, API, etc.
  return localStorage.getItem('token') !== null
}
```

#### Page Title Plugin

```typescript
const TitlePlugin: RouterPlugin = ({ router, runWithAppContext }) => {
  // Listen for route changes and update title after app installation is ready
  runWithAppContext(() => {
    watch(
      router.currentRoute,
      (route) => {
        document.title = route.meta.title || 'Default Title'
      },
      { immediate: true },
    )
  })
}
```

#### Progress Bar Plugin

```typescript
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

```typescript
type RouterPlugin = (ctx: RouterPluginContext) => void
```

### RouterPluginContext

Plugin context object:

```typescript
interface RouterPluginContext {
  router: Router
  runWithAppContext: (handler: (app: App) => void) => void
  onUninstall: (handler: () => void) => void
}
```

#### `router: Router`

Vue Router instance, can be used to:

- Add route guards
- Access current route information
- Perform programmatic navigation

#### `runWithAppContext(handler)`

Execute code in Vue App context:

- **When to use**: When you need to access Vue App instance (like `provide/inject`, global config, etc.)
- **Execution timing**:
  - If router is already installed to app, executes immediately
  - If not yet installed, queues and waits for `app.use(router)` then executes in registration order
- **Auto cleanup**: Executes in `effectScope`, reactive side effects are automatically cleaned up

#### `onUninstall(handler)`

Register cleanup callback:

- **Execution timing**: Called when app unmounts
- **Execution order**: Executed in registration order
- **Note**: At this point `effectScope` has stopped, reactive effects no longer trigger

### createRouter(options)

Extended router creation function:

```typescript
interface RouterOptions {
  // Inherits all options from vue-router
  history: RouterHistory
  routes: RouteRecordRaw[]
  // New plugin option
  plugins?: RouterPlugin[]
}

function createRouter(options: RouterOptions): Router
```

### withInstall(plugin)

Wraps RouterPlugin to support two installation modes:

```typescript
interface RouterPluginInstall {
  install: (instance: App | Router) => void
}

function withInstall(plugin: RouterPlugin): RouterPlugin & RouterPluginInstall
```

**Features**:

- Supports Vue plugin system: `app.use(Plugin)`
- Supports direct installation to router: `Plugin.install(router)`
- Idempotent: Each Router instance is only wrapped once
- Order guarantee: Plugins initialize in registration order

### Lifecycle and Cleanup Mechanism

#### EffectScope Management

- All plugins on the same Router instance run in a shared `effectScope`
- When `app.unmount()` is called:
  1. First stop `effectScope`
  2. Then call all `onUninstall` handlers in registration order
  3. Clear internal queue
- Ensures reactive side effects created by plugins (`watch`, `computed`, etc.) are reliably cleaned up

#### Installation Order and Idempotency

- Plugins initialize in registration order
- `runWithAppContext` handlers execute in registration order after `app.use(router)`
- Each Router instance's `install` is only wrapped once
- This library does not deduplicate multiple registrations of the same plugin—if deduplication is needed, implement it at the call site

---

## License

[MIT](./LICENSE) © 2025 [leihaohao](https://github.com/l246804)
