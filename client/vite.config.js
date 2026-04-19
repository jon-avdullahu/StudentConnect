import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Default 5001 avoids macOS AirPlay Receiver taking port 5000; override with VITE_API_PROXY_TARGET.
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:5001'

  const configureApiProxy = (proxy) => {
    proxy.on('proxyReq', (proxyReq, req) => {
      const contentType = req.headers['content-type']
      if (contentType) proxyReq.setHeader('Content-Type', contentType)
      const contentLength = req.headers['content-length']
      if (contentLength) proxyReq.setHeader('Content-Length', contentLength)
      const auth = req.headers.authorization
      if (auth) proxyReq.setHeader('Authorization', auth)
    })
    proxy.on('error', (err) => {
      console.error('[vite proxy]', err.message)
    })
  }

  return {
    plugins: [
      tailwindcss(),
      react(),
    ],
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          configure: configureApiProxy,
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
