import type { App } from 'vue'
import type { RouterPlugin } from './plugin'
import { prepareInstall } from './prepare-install'
import { setupPlugin } from './setup-plugin'

export interface VueRouterPlugin extends RouterPlugin {
  /**
   * Install the plugin.
   * @param app vue app
   */
  install: (app: App) => void
}

/**
 * Create a {@link VueRouterPlugin} from a {@link RouterPlugin}.
 * @param plugin {@link RouterPlugin}
 * @returns Returns a {@link VueRouterPlugin}
 * @example
 * ```ts
 * const SomePlugin = createVueRouterPlugin((ctx) => {
 *   // plugin implementation
 * })
 *
 * // must be installed after the router
 * app.use(router).use(SomePlugin)
 * ```
 */
export function createVueRouterPlugin(plugin: RouterPlugin): VueRouterPlugin {
  return Object.assign(plugin, {
    install(app: App) {
      const router = app.config.globalProperties.$router
      if (!router) {
        throw new Error(
          '[vue-router-plugin-system] Please install vue-router first.',
        )
      }

      prepareInstall({ app, router })
      setupPlugin({ router, plugin })
    },
  })
}
