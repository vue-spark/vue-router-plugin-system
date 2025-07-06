import type { App, ObjectPlugin } from 'vue'
import type { RouterPlugin } from './plugin'
import { prepareInstall } from './prepare-install'
import { setupPlugin } from './setup-plugin'

/**
 * Convert a {@link RouterPlugin} to a {@link ObjectPlugin VuePlugin}.
 *
 * @description Wraps the plugin with an `install` method to adapt it to Vue's plugin registration mechanism.
 *
 * @param plugin {@link RouterPlugin}
 *
 * @returns Returns a {@link ObjectPlugin VuePlugin}.
 *
 * @example
 * ```ts
 * const SomePlugin: RouterPlugin = (ctx) => {
 *   // plugin implementation
 * }
 *
 * // must be installed after the router
 * app.use(router).use(asVuePlugin(SomePlugin))
 * ```
 */
export function asVuePlugin(plugin: RouterPlugin): RouterPlugin & ObjectPlugin {
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
