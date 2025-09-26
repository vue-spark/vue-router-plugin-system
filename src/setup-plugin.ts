import type { Router } from 'vue-router'
import type { RouterPlugin, RouterPluginContext } from './plugin'
import { getInternals } from './internals'

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
  const internals = getInternals(router)
  // 在 scope 中运行插件
  internals.effectScope.run(() => {
    const ctx: RouterPluginContext = {
      router,
      onUninstall(handler) {
        internals.uninstallHandlers.push(handler)
      },
      runWithApp(handler) {
        ctx.runWithAppContext(handler)
      },
      runWithAppContext(handler) {
        // 在 scope 中运行 handler
        const rawHandler = handler
        handler = (...args) => {
          const [app] = args
          return internals.effectScope.run(() =>
            // 在 app context 中运行 handler
            app.runWithContext(() => rawHandler(...args)),
          )
        }

        if (internals.app) {
          handler(internals.app)
        }
        else {
          internals.runWithAppHandlers.push(handler)
        }
      },
    }

    plugin(ctx)
  })
}
