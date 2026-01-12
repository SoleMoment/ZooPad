<script setup lang="ts">
// ==========================================
// 窗口管理器 - 管理所有运行中的App窗口
// ==========================================
import { useAppStore } from '@/stores/apps'
import { defineAsyncComponent, shallowRef, computed, watch } from 'vue'
import { PhX, PhMinus, PhArrowsOut } from '@phosphor-icons/vue'

const appStore = useAppStore()

// 动态组件映射
const appComponents: Record<string, any> = {
  WeatherApp: defineAsyncComponent(() => import('@/components/apps/WeatherApp.vue')),
  SafariApp: defineAsyncComponent(() => import('@/components/apps/SafariApp.vue')),
  BookingApp: defineAsyncComponent(() => import('@/components/apps/BookingApp.vue')),
  MapsApp: defineAsyncComponent(() => import('@/components/apps/MapsApp.vue')),
  LensApp: defineAsyncComponent(() => import('@/components/apps/LensApp.vue')),
  NotesApp: defineAsyncComponent(() => import('@/components/apps/NotesApp.vue')),
  PhotosApp: defineAsyncComponent(() => import('@/components/apps/PhotosApp.vue')),
}

function getAppComponent(componentName: string) {
  return appComponents[componentName] || null
}

function getAppName(appId: string) {
  return appStore.getAppConfig(appId)?.name || appId
}

function getAppColor(appId: string) {
  return appStore.getAppConfig(appId)?.color || 'from-gray-400 to-gray-600'
}
</script>

<template>
  <TransitionGroup name="app-window">
    <div 
      v-for="app in appStore.runningApps" 
      :key="app.processId"
      class="absolute inset-0 flex flex-col overflow-hidden bg-white"
      :class="[
        app.isMinimized ? 'pointer-events-none opacity-0 scale-75' : 'opacity-100 scale-100'
      ]"
      :style="{ 
        zIndex: app.zIndex,
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }"
      @mousedown="appStore.bringToFront(app.processId)"
    >
      <!-- 窗口标题栏 -->
      <div 
        class="h-11 flex items-center justify-between px-4 shrink-0 border-b"
        :class="`bg-gradient-to-r ${getAppColor(app.appId)} border-white/10`"
      >
        <!-- 左侧：窗口控制按钮 -->
        <div class="flex items-center gap-2">
          <!-- 关闭按钮 -->
          <button 
            @click.stop="appStore.closeApp(app.processId)"
            class="w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center group shadow-sm"
            title="关闭"
          >
            <PhX :size="8" weight="bold" class="text-red-900 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          
          <!-- 最小化按钮 -->
          <button 
            @click.stop="appStore.minimizeApp(app.processId)"
            class="w-3.5 h-3.5 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors flex items-center justify-center group shadow-sm"
            title="最小化"
          >
            <PhMinus :size="8" weight="bold" class="text-yellow-900 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          <!-- 全屏按钮（装饰） -->
          <button 
            class="w-3.5 h-3.5 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center group shadow-sm"
            title="全屏"
          >
            <PhArrowsOut :size="8" weight="bold" class="text-green-900 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        <!-- 中间：应用名称 -->
        <div class="absolute left-1/2 -translate-x-1/2 text-white font-semibold text-sm tracking-wide drop-shadow-sm">
          {{ getAppName(app.appId) }}
        </div>

        <!-- 右侧：占位 -->
        <div class="w-20"></div>
      </div>

      <!-- 窗口内容区 -->
      <div class="flex-1 overflow-hidden bg-gray-50">
        <Suspense>
          <template #default>
            <component :is="getAppComponent(app.componentName)" />
          </template>
          <template #fallback>
            <div class="h-full flex items-center justify-center">
              <div class="flex flex-col items-center gap-4">
                <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span class="text-gray-500 text-sm">正在加载...</span>
              </div>
            </div>
          </template>
        </Suspense>
      </div>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.app-window-enter-active {
  animation: appWindowOpen 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.app-window-leave-active {
  animation: appWindowClose 0.25s ease-out forwards;
}

@keyframes appWindowOpen {
  0% {
    opacity: 0;
    transform: scale(0.85) translateY(20px);
    border-radius: 2rem;
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
    border-radius: 0;
  }
}

@keyframes appWindowClose {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.9) translateY(10px);
  }
}
</style>
