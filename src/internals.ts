import type { Router } from 'vue-router'
import type { RouterPluginSystemInternals } from './types/vue-router'
import { effectScope } from 'vue'

export const INTERNALS_KEY = '__VUE_ROUTER_PLUGIN_SYSTEM_INTERNALS__' as const

export function getInternals(router: Router): RouterPluginSystemInternals {
  if (!router[INTERNALS_KEY]) {
    router[INTERNALS_KEY] = {
      isInstallOverridden: false,
      isPrepared: false,
      app: undefined,
      effectScope: effectScope(true),
      uninstallHandlers: [],
      runWithAppHandlers: [],
    }
  }
  return router[INTERNALS_KEY]
}
