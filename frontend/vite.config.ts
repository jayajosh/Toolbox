import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '')
  const port = (value: string | undefined, fallback: number) => {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 && parsed < 65_536 ? parsed : fallback
  }

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: port(env.VITE_DEV_PORT, 5174),
      strictPort: true,
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'http://192.168.10.116:5080',
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: port(env.VITE_PREVIEW_PORT, 4174),
      strictPort: true,
    },
    test: { environment: 'jsdom' },
  }
})
