import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      port: 4000,
      host: '0.0.0.0',
      strictPort: true,
      cors: true
    },
    build: {
      // 跳过类型检查以加速构建过程
      sourcemap: mode === 'development',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production'
        }
      },
      assetsDir: 'assets',
      outDir: 'dist',
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            let extType = assetInfo.name.split('.').at(1);
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              extType = 'imgs';
            }
            return `assets/${extType}/[name]-[hash][extname]`;
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    base: '/',
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV),
      'process.env': {
        VITE_FIREBASE_API_KEY: JSON.stringify(env.VITE_FIREBASE_API_KEY),
        VITE_FIREBASE_AUTH_DOMAIN: JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
        VITE_FIREBASE_PROJECT_ID: JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
        VITE_FIREBASE_STORAGE_BUCKET: JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
        VITE_FIREBASE_MESSAGING_SENDER_ID: JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
        VITE_FIREBASE_APP_ID: JSON.stringify(env.VITE_FIREBASE_APP_ID),
        VITE_API_URL: JSON.stringify(env.VITE_API_URL)
      }
    }
  }
}) 