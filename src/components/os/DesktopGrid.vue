<script setup lang="ts">
// ==========================================
// 桌面图标网格组件
// ==========================================
import { useAppStore } from '@/stores/apps'
import { useTaskStore } from '@/stores/task'

const appStore = useAppStore()
const taskStore = useTaskStore()

function handleAppClick(appId: string, event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  
  // 触发任务检查
  taskStore.checkTrigger({ type: 'app_open', appId })
  
  // 打开应用
  appStore.openApp(appId, {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  })
}
</script>

<template>
  <div class="absolute top-14 left-0 right-0 bottom-28 px-8 py-4 overflow-hidden">
    <!-- 图标网格：5列布局 -->
    <div class="grid grid-cols-5 gap-x-4 gap-y-6 justify-items-center">
      <div 
        v-for="app in appStore.installedApps" 
        :key="app.id"
        class="app-grid-item flex flex-col items-center gap-2 cursor-pointer group relative"
        @click="handleAppClick(app.id, $event)"
      >
        <!-- App 图标 -->
        <div 
          class="relative w-20 h-20 rounded-[1.4rem] flex items-center justify-center shadow-xl ring-1 ring-white/10 transition-all duration-200"
          :class="[
            `bg-gradient-to-br ${app.color}`,
            'group-hover:scale-105 group-hover:shadow-2xl group-hover:-translate-y-1',
            'group-active:scale-95 group-active:translate-y-0',
          ]"
        >
          <component 
            :is="appStore.getIconComponent(app.icon)" 
            :size="44" 
            weight="fill" 
            class="text-white drop-shadow-lg"
          />
        </div>

        <!-- App 名称 -->
        <span 
          class="text-white text-sm font-medium drop-shadow-md text-center transition-transform group-hover:scale-105"
          style="text-shadow: 0 1px 3px rgba(0,0,0,0.5);"
        >
          {{ app.name }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-grid-item {
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
</style>
