import type { RouterPlugin } from '../src/plugin'
import { describe, expect, it, vi } from 'vitest'
import { computed, createApp, inject, ref, watch } from 'vue'
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

  // ===== runWithAppContext 测试用例 =====

  describe('runWithAppContext', () => {
    // 测试基础功能：确保插件上下文包含 runWithAppContext
    it('should provide runWithAppContext in plugin context', () => {
      const mockPlugin = vi.fn<RouterPlugin>()
      createRouter({
        history: createMemoryHistory(),
        routes: [],
        plugins: [mockPlugin],
      })

      expect(mockPlugin).toHaveBeenCalledOnce()
      const context = mockPlugin.mock.calls[0][0]
      expect(context).toHaveProperty('runWithAppContext')
      expect(typeof context.runWithAppContext).toBe('function')
    })

    // 测试延迟执行：在 app.use(router) 之前不执行
    it('should defer runWithAppContext functions until app installation', () => {
      const runWithAppContextSpy = vi.fn()
      const mockPlugin: RouterPlugin = (ctx) => {
        ctx.runWithAppContext(() => {
          runWithAppContextSpy()
        })
      }

      const router = createRouter({
        history: createMemoryHistory(),
        routes: [],
        plugins: [mockPlugin],
      })

      expect(runWithAppContextSpy).not.toHaveBeenCalled()

      const app = createApp(() => null)
      app.use(router)

      expect(runWithAppContextSpy).toHaveBeenCalledOnce()
    })

    // 测试立即执行：在 app.use(router) 之后立即执行
    it('should execute runWithAppContext immediately when router is already installed', () => {
      const runWithAppContextSpy = vi.fn()

      const router = createRouter({
        history: createMemoryHistory(),
        routes: [],
      })

      const app = createApp(() => null)
      app.use(router)

      // 在路由已安装后添加插件
      const Plugin = withInstall((ctx) => {
        ctx.runWithAppContext(() => {
          runWithAppContextSpy()
        })
      })

      Plugin.install(router)
      expect(runWithAppContextSpy).toHaveBeenCalledOnce()
    })

    // 测试 App 实例传递
    it('should pass correct App instance to runWithAppContext handler', () => {
      let receivedApp: any
      const mockPlugin: RouterPlugin = (ctx) => {
        ctx.runWithAppContext((app) => {
          receivedApp = app
        })
      }

      const router = createRouter({
        history: createMemoryHistory(),
        routes: [],
        plugins: [mockPlugin],
      })

      const app = createApp(() => null)
      app.use(router)

      expect(receivedApp).toBe(app)
    })

    // 测试多个 runWithAppContext 的执行顺序
    it('should execute multiple runWithAppContext handlers in registration order', () => {
      const calls: string[] = []
      const p1: RouterPlugin = ctx =>
        ctx.runWithAppContext(() => calls.push('plugin1'))
      const p2: RouterPlugin = ctx =>
        ctx.runWithAppContext(() => calls.push('plugin2'))
      const p3: RouterPlugin = ctx =>
        ctx.runWithAppContext(() => calls.push('plugin3'))

      const router = createRouter({
        history: createMemoryHistory(),
        routes: [],
        plugins: [p1, p2, p3],
      })

      const app = createApp(() => null)
      app.use(router)

      expect(calls).toEqual(['plugin1', 'plugin2', 'plugin3'])
    })

    // 测试同一插件中多个 runWithAppContext 的执行顺序
    it('should execute multiple runWithAppContext handlers from same plugin in order', () => {
      const calls: string[] = []
      const mockPlugin: RouterPlugin = (ctx) => {
        ctx.runWithAppContext(() => calls.push('first'))
        ctx.runWithAppContext(() => calls.push('second'))
        ctx.runWithAppContext(() => calls.push('third'))
      }

      const router = createRouter({
        history: createMemoryHistory(),
        routes: [],
        plugins: [mockPlugin],
      })

      const app = createApp(() => null)
      app.use(router)

      expect(calls).toEqual(['first', 'second', 'third'])
    })

    // 测试 Vue 上下文功能：provide/inject
    it('should work with Vue context APIs like provide/inject', () => {
      const THEME_KEY = Symbol('theme')
      let injectedValue: any

      const mockPlugin: RouterPlugin = (ctx) => {
        ctx.runWithAppContext(() => {
          // 在 app 上下文中可以使用 inject
          injectedValue = inject(THEME_KEY, 'default-theme')
        })
      }

      const router = createRouter({
        history: createMemoryHistory(),
        routes: [],
        plugins: [mockPlugin],
      })

      const app = createApp(() => null)
      // 在应用中提供值
      app.provide(THEME_KEY, 'dark-theme')
      app.use(router)

      expect(injectedValue).toBe('dark-theme')
    })

    // 测试 Vue 上下文功能：全局属性访问
    it('should access global properties through app context', () => {
      let globalConfig: any

      const mockPlugin: RouterPlugin = (ctx) => {
        ctx.runWithAppContext((app) => {
          globalConfig = app.config.globalProperties
        })
      }

      const router = createRouter({
        history: createMemoryHistory(),
        routes: [],
        plugins: [mockPlugin],
      })

      const app = createApp(() => null)
      app.config.globalProperties.$customProperty = 'test-value'
      app.use(router)

      expect(globalConfig).toBeDefined()
      expect(globalConfig.$customProperty).toBe('test-value')
    })

    // 测试响应式效果的自动清理
    it('should automatically clean up reactive effects created in runWithAppContext', () => {
      const counter = ref(0)
      const watchSpy = vi.fn()

      const mockPlugin: RouterPlugin = (ctx) => {
        ctx.runWithAppContext(() => {
          // 在 runWithAppContext 中创建响应式效果
          watch(counter, watchSpy, { immediate: true, flush: 'sync' })
        })
      }

      const router = createRouter({
        history: createMemoryHistory(),
        routes: [],
        plugins: [mockPlugin],
      })

      const app = createApp(() => null)
      app.use(router)

      // 初始调用
      expect(watchSpy).toHaveBeenCalledTimes(1)

      // 触发响应式更新
      counter.value = 1
      expect(watchSpy).toHaveBeenCalledTimes(2)

      // 卸载应用，应该停止响应式效果
      app.unmount()
      counter.value = 2
      expect(watchSpy).toHaveBeenCalledTimes(2) // 不应该再被调用
    })

    // 测试在 effectScope 中运行
    it('should run runWithAppContext handlers within effectScope', () => {
      const computedSpy = vi.fn()
      const counter = ref(0)

      const mockPlugin: RouterPlugin = (ctx) => {
        ctx.runWithAppContext(() => {
          const doubled = computed(() => {
            computedSpy()
            return counter.value * 2
          })
          // 访问 computed 值以触发计算
          expect(doubled.value).toBe(0)
        })
      }

      const router = createRouter({
        history: createMemoryHistory(),
        routes: [],
        plugins: [mockPlugin],
      })

      const app = createApp(() => null)
      app.use(router)

      expect(computedSpy).toHaveBeenCalledTimes(1)

      // 更新值，computed 应该重新计算
      counter.value = 5
      expect(computedSpy).toHaveBeenCalledTimes(1) // computed 是懒计算的

      // 卸载后，computed 应该被清理
      app.unmount()
      counter.value = 10
      expect(computedSpy).toHaveBeenCalledTimes(1) // 不应该再被调用
    })

    // 测试 withInstall 与 runWithAppContext 的集成
    describe('withInstall integration', () => {
      // 测试通过 router 直接安装时的延迟执行
      it('should defer runWithAppContext when installing via router before app.use', () => {
        const runWithAppContextSpy = vi.fn()
        const Plugin = withInstall((ctx) => {
          ctx.runWithAppContext(() => {
            runWithAppContextSpy()
          })
        })

        const router = _createRouter({
          history: createMemoryHistory(),
          routes: [],
        })

        // 直接通过 router 安装
        Plugin.install(router)
        expect(runWithAppContextSpy).not.toHaveBeenCalled()

        // 安装到 app 后应该执行
        const app = createApp(() => null)
        app.use(router)
        expect(runWithAppContextSpy).toHaveBeenCalledOnce()
      })

      // 测试通过 router 在 app.use 后安装时的立即执行
      it('should execute runWithAppContext immediately when installing via router after app.use', () => {
        const runWithAppContextSpy = vi.fn()
        const Plugin = withInstall((ctx) => {
          ctx.runWithAppContext(() => {
            runWithAppContextSpy()
          })
        })

        const router = createRouter({
          history: createMemoryHistory(),
          routes: [],
        })

        const app = createApp(() => null)
        app.use(router)

        // 在 app.use(router) 后安装插件
        Plugin.install(router)
        expect(runWithAppContextSpy).toHaveBeenCalledOnce()
      })

      // 测试通过 app.use 安装插件
      it('should work when installing plugin via app.use', () => {
        const runWithAppContextSpy = vi.fn()
        const Plugin = withInstall((ctx) => {
          ctx.runWithAppContext(() => {
            runWithAppContextSpy()
          })
        })

        const router = createRouter({
          history: createMemoryHistory(),
          routes: [],
        })

        const app = createApp(() => null)
        app.use(router)
        app.use(Plugin)

        expect(runWithAppContextSpy).toHaveBeenCalledOnce()
      })

      // 测试在 runWithAppContext 中使用 Vue 上下文 API
      it('should provide Vue context in runWithAppContext when using withInstall', () => {
        const PLUGIN_KEY = Symbol('plugin-data')
        let injectedValue: any

        const Plugin = withInstall((ctx) => {
          ctx.runWithAppContext((_app) => {
            injectedValue = inject(PLUGIN_KEY, 'default-value')
          })
        })

        const router = createRouter({
          history: createMemoryHistory(),
          routes: [],
        })

        const app = createApp(() => null)
        app.provide(PLUGIN_KEY, 'provided-value')
        app.use(router)

        Plugin.install(router)
        expect(injectedValue).toBe('provided-value')
      })
    })

    // 测试错误处理和边界情况
    describe('error handling and edge cases', () => {
      // 测试 runWithAppContext 中抛出的错误
      it('should propagate errors thrown in runWithAppContext handlers', () => {
        const mockPlugin: RouterPlugin = (ctx) => {
          ctx.runWithAppContext(() => {
            throw new Error('Test error')
          })
        }

        const router = createRouter({
          history: createMemoryHistory(),
          routes: [],
          plugins: [mockPlugin],
        })

        const app = createApp(() => null)

        // 错误应该被抛出
        expect(() => app.use(router)).toThrow('Test error')
      })

      // 测试空的 runWithAppContext 处理器
      it('should handle empty runWithAppContext handlers', () => {
        const mockPlugin: RouterPlugin = (ctx) => {
          ctx.runWithAppContext(() => {
            // 空处理器
          })
        }

        const router = createRouter({
          history: createMemoryHistory(),
          routes: [],
          plugins: [mockPlugin],
        })

        const app = createApp(() => null)
        expect(() => app.use(router)).not.toThrow()
      })

      // 测试多次调用同一个 runWithAppContext 处理器
      it('should not execute the same runWithAppContext handler multiple times', () => {
        const handlerSpy = vi.fn()

        const mockPlugin: RouterPlugin = (ctx) => {
          const handler = () => handlerSpy()
          ctx.runWithAppContext(handler)
        }

        const router = createRouter({
          history: createMemoryHistory(),
          routes: [],
          plugins: [mockPlugin],
        })

        const app = createApp(() => null)
        app.use(router)

        expect(handlerSpy).toHaveBeenCalledTimes(1)
      })
    })
  })
})
