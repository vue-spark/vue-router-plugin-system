import type { App } from 'vue'
import type { Router } from 'vue-router'

export interface RouterPluginContext {
  /**
   * The router instance.
   */
  router: Router
  /**
   * Runs a function with the vue app.
   */
  runWithApp: (fn: (app: App) => void) => void
  /**
   * Register a function to be called when the plugin is uninstalled.
   */
  onUninstall: (fn: () => void) => void
}

export interface RouterPlugin {
  /**
   * Called when the plugin is installed.
   */
  (ctx: RouterPluginContext): void
}
