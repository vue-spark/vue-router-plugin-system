# vue-router-plugin-system

**为 Vue Router 提供标准化的插件系统与统一的安装机制。**

[![npm version](https://badge.fury.io/js/vue-router-plugin-system.svg)](https://badge.fury.io/js/vue-router-plugin-system)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[English Document](./README.md)

---

## 背景

在 Vue 应用开发中，我们经常需要围绕 Vue Router 开发各种功能，比如页面导航方向、跨页面通信、滚动位置还原等。这些功能本可以作为 Vue Router 的扩展独立开发，但由于 Vue Router 官方并不支持插件机制，我们不得不将它们作为 Vue 插件来实现，这带来了以下问题：

<details>
<summary><b>插件的职责模糊不清</b></summary>

以页面缓存插件为例，它本应为 Vue Router 提供功能，却必须作为 Vue 插件开发，这让人感觉关注点有所偏离：

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
    throw new Error('[KeepAlivePlugin] 请先安装 Vue Router.')
  }

  const keepAlivePageSet = shallowReactive(new Set<string>())
  const keepAlivePages = computed(() => Array.from(keepAlivePageSet))

  router.keepAlive = {
    pages: keepAlivePages,
    add: (page: string) => keepAlivePageSet.add(page),
    remove: (page: string) => keepAlivePageSet.delete(page),
  }

  // 在路由变化时自动更新缓存列表
  router.afterEach((to, from) => {
    if (to.meta.keepAlive) {
      keepAlivePageSet.add(to.fullPath)
    }
  })
}
```

</details>

<details>
<summary><b>需要手动清理响应式副作用</b></summary>

仍以页面缓存插件为例，我们需要使用 `effectScope` 创建响应式副作用，并在应用卸载时手动停止：

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
<summary><b>插件初始化时机问题</b></summary>

Vue Router 的 `createRouter()` 和 `app.use(router)` 是分离的，无法在创建 Router 时立即安装扩展插件，这可能导致插件功能在初始化之前就被调用：

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

// KeepAlivePlugin 的类型扩展已生效，但插件可能尚未初始化
// 手动调用插件方法
router.keepAlive.add('/home')
```

```ts
// main.ts
app.use(router).use(KeepAlivePlugin)
```

</details>

<br>

本库旨在提供标准化的插件接口和多种安装策略，让路由扩展功能的开发和集成变得简单、高效、可复用。

---

## 快速开始

### 安装

```bash
npm install vue-router-plugin-system
```

### 插件开发

一个完整的插件示例：

```ts
import type { RouterPlugin } from 'vue-router-plugin-system'
import { inject, watch } from 'vue'

const LoggerPlugin: RouterPlugin = ({
  router,
  runWithAppContext,
  onUninstall,
}) => {
  // 添加路由守卫
  router.beforeEach((to, from, next) => {
    console.log(`路由跳转: ${from.path} → ${to.path}`)
    next()
  })

  // 需要 App 上下文时使用（如 inject、pinia store 等）
  runWithAppContext(() => {
    const theme = inject('theme', 'light')
    watch(router.currentRoute, (route) => {
      console.log('当前路由:', route.path, '主题:', theme)
    })
  })

  // 注册清理逻辑
  onUninstall(() => {
    console.log('插件正在清理')
  })
}
```

### 集成方式

#### 方案一：插件库集成

##### 插件库开发

```ts
// 将此包作为开发依赖，用 withInstall 包装插件并打包到 dist 中
import { withInstall } from 'vue-router-plugin-system'

const MyRouterPlugin = withInstall(
  ({ router, runWithAppContext, onUninstall }) => {
    // 插件实现
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

##### 应用侧安装

```ts
import MyRouterPlugin from 'some-plugin-package'

// 选项 A：直接安装到路由实例，推荐紧跟在 createRouter 之后调用
MyRouterPlugin.install(router)

// 选项 B：作为 Vue 插件注册，必须在 Vue Router 之后，否则会抛出异常
app.use(router)
app.use(MyRouterPlugin)
```

#### 方案二：应用内部插件集成

对于应用内部开发的路由插件，可以在应用侧统一注册和管理。

##### 内部插件开发

```ts
// 只需导出 RouterPlugin 实现
import type { RouterPlugin } from 'vue-router-plugin-system'

// src/router/plugins/auth.ts
export const AuthPlugin: RouterPlugin = ({
  router,
  runWithAppContext,
  onUninstall,
}) => {
  // 插件实现
  router.beforeEach((to, from, next) => {
    // 权限检查逻辑
    next()
  })
}

// src/router/plugins/cache.ts
export const CachePlugin: RouterPlugin = ({
  router,
  runWithAppContext,
  onUninstall,
}) => {
  // 缓存管理逻辑
}
```

##### 应用侧安装

**使用 `batchInstall`**

```ts
// router.ts
import { batchInstall } from 'vue-router-plugin-system'
import { AuthPlugin, CachePlugin } from './plugins'

const router = createRouter({
  history: createWebHistory(),
  routes: [],
})

// 紧跟在 createRouter 之后调用
batchInstall(router, [AuthPlugin, CachePlugin])
```

**使用 `createRouter`**

```ts
import { createWebHistory } from 'vue-router'
import { createRouter } from 'vue-router-plugin-system'
import { AuthPlugin, CachePlugin } from './plugins'

const router = createRouter({
  history: createWebHistory(),
  routes: [],
  // 新增插件选项
  plugins: [AuthPlugin, CachePlugin],
})
```

---

## 核心特性

### 标准化插件接口

提供统一的 `RouterPlugin` 接口：

```ts
type RouterPlugin = (ctx: RouterPluginContext) => void

interface RouterPluginContext {
  router: Router // Vue Router 实例
  runWithAppContext: (handler: (app: App) => void) => void // 在 App 上下文中执行
  onUninstall: (handler: () => void) => void // 注册清理回调
}
```

### 自动清理响应式副作用

插件中创建的响应式副作用（`watch`、`computed` 等）会在卸载时自动清理，无需手动管理 `effectScope`。

---

## API 参考

### 核心 API

**`createRouter(options)`** - 扩展版路由创建函数，支持 `plugins` 选项

**`withInstall(plugin)`** - 包装插件，支持 `app.use()` 和 `Plugin.install(router)` 两种安装方式

**`batchInstall(router, plugins)`** - 批量安装多个插件

### 插件上下文

```ts
interface RouterPluginContext {
  router: Router // Vue Router 实例
  runWithAppContext: (handler: (app: App) => void) => void // 在 App 上下文中执行
  onUninstall: (handler: () => void) => void // 注册清理回调
}
```

- **`router`** - 用于添加路由守卫、访问路由信息、编程式导航
- **`runWithAppContext`** - 当需要使用 `inject()`、pinia store 等 App 上下文 API 时使用
- **`onUninstall`** - 注册清理回调，在应用卸载时按顺序执行

### 生命周期

- 所有插件在共享的 `effectScope` 中运行，响应式副作用自动清理
- 插件按注册顺序初始化和清理
- 每个 Router 实例的 `install` 只会被包装一次

---

## 📄 许可证

[MIT](./LICENSE) © 2025 [leihaohao](https://github.com/l246804)
