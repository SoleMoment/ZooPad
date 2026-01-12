// ==========================================
// ZooPad System Store - 系统内核状态管理
// ==========================================
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useBattery, useDateFormat, useNow } from '@vueuse/core'
import desktopWallpaper from '@/assets/images/桌面壁纸.jpg'

export const useSystemStore = defineStore('system', () => {
  // ========== 系统时间 ==========
  const currentTime = useNow()
  const formattedTime = useDateFormat(currentTime, 'HH:mm')
  const formattedDate = useDateFormat(currentTime, 'MM月DD日 dddd', { locales: 'zh-CN' })
  const formattedFullDate = useDateFormat(currentTime, 'YYYY年MM月DD日', { locales: 'zh-CN' })

  // ========== 电池状态 ==========
  const { level: actualBatteryLevel, isSupported: isBatterySupported } = useBattery()
  const simulatedBatteryLevel = ref(0.92)

  const batteryLevel = computed(() => {
    if (isBatterySupported.value && actualBatteryLevel.value) {
      return actualBatteryLevel.value
    }
    return simulatedBatteryLevel.value
  })

  // ========== 网络状态 ==========
  const isWifiConnected = ref(true)
  const isAirplaneMode = ref(false)
  const signalStrength = ref(4) // 0-4 bars

  // ========== 定位信息 ==========
  const currentLocation = ref({
    city: '连云港',
    district: '海州区',
    fullAddress: '江苏省连云港市海州区'
  })

  // ========== 主题设置 ==========
  const isDark = ref(false)
  const brightness = ref(0.9) // 0-1
  const wallpaperIndex = ref(0)

  const wallpapers = [
    // 本地桌面壁纸
    desktopWallpaper,
    // 本地壁纸 - 离线可用
    import.meta.env.BASE_URL + 'images/wallpapers/sunset.png',
    import.meta.env.BASE_URL + 'images/wallpapers/ocean.png',
    import.meta.env.BASE_URL + 'images/wallpapers/forest.png'
  ]

  const currentWallpaper = computed(() => wallpapers[wallpaperIndex.value])

  // ========== 系统锁定 ==========
  const isLocked = ref(false)
  const isBooting = ref(false)

  // ========== 调试模式 ==========
  const isDebugMode = ref(false)

  // ========== 方法 ==========
  function toggleTheme() {
    isDark.value = !isDark.value
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function toggleWifi() {
    isWifiConnected.value = !isWifiConnected.value
  }

  function setWallpaper(index: number) {
    if (index >= 0 && index < wallpapers.length) {
      wallpaperIndex.value = index
    }
  }

  function lockScreen() {
    isLocked.value = true
  }

  function unlockScreen() {
    isLocked.value = false
  }

  function enableDebugMode() {
    isDebugMode.value = true
    console.log('🐵 Debug Mode Enabled - God Mode Activated!')
  }

  // URL参数检查调试模式
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('debug') === 'true') {
      enableDebugMode()
    }
  }

  return {
    // Time
    currentTime,
    formattedTime,
    formattedDate,
    formattedFullDate,

    // Battery
    batteryLevel,
    isBatterySupported,

    // Network
    isWifiConnected,
    isAirplaneMode,
    signalStrength,

    // Location
    currentLocation,

    // Theme
    isDark,
    brightness,
    currentWallpaper,
    wallpapers,

    // System State
    isLocked,
    isBooting,
    isDebugMode,

    // Methods
    toggleTheme,
    toggleWifi,
    setWallpaper,
    lockScreen,
    unlockScreen,
    enableDebugMode
  }
})
