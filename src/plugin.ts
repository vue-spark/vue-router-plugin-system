import type { App } from 'vue'
import type { Router } from 'vue-router'

export type RouterPluginUninstallHandler = () => void
export type RouterPluginRunWithAppHandler = (app: App) => void

export interface RouterPluginContext {
  /**
   * The router instance.
   */
  router: Router
  /**
   * Runs a function with the vue app.
   */
  runWithApp: (handler: RouterPluginRunWithAppHandler) => void
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
