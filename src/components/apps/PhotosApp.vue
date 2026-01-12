<script setup lang="ts">
// ==========================================
// 相册 App - 图片管理与编辑
// ==========================================
import { ref, computed, onMounted } from 'vue'
import { usePhotosStore } from '@/stores/photos'
import { useTaskStore } from '@/stores/task'
import { 
  PhImage, 
  PhTrash, 
  PhPencil,
  PhX,
  PhArrowLeft,
  PhShare,
  PhHeart,
  PhMagnifyingGlassPlus,
  PhMagnifyingGlassMinus,
  PhPaintBrush,
  PhTextT,
  PhCheck
} from '@phosphor-icons/vue'

const photosStore = usePhotosStore()
const taskStore = useTaskStore()

// 视图模式
const viewMode = ref<'grid' | 'detail' | 'edit'>('grid')
const selectedPhoto = ref<any>(null)

// 编辑状态
const isEditing = ref(false)
const brushColor = ref('#FF5733')
const brushSize = ref(4)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isDrawing = ref(false)
const lastPos = ref({ x: 0, y: 0 })

// 分类过滤
const activeCategory = ref<'all' | 'animal' | 'map' | 'saved'>('all')

// 根据分类过滤照片
const filteredPhotos = computed(() => {
  if (activeCategory.value === 'all') {
    return photosStore.photos
  }
  return photosStore.photos.filter(p => p.category === activeCategory.value)
})

// 查看照片详情
function viewPhoto(photo: any) {
  selectedPhoto.value = photo
  viewMode.value = 'detail'
}

// 返回网格视图
function goBack() {
  if (viewMode.value === 'edit') {
    viewMode.value = 'detail'
    isEditing.value = false
  } else {
    viewMode.value = 'grid'
    selectedPhoto.value = null
  }
}

// 进入编辑模式
function startEdit() {
  viewMode.value = 'edit'
  isEditing.value = true
  
  // 初始化画布
  setTimeout(() => {
    initCanvas()
  }, 100)
}

// 初始化画布
function initCanvas() {
  if (!canvasRef.value || !selectedPhoto.value) return
  
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)
  }
  img.src = selectedPhoto.value.url
}

// 绘图事件
function startDrawing(e: MouseEvent | TouchEvent) {
  if (!canvasRef.value) return
  isDrawing.value = true
  
  const rect = canvasRef.value.getBoundingClientRect()
  const scaleX = canvasRef.value.width / rect.width
  const scaleY = canvasRef.value.height / rect.height
  
  let clientX, clientY
  if ('touches' in e) {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  } else {
    clientX = e.clientX
    clientY = e.clientY
  }
  
  lastPos.value = {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  }
}

function draw(e: MouseEvent | TouchEvent) {
  if (!isDrawing.value || !canvasRef.value) return
  
  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return
  
  const rect = canvasRef.value.getBoundingClientRect()
  const scaleX = canvasRef.value.width / rect.width
  const scaleY = canvasRef.value.height / rect.height
  
  let clientX, clientY
  if ('touches' in e) {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
    e.preventDefault()
  } else {
    clientX = e.clientX
    clientY = e.clientY
  }
  
  const currentPos = {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  }
  
  ctx.beginPath()
  ctx.strokeStyle = brushColor.value
  ctx.lineWidth = brushSize.value * 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.moveTo(lastPos.value.x, lastPos.value.y)
  ctx.lineTo(currentPos.x, currentPos.y)
  ctx.stroke()
  
  lastPos.value = currentPos
}

function stopDrawing() {
  isDrawing.value = false
}

// 保存编辑
function saveEdit() {
  // 这里可以保存canvas为新图片
  viewMode.value = 'detail'
  isEditing.value = false
}

// 删除照片
function deletePhoto() {
  if (selectedPhoto.value) {
    photosStore.deletePhoto(selectedPhoto.value.id)
    goBack()
  }
}

// 颜色选项
const colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#FFD700', '#FFFFFF', '#000000']

onMounted(() => {
  taskStore.checkTrigger({ type: 'app_open', appId: 'photos' })
})
</script>

<template>
  <div class="h-full flex flex-col bg-gray-50">
    
    <!-- 头部 -->
    <div class="h-12 bg-white border-b flex items-center justify-between px-4 shrink-0">
      <template v-if="viewMode === 'grid'">
        <h1 class="font-bold text-gray-800">相册</h1>
        <span class="text-sm text-gray-500">{{ photosStore.photos.length }} 张照片</span>
      </template>
      <template v-else>
        <button @click="goBack" class="flex items-center gap-1 text-blue-500">
          <PhArrowLeft :size="18" />
          <span class="text-sm">返回</span>
        </button>
        <template v-if="viewMode === 'detail'">
          <div class="flex gap-2">
            <button @click="startEdit" class="p-2 hover:bg-gray-100 rounded-lg">
              <PhPencil :size="20" class="text-gray-600" />
            </button>
            <button @click="deletePhoto" class="p-2 hover:bg-gray-100 rounded-lg">
              <PhTrash :size="20" class="text-red-500" />
            </button>
          </div>
        </template>
        <template v-else-if="viewMode === 'edit'">
          <button @click="saveEdit" class="flex items-center gap-1 text-blue-500 font-medium">
            <PhCheck :size="18" weight="bold" />
            完成
          </button>
        </template>
      </template>
    </div>

    <!-- 分类标签（网格视图） -->
    <div v-if="viewMode === 'grid'" class="flex bg-white border-b px-2 shrink-0">
      <button 
        @click="activeCategory = 'all'"
        class="flex-1 py-3 text-sm font-medium border-b-2 transition-colors"
        :class="activeCategory === 'all' ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500'"
      >
        全部
      </button>
      <button 
        @click="activeCategory = 'animal'"
        class="flex-1 py-3 text-sm font-medium border-b-2 transition-colors"
        :class="activeCategory === 'animal' ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500'"
      >
        🦁 动物
      </button>
      <button 
        @click="activeCategory = 'map'"
        class="flex-1 py-3 text-sm font-medium border-b-2 transition-colors"
        :class="activeCategory === 'map' ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500'"
      >
        🗺️ 地图
      </button>
      <button 
        @click="activeCategory = 'saved'"
        class="flex-1 py-3 text-sm font-medium border-b-2 transition-colors"
        :class="activeCategory === 'saved' ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500'"
      >
        💾 已保存
      </button>
    </div>

    <!-- 内容区域 -->
    <div class="flex-1 overflow-auto">
      
      <!-- 网格视图 -->
      <template v-if="viewMode === 'grid'">
        <div v-if="filteredPhotos.length === 0" class="h-full flex flex-col items-center justify-center text-gray-400">
          <PhImage :size="48" class="mb-2 opacity-50" />
          <p>暂无照片</p>
          <p class="text-sm mt-1">在浏览器中长按图片可以保存到这里</p>
        </div>
        
        <div v-else class="grid grid-cols-3 gap-0.5 p-0.5">
          <div 
            v-for="photo in filteredPhotos"
            :key="photo.id"
            @click="viewPhoto(photo)"
            class="aspect-square bg-gray-200 cursor-pointer relative overflow-hidden group"
          >
            <img 
              :src="photo.url"
              :alt="photo.name"
              class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            <!-- 分类标记 -->
            <div 
              class="absolute bottom-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-xs"
            >
              <span v-if="photo.category === 'animal'">🦁</span>
              <span v-else-if="photo.category === 'map'">🗺️</span>
              <span v-else>📷</span>
            </div>
          </div>
        </div>
      </template>

      <!-- 详情视图 -->
      <template v-else-if="viewMode === 'detail' && selectedPhoto">
        <div class="h-full flex flex-col">
          <!-- 图片展示 -->
          <div class="flex-1 bg-black flex items-center justify-center overflow-hidden">
            <img 
              :src="selectedPhoto.url"
              :alt="selectedPhoto.name"
              class="max-w-full max-h-full object-contain"
            />
          </div>
          
          <!-- 信息栏 -->
          <div class="bg-white p-4 border-t">
            <h3 class="font-bold text-gray-800">{{ selectedPhoto.name }}</h3>
            <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>{{ new Date(selectedPhoto.savedAt).toLocaleDateString() }}</span>
              <span class="px-2 py-0.5 bg-gray-100 rounded-full capitalize">{{ selectedPhoto.category }}</span>
            </div>
          </div>

          <!-- 操作栏 -->
          <div class="bg-white border-t p-4 flex justify-around">
            <button class="flex flex-col items-center gap-1 text-gray-600">
              <PhShare :size="22" />
              <span class="text-xs">分享</span>
            </button>
            <button class="flex flex-col items-center gap-1 text-gray-600">
              <PhHeart :size="22" />
              <span class="text-xs">喜欢</span>
            </button>
            <button @click="startEdit" class="flex flex-col items-center gap-1 text-blue-500">
              <PhPencil :size="22" />
              <span class="text-xs">编辑</span>
            </button>
          </div>
        </div>
      </template>

      <!-- 编辑视图 -->
      <template v-else-if="viewMode === 'edit' && selectedPhoto">
        <div class="h-full flex flex-col">
          <!-- 画布区域 -->
          <div class="flex-1 bg-gray-900 flex items-center justify-center overflow-hidden p-4">
            <canvas 
              ref="canvasRef"
              class="max-w-full max-h-full bg-white shadow-2xl rounded-lg cursor-crosshair"
              :style="{ maxWidth: '100%', maxHeight: 'calc(100vh - 200px)' }"
              @mousedown="startDrawing"
              @mousemove="draw"
              @mouseup="stopDrawing"
              @mouseleave="stopDrawing"
              @touchstart="startDrawing"
              @touchmove="draw"
              @touchend="stopDrawing"
            ></canvas>
          </div>

          <!-- 工具栏 -->
          <div class="bg-white border-t p-4">
            <!-- 功能切换 -->
            <div class="flex justify-center gap-4 mb-4">
              <button class="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <PhPaintBrush :size="22" weight="fill" />
              </button>
              <button class="p-3 bg-gray-100 text-gray-400 rounded-xl">
                <PhTextT :size="22" />
              </button>
            </div>

            <!-- 颜色选择 -->
            <div class="flex justify-center gap-3 mb-4">
              <button 
                v-for="color in colors"
                :key="color"
                @click="brushColor = color"
                class="w-8 h-8 rounded-full border-2 transition-transform"
                :class="brushColor === color ? 'scale-125 border-gray-400' : 'border-transparent'"
                :style="{ backgroundColor: color }"
              ></button>
            </div>

            <!-- 笔刷大小 -->
            <div class="flex items-center gap-4 px-4">
              <span class="text-xs text-gray-500">细</span>
              <input 
                type="range" 
                v-model="brushSize" 
                min="1" 
                max="10"
                class="flex-1"
              />
              <span class="text-xs text-gray-500">粗</span>
            </div>


          </div>
        </div>
      </template>
    </div>
  </div>
</template>
