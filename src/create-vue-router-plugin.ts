import type { App } from 'vue'
import type { RouterPlugin } from './plugin'
import { asVuePlugin } from './as-vue-plugin'

/**
 * @deprecated
 */
export interface VueRouterPlugin extends RouterPlugin {
  /**
   * Install the plugin.
   * @param app vue app
   */
  install: (app: App) => void
}

/**
 * Create a {@link VueRouterPlugin} from a {@link RouterPlugin}.
 *
 * @deprecated Please use {@link asVuePlugin} instead.
 *
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
export const createVueRouterPlugin: (plugin: RouterPlugin) => VueRouterPlugin =
  asVuePlugin
