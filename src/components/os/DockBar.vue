<script setup lang="ts">
// ==========================================
// Dock 栏组件 - 模拟 iPadOS 底部 Dock
// ==========================================
import { useAppStore } from '@/stores/apps'
import { computed } from 'vue'

const appStore = useAppStore()

// Dock 栏显示的应用（前4个高频应用）
const dockApps = computed(() => appStore.installedApps.slice(0, 4))

function handleAppClick(appId: string, event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  appStore.openApp(appId, {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  })
}
</script>

<template>
  <div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
    <div class="dock-container px-4 py-2.5 rounded-3xl bg-white/20 backdrop-blur-2xl border border-white/20 shadow-2xl flex items-center gap-3">
      <div 
        v-for="app in dockApps" 
        :key="app.id"
        class="dock-icon relative group"
        @click="handleAppClick(app.id, $event)"
      >
        <!-- App 图标 -->
        <div 
          class="w-14 h-14 rounded-[1rem] flex items-center justify-center cursor-pointer transition-all duration-300 shadow-lg ring-1 ring-white/10"
          :class="[
            `bg-gradient-to-br ${app.color}`,
            'hover:-translate-y-2 hover:scale-110 hover:shadow-xl',
            'active:scale-95 active:translate-y-0'
          ]"
        >
          <component 
            :is="appStore.getIconComponent(app.icon)" 
            :size="30" 
            weight="fill" 
            class="text-white drop-shadow-md"
          />
        </div>

        <!-- 运行指示点 -->
        <div 
          v-if="appStore.isAppRunning(app.id)"
          class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-lg"
        ></div>

        <!-- Hover 提示 -->
        <div class="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/80 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {{ app.name }}
        </div>
      </div>

      <!-- 分隔线 -->
      <div class="w-px h-10 bg-white/20 mx-1"></div>

      <!-- 最近使用的应用（如果有运行中的应用） -->
      <template v-for="runningApp in appStore.runningApps.slice(0, 2)" :key="runningApp.processId">
        <div 
          v-if="!dockApps.find(a => a.id === runningApp.appId)"
          class="dock-icon relative"
          @click="appStore.bringToFront(runningApp.processId)"
        >
          <div 
            class="w-14 h-14 rounded-[1rem] flex items-center justify-center cursor-pointer bg-gradient-to-br from-gray-400 to-gray-600 shadow-lg ring-1 ring-white/10"
            :class="[
              'hover:-translate-y-2 hover:scale-110',
              'active:scale-95'
            ]"
          >
            <component 
              :is="appStore.getIconComponent(appStore.getAppConfig(runningApp.appId)?.icon || '')" 
              :size="30" 
              weight="fill" 
              class="text-white"
            />
          </div>
          <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.dock-container {
  transform-style: preserve-3d;
  perspective: 1000px;
}

.dock-icon {
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
</style>
