<script setup lang="ts">
// ==========================================
// 智能镜头 App - AI 识图
// ==========================================
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useTaskStore } from '@/stores/task'
import { usePhotosStore } from '@/stores/photos'
import {
  PhCamera,
  PhScan,
  PhInfo,
  PhHeart,
  PhShareNetwork,
  PhImage,
  PhArrowsOut,
  PhArrowsIn,
  PhX
} from '@phosphor-icons/vue'

const taskStore = useTaskStore()
const photosStore = usePhotosStore()

// 识别状态
const scanState = ref<'idle' | 'scanning' | 'result'>('idle')
const scanProgress = ref(0)
const identifiedAnimal = ref<any>(null)
let scanInterval: NodeJS.Timeout | null = null

// 相册模式
const showAlbumPicker = ref(false)
const selectedPhoto = ref<{ url: string; name: string } | null>(null)

// 识别框状态（可移动、可缩放）
const scanBoxRef = ref<HTMLDivElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const scanBox = ref({
  x: 0,
  y: 0,
  width: 240,
  height: 240,
  minSize: 120,
  maxSize: 500
})

// 拖拽状态
const isDragging = ref(false)
const isResizing = ref(false)
const dragStart = ref({ x: 0, y: 0, boxX: 0, boxY: 0 })
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0 })

// 选择相册照片
function selectPhotoFromAlbum(photo: { url: string; name: string }) {
  selectedPhoto.value = photo
  showAlbumPicker.value = false
  resetScan()
}

// 获取当前显示的图片
const currentImageUrl = computed(() => {
  if (selectedPhoto.value) {
    return selectedPhoto.value.url
  }
  return ''
})

// 开始拖拽识别框
function startDrag(e: MouseEvent | TouchEvent) {
  if (scanState.value !== 'idle') return
  e.preventDefault()
  isDragging.value = true

  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

  dragStart.value = {
    x: clientX,
    y: clientY,
    boxX: scanBox.value.x,
    boxY: scanBox.value.y
  }
}

// 开始缩放识别框
function startResize(e: MouseEvent | TouchEvent) {
  if (scanState.value !== 'idle') return
  e.preventDefault()
  e.stopPropagation()
  isResizing.value = true

  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

  resizeStart.value = {
    x: clientX,
    y: clientY,
    width: scanBox.value.width,
    height: scanBox.value.height
  }
}

// 处理拖拽/缩放移动
function handleMove(e: MouseEvent | TouchEvent) {
  if (!isDragging.value && !isResizing.value) return

  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

  if (isDragging.value && containerRef.value) {
    const containerRect = containerRef.value.getBoundingClientRect()
    const deltaX = clientX - dragStart.value.x
    const deltaY = clientY - dragStart.value.y

    let newX = dragStart.value.boxX + deltaX
    let newY = dragStart.value.boxY + deltaY

    // 限制在容器范围内
    const maxX = containerRect.width - scanBox.value.width
    const maxY = containerRect.height - scanBox.value.height

    newX = Math.max(0, Math.min(newX, maxX))
    newY = Math.max(0, Math.min(newY, maxY))

    scanBox.value.x = newX
    scanBox.value.y = newY
  }

  if (isResizing.value) {
    const deltaX = clientX - resizeStart.value.x
    const deltaY = clientY - resizeStart.value.y
    const delta = Math.max(deltaX, deltaY)

    let newSize = resizeStart.value.width + delta
    newSize = Math.max(scanBox.value.minSize, Math.min(newSize, scanBox.value.maxSize))

    scanBox.value.width = newSize
    scanBox.value.height = newSize
  }
}

// 停止拖拽/缩放
function stopDragResize() {
  isDragging.value = false
  isResizing.value = false
}

// 重置识别框位置到中心
function resetScanBoxPosition() {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    scanBox.value.x = (rect.width - scanBox.value.width) / 2
    scanBox.value.y = (rect.height - scanBox.value.height) / 2
  }
}

// 动物识别数据库 - 包含动物园官网所有动物
const animalDatabase: Record<string, any> = {
  '长颈鹿': {
    name: '长颈鹿',
    englishName: 'Giraffe',
    scientificName: 'Giraffa camelopardalis',
    confidence: 97.8,
    category: '哺乳纲 / 长颈鹿科',
    features: ['世界上最高的动物', '长脖子和长腿', '身上有独特斑纹', '蓝黑色长舌头'],
    description: '长颈鹿是世界上现存最高的陆生动物，以其超长的脖子和腿而闻名。它们生活在非洲的稀树草原和开阔林地，主要以树叶为食，尤其喜爱金合欢树的叶子。',
    habitat: '非洲撒哈拉以南的稀树草原',
    conservation: '易危 (VU)'
  },
  '亚洲象': {
    name: '亚洲象',
    englishName: 'Asian Elephant',
    scientificName: 'Elephas maximus',
    confidence: 98.1,
    category: '哺乳纲 / 象科',
    features: ['亚洲最大陆生动物', '长鼻子', '大耳朵', '象牙'],
    description: '亚洲象是亚洲最大的陆生动物，以其智慧和温和的性格著称。它们是中国国家一级保护动物，主要分布在云南的热带雨林中。',
    habitat: '南亚及东南亚热带森林',
    conservation: '濒危 (EN)'
  },
  '火烈鸟': {
    name: '火烈鸟',
    englishName: 'Flamingo',
    scientificName: 'Phoenicopteridae',
    confidence: 98.5,
    category: '鸟纲 / 火烈鸟科',
    features: ['身高约1.1-1.5米', '全身羽毛呈粉红色', '长腿细颈', '喙部弯曲'],
    description: '火烈鸟因其亮丽的粉红色羽毛而得名，它们常常成群结队地站在浅水中，形成壮观的粉红色海洋。它们的粉红色来自于食物中的类胡萝卜素。',
    habitat: '热带及亚热带浅水湖泊',
    conservation: '无危 (LC)'
  },
  '金丝猴': {
    name: '金丝猴',
    englishName: 'Golden Snub-nosed Monkey',
    scientificName: 'Rhinopithecus roxellana',
    confidence: 97.2,
    category: '哺乳纲 / 猴科',
    features: ['金黄色毛发', '蓝色面孔', '朝天鼻', '长尾巴'],
    description: '金丝猴是中国特有的珍稀动物，因其金黄色的毛发而得名，是中国国家一级保护动物。它们主要栖息在海拔1500-3400米的高山针叶林中。',
    habitat: '中国中部和西南部山区',
    conservation: '濒危 (EN)'
  },
  '东北虎': {
    name: '东北虎',
    englishName: 'Siberian Tiger',
    scientificName: 'Panthera tigris altaica',
    confidence: 99.0,
    category: '哺乳纲 / 猫科',
    features: ['体型最大的猫科动物', '橙黄色皮毛', '黑色条纹', '白色腹部'],
    description: '东北虎是世界上体型最大的猫科动物，也是中国国家一级保护动物。它们主要栖息在中国东北和俄罗斯远东地区的针阔混交林中。',
    habitat: '中国东北及俄罗斯远东地区',
    conservation: '濒危 (EN)'
  },
  '海狮': {
    name: '海狮',
    englishName: 'Sea Lion',
    scientificName: 'Otariinae',
    confidence: 96.8,
    category: '哺乳纲 / 海狮科',
    features: ['流线型身体', '鳍状肢', '外耳', '灵活的后肢'],
    description: '海狮是一种聪明的海洋哺乳动物，以其在水中优雅的游泳姿态和陆地上笨拙可爱的行走方式而著名。新浦动物园的海狮表演是最受欢迎的节目之一。',
    habitat: '沿海地区和岛屿',
    conservation: '无危至易危'
  },
  '大熊猫': {
    name: '大熊猫',
    englishName: 'Giant Panda',
    scientificName: 'Ailuropoda melanoleuca',
    confidence: 99.2,
    category: '哺乳纲 / 熊科',
    features: ['体型圆胖', '黑白相间的毛色', '有黑色眼圈', '以竹子为主食'],
    description: '大熊猫是中国的国宝，被称为"活化石"。它们有着标志性的黑白相间的毛色，憨态可掬的模样深受全世界人民的喜爱。',
    habitat: '中国四川、陕西、甘肃的山区',
    conservation: '易危 (VU)'
  },
  '孔雀': {
    name: '孔雀',
    englishName: 'Peacock',
    scientificName: 'Pavo cristatus',
    confidence: 98.3,
    category: '鸟纲 / 雉科',
    features: ['华丽的尾羽', '彩虹色羽毛', '头顶冠羽', '可以开屏'],
    description: '孔雀以其华丽的彩虹色尾羽而闻名，开屏时展现出令人惊叹的美丽。雄孔雀会展开尾羽吸引雌性，形成壮观的"百鸟之王"景象。',
    habitat: '南亚热带及亚热带地区',
    conservation: '无危 (LC)'
  }
}

// 默认识别结果（未知动物）
const defaultAnimalData = {
  name: '未知物种',
  englishName: 'Unknown Species',
  scientificName: 'Species unknown',
  confidence: 65.0,
  category: '待识别',
  features: ['特征分析中...', '请尝试选择其他照片'],
  description: '暂时无法识别该物种，请确保照片清晰并包含完整的动物特征。您可以尝试调整识别框的位置和大小，或选择其他照片进行识别。',
  habitat: '未知',
  conservation: '未知'
}

// 根据照片名称获取识别结果
function getAnimalByPhotoName(photoName: string): any {
  // 遍历数据库，查找匹配的动物
  for (const [animalName, data] of Object.entries(animalDatabase)) {
    if (photoName.includes(animalName)) {
      return data
    }
  }
  return defaultAnimalData
}

// 开始扫描
function startScan() {
  if (!selectedPhoto.value) {
    showAlbumPicker.value = true
    return
  }

  scanState.value = 'scanning'
  scanProgress.value = 0

  // 模拟扫描进度
  scanInterval = setInterval(() => {
    scanProgress.value += Math.random() * 15 + 5

    if (scanProgress.value >= 100) {
      if (scanInterval) clearInterval(scanInterval)
      scanProgress.value = 100

      // 显示结果 - 根据选择的照片匹配识别结果
      setTimeout(() => {
        const result = getAnimalByPhotoName(selectedPhoto.value?.name || '')
        identifiedAnimal.value = result
        scanState.value = 'result'

        // 完成任务 - 完成AI识别即可完成任务6
        taskStore.checkTrigger({ type: 'ai_identify' })
      }, 500)
    }
  }, 200)
}

// 重新扫描
function rescan() {
  scanState.value = 'idle'
  identifiedAnimal.value = null
  scanProgress.value = 0
}

// 重置扫描状态
function resetScan() {
  if (scanInterval) clearInterval(scanInterval)
  scanState.value = 'idle'
  identifiedAnimal.value = null
  scanProgress.value = 0
}

onMounted(() => {
  taskStore.checkTrigger({ type: 'app_open', appId: 'lens' })

  // 初始化识别框位置
  setTimeout(resetScanBoxPosition, 100)

  // 添加全局事件监听
  document.addEventListener('mousemove', handleMove)
  document.addEventListener('mouseup', stopDragResize)
  document.addEventListener('touchmove', handleMove, { passive: false })
  document.addEventListener('touchend', stopDragResize)
})

onUnmounted(() => {
  if (scanInterval) clearInterval(scanInterval)

  // 移除全局事件监听
  document.removeEventListener('mousemove', handleMove)
  document.removeEventListener('mouseup', stopDragResize)
  document.removeEventListener('touchmove', handleMove)
  document.removeEventListener('touchend', stopDragResize)
})
</script>

<template>
  <div class="h-full flex flex-col bg-gray-900 text-white relative overflow-hidden">

    <!-- 顶部标题栏 -->
    <div class="bg-black/60 backdrop-blur-xl px-4 py-3 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-2">
        <PhScan :size="20" class="text-cyan-400" />
        <span class="font-medium">智能识别</span>
      </div>

      <!-- 当前照片名称 -->
      <div v-if="selectedPhoto" class="text-sm text-gray-300 truncate max-w-[150px]">
        📷 {{ selectedPhoto.name }}
      </div>
    </div>

    <!-- 取景器区域 -->
    <div
      ref="containerRef"
      class="flex-1 relative flex items-center justify-center overflow-hidden"
      @mousedown.self="startDrag"
      @touchstart.self="startDrag"
    >

      <!-- 背景图片 -->
      <img
        :src="currentImageUrl"
        class="absolute inset-0 w-full h-full object-cover"
        :class="{ 'blur-sm': scanState === 'result' }"
      />

      <!-- 暗角效果 -->
      <div class="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60"></div>

      <!-- 可拖拽/可缩放的扫描框 -->
      <div
        ref="scanBoxRef"
        class="absolute border-2 rounded-2xl transition-colors duration-300 select-none"
        :class="[
          scanState === 'scanning' ? 'border-cyan-400' : 'border-white/70',
          scanState === 'result' ? 'border-green-400' : '',
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        ]"
        :style="{
          left: `${scanBox.x}px`,
          top: `${scanBox.y}px`,
          width: `${scanBox.width}px`,
          height: `${scanBox.height}px`
        }"
        @mousedown="startDrag"
        @touchstart="startDrag"
      >
        <!-- 四角装饰 -->
        <div class="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 rounded-tl-lg pointer-events-none"
             :class="scanState === 'scanning' ? 'border-cyan-400' : 'border-white'"></div>
        <div class="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 rounded-tr-lg pointer-events-none"
             :class="scanState === 'scanning' ? 'border-cyan-400' : 'border-white'"></div>
        <div class="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 rounded-bl-lg pointer-events-none"
             :class="scanState === 'scanning' ? 'border-cyan-400' : 'border-white'"></div>
        <div class="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 rounded-br-lg pointer-events-none"
             :class="scanState === 'scanning' ? 'border-cyan-400' : 'border-white'"></div>

        <!-- 缩放手柄 -->
        <div
          v-if="scanState === 'idle'"
          class="absolute -bottom-3 -right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg cursor-se-resize"
          @mousedown="startResize"
          @touchstart="startResize"
        >
          <PhArrowsOut :size="16" class="text-gray-700" />
        </div>

        <!-- 扫描线动画 -->
        <div
          v-if="scanState === 'scanning'"
          class="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full animate-scan-line"
          :style="{ top: `${(scanProgress % 100)}%` }"
        ></div>

        <!-- 识别成功标记 -->
        <div
          v-if="scanState === 'result'"
          class="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-2xl animate-pulse"
        >
          <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
            <span class="text-3xl">✓</span>
          </div>
        </div>

        <!-- 拖拽提示 -->
        <div
          v-if="scanState === 'idle' && !isDragging && !isResizing"
          class="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <span class="text-white/50 text-xs">拖动调整位置</span>
        </div>
      </div>


      <!-- 扫描状态提示 -->
      <div
        v-if="scanState === 'scanning'"
        class="absolute bottom-8 left-0 right-0 text-center"
      >
        <div class="inline-flex items-center gap-3 bg-black/60 backdrop-blur px-6 py-3 rounded-full">
          <div class="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span class="text-cyan-300 font-medium">正在识别中...</span>
          <span class="text-white font-bold">{{ Math.round(scanProgress) }}%</span>
        </div>
      </div>

      <!-- 未选择照片时的提示 -->
      <div
        v-if="!selectedPhoto"
        class="absolute inset-0 flex items-center justify-center bg-black/60"
      >
        <button
          @click="showAlbumPicker = true"
          class="px-8 py-6 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-white/20 rounded-3xl flex flex-col items-center gap-3 transition-all hover:scale-105"
        >
          <div class="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
            <PhImage :size="32" class="text-white" />
          </div>
          <span class="text-white font-medium text-lg">从相册选择照片</span>
          <span class="text-gray-400 text-sm">选择要识别的动物图片</span>
        </button>
      </div>
    </div>

    <!-- 控制区域 -->
    <div class="bg-black/80 backdrop-blur-xl p-4 shrink-0">
      <template v-if="scanState === 'idle'">
        <!-- 未选择照片时 -->
        <template v-if="!selectedPhoto">
          <button
            @click="showAlbumPicker = true"
            class="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-purple-500/30 active:scale-[0.98] transition-transform"
          >
            <PhImage :size="24" />
            选择照片
          </button>
          <p class="text-center text-gray-400 text-sm mt-3">
            从相册选择一张照片进行AI识别
          </p>
        </template>

        <!-- 已选择照片，显示识别按钮 -->
        <template v-else>
          <div class="flex gap-3">
            <button
              @click="showAlbumPicker = true"
              class="py-4 px-5 bg-gray-700 hover:bg-gray-600 rounded-2xl font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <PhImage :size="20" />
              换图
            </button>
            <button
              @click="startScan"
              class="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-cyan-500/30 active:scale-[0.98] transition-transform"
            >
              <PhScan :size="24" weight="fill" />
              开始识别
            </button>
          </div>
          <p class="text-center text-gray-400 text-sm mt-3">
            调整识别框位置和大小，点击按钮开始AI识别
          </p>
        </template>
      </template>

      <template v-else-if="scanState === 'scanning'">
        <!-- 进度条 -->
        <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full transition-all duration-200"
            :style="{ width: `${scanProgress}%` }"
          ></div>
        </div>
        <p class="text-center text-gray-400 text-sm mt-3">
          AI正在分析图像特征...
        </p>
      </template>
    </div>

    <!-- 识别结果面板 -->
    <Transition name="slide-up">
      <div 
        v-if="scanState === 'result' && identifiedAnimal"
        class="absolute inset-x-0 bottom-0 bg-white text-gray-800 rounded-t-3xl shadow-2xl max-h-[70%] overflow-auto"
      >
        <!-- 拖动条 -->
        <div class="flex justify-center py-3">
          <div class="w-12 h-1 bg-gray-300 rounded-full"></div>
        </div>

        <!-- 头部信息 -->
        <div class="px-6 pb-4 border-b flex items-start gap-4">
          <div class="w-20 h-20 rounded-2xl overflow-hidden bg-pink-100 shrink-0">
            <img
              :src="currentImageUrl"
              class="w-full h-full object-cover"
            />
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h2 class="text-xl font-bold">{{ identifiedAnimal.name }}</h2>
              <span class="px-2 py-0.5 bg-green-100 text-green-600 text-xs font-bold rounded-full">
                {{ identifiedAnimal.confidence }}% 匹配
              </span>
            </div>
            <p class="text-gray-500 text-sm mt-1">{{ identifiedAnimal.englishName }}</p>
            <p class="text-gray-400 text-xs italic mt-0.5">{{ identifiedAnimal.scientificName }}</p>
            <div class="flex items-center gap-2 mt-2">
              <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">{{ identifiedAnimal.category }}</span>
              <span class="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-lg">{{ identifiedAnimal.conservation }}</span>
            </div>
          </div>
        </div>

        <!-- 特征标签 -->
        <div class="px-6 py-4 border-b">
          <h3 class="text-sm font-bold text-gray-500 mb-3">识别特征</h3>
          <div class="flex flex-wrap gap-2">
            <span 
              v-for="feature in identifiedAnimal.features"
              :key="feature"
              class="px-3 py-1.5 bg-pink-50 text-pink-600 text-sm rounded-full"
            >
              {{ feature }}
            </span>
          </div>
        </div>

        <!-- 详细介绍 -->
        <div class="px-6 py-4 border-b">
          <h3 class="text-sm font-bold text-gray-500 mb-2">物种介绍</h3>
          <p class="text-gray-600 text-sm leading-relaxed">
            {{ identifiedAnimal.description }}
          </p>
        </div>

        <!-- 栖息地 -->
        <div class="px-6 py-4 border-b">
          <h3 class="text-sm font-bold text-gray-500 mb-2">栖息环境</h3>
          <p class="text-gray-600 text-sm">{{ identifiedAnimal.habitat }}</p>
        </div>

        <!-- 操作按钮 -->
        <div class="px-6 py-4 flex gap-3">
          <button 
            @click="rescan"
            class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <PhCamera :size="18" />
            重新识别
          </button>
          <button class="flex-1 py-3 bg-pink-500 text-white rounded-xl font-medium flex items-center justify-center gap-2">
            <PhHeart :size="18" weight="fill" />
            收藏
          </button>
        </div>

      </div>
    </Transition>

    <!-- 相册选择器弹窗 -->
    <Transition name="fade">
      <div
        v-if="showAlbumPicker"
        class="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col"
      >
        <!-- 头部 -->
        <div class="bg-gray-900/90 backdrop-blur-xl px-4 py-3 flex items-center justify-between shrink-0">
          <h2 class="text-white font-bold text-lg">选择照片</h2>
          <button
            @click="showAlbumPicker = false"
            class="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
          >
            <PhX :size="18" class="text-white" />
          </button>
        </div>

        <!-- 照片网格 -->
        <div class="flex-1 overflow-auto p-3">
          <div v-if="photosStore.photos.length === 0" class="h-full flex flex-col items-center justify-center text-gray-400">
            <PhImage :size="48" class="mb-3 opacity-50" />
            <p class="text-lg">相册为空</p>
            <p class="text-sm mt-1">请先在浏览器中保存一些图片到相册</p>
          </div>

          <div v-else class="grid grid-cols-3 gap-2">
            <div
              v-for="photo in photosStore.photos"
              :key="photo.id"
              @click="selectPhotoFromAlbum(photo)"
              class="aspect-square rounded-xl overflow-hidden cursor-pointer relative group"
            >
              <img
                :src="photo.url"
                :alt="photo.name"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <!-- 悬浮遮罩 -->
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <div class="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 group-hover:scale-100">
                  <PhScan :size="20" class="text-cyan-600" />
                </div>
              </div>
              <!-- 照片名称 -->
              <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p class="text-white text-xs truncate">{{ photo.name }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部提示 -->
        <div class="bg-gray-900/90 backdrop-blur-xl px-4 py-3 text-center shrink-0">
          <p class="text-gray-400 text-sm">点击选择要识别的照片</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 扫描线动画 */
@keyframes scan-line {
  0% {
    top: 0%;
  }
  100% {
    top: 100%;
  }
}

.animate-scan-line {
  animation: scan-line 1.5s ease-in-out infinite;
}
</style>
