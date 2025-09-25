import type { App, ObjectPlugin } from 'vue'
import type { RouterPlugin } from '../plugin'
import { prepareInstall } from '../prepare-install'
import { setupPlugin } from '../setup-plugin'

/**
 * @deprecated
 * Please use {@link withInstall} instead.
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
