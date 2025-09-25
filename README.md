# vue-router-plugin-system

Standardized plugin system and unified installation mechanism for Vue Router.

[中文文档](./README.zh_CN.md)

---

## 📦 Installation

```bash
npm i vue-router-plugin-system
```

---

## 🧩 Two integration approaches

### Approach 1: As a “pre-installed dependency” (centrally installed by the application)

- Suitable for: registering all router plugins on the application side, ensuring each is installed only once and shares the same internal mechanism.
- Plugin side
  - Only export the implementation of `RouterPlugin`; no need to implement an installation mechanism
  - Declare this package in `peerDependencies`
- Application side: two ways to perform centralized installation
  1. The application uses this package’s `createRouter`

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

  2. Use `withInstall` for installation adaptation

     ```ts
     import { BarPlugin, FooPlugin } from 'some-libs'
     import { withInstall } from 'vue-router-plugin-system'

     const Foo = withInstall(FooPlugin)
     const Bar = withInstall(BarPlugin)

     // Option A: install directly onto the router (can be called before app.use(router); runWithApp will be deferred)
     Foo.install(router)
     Bar.install(router)

     // Option B: register as a Vue plugin (must call app.use(router) before app.use(Foo/Bar))
     app.use(router)
     app.use(Foo).use(Bar)
     ```

### Approach 2: As a “dev dependency” (installed by the app via Vue’s plugin system)

- Suitable for: exposing the plugin directly as a Vue plugin (the app only needs `app.use(plugin)`).
- Plugin side
  - Add this package as a dev dependency, wrap the plugin with `withInstall`, and bundle it together with your build output (`dist`)
  - Export the wrapped plugin object

  ```ts
  import { withInstall } from 'vue-router-plugin-system'

  export const MyPlugin = withInstall((ctx) => {
    // Plugin implementation
  })
  ```

- Application side

  ```ts
  // Option A: install directly onto the router (can be called before app.use(router); runWithApp will be deferred)
  MyPlugin.install(router)

  // Option B: register as a Vue plugin (must call app.use(router) before app.use(MyPlugin))
  app.use(router)
  app.use(MyPlugin)
  ```

---

## 🔍 Detailed API and runtime model

### RouterPlugin

Each plugin is invoked once during the application’s lifetime and receives the context object:

```ts
interface RouterPluginContext {
  router: Router
  runWithApp: (handler: (app: App) => void) => void
  onUninstall: (handler: () => void) => void
}

type RouterPlugin = (ctx: RouterPluginContext) => void
```

### EffectScope and cleanup

- All plugins on the same Router instance run within a shared `effectScope` (maintained by this library).
- When `app.unmount()` is called, the `effectScope` is first stopped, then all `onUninstall` handlers are invoked in registration order, and the internal queue is cleared.
- This ensures reactive side effects created by plugins (`watch`, `computed`, etc.) are cleaned up reliably.

### `runWithApp(handler)`

- Use when the plugin needs access to the Vue App instance (e.g. `provide/inject`, global config).
- Behavior:
  - If the `router` has already been installed into the `app`, the `handler` executes immediately (inside the `effectScope`).
  - If not yet installed, it is queued and flushed in registration order after `app.use(router)`.

### `onUninstall(handler)`

- Register one-off cleanup logic to run when the application is unmounted.
- Note: Since the `effectScope` has been stopped before `onUninstall` runs, reactive effects will no longer trigger during cleanup; release non-reactive resources here (timers, subscriptions, DOM, etc.).

### `createRouter(options)`

- Equivalent to `vue-router`’s `createRouter`, with an extra `options.plugins: RouterPlugin[]` to register plugins at creation time.
- Installation order follows the array order; corresponding `runWithApp` handlers are flushed in the same order after `app.use(router)`.

### `withInstall(plugin)`

- Wraps a `RouterPlugin` so it supports both installation modes:
  - Via Vue’s plugin system: `app.use(Plugin)` (the `router` must be installed first)
  - Install directly onto the Router: `Plugin.install(router)` (can be called before or after `app.use(router)`)
- Details:
  - Calling `app.use(Plugin)` before the `router` is installed will throw an error
  - The internal wrapping of `router.install` is idempotent: each Router is wrapped only once

### Installation order and idempotency

- Plugins initialize in registration order.
- `runWithApp` handlers are flushed in registration order after `app.use(router)`.
- Each Router instance’s `install` will only be wrapped once.
- This library does not de-duplicate multiple registrations of the same plugin—if you need deduplication, enforce it at the call site.

## License

[MIT](./LICENSE) © 2025 [leihaohao](https://github.com/l246804)
