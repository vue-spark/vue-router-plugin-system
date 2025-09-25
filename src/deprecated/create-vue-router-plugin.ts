import type { App } from 'vue'
import type { RouterPlugin } from '../plugin'
import { asVuePlugin } from './as-vue-plugin'

/**
 * @deprecated
 * Please use {@link RouterPluginInstall} instead.
 */
export interface VueRouterPlugin extends RouterPlugin {
  /**
   * Install the plugin.
   * @param app vue app
   */
  install: (app: App) => void
}

/**
 * @deprecated
 * Please use {@link withInstall} instead.
 */
export const createVueRouterPlugin: (plugin: RouterPlugin) => VueRouterPlugin =
  asVuePlugin
