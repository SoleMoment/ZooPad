<script setup lang="ts">
// ==========================================
// 状态栏组件 - 模拟 iPadOS 顶部状态栏
// ==========================================
import { useSystemStore } from '@/stores/system'
import { PhWifiHigh, PhMapPin, PhAirplaneTilt } from '@phosphor-icons/vue'

const systemStore = useSystemStore()
</script>

<template>
  <div class="absolute top-0 left-0 w-full h-8 px-6 flex items-center justify-between text-white text-xs font-medium tracking-wide z-50">
    <!-- 左侧：日期 + 定位 -->
    <div class="flex items-center gap-3">
      <span class="opacity-90">{{ systemStore.formattedDate }}</span>
      <div class="flex items-center gap-1 opacity-75">
        <PhMapPin :size="12" weight="fill" />
        <span>{{ systemStore.currentLocation.city }}</span>
      </div>
    </div>

    <!-- 右侧：时间 + 系统状态 -->
    <div class="flex items-center gap-4">
      <!-- 时间 -->
      <span class="font-semibold text-sm opacity-95">{{ systemStore.formattedTime }}</span>
      
      <!-- 系统图标 -->
      <div class="flex items-center gap-2 opacity-85">
        <!-- 飞行模式 / WiFi -->
        <PhAirplaneTilt v-if="systemStore.isAirplaneMode" :size="14" weight="fill" />
        <div v-else class="flex items-center gap-0.5">
          <PhWifiHigh :size="14" weight="fill" :class="systemStore.isWifiConnected ? 'text-white' : 'text-white/40'" />
        </div>
        
        <!-- 电池 -->
        <div class="flex items-center gap-1">
          <span class="text-[10px]">{{ Math.round(systemStore.batteryLevel * 100) }}%</span>
          <div class="relative">
            <div class="w-6 h-3 border border-white/50 rounded-sm flex items-center p-0.5">
              <div 
                class="h-full rounded-[1px] transition-all duration-300"
                :class="[
                  systemStore.batteryLevel > 0.2 ? 'bg-white' : 'bg-red-500',
                ]"
                :style="{ width: `${systemStore.batteryLevel * 100}%` }"
              ></div>
            </div>
            <!-- 电池头 -->
            <div class="absolute -right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-1.5 bg-white/50 rounded-r-sm"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
