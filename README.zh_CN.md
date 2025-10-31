# vue-router-plugin-system

**为 Vue Router 提供标准化的插件系统与统一的安装机制。**

[![npm version](https://badge.fury.io/js/vue-router-plugin-system.svg)](https://badge.fury.io/js/vue-router-plugin-system)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[English Document](./README.md)

---

## 安装

```bash
npm install vue-router-plugin-system
```

## 背景

在 Vue 应用开发中，我们经常需要开发一些与路由强相关的功能，如权限控制、页面缓存等。但是目前 Vue Router 官方并不支持插件机制，导致必须将插件作为 Vue 插件来开发，这会存在以下问题：

- 插件的职责模糊不清，要为 Vue Router 提供功能，又无法确保插件安装在 Vue Router 之后
  ```ts
  // 无法确保 MyPlugin 在 Vue Router 之后安装
  app.use(MyPlugin).use(router)
  ```
- Vue Router 的 `createRouter` 和 `app.use(router)` 分离，无法在创建 Router 时立即安装扩展插件，这会导致插件功能调用可能早于插件初始化的问题

  ```ts
  // router.ts
  const router = createRouter({
    history: createWebHistory(),
    routes: [],
  })

  // 在 router.ts 或其他文件顶级作用域中使用时，
  // 插件的类型扩展已存在，但插件可能尚未初始化
  router.myPlugin.fn()

  // main.ts
  Promise.resolve().then(() => {
    app.use(router).use(MyPlugin)
  })
  ```

### 解决方案

**vue-router-plugin-system** 提供了标准化的插件接口和多种安装策略，让路由扩展功能的开发和集成变得简单、高效、可复用。

---

## 核心特性

### 标准化插件接口

提供统一的 `RouterPlugin` 接口，让所有路由扩展功能都有标准的实现方式：

```ts
type RouterPlugin = (ctx: RouterPluginContext) => void

interface RouterPluginContext {
  router: Router // Vue Router 实例
  runWithAppContext: (handler: (app: App) => void) => void // 在 App 上下文中执行
  onUninstall: (handler: () => void) => void // 注册清理回调
}
```

### 响应式副作用管理

在插件函数作用域及 `runWithAppContext` 回调中创建的响应式副作用（`watch`、`computed` 等）会自动在插件卸载时清理，无需手动处理。

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

## 集成方式

### 方案一：插件库集成

#### 插件库开发

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
    "vue-router-plugin-system": "^1.0.0"
  }
}
```

#### 应用侧安装

```ts
import MyRouterPlugin from 'some-plugin-package'

// 选项 A：直接安装到路由实例，推荐紧跟在 createRouter 之后调用
MyRouterPlugin.install(router)

// 选项 B：作为 Vue 插件注册，必须在 Vue Router 之后，否则会抛出异常
app.use(router)
app.use(MyRouterPlugin)
```

---

### 方案二：应用内部插件集成

应用内部开发的路由插件，希望在应用侧统一注册和管理。

#### 内部插件开发

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

#### 应用侧安装

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

## 插件开发指南

```ts
import type { RouterPlugin } from 'vue-router-plugin-system'
import { inject, watch } from 'vue'

const LoggerPlugin: RouterPlugin = ({
  router,
  runWithAppContext,
  onUninstall,
}) => {
  console.log('插件初始化:', router)

  // 添加路由守卫
  router.beforeEach((to, from, next) => {
    console.log(`路由跳转: ${from.path} → ${to.path}`)
    next()
  })

  // 需要 Vue App 上下文时使用
  runWithAppContext((app) => {
    console.log('Vue 应用已就绪:', app)

    // 可以使用 inject、provide 等 Vue 上下文 API
    const theme = inject('theme', 'light')
    console.log('当前主题:', theme)

    // 创建响应式效果（会自动清理）
    watch(router.currentRoute, (route) => {
      console.log('当前路由:', route.path)
    })
  })

  // 注册清理逻辑
  onUninstall(() => {
    console.log('插件正在清理')
  })
}
```

### 实用插件示例

#### 页面标题插件

```ts
export interface TitlePluginOptions {
  titleTemplate?: (title: string) => string
}

// 当插件需要配置项时，可以通过工厂函数创建插件
export function TitlePlugin({
  titleTemplate = t => t,
}: TitlePluginOptions): RouterPlugin {
  return ({ router, runWithAppContext }) => {
    // 在 App 安装就绪后监听路由变化并更新标题
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

#### 进度条插件

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

## API 参考

### RouterPlugin

插件函数类型定义：

```ts
type RouterPlugin = (ctx: RouterPluginContext) => void
```

### RouterPluginContext

插件上下文对象：

```ts
interface RouterPluginContext {
  router: Router
  runWithAppContext: (handler: (app: App) => void) => void
  onUninstall: (handler: () => void) => void
}
```

#### `router: Router`

Vue Router 实例，可以用来：

- 添加路由守卫
- 访问当前路由信息
- 进行编程式导航

#### `runWithAppContext(handler)`

在 Vue App 上下文中执行代码：

- **何时使用**：当需要使用 `inject()` 等依赖注入 API 时。这在注入像 `pinia stores` 这样的全局属性时很有用。
  ```ts
  runWithAppContext(() => {
    const global = inject('global') // 'hello injections'
    // 获取 pinia store
    const userStore = useAuthStore()
    // ...
  })
  ```
- **自动清理**：回调函数在独立的 `effectScope` 中执行，其中创建的响应式副作用会自动清理。

#### `onUninstall(handler)`

注册清理回调：

- **执行时机**：应用卸载时调用
- **执行顺序**：按注册顺序执行

### createRouter(options)

扩展版的路由创建函数：

```ts
interface RouterOptions extends VueRouter.RouterOptions {
  // 新增插件选项
  plugins?: RouterPlugin[]
}

function createRouter(options: RouterOptions): VueRouter.Router
```

### withInstall(plugin)

将 `RouterPlugin` 包装为支持两种安装模式的插件：

```ts
interface RouterPluginInstall {
  install: (instance: App | Router) => void
}

function withInstall(plugin: RouterPlugin): RouterPlugin & RouterPluginInstall
```

**特性**：

- 支持 Vue 插件系统：`app.use(Plugin)`
- 支持直接安装到路由：`Plugin.install(router)`

### batchInstall(router, plugins)

批量安装多个插件到路由实例上，等价于对每个插件调用 `plugin.install(router)`：

```ts
function batchInstall(router: Router, plugins: RouterPlugin[]): void
```

### 生命周期和清理机制

#### EffectScope 管理

- 同一 Router 实例上的所有插件在共享的 `effectScope` 中运行
- 当 `app.unmount()` 调用时：
  1. 首先停止 `effectScope`
  2. 然后按注册顺序调用所有 `onUninstall` 处理器
- 确保插件创建的响应式副作用（`watch`、`computed` 等）得到可靠清理

#### 安装顺序和幂等性

- 插件按注册顺序初始化
- `runWithAppContext` 处理器在 `app.use(router)` 后按注册顺序执行
- 每个 Router 实例的 `install` 只会被包装一次
- 本库不会对同一插件的多次注册进行去重，如需去重请在调用方实现

---

## 📄 许可证

[MIT](./LICENSE) © 2025 [leihaohao](https://github.com/l246804)
