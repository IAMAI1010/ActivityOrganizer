import { createApp } from 'vue'
import App from './App.vue'
import { applyTheme, loadTheme } from './theme'
import './styles.css'

// 挂载前应用主题，避免首屏闪白
applyTheme(loadTheme())

createApp(App).mount('#app')
