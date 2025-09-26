import type { App } from 'vue'
import type { Router } from 'vue-router'

export type RouterPluginUninstallHandler = () => void
/**
 * @deprecated
 * Please use {@link RouterPluginRunWithAppContextHandler} instead.
 */
export type RouterPluginRunWithAppHandler = (app: App) => void
export type RouterPluginRunWithAppContextHandler = (app: App) => void

export interface RouterPluginContext {
  /**
   * The router instance.
   */
  router: Router
  /**
   * @deprecated
   * Please use {@link runWithAppContext} instead.
   */
  runWithApp: (handler: RouterPluginRunWithAppHandler) => void
  /**
   * Execute a handler function with access to the Vue App instance and its context.
   *
   * This method provides a way to access the Vue App instance when the plugin needs to:
   * - Use dependency injection (`inject`/`provide`)
   * - Access global properties or configurations
   * - Create reactive effects that should be automatically cleaned up
   *
   * **Execution Timing:**
   * - If the router is already installed to an app, the handler executes immediately
   * - If the router is not yet installed, the handler is queued and will execute when `app.use(router)` is called
   *
   * **Context and Lifecycle:**
   * - The handler runs within the plugin's shared `effectScope`, ensuring automatic cleanup
   * - The handler runs within the Vue app's context, enabling `inject()` and other context-dependent APIs
   * - Any reactive effects (`watch`, `computed`, etc.) created within the handler are automatically stopped when the plugin is uninstalled
   *
   * @param handler - Function that receives the Vue App instance and runs within its context
   *
   * @example
   * ```ts
   * const Plugin = (ctx) => {
   *   ctx.runWithAppContext((app) => {
   *     // ✅ Can use inject() here - runs in app context
   *     const injected = inject(SomeSymbol)
   *
   *     // ✅ Can access global properties
   *     const globalConfig = app.config.globalProperties
   *
   *     // ✅ Can use watch() - automatically cleaned up on plugin uninstall
   *     watch(injected, (newValue) => {
   *       console.log('Injected value changed:', newValue)
   *     })
   *
   *     // ✅ Can provide values to child components
   *     app.provide('pluginData', someData)
   *   })
   * }
   * ```
   *
   * @example
   * ```ts
   * // Example: Plugin that provides route-based theme
   * const ThemePlugin = (ctx) => {
   *   ctx.runWithAppContext((app) => {
   *     const theme = ref('light')
   *
   *     // Provide theme to all components
   *     app.provide('theme', theme)
   *
   *     // Watch route changes and update theme
   *     watch(ctx.router.currentRoute, (route) => {
   *       theme.value = route.meta.theme || 'light'
   *     })
   *   })
   * }
   * ```
   */
  runWithAppContext: (handler: RouterPluginRunWithAppContextHandler) => void
  /**
   * Register a function to be called when the plugin is uninstalled.
   */
  onUninstall: (handler: RouterPluginUninstallHandler) => void
}

export interface RouterPlugin {
  /**
   * Called when the plugin is installed.
   */
  (ctx: RouterPluginContext): void
}
