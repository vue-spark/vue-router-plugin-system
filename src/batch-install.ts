import type { Router } from 'vue-router'
import type { RouterPlugin } from './plugin'
import { withInstall } from './with-install'

/**
 * Install multiple plugins to a router instance at once.
 * This is equivalent to calling `plugin.install(router)` for each plugin.
 * @param router router instance
 * @param plugins plugins to install
 *
 * @example
 * ```ts
 * batchInstall(router, [AuthPlugin, CachePlugin])
 * ```
 */
export function batchInstall(router: Router, plugins: RouterPlugin[]): void {
  plugins.forEach(plugin => withInstall(plugin).install(router))
}
