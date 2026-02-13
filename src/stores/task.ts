// ==========================================
// ZooPad Task Store - 教学任务引擎
// ==========================================
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Task, TaskStatus, InventoryItem } from '@/types'

export const useTaskStore = defineStore('task', () => {
  // ========== 课时模式 ==========
  // 根据 URL 路径确定当前课时
  // /lesson1 -> 第一课（游园前）
  // /lesson2 -> 第二课（游园中）
  // /lesson3 -> 第三课（游园后）
  // 默认 -> 所有任务
  const getLessonFromUrl = (): number | null => {
    if (typeof window === 'undefined') return null

    // 优先检查查询参数 ?lesson=1
    const urlParams = new URLSearchParams(window.location.search)
    const lessonParam = urlParams.get('lesson')
    if (lessonParam) {
      const lessonNum = parseInt(lessonParam, 10)
      if (lessonNum >= 1 && lessonNum <= 3) return lessonNum
    }

    // 兼容旧的路径方式 /lesson1（开发环境）
    const path = window.location.pathname
    if (path.includes('/lesson1')) return 1
    if (path.includes('/lesson2')) return 2
    if (path.includes('/lesson3')) return 3

    return null
  }

  const currentLessonPhase = ref<number | null>(getLessonFromUrl())

  // 课时名称
  const lessonNames: Record<number, string> = {
    1: '游园前 · 规划准备',
    2: '游园中 · 探索发现',
    3: '游园后 · 研学分享'
  }

  const currentLessonName = computed(() => {
    if (currentLessonPhase.value) {
      return lessonNames[currentLessonPhase.value]
    }
    return '全部任务'
  })

  // ========== 完整任务列表（9个任务，3个阶段） ==========
  const tasks = ref<Task[]>([
    // ===== 阶段一：游园前——规划与准备 =====
    {
      id: 'task_1',
      phase: 1,
      title: '天气早知道',
      description: '打开【天气App】，查看连云港海州区明天的天气，告诉悟空去动物园冷不冷。',
      status: 'in_progress', // 阶段一第一个任务默认激活
      requiredAppId: 'weather',
      guideText: '明天我们要去动物园游玩，你能帮我查查天气吗？要不要带雨具！',
      completeText: '太好了！有你在真好，现在我知道该怎么穿衣服啦！👍',
      steps: [
        { id: 'step_1_1', description: '打开天气App', completed: false, trigger: { type: 'app_open', appId: 'weather' } },
        { id: 'step_1_2', description: '查看温度信息', completed: false },
        { id: 'step_1_3', description: '回答悟空的问题', completed: false, trigger: { type: 'answer', value: 'warm' } }
      ],
      reward: { id: 'weather_badge', name: '天气小达人', type: 'achievement', description: '成功获取了天气信息！' }
    },
    {
      id: 'task_2',
      phase: 1,
      title: '门票提前订',
      description: '打开【订票通App】，搜索"新浦动物园"，预订一张学生优惠票。',
      status: 'pending',
      requiredAppId: 'booking',
      guideText: '周末游客肯定很多！我们得提前把票买好，记得选学生优惠票哦！💰',
      completeText: '耶！门票买好啦！我已经迫不及待想去了！🎫',
      steps: [
        { id: 'step_2_1', description: '打开订票通App', completed: false, trigger: { type: 'app_open', appId: 'booking' } },
        { id: 'step_2_2', description: '生成电子门票', completed: false }
      ],
      reward: { id: 'zoo_ticket', name: '动物园电子门票', type: 'ticket', description: '新浦动物园学生优惠票', imageUrl: '/ticket.png' }
    },
    {
      id: 'task_3',
      phase: 1,
      title: '我们出发啦',
      description: '打开【地图App】，规划从"当前位置"到"新浦动物园"的路线，选择公交路线即可出发。',
      status: 'pending',
      requiredAppId: 'maps',
      guideText: '从当前位置出发怎么走呀？帮我查查路线，我想快点到！🚌',
      completeText: '路线规划好啦！等下就按这条路走，出发！🗺️',
      steps: [
        { id: 'step_3_1', description: '规划完成路线', completed: false, trigger: { type: 'route_complete' } }
      ],
      reward: { id: 'route_map', name: '出行路线图', type: 'map', description: '从当前位置到动物园的公交路线' }
    },

    // ===== 阶段二：游园中——游览与探索 =====
    {
      id: 'task_4',
      phase: 2,
      title: '游园路线我规划',
      description: '打开【浏览器】访问动物园官网，浏览动物介绍，将导览图保存到相册。',
      status: 'in_progress', // 阶段二第一个任务默认激活
      requiredAppId: 'safari',
      guideText: '进园区啦！快去官网看看有哪些动物，把导览图保存下来！🦁',
      completeText: '导览图拿到手！现在我们可以按照地图去看动物啦！',
      steps: [
        { id: 'step_4_1', description: '保存导览图到相册', completed: false, trigger: { type: 'save_to_album' } }
      ],
      reward: { id: 'zoo_guide', name: '园区导览图', type: 'map', description: '新浦动物园官方导览图', imageUrl: '/zoo_map.png' }
    },
    {
      id: 'task_5',
      phase: 2,
      title: '长颈鹿有多高？',
      description: '在浏览器中使用搜索功能，查询"长颈鹿 平均身高"和"亚洲象 体重"，学会用关键词搜索。',
      status: 'pending',
      requiredAppId: 'safari',
      guideText: '哇！长颈鹿好高啊！它到底有多高？大象又有多重？帮我搜搜看！🔍',
      completeText: '原来长颈鹿那么高！大象那么重！学到了学到了！📚',
      steps: [
        { id: 'step_5_1', description: '使用关键词搜索', completed: false, trigger: { type: 'browser_search' } }
      ]
    },
    {
      id: 'task_6',
      phase: 2,
      title: '全身浴火的鸟叫啥？',
      description: '打开【智能镜头App】，对准神秘的红色鸟类进行AI识别，了解火烈鸟的信息。',
      status: 'pending',
      requiredAppId: 'lens',
      guideText: '看那边！好多红色的鸟！它们叫什么名字呀？用智能镜头扫一扫！📷',
      completeText: '哦原来叫火烈鸟！它们真漂亮，像一团火焰！🔥',
      steps: [
        { id: 'step_6_1', description: '完成AI识别', completed: false, trigger: { type: 'ai_identify' } }
      ]
    },

    // ===== 阶段三：游园后——研学与分享 =====
    {
      id: 'task_7',
      phase: 3,
      title: '喜欢的动物有哪些？',
      description: '在官网的"动物图鉴"里找到你喜欢的动物（如金丝猴、东北虎），将图片保存到相册。',
      status: 'in_progress', // 阶段三第一个任务默认激活
      requiredAppId: 'safari',
      guideText: '今天看到好多可爱的动物！把喜欢的动物图片保存下来吧！📸',
      completeText: '收集了好多动物照片！回家可以慢慢欣赏啦！',
      steps: [
        { id: 'step_7_1', description: '保存动物照片', completed: false, trigger: { type: 'save_animal_photo' } }
      ]
    },
    {
      id: 'task_8',
      phase: 3,
      title: '动物资料我搜索',
      description: '在官网或搜索引擎中查找动物的详细介绍，复制一段文字资料。',
      status: 'pending',
      requiredAppId: 'safari',
      guideText: '金丝猴是国家几级保护动物呀？帮我查查它的资料，复制下来！✂️',
      completeText: '资料复制好啦！等下我们把它粘贴到笔记里！',
      steps: [
        { id: 'step_8_1', description: '复制文字资料', completed: false, trigger: { type: 'copy_text' } }
      ]
    },
    {
      id: 'task_9',
      phase: 3,
      title: '动物档案我建档',
      description: '打开【备忘录App】，创建"我的动物园之旅"笔记，粘贴文字并插入动物图片。',
      status: 'pending',
      requiredAppId: 'notes',
      guideText: '最后一步！让我们把今天学到的东西整理成一份研学笔记吧！📝',
      completeText: '🎉 太棒啦！研学笔记完成！你真是个信息小达人！今天学到了好多知识呢！',
      steps: [
        { id: 'step_9_1', description: '新建备忘录', completed: false, trigger: { type: 'create_note' } }
      ],
      reward: { id: 'master_badge', name: '信息小达人', type: 'achievement', description: '完成了所有学习任务！' }
    }
  ])

  // ========== 根据课时模式初始化任务状态 ==========
  // 如果指定了课时，需要重新设置任务状态
  const initializeTaskStates = () => {
    const lesson = currentLessonPhase.value

    if (lesson !== null) {
      // 单课时模式：只激活对应阶段的第一个任务
      tasks.value.forEach(task => {
        if (task.phase === lesson) {
          // 该阶段的第一个任务
          if ((lesson === 1 && task.id === 'task_1') ||
            (lesson === 2 && task.id === 'task_4') ||
            (lesson === 3 && task.id === 'task_7')) {
            task.status = 'in_progress'
          } else {
            task.status = 'pending'
          }
        } else {
          // 其他阶段的任务全部设为 pending
          task.status = 'pending'
        }
      })
    }
    // 默认模式不需要修改，因为任务定义中已经设置好了
  }

  // 执行初始化
  initializeTaskStates()

  // ========== 背包物品 ==========
  const inventory = ref<InventoryItem[]>([])

  // ========== 悟空对话状态 ==========
  const isGuideOpen = ref(false)
  const wukongDialogue = ref('')
  const wukongMood = ref<'happy' | 'thinking' | 'excited' | 'normal'>('normal')
  const showWukongBubble = ref(true)

  // ========== 计算属性 ==========
  // 获取所有正在进行的任务（每个阶段可能有一个）
  const inProgressTasks = computed(() =>
    tasks.value.filter(t => t.status === 'in_progress')
  )

  // 当前任务索引（兼容旧逻辑，取第一个in_progress的任务）
  const currentTaskIndex = computed(() => {
    const index = tasks.value.findIndex(t => t.status === 'in_progress')
    return index >= 0 ? index : tasks.value.length - 1
  })

  const currentTask = computed(() => tasks.value[currentTaskIndex.value])

  const completedCount = computed(() =>
    tasks.value.filter(t => t.status === 'completed').length
  )

  const progress = computed(() =>
    Math.round((completedCount.value / tasks.value.length) * 100)
  )

  const currentPhase = computed(() => currentTask.value?.phase || 1)

  const isAllCompleted = computed(() =>
    tasks.value.every(t => t.status === 'completed')
  )

  // 根据课时过滤的任务列表
  const filteredTasks = computed(() => {
    const lesson = currentLessonPhase.value
    if (lesson === null) {
      return tasks.value // 返回所有任务
    }
    return tasks.value.filter(t => t.phase === lesson)
  })

  const tasksByPhase = computed(() => ({
    phase1: tasks.value.filter(t => t.phase === 1),
    phase2: tasks.value.filter(t => t.phase === 2),
    phase3: tasks.value.filter(t => t.phase === 3)
  }))

  // 过滤后的完成计数和进度
  const filteredCompletedCount = computed(() =>
    filteredTasks.value.filter(t => t.status === 'completed').length
  )

  const filteredProgress = computed(() =>
    Math.round((filteredCompletedCount.value / filteredTasks.value.length) * 100)
  )

  const isFilteredAllCompleted = computed(() =>
    filteredTasks.value.every(t => t.status === 'completed')
  )

  // 过滤后的当前任务（第一个in_progress的任务）
  const filteredCurrentTask = computed(() => {
    return filteredTasks.value.find(t => t.status === 'in_progress') || null
  })

  const filteredCurrentTaskIndex = computed(() => {
    const index = filteredTasks.value.findIndex(t => t.status === 'in_progress')
    return index >= 0 ? index : filteredTasks.value.length - 1
  })

  // ========== 方法 ==========
  function completeTask(taskId: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task || task.status === 'completed') return

    const taskPhase = task.phase

    // 标记任务完成
    task.status = 'completed'
    task.steps.forEach(step => step.completed = true)

    // 显示完成对话
    wukongDialogue.value = task.completeText
    wukongMood.value = 'excited'
    showWukongBubble.value = true

    // 添加奖励物品
    if (task.reward) {
      addToInventory({ ...task.reward, obtainedAt: new Date() })
    }

    // 延迟后切换到同阶段的下一个任务
    setTimeout(() => {
      // 只在同一阶段内查找下一个pending的任务
      const nextPendingInPhase = tasks.value.find(
        t => t.phase === taskPhase && t.status === 'pending'
      )

      if (nextPendingInPhase) {
        nextPendingInPhase.status = 'in_progress'
        wukongDialogue.value = nextPendingInPhase.guideText
        wukongMood.value = 'normal'
      } else {
        // 该阶段所有任务完成
        const phaseNames: Record<number, string> = {
          1: '游园前',
          2: '游园中',
          3: '游园后'
        }
        const isAllCompleted = tasks.value.every(t => t.status === 'completed')
        if (isAllCompleted) {
          wukongDialogue.value = '🎉 恭喜你完成了所有任务！你已经是信息科技小达人啦！'
          wukongMood.value = 'happy'
        } else {
          wukongDialogue.value = `🎉 太棒了！「${phaseNames[taskPhase]}」阶段的任务全部完成啦！`
          wukongMood.value = 'happy'
        }
      }
    }, 2000)
  }

  function completeTaskStep(taskId: string, stepId: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task) return

    const step = task.steps.find(s => s.id === stepId)
    if (step) {
      step.completed = true

      // 检查是否所有步骤都完成
      if (task.steps.every(s => s.completed)) {
        completeTask(taskId)
      }
    }
  }

  function checkTrigger(event: { type: string; appId?: string; value?: string }) {
    // 检查过滤后的任务中所有正在进行的任务
    const tasksToCheck = filteredTasks.value.filter(t => t.status === 'in_progress')

    tasksToCheck.forEach(task => {
      task.steps.forEach(step => {
        if (step.completed) return
        if (!step.trigger) return

        if (step.trigger.type === event.type) {
          if (step.trigger.appId && step.trigger.appId !== event.appId) return
          if (step.trigger.value && step.trigger.value !== event.value) return

          step.completed = true

          // 如果所有步骤完成，完成任务
          if (task.steps.every(s => s.completed)) {
            completeTask(task.id)
          }
        }
      })
    })
  }

  function addToInventory(item: InventoryItem) {
    if (!inventory.value.find(i => i.id === item.id)) {
      inventory.value.push(item)
    }
  }

  function toggleGuide() {
    isGuideOpen.value = !isGuideOpen.value
  }

  function setWukongDialogue(text: string, mood: 'happy' | 'thinking' | 'excited' | 'normal' = 'normal') {
    wukongDialogue.value = text
    wukongMood.value = mood
    showWukongBubble.value = true
  }

  function hideWukongBubble() {
    showWukongBubble.value = false
  }

  // 初始化对话 - 显示过滤后的第一个正在进行的任务的引导
  const firstInProgressTask = filteredTasks.value.find(t => t.status === 'in_progress')
  if (firstInProgressTask) {
    wukongDialogue.value = firstInProgressTask.guideText
  }

  return {
    tasks,
    filteredTasks,
    inventory,
    currentTask,
    currentTaskIndex,
    completedCount,
    progress,
    currentPhase,
    isAllCompleted,
    tasksByPhase,
    inProgressTasks,

    // 课时模式相关
    currentLessonPhase,
    currentLessonName,
    filteredCompletedCount,
    filteredProgress,
    isFilteredAllCompleted,
    filteredCurrentTask,
    filteredCurrentTaskIndex,

    isGuideOpen,
    wukongDialogue,
    wukongMood,
    showWukongBubble,

    completeTask,
    completeTaskStep,
    checkTrigger,
    addToInventory,
    toggleGuide,
    setWukongDialogue,
    hideWukongBubble
  }
})
