// ==========================================
// ZooPad App Store - 应用管理状态
// ==========================================
import { defineStore } from 'pinia'
import { ref, markRaw } from 'vue'
import type { AppConfig, RunningApp } from '@/types'
import {
  PhSun,
  PhCompass,
  PhMapTrifold,
  PhImage,
  PhNotePencil,
  PhTicket,
  PhCamera,
  PhGear
} from '@phosphor-icons/vue'

export const useAppStore = defineStore('apps', () => {
  // ========== 已安装应用列表 ==========
  const installedApps = ref<AppConfig[]>([
    {
      id: 'weather',
      name: '天气',
      icon: 'PhSun',
      componentName: 'WeatherApp',
      color: 'from-sky-400 to-blue-500',
      category: 'utility'
    },
    {
      id: 'safari',
      name: '浏览器',
      icon: 'PhCompass',
      componentName: 'SafariApp',
      color: 'from-blue-400 to-indigo-500',
      category: 'utility'
    },
    {
      id: 'booking',
      name: '订票通',
      icon: 'PhTicket',
      componentName: 'BookingApp',
      color: 'from-green-400 to-emerald-500',
      category: 'education'
    },
    {
      id: 'maps',
      name: '地图',
      icon: 'PhMapTrifold',
      componentName: 'MapsApp',
      color: 'from-emerald-400 to-teal-500',
      category: 'utility'
    },
    {
      id: 'lens',
      name: '智能镜头',
      icon: 'PhCamera',
      componentName: 'LensApp',
      color: 'from-purple-400 to-pink-500',
      category: 'education'
    },
    {
      id: 'notes',
      name: '备忘录',
      icon: 'PhNotePencil',
      componentName: 'NotesApp',
      color: 'from-yellow-400 to-orange-500',
      category: 'utility'
    },
    {
      id: 'photos',
      name: '相册',
      icon: 'PhImage',
      componentName: 'PhotosApp',
      color: 'from-pink-400 to-rose-500',
      category: 'utility'
    }
  ])

  // ========== 运行中的应用 ==========
  const runningApps = ref<RunningApp[]>([])
  const activeAppId = ref<string | null>(null)
  let nextProcessId = 1
  let maxZIndex = 100

  // ========== 图标组件映射 ==========
  const iconComponents: Record<string, any> = {
    PhSun: markRaw(PhSun),
    PhCompass: markRaw(PhCompass),
    PhMapTrifold: markRaw(PhMapTrifold),
    PhImage: markRaw(PhImage),
    PhNotePencil: markRaw(PhNotePencil),
    PhTicket: markRaw(PhTicket),
    PhCamera: markRaw(PhCamera),
    PhGear: markRaw(PhGear)
  }

  function getIconComponent(iconName: string) {
    return iconComponents[iconName] || null
  }

  // ========== 应用操作 ==========
  function openApp(appId: string, launchPosition?: { x: number; y: number }) {
    // 检查应用是否已运行
    const existing = runningApps.value.find(app => app.appId === appId)
    if (existing) {
      existing.isMinimized = false
      bringToFront(existing.processId)
      return existing.processId
    }

    // 获取应用配置
    const appConfig = installedApps.value.find(a => a.id === appId)
    if (!appConfig) return null

    // 创建新的应用实例
    const newApp: RunningApp = {
      processId: nextProcessId++,
      appId,
      componentName: appConfig.componentName,
      zIndex: ++maxZIndex,
      isMinimized: false,
      launchPosition
    }

    runningApps.value.push(newApp)
    activeAppId.value = appId

    return newApp.processId
  }

  function closeApp(processId: number) {
    const index = runningApps.value.findIndex(app => app.processId === processId)
    if (index > -1) {
      runningApps.value.splice(index, 1)

      // 更新活跃应用
      if (runningApps.value.length > 0) {
        const topApp = [...runningApps.value]
          .filter(a => !a.isMinimized)
          .sort((a, b) => b.zIndex - a.zIndex)[0]
        activeAppId.value = topApp?.appId || null
      } else {
        activeAppId.value = null
      }
    }
  }

  function minimizeApp(processId: number) {
    const app = runningApps.value.find(a => a.processId === processId)
    if (app) {
      app.isMinimized = true

      // 找到下一个可见应用
      const visibleApps = runningApps.value
        .filter(a => !a.isMinimized && a.processId !== processId)
        .sort((a, b) => b.zIndex - a.zIndex)

      activeAppId.value = visibleApps[0]?.appId || null
    }
  }

  function bringToFront(processId: number) {
    const app = runningApps.value.find(a => a.processId === processId)
    if (app) {
      app.zIndex = ++maxZIndex
      app.isMinimized = false
      activeAppId.value = app.appId
    }
  }

  function closeAllApps() {
    runningApps.value = []
    activeAppId.value = null
  }

  function getAppConfig(appId: string) {
    return installedApps.value.find(a => a.id === appId)
  }

  function isAppRunning(appId: string) {
    return runningApps.value.some(a => a.appId === appId)
  }

  return {
    installedApps,
    runningApps,
    activeAppId,

    getIconComponent,
    openApp,
    closeApp,
    minimizeApp,
    bringToFront,
    closeAllApps,
    getAppConfig,
    isAppRunning
  }
})
