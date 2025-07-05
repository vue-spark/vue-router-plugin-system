import type { RouterPlugin } from '../src/plugin'
import { describe, expect, it, vi } from 'vitest'
import { computed, createApp, watch } from 'vue'
import { createMemoryHistory } from 'vue-router'
import { createRouter } from '../src/index'
import { ref } from 'vue'

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
})
