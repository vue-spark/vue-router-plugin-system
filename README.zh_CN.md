# vue-router-plugin-system

**为 Vue Router 提供标准化的插件系统与统一的安装机制**

[![npm version](https://badge.fury.io/js/vue-router-plugin-system.svg)](https://badge.fury.io/js/vue-router-plugin-system)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[English Document](./README.md)

---

## 安装

```bash
npm install vue-router-plugin-system
```

## 为什么需要插件系统？

在现代 Vue 应用开发中，我们经常需要为路由添加各种功能：

- **权限控制** - 路由守卫、角色验证
- **页面缓存** - keep-alive 管理、缓存策略
- **埋点统计** - 页面访问追踪、用户行为分析
- **进度条显示** - 路由切换加载状态

### 传统做法的痛点

- **代码分散** - 路由相关逻辑散落在各个文件中，难以统一管理
- **难以复用** - 同样的功能在不同项目中重复实现，缺乏标准化
- **维护困难** - 功能耦合严重，修改一处可能影响多处
- **生命周期混乱** - 缺乏统一的安装和清理机制，容易造成内存泄漏

### 解决方案

**vue-router-plugin-system** 提供了标准化的插件接口和统一的生命周期管理，让路由扩展功能的开发和使用变得简单、可靠、可复用。

---

## 核心特性

### 标准化插件接口

提供统一的 `RouterPlugin` 接口，让所有路由扩展功能都有标准的实现方式：

```typescript
type RouterPlugin = (ctx: RouterPluginContext) => void

interface RouterPluginContext {
  router: Router // Vue Router 实例
  runWithAppContext: (handler: (app: App) => void) => void // 在 App 上下文中执行
  onUninstall: (handler: () => void) => void // 注册清理回调
}
```

### 自动化生命周期管理

- **智能初始化** - 插件按注册顺序初始化
- **响应式清理** - 基于 `effectScope` 自动清理响应式副作用
- **优雅卸载** - 应用卸载时自动调用清理回调，防止内存泄漏

### 类型安全

- 完整的 TypeScript 支持
- 严格的类型检查
- 智能的代码提示和补全

---

## 集成方式

### 方案一：插件库集成

#### 插件库开发

```typescript
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

```typescript
import MyRouterPlugin from 'some-plugin-package'

// 选项 A：直接安装到路由实例
MyRouterPlugin.install(router)

// 选项 B：作为 Vue 插件注册
app.use(router)
app.use(MyRouterPlugin)
```

---

### 方案二：应用内部插件集成

应用内部开发的路由插件，希望在应用侧统一注册和管理。

#### 内部插件开发

```typescript
// 只需导出 RouterPlugin 实现，无需实现安装机制
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

**使用 `createRouter`**

```typescript
import { createWebHistory } from 'vue-router'
import { createRouter } from 'vue-router-plugin-system'
import { AuthPlugin, CachePlugin } from './plugins'

const router = createRouter({
  history: createWebHistory(),
  routes: [],
  plugins: [AuthPlugin, CachePlugin], // 一次性注册所有插件
})
```

## 插件开发指南

```typescript
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

#### 权限控制插件

```typescript
const AuthPlugin: RouterPlugin = ({ router }) => {
  router.beforeEach(async (to, from, next) => {
    if (to.meta.requiresAuth) {
      // 检查用户认证状态（需要自行实现）
      const isAuthenticated = await checkUserAuth()
      if (!isAuthenticated) {
        next('/login')
        return
      }
    }
    next()
  })
}

// 示例：用户认证检查函数
async function checkUserAuth(): Promise<boolean> {
  // 实际项目中可能从 localStorage、API 等获取认证状态
  return localStorage.getItem('token') !== null
}
```

#### 页面标题插件

```typescript
const TitlePlugin: RouterPlugin = ({ router, runWithAppContext }) => {
  // 在 app 安装就绪后监听路由变化并更新标题
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

#### 进度条插件

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

## API 参考

### RouterPlugin

插件函数类型定义：

```typescript
type RouterPlugin = (ctx: RouterPluginContext) => void
```

### RouterPluginContext

插件上下文对象：

```typescript
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

- **何时使用**：需要访问 Vue App 实例时（如 `provide/inject`、全局配置等）
- **执行时机**：
  - 如果路由已安装到应用中，立即执行
  - 如果尚未安装，会排队等待 `app.use(router)` 后按注册顺序执行
- **自动清理**：在 `effectScope` 中执行，响应式副作用会自动清理

#### `onUninstall(handler)`

注册清理回调：

- **执行时机**：应用卸载时调用
- **执行顺序**：按注册顺序执行
- **注意事项**：此时 `effectScope` 已停止，响应式效果不再触发

### createRouter(options)

扩展版的路由创建函数：

```typescript
interface RouterOptions {
  // 继承 vue-router 的所有选项
  history: RouterHistory
  routes: RouteRecordRaw[]
  // 新增插件选项
  plugins?: RouterPlugin[]
}

function createRouter(options: RouterOptions): Router
```

### withInstall(plugin)

将 RouterPlugin 包装为支持两种安装模式的插件：

```typescript
interface RouterPluginInstall {
  install: (instance: App | Router) => void
}

function withInstall(plugin: RouterPlugin): RouterPlugin & RouterPluginInstall
```

**特性**：

- 支持 Vue 插件系统：`app.use(Plugin)`
- 支持直接安装到路由：`Plugin.install(router)`
- 幂等性：每个 Router 实例只会被包装一次
- 顺序保证：插件按注册顺序初始化

### 生命周期和清理机制

#### EffectScope 管理

- 同一 Router 实例上的所有插件在共享的 `effectScope` 中运行
- 当 `app.unmount()` 调用时：
  1. 首先停止 `effectScope`
  2. 然后按注册顺序调用所有 `onUninstall` 处理器
  3. 清空内部队列
- 确保插件创建的响应式副作用（`watch`、`computed` 等）得到可靠清理

#### 安装顺序和幂等性

- 插件按注册顺序初始化
- `runWithAppContext` 处理器在 `app.use(router)` 后按注册顺序执行
- 每个 Router 实例的 `install` 只会被包装一次
- 本库不会对同一插件的多次注册进行去重，如需去重请在调用方实现

---

## 📄 许可证

[MIT](./LICENSE) © 2025 [leihaohao](https://github.com/l246804)
