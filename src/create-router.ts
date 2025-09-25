import type { RouterOptions as _RouterOptions, Router } from 'vue-router'
import type { RouterPlugin } from './plugin'
import { createRouter as _createRouter } from 'vue-router'
import { overrideRouterInstall } from './override-router-install'
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
  overrideRouterInstall(router)

  // 安装插件
  const { plugins = [] } = options
  plugins.forEach(plugin => setupPlugin({ router, plugin }))

  return router
}
