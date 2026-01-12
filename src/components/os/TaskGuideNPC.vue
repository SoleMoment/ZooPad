<script setup lang="ts">
// ==========================================
// 悟空 NPC 任务引导组件
// ==========================================
import { useTaskStore } from '@/stores/task'
import { computed, ref, watch, reactive } from 'vue'
import { 
  PhCheckCircle, 
  PhCircle, 
  PhX, 
  PhTrophy,
  PhNotePencil,
  PhStar
} from '@phosphor-icons/vue'

const taskStore = useTaskStore()

// 当前显示的面板
const activePanel = ref<'tasks' | 'evaluation' | null>(null)

// 悟空表情
const wukongEmoji = computed(() => {
  switch (taskStore.wukongMood) {
    case 'happy': return '😄'
    case 'excited': return '🎉'
    case 'thinking': return '🤔'
    default: return '🐵'
  }
})

// 阶段名称
const phaseNames = {
  1: '游园前 · 规划准备',
  2: '游园中 · 探索发现', 
  3: '游园后 · 研学分享'
}

// 任务评价标准
const evaluationCriteria: Record<string, { title: string; criteria: string[] }> = {
  // 阶段一
  'task_1': {
    title: '天气早知道',
    criteria: [
      '能独立打开天气App',
      '能正确查看天气信息',
      '能根据天气做出判断'
    ]
  },
  'task_2': {
    title: '门票提前订',
    criteria: [
      '能找到正确的订票入口',
      '能完成订票操作流程',
      '能保存电子门票'
    ]
  },
  'task_3': {
    title: '我们出发啦',
    criteria: [
      '能使用地图App搜索',
      '能规划合理的出行路线',
      '能理解路线指引信息'
    ]
  },
  // 阶段二
  'task_4': {
    title: '游园路线我规划',
    criteria: [
      '能访问官方网站',
      '能浏览动物介绍',
      '能保存导览图到相册'
    ]
  },
  'task_5': {
    title: '长颈鹿有多高？',
    criteria: [
      '能使用关键词搜索',
      '能筛选有效信息',
      '能总结搜索结果'
    ]
  },
  'task_6': {
    title: '全身浴火的鸟叫啥？',
    criteria: [
      '能使用智能镜头App',
      '能完成AI识别操作',
      '能理解识别结果'
    ]
  },
  // 阶段三
  'task_7': {
    title: '喜欢的动物有哪些？',
    criteria: [
      '能浏览动物图鉴',
      '能选择喜欢的动物',
      '能保存图片到相册'
    ]
  },
  'task_8': {
    title: '动物资料我搜索',
    criteria: [
      '能查找详细资料',
      '能正确选择复制内容',
      '能完成复制操作'
    ]
  },
  'task_9': {
    title: '动物档案我建档',
    criteria: [
      '能创建新备忘录',
      '能粘贴文字内容',
      '能插入动物图片'
    ]
  }
}

// 自我评价分数（每个任务每个标准的星级）
const selfEvaluations = reactive<Record<string, number[]>>({})

// 初始化评价数据
function initEvaluations() {
  Object.keys(evaluationCriteria).forEach(taskId => {
    if (!selfEvaluations[taskId]) {
      selfEvaluations[taskId] = [0, 0, 0] // 三个标准，每个默认0星
    }
  })
}
initEvaluations()

// 设置星级
function setStars(taskId: string, criteriaIndex: number, stars: number) {
  if (!selfEvaluations[taskId]) {
    selfEvaluations[taskId] = [0, 0, 0]
  }
  selfEvaluations[taskId][criteriaIndex] = stars
}

// 获取当前阶段需要评价的任务
const currentPhaseTasks = computed(() => {
  const lesson = taskStore.currentLessonPhase
  if (lesson === null) {
    // 显示所有任务
    return taskStore.tasks
  }
  // 只显示当前课时阶段的任务
  return taskStore.tasks.filter(t => t.phase === lesson)
})

// 获取任务的总星数
function getTaskTotalStars(taskId: string): number {
  if (!selfEvaluations[taskId]) return 0
  return selfEvaluations[taskId].reduce((sum, star) => sum + star, 0)
}

// 获取任务的最大星数
function getTaskMaxStars(): number {
  return 9 // 3个标准 * 3星
}

function togglePanel(panel: 'tasks' | 'evaluation') {
  if (activePanel.value === panel) {
    activePanel.value = null
  } else {
    activePanel.value = panel
  }
}

function closePanel() {
  activePanel.value = null
}

// 对话气泡自动隐藏
const showBubble = ref(true)
let bubbleTimer: NodeJS.Timeout | null = null

watch(() => taskStore.wukongDialogue, () => {
  showBubble.value = true
  if (bubbleTimer) clearTimeout(bubbleTimer)
  bubbleTimer = setTimeout(() => {
    showBubble.value = false
  }, 8000)
})
</script>

<template>
  <div class="flex flex-col items-end pointer-events-auto">
    
    <!-- 对话气泡 -->
    <Transition name="bubble">
      <div 
        v-if="showBubble && taskStore.wukongDialogue && !activePanel"
        class="mb-3 max-w-[280px] bg-white/95 backdrop-blur-xl rounded-2xl rounded-br-sm p-4 shadow-2xl border-2 border-yellow-400 animate-bounce-in"
      >
        <div class="flex gap-3">
          <span class="text-2xl shrink-0">{{ wukongEmoji }}</span>
          <div>
            <p class="text-sm text-gray-800 font-medium leading-relaxed">
              {{ taskStore.wukongDialogue }}
            </p>
            <div class="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <span class="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                任务 {{ taskStore.filteredCurrentTaskIndex + 1 }}/{{ taskStore.filteredTasks.length }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
    
    <!-- 悟空头像按钮 -->
    <div class="flex items-center gap-2">
      <!-- 自我评价按钮 -->
      <button
        @click="togglePanel('evaluation')"
        class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform border-2 border-white"
        :class="{ 'ring-2 ring-purple-400 ring-offset-2': activePanel === 'evaluation' }"
      >
        <PhNotePencil :size="20" weight="fill" class="text-white" />
      </button>

      <!-- 主头像 -->
      <button
        @click="togglePanel('tasks')"
        class="relative group"
      >
        <!-- 光晕效果 -->
        <div class="absolute inset-0 -m-2 rounded-full bg-yellow-400/30 animate-pulse"></div>
        
        <!-- 头像容器 -->
        <div 
          class="relative w-16 h-16 rounded-full border-[3px] border-white shadow-2xl overflow-hidden bg-gradient-to-br from-yellow-300 via-yellow-100 to-orange-400 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-10"
          :class="{ 'ring-4 ring-yellow-400/50': activePanel === 'tasks' }"
        >
          <span class="text-3xl">🐵</span>
        </div>
        
        <!-- 进度徽章 -->
        <div 
          class="absolute -bottom-0.5 -right-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white z-20 shadow-md"
        >
          {{ taskStore.filteredProgress }}%
        </div>

        <!-- 新任务提示 -->
        <div 
          v-if="taskStore.filteredCurrentTask?.status === 'in_progress'"
          class="absolute -top-1 -left-1 w-4 h-4 bg-red-500 rounded-full animate-ping z-20"
        ></div>
      </button>
    </div>

    <!-- 任务面板 -->
    <Transition name="panel">
      <div 
        v-if="activePanel === 'tasks'"
        class="mt-3 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
      >
        <!-- 面板头部 -->
        <div class="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 p-4 flex items-center justify-between">
          <div>
            <h3 class="text-white font-bold text-lg flex items-center gap-2">
              <PhTrophy :size="20" weight="fill" />
              研学任务
            </h3>
            <p v-if="taskStore.currentLessonPhase" class="text-white/80 text-xs mt-1">
              {{ taskStore.currentLessonName }}
            </p>
          </div>
          <button @click="closePanel" class="text-white/80 hover:text-white transition-colors">
            <PhX :size="20" weight="bold" />
          </button>
        </div>

        <!-- 进度条 -->
        <div class="px-4 py-3 bg-gray-50 border-b">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium text-gray-600">
              {{ taskStore.currentLessonPhase ? '本课进度' : '总进度' }}
            </span>
            <span class="text-xs font-bold text-orange-600">
              {{ taskStore.filteredCompletedCount }}/{{ taskStore.filteredTasks.length }}
            </span>
          </div>
          <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              class="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-500"
              :style="{ width: `${taskStore.filteredProgress}%` }"
            ></div>
          </div>
        </div>

        <!-- 任务列表 -->
        <div class="max-h-[300px] overflow-y-auto">
          <!-- 根据课时模式显示任务 -->
          <template v-if="taskStore.currentLessonPhase">
            <!-- 单阶段模式：直接显示过滤后的任务 -->
            <div class="px-4 py-2 bg-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-0">
              {{ phaseNames[taskStore.currentLessonPhase as 1 | 2 | 3] }}
            </div>
            <div 
              v-for="task in taskStore.filteredTasks"
              :key="task.id"
              class="p-3 border-b border-gray-100 last:border-b-0 transition-colors"
              :class="[
                task.status === 'in_progress' ? 'bg-blue-50' : '',
                task.status === 'completed' ? 'bg-green-50/50' : '',
                task.status === 'pending' || task.status === 'locked' ? 'opacity-60' : ''
              ]"
            >
              <div class="flex items-start gap-3">
                <!-- 状态图标 -->
                <div class="mt-0.5 shrink-0">
                  <PhCheckCircle 
                    v-if="task.status === 'completed'" 
                    :size="20" 
                    weight="fill" 
                    class="text-green-500" 
                  />
                  <div 
                    v-else-if="task.status === 'in_progress'" 
                    class="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"
                  ></div>
                  <PhCircle 
                    v-else 
                    :size="20" 
                    class="text-gray-300" 
                  />
                </div>

                <!-- 任务内容 -->
                <div class="flex-1 min-w-0">
                  <h4 
                    class="text-sm font-bold truncate"
                    :class="[
                      task.status === 'in_progress' ? 'text-blue-700' : '',
                      task.status === 'completed' ? 'text-green-700' : 'text-gray-800'
                    ]"
                  >
                    {{ task.title }}
                  </h4>
                  <p class="text-xs text-gray-500 mt-1 line-clamp-2">
                    {{ task.description }}
                  </p>
                  
                  <!-- 步骤进度 -->
                  <div v-if="task.status === 'in_progress'" class="flex gap-1 mt-2">
                    <div 
                      v-for="step in task.steps" 
                      :key="step.id"
                      class="w-3 h-1 rounded-full"
                      :class="step.completed ? 'bg-blue-500' : 'bg-gray-200'"
                    ></div>
                  </div>
                </div>

                <!-- 奖励标记 -->
                <div v-if="task.reward && task.status === 'completed'" class="shrink-0">
                  <PhStar :size="16" weight="fill" class="text-yellow-500" />
                </div>
              </div>
            </div>
          </template>

          <!-- 全部任务模式：按阶段分组 -->
          <template v-else>
            <div v-for="phase in [1, 2, 3]" :key="phase" class="border-b last:border-b-0">
              <!-- 阶段标题 -->
              <div class="px-4 py-2 bg-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-0">
                {{ phaseNames[phase as 1 | 2 | 3] }}
              </div>
              
              <!-- 该阶段的任务 -->
              <div 
                v-for="task in taskStore.tasks.filter(t => t.phase === phase)"
                :key="task.id"
                class="p-3 border-b border-gray-100 last:border-b-0 transition-colors"
                :class="[
                  task.status === 'in_progress' ? 'bg-blue-50' : '',
                  task.status === 'completed' ? 'bg-green-50/50' : '',
                  task.status === 'pending' || task.status === 'locked' ? 'opacity-60' : ''
                ]"
              >
                <div class="flex items-start gap-3">
                  <!-- 状态图标 -->
                  <div class="mt-0.5 shrink-0">
                    <PhCheckCircle 
                      v-if="task.status === 'completed'" 
                      :size="20" 
                      weight="fill" 
                      class="text-green-500" 
                    />
                    <div 
                      v-else-if="task.status === 'in_progress'" 
                      class="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"
                    ></div>
                    <PhCircle 
                      v-else 
                      :size="20" 
                      class="text-gray-300" 
                    />
                  </div>

                  <!-- 任务内容 -->
                  <div class="flex-1 min-w-0">
                    <h4 
                      class="text-sm font-bold truncate"
                      :class="[
                        task.status === 'in_progress' ? 'text-blue-700' : '',
                        task.status === 'completed' ? 'text-green-700' : 'text-gray-800'
                      ]"
                    >
                      {{ task.title }}
                    </h4>
                    <p class="text-xs text-gray-500 mt-1 line-clamp-2">
                      {{ task.description }}
                    </p>
                    
                    <!-- 步骤进度 -->
                    <div v-if="task.status === 'in_progress'" class="flex gap-1 mt-2">
                      <div 
                        v-for="step in task.steps" 
                        :key="step.id"
                        class="w-3 h-1 rounded-full"
                        :class="step.completed ? 'bg-blue-500' : 'bg-gray-200'"
                      ></div>
                    </div>
                  </div>

                  <!-- 奖励标记 -->
                  <div v-if="task.reward && task.status === 'completed'" class="shrink-0">
                    <PhStar :size="16" weight="fill" class="text-yellow-500" />
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Transition>

    <!-- 自我评价面板 -->
    <Transition name="panel">
      <div 
        v-if="activePanel === 'evaluation'"
        class="mt-3 w-96 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
      >
        <!-- 面板头部 -->
        <div class="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 flex items-center justify-between">
          <h3 class="text-white font-bold text-lg flex items-center gap-2">
            <PhNotePencil :size="20" weight="fill" />
            学生自我评价
          </h3>
          <button @click="closePanel" class="text-white/80 hover:text-white transition-colors">
            <PhX :size="20" weight="bold" />
          </button>
        </div>

        <!-- 课时说明 -->
        <div class="px-4 py-2 bg-purple-50 border-b border-purple-100">
          <p class="text-xs text-purple-700 font-medium">
            📖 当前评价：{{ taskStore.currentLessonName || '全部任务' }}
          </p>
        </div>

        <!-- 评价内容 -->
        <div class="max-h-[400px] overflow-y-auto">
          <div 
            v-for="task in currentPhaseTasks"
            :key="task.id"
            class="border-b border-gray-100 last:border-b-0"
          >
            <!-- 任务标题 -->
            <div class="px-4 py-3 bg-gray-50 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-lg">📋</span>
                <span class="font-bold text-gray-800 text-sm">{{ evaluationCriteria[task.id]?.title || task.title }}</span>
              </div>
              <div class="flex items-center gap-1 text-xs text-gray-500">
                <PhStar :size="14" weight="fill" class="text-yellow-500" />
                <span>{{ getTaskTotalStars(task.id) }}/{{ getTaskMaxStars() }}</span>
              </div>
            </div>

            <!-- 评价标准列表 -->
            <div class="p-4 space-y-3">
              <div 
                v-for="(criterion, index) in evaluationCriteria[task.id]?.criteria || []"
                :key="index"
                class="flex items-center justify-between bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
              >
                <!-- 评价标准文字 -->
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <span class="text-xs text-gray-400 font-medium">{{ index + 1 }}.</span>
                  <span class="text-sm text-gray-700 truncate">{{ criterion }}</span>
                </div>
                
                <!-- 星级评分 -->
                <div class="flex items-center gap-1 shrink-0 ml-3">
                  <button
                    v-for="star in 3"
                    :key="star"
                    @click="setStars(task.id, index, star === selfEvaluations[task.id]?.[index] ? 0 : star)"
                    class="w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-125"
                    :class="selfEvaluations[task.id]?.[index] >= star ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-300 hover:text-gray-400'"
                  >
                    <PhStar 
                      :size="20" 
                      :weight="selfEvaluations[task.id]?.[index] >= star ? 'fill' : 'regular'" 
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="currentPhaseTasks.length === 0" class="text-center py-8 text-gray-400">
            <PhNotePencil :size="40" class="mx-auto mb-2 opacity-50" />
            <p class="text-sm">暂无可评价的任务</p>
          </div>
        </div>

        <!-- 底部汇总 -->
        <div class="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-t border-purple-100">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-purple-700">总评分</span>
            <div class="flex items-center gap-2">
              <div class="flex items-center">
                <PhStar v-for="i in 3" :key="i" :size="18" weight="fill" class="text-yellow-500" />
              </div>
              <span class="text-lg font-bold text-purple-700">
                {{ currentPhaseTasks.reduce((sum, task) => sum + getTaskTotalStars(task.id), 0) }}/{{ currentPhaseTasks.length * getTaskMaxStars() }}
              </span>
            </div>
          </div>
          <p class="text-xs text-purple-600 mt-2 text-center">
            💡 点击星星进行自我评价，再次点击取消
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.bubble-enter-active,
.bubble-leave-active {
  transition: all 0.3s ease;
}

.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translateX(20px) scale(0.9);
}

.panel-enter-active,
.panel-leave-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}
</style>
