import type { App } from 'vue'

export const APP_KEY = Symbol('vue app')

declare module 'vue-router' {
  export interface Router {
    /**
     * The vue app instance.
     */
    [APP_KEY]?: App
  }
}
