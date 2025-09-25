import type { RouterPlugin } from '../src/plugin'
import { describe, expect, it, vi } from 'vitest'
import { computed, createApp, ref, watch } from 'vue'
import { createRouter as _createRouter, createMemoryHistory } from 'vue-router'
import { createRouter, withInstall } from '../src/index'
import { getInternals } from '../src/internals'

describe.concurrent('vue Router Plugin System', () => {
  // 测试插件基础功能
  it('should call plugin with correct context', () => {
    const mockPlugin = vi.fn<RouterPlugin>()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [],
      plugins: [mockPlugin],
    })

    expect(mockPlugin).toHaveBeenCalledOnce()
    expect(mockPlugin.mock.calls[0][0]).toHaveProperty('router', router)
    expect(mockPlugin.mock.calls[0][0]).toHaveProperty('runWithApp')
    expect(mockPlugin.mock.calls[0][0]).toHaveProperty('onUninstall')
  })

  // 测试 runWithApp 延迟执行
  it('should defer runWithApp functions until app installation', () => {
    const runWithAppSpy = vi.fn()
    const mockPlugin: RouterPlugin = (ctx) => {
      ctx.runWithApp(() => {
        runWithAppSpy()
      })
    }

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [],
      plugins: [mockPlugin],
    })

    expect(runWithAppSpy).not.toHaveBeenCalled()

    const app = createApp(() => null)
    app.use(router)

    expect(runWithAppSpy).toHaveBeenCalledOnce()
  })

  // 测试卸载钩子
  it('should execute onUninstall hooks on app unmount', () => {
    const onUninstallSpy = vi.fn()
    const mockPlugin: RouterPlugin = (ctx) => {
      ctx.onUninstall(onUninstallSpy)
    }

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [],
      plugins: [mockPlugin],
    })

    const app = createApp(() => null)
    app.use(router)

    expect(onUninstallSpy).not.toHaveBeenCalled()
    app.unmount()
    expect(onUninstallSpy).toHaveBeenCalledOnce()
  })

  // 测试多插件执行顺序
  it('should execute plugins in registration order', () => {
    const order: number[] = []
    const plugins: RouterPlugin[] = [
      () => order.push(1),
      () => order.push(2),
      () => order.push(3),
    ]

    createRouter({
      history: createMemoryHistory(),
      routes: [],
      plugins,
    })

    expect(order).toEqual([1, 2, 3])
  })

  // 测试 effectScope 隔离
  it('should isolate plugins in effect scope', () => {
    const counter = ref(0)
    const logSpy = vi.fn()
    const mockPlugin: RouterPlugin = () => {
      const doubled = computed(() => counter.value * 2)
      watch(doubled, logSpy, { immediate: true, flush: 'sync' })
      counter.value = 1
    }

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [],
      plugins: [mockPlugin],
    })

    const app = createApp(() => null)
    app.use(router)
    app.unmount()

    expect(logSpy).toHaveBeenCalledTimes(2)
    counter.value = 2
    expect(logSpy).toHaveBeenCalledTimes(2)
  })

  // 多个 runWithApp 的刷新顺序
  it('should flush runWithApp handlers in registration order', () => {
    const calls: string[] = []
    const p1: RouterPlugin = ctx => ctx.runWithApp(() => calls.push('a'))
    const p2: RouterPlugin = ctx => ctx.runWithApp(() => calls.push('b'))
    const p3: RouterPlugin = ctx => ctx.runWithApp(() => calls.push('c'))

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [],
      plugins: [p1, p2, p3],
    })

    const app = createApp(() => null)
    app.use(router)

    expect(calls).toEqual(['a', 'b', 'c'])
  })

  // 使用 withInstall：通过 router 直接安装（app.use 前，runWithApp 应延迟）
  it('withInstall: install with router before app.use should defer runWithApp', () => {
    const runWithAppSpy = vi.fn()
    const Plugin = withInstall((ctx) => {
      ctx.runWithApp(() => runWithAppSpy())
    })

    const router = _createRouter({
      history: createMemoryHistory(),
      routes: [],
    })

    // install via router directly
    Plugin.install(router)

    // before app.use, runWithApp should not run
    expect(runWithAppSpy).not.toHaveBeenCalled()

    const app = createApp(() => null)
    app.use(router)
    expect(runWithAppSpy).toHaveBeenCalledOnce()
  })

  // 使用 withInstall：通过 router 在 app.use 后安装（应立即执行 runWithApp）
  it('withInstall: install with router after app.use should run runWithApp immediately', () => {
    const runWithAppSpy = vi.fn()
    const Plugin = withInstall((ctx) => {
      ctx.runWithApp(() => runWithAppSpy())
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [],
    })

    const app = createApp(() => null)
    app.use(router)

    Plugin.install(router)
    expect(runWithAppSpy).toHaveBeenCalledOnce()
  })

  // 使用 withInstall：通过 app.use 安装时，若未先注册 router，应抛错
  it('withInstall: installing with app before router should throw', () => {
    const Plugin = withInstall(() => {})
    const app = createApp(() => null)
    expect(() => app.use(Plugin as any)).toThrowError(
      /Please install vue-router first/,
    )
  })

  // 使用 withInstall：onUninstall 应在 app.unmount 时触发
  it('withInstall: should register uninstall hook', () => {
    const uninstallSpy = vi.fn()
    const Plugin = withInstall((ctx) => {
      ctx.onUninstall(uninstallSpy)
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [],
    })

    const app = createApp(() => null)
    app.use(router)

    Plugin.install(router)

    expect(uninstallSpy).not.toHaveBeenCalled()
    app.unmount()
    expect(uninstallSpy).toHaveBeenCalledOnce()
  })

  // overrideRouterInstall 幂等：仅包裹一次 install，并有内部标记
  it('overrideRouterInstall is idempotent (wrapped once with internal flag)', () => {
    const router = _createRouter({ history: createMemoryHistory(), routes: [] })
    const originalInstall = router.install

    const P1 = withInstall(() => {})
    P1.install(router)
    const wrappedOnce = router.install
    expect(wrappedOnce).not.toBe(originalInstall)

    const P2 = withInstall(() => {})
    P2.install(router)
    const wrappedTwice = router.install
    expect(wrappedTwice).toBe(wrappedOnce)

    // internal flag should be true
    expect(getInternals(router).isInstallOverridden).toBe(true)
  })
})
