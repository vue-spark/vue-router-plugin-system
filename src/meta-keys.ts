import type { App, EffectScope } from 'vue'
import type {
  RouterPluginRunWithAppHandler,
  RouterPluginUninstallHandler,
} from './plugin'

export const APP_KEY = Symbol('vue app')
export const EFFECT_SCOPE_KEY = Symbol('vue effect scope')
export const UNINSTALL_HANDLERS_KEY = Symbol('router plugin uninstall handlers')
export const RUN_WITH_APP_HANDLERS_KEY = Symbol(
  'router plugin run with app handlers',
)
export const PREPARED_FLAG_KEY = Symbol('router plugin system already prepared')

declare module 'vue-router' {
  export interface Router {
    /**
     * The vue app instance.
     */
    [APP_KEY]?: App
    /**
     * The vue effect scope.
     */
    [EFFECT_SCOPE_KEY]?: EffectScope
    /**
     * The router plugin uninstall functions.
     */
    [UNINSTALL_HANDLERS_KEY]?: RouterPluginUninstallHandler[]
    /**
     * The router plugin run with app functions.
     */
    [RUN_WITH_APP_HANDLERS_KEY]?: RouterPluginRunWithAppHandler[]
    /**
     * The flag to indicate whether the router is prepared.
     */
    [PREPARED_FLAG_KEY]?: boolean
  }
}
