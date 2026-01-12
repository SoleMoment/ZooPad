<script setup lang="ts">
// ==========================================
// ZooPad OS - 主应用入口
// ==========================================
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { useSystemStore } from './stores/system'
import { useAppStore } from './stores/apps'
import { useTaskStore } from './stores/task'
import TaskGuideNPC from './components/os/TaskGuideNPC.vue'
import StatusBar from './components/os/StatusBar.vue'
import DockBar from './components/os/DockBar.vue'
import DesktopGrid from './components/os/DesktopGrid.vue'
import WindowManager from './components/os/WindowManager.vue'

const systemStore = useSystemStore()
const appStore = useAppStore()
const taskStore = useTaskStore()

// 启动动画状态
const isBooted = ref(false)
const showBootLogo = ref(true)

onMounted(() => {
  // 模拟启动过程
  setTimeout(() => {
    showBootLogo.value = false
    setTimeout(() => {
      isBooted.value = true
    }, 300)
  }, 1500)
  
  console.log('🐵 ZooPad OS v1.0 - 沉浸式信息科技教学模拟器')
  console.log('📍 当前位置：', systemStore.currentLocation.fullAddress)
})
</script>

<template>
  <!-- 环境背景 - 深色空间 -->
  <div class="fixed inset-0 w-screen h-screen bg-gradient-to-br from-gray-900 via-[#0a0a0a] to-gray-900 flex items-center justify-center overflow-hidden pr-80">
    
    <!-- 背景装饰粒子 -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
    </div>

    <!-- 物理 iPad 设备容器 -->
    <div 
      class="relative shadow-2xl"
      style="height: min(90vh, 90vw * 0.625); aspect-ratio: 16/10; border-radius: 2.5rem;"
    >
      <!-- 设备外壳（边框） -->
      <div class="absolute inset-0 bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-[2.5rem] ring-1 ring-white/5">
        <!-- 边框高光 -->
        <div class="absolute inset-0 rounded-[2.5rem] bg-gradient-to-t from-transparent to-white/5"></div>
      </div>

      <!-- 屏幕区域 -->
      <div 
        id="zoo-pad-os"
        class="absolute top-3 bottom-3 left-3 right-3 overflow-hidden select-none rounded-[2rem]"
        :style="{
          backgroundImage: `url('${systemStore.currentWallpaper}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.3)'
        }"
      >
        <!-- 壁纸叠加层 - 增加深度感 -->
        <div class="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none"></div>

        <!-- 启动画面 -->
        <Transition name="fade">
          <div 
            v-if="showBootLogo"
            class="absolute inset-0 bg-black flex items-center justify-center z-[100]"
          >
            <div class="text-center">
              <div class="text-6xl mb-4 animate-bounce">🐵</div>
              <div class="text-white/80 text-lg font-light tracking-widest">ZooPad</div>
            </div>
          </div>
        </Transition>

        <!-- 主界面内容 -->
        <template v-if="isBooted">
          <!-- 状态栏 -->
          <StatusBar class="z-30" />

          <!-- 桌面图标网格 -->
          <DesktopGrid class="z-10" />

          <!-- 窗口管理器 -->
          <WindowManager class="z-20" />

          <!-- Dock 栏 -->
          <DockBar class="z-30" />

          <!-- Home 指示条 -->
          <div class="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/40 rounded-full z-40 transition-opacity hover:bg-white/60"></div>
        </template>
      </div>



      <!-- 物理摄像头 -->
      <div class="absolute top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#0a0a0a] rounded-full z-20">
        <div class="absolute inset-0.5 rounded-full bg-gradient-to-br from-gray-700 to-gray-900"></div>
        <div class="absolute top-0.5 left-0.5 w-1 h-1 bg-gray-600/50 rounded-full"></div>
      </div>
    </div>

    <!-- 悟空 NPC 引导 - 浏览器右侧居中 -->
    <div class="fixed right-6 top-1/2 -translate-y-1/2 z-[9999]">
      <TaskGuideNPC v-if="isBooted" />
    </div>

    <!-- 调试面板入口 -->
    <div 
      v-if="systemStore.isDebugMode"
      class="fixed bottom-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold z-[10000] cursor-pointer"
      @click="taskStore.completeTask(taskStore.currentTask?.id || '')"
    >
      🔧 DEBUG: 跳过当前任务
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
