import type { App } from 'vue'
import type { Router } from 'vue-router'
import {
  APP_KEY,
  EFFECT_SCOPE_KEY,
  PREPARED_FLAG_KEY,
  RUN_WITH_APP_HANDLERS_KEY,
  UNINSTALL_HANDLERS_KEY,
} from './meta-keys'

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
  if (router[PREPARED_FLAG_KEY]) {
    return
  }

  // 避免重复执行后续操作
  router[PREPARED_FLAG_KEY] = true

  // 用于 setupPlugin 内访问 vue app
  router[APP_KEY] = app

  // 注册卸载函数
  // TODO: use https://github.com/vuejs/core/pull/8801 if merged
  const { unmount } = app
  app.unmount = () => {
    router[EFFECT_SCOPE_KEY]?.stop()
    router[UNINSTALL_HANDLERS_KEY]?.forEach(handler => handler())

    delete router[PREPARED_FLAG_KEY]
    delete router[APP_KEY]
    delete router[EFFECT_SCOPE_KEY]
    delete router[UNINSTALL_HANDLERS_KEY]
    delete router[RUN_WITH_APP_HANDLERS_KEY]

    return unmount.call(app)
  }
}
