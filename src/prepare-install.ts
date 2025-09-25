import type { App } from 'vue'
import type { Router } from 'vue-router'
import { getInternals } from './internals'

/**
 * 在正式安装到 vue app 前运行此函数，以准备安装
 */
export function prepareInstall({
  app,
  router,
}: {
  app: App
  router: Router
}): void {
  const internals = getInternals(router)
  if (internals.isPrepared) {
    return
  }

  // 避免重复执行后续操作
  internals.isPrepared = true

  // 用于 setupPlugin 内访问 vue app
  internals.app = app

  // 注册卸载函数
  const { unmount } = app
  app.unmount = () => {
    internals.effectScope.stop()
    internals.uninstallHandlers.forEach(handler => handler())
    internals.uninstallHandlers.length = 0
    internals.runWithAppHandlers.length = 0

    return unmount.call(app)
  }
}
