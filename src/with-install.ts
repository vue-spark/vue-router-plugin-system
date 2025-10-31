import type { App } from 'vue'
import type { Router } from 'vue-router'
import type { RouterPlugin } from './plugin'
import { overrideRouterInstall } from './override-router-install'
import { prepareInstall } from './prepare-install'
import { setupPlugin } from './setup-plugin'

export interface RouterPluginInstall {
  /**
   * Install the plugin.
   * @param instance App or Router instance
   */
  install: (instance: App | Router) => void
}

const WITH_INSTALL = '__WITH_INSTALL__'

type RouterPluginInternal = RouterPlugin & {
  [WITH_INSTALL]?: true
}

/**
 * Add an `install` method to the plugin to adapt it to Vue's plugin registration mechanism,
 * or to manually install the plugin with an router instance.
 *
 * @example
 * ```ts
 * const SomePlugin = withInstall((ctx) => {
 *   // plugin implementation
 * })
 *
 * // install with router
 * SomePlugin.install(router)
 *
 * // install with app
 * // must be installed after the router
 * app.use(router).use(SomePlugin)
 * ```
 */
export function withInstall(
  plugin: RouterPlugin,
): RouterPlugin & RouterPluginInstall {
  if ((plugin as RouterPluginInternal)[WITH_INSTALL]) {
    return plugin as RouterPlugin & RouterPluginInstall
  }

  return Object.assign(plugin, {
    [WITH_INSTALL]: true,

    install(instance: App | Router) {
      if (isRouter(instance)) {
        overrideRouterInstall(instance)
        setupPlugin({ router: instance, plugin })
      }
      else {
        const router = instance.config.globalProperties.$router
        if (!router) {
          throw new Error(
            '[vue-router-plugin-system] Please install vue-router first.',
          )
        }

        prepareInstall({ app: instance, router })
        setupPlugin({ router, plugin })
      }
    },
  })
}

function isRouter(instance: any): instance is Router {
  return !!instance.install && !!instance.options && !!instance.currentRoute
}
