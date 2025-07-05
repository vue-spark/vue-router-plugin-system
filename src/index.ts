import type { App } from 'vue'
import type { RouterOptions as _RouterOptions, Router } from 'vue-router'
import type { RouterPlugin, RouterPluginContext } from './plugin'
import { effectScope } from 'vue'
import { createRouter as _createRouter } from 'vue-router'
import { APP_KEY } from './meta-keys'

export interface RouterOptions extends _RouterOptions {
  /**
   * Plugins to be installed on the router.
   */
  plugins?: RouterPlugin[]
}

/**
 * Equivalent to {@link createRouter} from `vue-router`, but with support for plugins.
 * @param options {@link RouterOptions}
 *
 * @example
 * ```ts
 * createRouter({
 *   history: createWebHistory(),
 *   routes: [],
 *   plugins: [SomePlugin()],
 * })
 * ```
 */
export function createRouter(options: RouterOptions): Router {
  const router = _createRouter(options)
  const { plugins = [] } = options

  const effect = effectScope(true)
  const runWithAppFns: ((app: App) => void)[] = []
  const uninstallFns: (() => void)[] = []

  const ctx: RouterPluginContext = {
    router,

    runWithApp(fn) {
      // 将 fn 包装到 effect 中
      const rawFn = fn
      fn = function (this: any, ...args) {
        return effect.run(() => rawFn.apply(this, args))
      }

      if (router[APP_KEY]) {
        fn(router[APP_KEY])
      } else {
        runWithAppFns.push(fn)
      }
    },

    onUninstall(fn) {
      uninstallFns.push(fn)
    },
  }

  // 在 effect 中执行插件
  effect.run(() => {
    plugins.forEach((plugin) => plugin(ctx))
  })

  // 重写 install 方法
  const originalInstall = router.install
  router.install = (app: App) => {
    originalInstall(app)

    router[APP_KEY] = app
    runWithAppFns.forEach((fn) => fn(app))
    runWithAppFns.length = 0

    // TODO: use https://github.com/vuejs/core/pull/8801 if merged
    const { unmount } = app
    app.unmount = () => {
      effect.stop()
      delete router[APP_KEY]
      uninstallFns.forEach((fn) => fn())
      uninstallFns.length = 0
      unmount.call(app)
    }
  }

  return router
}
