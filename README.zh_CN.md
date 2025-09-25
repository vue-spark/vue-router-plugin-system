# vue-router-plugin-system

为 Vue Router 提供标准化的插件系统与统一的安装机制。

[English Document](./README.md)

---

## 📦 安装

```bash
npm i vue-router-plugin-system
```

---

## 🧩 两种集成方式

### 方案一：作为“预装依赖”（由应用侧统一安装）

- 适用：希望在“应用侧”统一注册所有的路由插件，确保只安装一次、共享同一套内部机制。
- 插件侧
  - 仅导出 `RouterPlugin` 的实现，无需实现安装机制
  - 将本包声明为 `peerDependencies`
- 应用侧：统一安装有两种做法
  1. 应用使用本包的 `createRouter`

     ```ts
     import { BarPlugin, FooPlugin } from 'some-libs'
     import { createWebHistory } from 'vue-router'
     import { createRouter } from 'vue-router-plugin-system'

     const router = createRouter({
       history: createWebHistory(),
       routes: [],
       plugins: [FooPlugin, BarPlugin],
     })
     ```

  2. 使用 `withInstall` 做安装适配

     ```ts
     import { BarPlugin, FooPlugin } from 'some-libs'
     import { withInstall } from 'vue-router-plugin-system'

     const Foo = withInstall(FooPlugin)
     const Bar = withInstall(BarPlugin)

     // 方式 A：直接装到 router 上（可在 app.use(router) 之前调用，会延迟 runWithApp）
     Foo.install(router)
     Bar.install(router)

     // 方式 B：作为 Vue 插件安装（必须先 app.use(router) 再 app.use(Foo/Bar)）
     app.use(router)
     app.use(Foo).use(Bar)
     ```

### 方案二：作为“开发依赖”（由应用侧通过 Vue 插件系统安装）

- 适用：插件希望直接以 Vue 插件形式对外暴露（应用只需 `app.use(插件)`）。
- 插件侧
  - 将本包作为开发依赖，使用 `withInstall` 包装后，把它随产物（`dist`）一起打包
  - 导出包装后的插件对象

  ```ts
  import { withInstall } from 'vue-router-plugin-system'

  export const MyPlugin = withInstall((ctx) => {
    // 插件实现
  })
  ```

- 应用侧

  ```ts
  // 方式 A：直接装到 router 上（可在 app.use(router) 之前调用，会延迟 runWithApp）
  MyPlugin.install(router)

  // 方式 B：作为 Vue 插件安装（必须先 app.use(router) 再 app.use(MyPlugin)）
  app.use(router)
  app.use(MyPlugin)
  ```

---

## 🔍 详细 API 与运行时模型

### RouterPlugin

每个插件在应用生命周期内被调用一次，拿到上下文对象：

```ts
interface RouterPluginContext {
  router: Router
  runWithApp: (handler: (app: App) => void) => void
  onUninstall: (handler: () => void) => void
}

type RouterPlugin = (ctx: RouterPluginContext) => void
```

### `EffectScope` 与清理

- 同一 Router 实例上的所有插件运行在一个共享的 `effectScope` 中（由本库维护）。
- 在 `app.unmount()` 时，会先停止该 `effectScope`，然后按注册顺序调用所有 `onUninstall`，并清空内部队列。
- 这保证了插件中创建的响应式副作用（`watch`、`computed` 等）会被可靠清理。

### `runWithApp(handler)`

- 当插件需要访问 Vue App 实例时使用（如 `provide/inject`、全局配置）。
- 行为：
  - 若 `router` 已安装到 `app`，`handler` 会立即执行（在 `effectScope` 中）。
  - 若尚未安装，则入队，待 `app.use(router)` 后按注册顺序一次性刷新执行。

### `onUninstall(handler)`

- 注册在应用卸载时执行的一次性清理逻辑。
- 注意：由于在 `onUninstall` 执行前 `effectScope` 已停止，清理阶段的响应式不会再触发；请在此释放非响应式资源（定时器、订阅、DOM 等）。

### `createRouter(options)`

- 等价于 `vue-router` 的 `createRouter`，额外支持 `options.plugins: RouterPlugin[]` 以在创建时注册插件。
- 安装顺序即数组顺序；对应的 `runWithApp` 在 `app.use(router)` 后按相同顺序刷新。

### `withInstall(plugin)`

- 将 `RouterPlugin` 包装为同时兼容两种安装方式：
  - 通过 Vue 插件系统：`app.use(Plugin)`（必须先安装 `router`）
  - 直接安装到 Router：`Plugin.install(router)`（可在 `app.use(router)` 之前或之后调用）
- 细节：
  - 若在未安装 `router` 的情况下调用 `app.use(Plugin)` 会抛出错误
  - 内部对 `router.install` 的包裹具备幂等性：同一 Router 只会包裹一次

### 安装顺序与幂等性

- 插件按注册顺序初始化。
- `runWithApp` 处理函数在 `app.use(router)` 后按注册顺序刷新。
- 每个 Router 实例的 `install` 只会被包裹一次。
- 本库不强制去重同一插件的多次注册——如需去重，请在调用端自行约束。

## License

[MIT](./LICENSE) © 2025 [leihaohao](https://github.com/l246804)
