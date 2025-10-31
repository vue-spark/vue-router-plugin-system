import type { Router } from 'vue-router'
import { getInternals } from './internals'
import { prepareInstall } from './prepare-install'

/**
 * 重写路由器的 install 方法
 *
 * @param router 路由器实例
 */
export function overrideRouterInstall(router: Router): void {
  const internals = getInternals(router)
  if (internals.isInstallOverridden) {
    return
  }

  // 避免多次重写
  internals.isInstallOverridden = true

  // 重写 install 方法
  const { install } = router
  router.install = (...args) => {
    const [app] = args

    // 准备安装
    prepareInstall({ app, router })
    // 执行原始 install 方法
    install.apply(router, args)

    // 运行缓存的 runWithApp 函数
    internals.runWithAppHandlers.forEach(handler => handler(app))
    internals.runWithAppHandlers.length = 0
  }
}
