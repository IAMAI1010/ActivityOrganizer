import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 发布环境通过反向代理暴露单个端口，因此必须监听 0.0.0.0 并放开 Host 校验。
const port = Number(process.env.PORT || 3000)

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port,
    strictPort: true,
    allowedHosts: true,
  },
})
