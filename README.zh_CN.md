# vue-router-plugin-system

[English Document](./README.md)

为 Vue Router 提供标准化插件系统的轻量级解决方案。

---

## 🌟 核心优势

| 功能特性            | 描述                                                      |
| ------------------- | --------------------------------------------------------- |
| 🧱 标准化插件接口   | 提供统一的插件开发规范，支持自动化注册/卸载               |
| 🔁 响应式副作用管理 | 自动追踪并清理插件内部的响应式副作用                      |
| ⚖️ 双模式兼容       | 同时支持 Vue Router 插件系统与 Vue 插件系统的兼容开发模式 |

---

## 📦 安装

```bash
npm install vue-router-plugin-system
```

---

## 🚀 快速上手

### 模式一：Vue Router 插件模式（推荐）

**1. 开发插件**

```ts
import type { RouterPlugin } from 'vue-router-plugin-system'
import { ref } from 'vue'

export const NavigationStatePlugin: RouterPlugin = (ctx) => {
  // 扩展响应式导航状态
  ctx.router.isNavigating = ref(false)

  // 注册导航守卫
  ctx.router.beforeEach(() => {
    ctx.router.isNavigating.value = true
  })
  ctx.router.afterEach(() => {
    ctx.router.isNavigating.value = false
  })

  // 卸载钩子
  ctx.onUninstall(() => {
    ctx.router.isNavigating.value = false
  })
}
```

**2. 应用集成**

```ts
import { createWebHistory } from 'vue-router'
import { createRouter } from 'vue-router-plugin-system'
import { NavigationStatePlugin } from './plugins'

const router = createRouter({
  history: createWebHistory(),
  routes: [],
  plugins: [NavigationStatePlugin],
})

// 使用扩展属性
router.isNavigating.value
```

### 模式二：Vue 插件模式（兼容方案）

**1. 开发插件**

```ts
import type { RouterPlugin } from 'vue-router-plugin-system'
import { ref } from 'vue'

export const NavigationStatePlugin: RouterPlugin = (ctx) => {
  // 插件实现逻辑同上
}
```

**2. 应用集成**

```ts
// main.ts
import { asVuePlugin } from 'vue-router-plugin-system'

const app = createApp(App)
app.use(router) // 先挂载路由
app.use(asVuePlugin(NavigationStatePlugin)) // 后注册插件
```

---

## ⚠️ 模式对比

| 特性           | Vue Router 插件模式 | Vue 插件模式       |
| -------------- | ------------------- | ------------------ |
| 初始化顺序     | 优先于应用逻辑      | 依赖客户端使用顺序 |
| 导航守卫优先级 | 更高                | 依赖注册顺序       |
| 响应式管理     | 自动清理            | 自动清理           |

---

## 📚 类型定义

```ts
interface RouterPluginContext {
  /**
   * Vue Router 实例
   */
  router: Router
  /**
   * 使用 vue app 实例执行回调函数
   */
  runWithApp: (handler: RouterPluginRunWithAppHandler) => void
  /**
   * 注册插件被卸载时的回调函数，支持多次调用
   */
  onUninstall: (handler: RouterPluginUninstallHandler) => void
}

interface RouterPlugin {
  /**
   * 插件初始化函数
   */
  (ctx: RouterPluginContext): void
}
```

---

## 🤝 贡献指南

欢迎提交 PR 或 issue！请确保：

1. 通过全部单元测试
2. 保持 TypeScript 类型完整性
3. 添加必要文档说明

## License

[MIT](./LICENSE) License © 2025 [leihaohao](https://github.com/l246804)
