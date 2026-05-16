import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',         // 打包后用相对路径，兼容 pywebview 的 file:// 加载
  server: {
    port: parseInt(process.env.VITE_PORT ?? '5173'),
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          antd:   ['antd', '@ant-design/icons'],
        },
      },
    },
  },
})
