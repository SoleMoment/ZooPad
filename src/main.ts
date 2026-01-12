// ==========================================
// ZooPad 应用入口
// ==========================================
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

// 创建应用实例
const app = createApp(App)

// 使用 Pinia 状态管理
const pinia = createPinia()
app.use(pinia)

// 挂载应用
app.mount('#app')

// 开发环境日志
if (import.meta.env.DEV) {
    console.log('🐵 ZooPad 沉浸式信息科技教学模拟器 v1.0')
    console.log('📍 新浦动物园虚拟研学之旅')
    console.log('💡 添加 ?debug=true 启用调试模式')
}
