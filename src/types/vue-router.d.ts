import type { App, EffectScope } from 'vue'
import type { INTERNALS_KEY } from '../internals'
import type {
  RouterPluginRunWithAppHandler,
  RouterPluginUninstallHandler,
} from '../plugin'

export interface RouterPluginSystemInternals {
  isInstallOverridden: boolean
  isPrepared: boolean
  app: App | undefined
  effectScope: EffectScope
  uninstallHandlers: RouterPluginUninstallHandler[]
  runWithAppHandlers: RouterPluginRunWithAppHandler[]
}

declare module 'vue-router' {
  export interface Router {
    /**
     * Internal data for vue-router-plugin-system.
     * @internal
     */
    [INTERNALS_KEY]?: RouterPluginSystemInternals
  }
}
