import type { RouterOptions as _RouterOptions, Router } from 'vue-router'
import type { RouterPlugin } from './plugin'
import { createRouter as _createRouter } from 'vue-router'
import { RUN_WITH_APP_HANDLERS_KEY } from './meta-keys'
import { prepareInstall } from './prepare-install'
import { setupPlugin } from './setup-plugin'

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
 * const SomePlugin: RouterPlugin = (ctx) => {
 *   // plugin implementation
 * }
 *
 * createRouter({
 *   history: createWebHistory(),
 *   routes: [],
 *   plugins: [SomePlugin()],
 * })
 * ```
 */
export function createRouter(options: RouterOptions): Router {
  const router = _createRouter(options)

  // 重写 install 方法
  const { install } = router
  router.install = (...args) => {
    const [app] = args
    prepareInstall({ app, router })
    install.apply(router, args)

    // 运行缓存的 runWithApp 函数
    const runWithAppHandlers = (router[RUN_WITH_APP_HANDLERS_KEY] ??= [])
    runWithAppHandlers.forEach(handler => handler(app))
    runWithAppHandlers.length = 0
  }

  // 安装插件
  const { plugins = [] } = options
  plugins.forEach(plugin => setupPlugin({ router, plugin }))

  return router
}
