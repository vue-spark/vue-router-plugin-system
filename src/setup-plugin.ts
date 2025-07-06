import type { Router } from 'vue-router'
import type { RouterPlugin } from './plugin'
import { effectScope } from 'vue'
import {
  APP_KEY,
  EFFECT_SCOPE_KEY,
  RUN_WITH_APP_HANDLERS_KEY,
  UNINSTALL_HANDLERS_KEY,
} from './meta-keys'

/**
 * 安装单一插件
 */
export function setupPlugin({
  router,
  plugin,
}: {
  router: Router
  plugin: RouterPlugin
}): void {
  const scope = (router[EFFECT_SCOPE_KEY] ??= effectScope(true))
  // 在 scope 中运行插件
  scope.run(() => {
    plugin({
      router,
      onUninstall(handler) {
        const handlers = (router[UNINSTALL_HANDLERS_KEY] ??= [])
        handlers.push(handler)
      },
      runWithApp(handler) {
        // 在 scope 中运行 handler
        const rawHandler = handler
        handler = (...args) => {
          return scope.run(() => rawHandler(...args))
        }

        if (router[APP_KEY]) {
          handler(router[APP_KEY])
        }
        else {
          const handlers = (router[RUN_WITH_APP_HANDLERS_KEY] ??= [])
          handlers.push(handler)
        }
      },
    })
  })
}
