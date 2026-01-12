<script setup lang="ts">
// ==========================================
// 浏览器 App - 模拟 Safari / 动物园官网
// ==========================================
import { ref, computed, onMounted } from 'vue'
import { useTaskStore } from '@/stores/task'
import { usePhotosStore } from '@/stores/photos'
import animalsData from '@/assets/data/animals.json'
import zooGuideMapImage from '@/assets/images/zoo_guide_map.png'
import { 
  PhMagnifyingGlass, 
  PhArrowLeft,
  PhArrowRight,
  PhArrowClockwise,
  PhBookmarkSimple,
  PhX,
  PhStar,
  PhMapPin,
  PhClock,
  PhDownload,
  PhCopy,
  PhCheckCircle,
  PhEye
} from '@phosphor-icons/vue'

const taskStore = useTaskStore()
const photosStore = usePhotosStore()

// 页面状态
type PageType = 'home' | 'zoo' | 'search' | 'animal'
const currentPage = ref<PageType>('home')
const currentUrl = ref('https://www.google.com')
const searchQuery = ref('')
const selectedAnimal = ref<any>(null)
const selectedCategory = ref<string | null>(null)

// 搜索结果
const searchResults = ref<any[]>([])
const searchKeyword = ref('')

// 菜单状态
const showContextMenu = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuTarget = ref<{ type: 'image' | 'text'; data: any } | null>(null)

// 操作反馈
const showCopySuccess = ref(false)
const showSaveSuccess = ref(false)

// 导览图预览弹窗
const showGuideMapPreview = ref(false)

// 动物数据
const animals = animalsData.animals
const categories = animalsData.categories

// 获取分类动物
const filteredAnimals = computed(() => {
  if (!selectedCategory.value) return animals
  return animals.filter(a => a.category === selectedCategory.value)
})

// 搜索处理
function handleSearch() {
  const query = searchQuery.value.toLowerCase()
  
  if (query.includes('动物园') || query.includes('连云港')) {
    goToZoo()
    return
  }
  
  if (query.includes('长颈鹿') || query.includes('身高')) {
    searchKeyword.value = '长颈鹿 平均身高'
    searchResults.value = [
      {
        title: '长颈鹿的平均身高是多少？',
        url: 'www.baike.com/giraffe',
        snippet: '成年长颈鹿的平均身高为 <strong>4.5-5.8米</strong>，雄性比雌性更高。长颈鹿是现存最高的陆生动物，它们长长的脖子有2-2.4米长。'
      },
      {
        title: '长颈鹿 - 动物百科',
        url: 'www.animal.wiki/giraffe',
        snippet: '长颈鹿（Giraffa）是一种生活在非洲的大型哺乳动物，以其极长的脖子和腿著称...'
      }
    ]
    currentPage.value = 'search'
    
    // 任务检查 - 使用关键词搜索即可完成任务5
    taskStore.checkTrigger({ type: 'browser_search' })
    return
  }
  
  if (query.includes('大象') || query.includes('亚洲象') || query.includes('体重')) {
    searchKeyword.value = '亚洲象 体重'
    searchResults.value = [
      {
        title: '亚洲象的体重有多重？',
        url: 'www.baike.com/elephant',
        snippet: '成年亚洲象的体重约为 <strong>3000-5000公斤</strong>，是亚洲最大的陆生动物。雄象比雌象更重，最大的雄象可达6吨。'
      },
      {
        title: '亚洲象 - 国家一级保护动物',
        url: 'www.wildlife.cn/asian-elephant',
        snippet: '亚洲象是中国国家一级保护动物，主要分布在云南西双版纳地区...'
      }
    ]
    currentPage.value = 'search'
    
    // 任务检查 - 使用关键词搜索即可完成任务5
    taskStore.checkTrigger({ type: 'browser_search' })
    return
  }
}

// 跳转动物园官网
function goToZoo() {
  currentUrl.value = 'https://www.lygzoo.com'
  currentPage.value = 'zoo'
  
  // 任务检查
  taskStore.checkTrigger({ type: 'app_open', appId: 'safari' })
}

// 回到首页
function goHome() {
  currentUrl.value = 'https://www.google.com'
  currentPage.value = 'home'
  searchQuery.value = ''
  selectedAnimal.value = null
  selectedCategory.value = null
}

// 查看动物详情
function viewAnimal(animal: any) {
  selectedAnimal.value = animal
  currentPage.value = 'animal'
}

// 返回上一页
function goBack() {
  if (currentPage.value === 'animal') {
    currentPage.value = 'zoo'
    selectedAnimal.value = null
  } else if (currentPage.value === 'search') {
    currentPage.value = 'home'
  } else {
    goHome()
  }
}

// 右键菜单（长按）
function handleContextMenu(event: MouseEvent, type: 'image' | 'text', data: any) {
  event.preventDefault()
  showContextMenu.value = true
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
  contextMenuTarget.value = { type, data }
}

// 保存图片
function saveImage() {
  if (contextMenuTarget.value?.type === 'image') {
    const imageName = contextMenuTarget.value.data.name || '动物图片'
    
    // 判断是否为导览图，设置正确的分类
    const isGuideMap = imageName === '园区导览图'
    const category = isGuideMap ? 'map' : 'saved'
    
    photosStore.saveImageFromUrl(
      contextMenuTarget.value.data.url,
      imageName,
      category
    )
    showSaveSuccess.value = true
    setTimeout(() => showSaveSuccess.value = false, 2000)
    
    // 任务检查 - 保存图片会触发相应任务
    if (isGuideMap) {
      taskStore.checkTrigger({ type: 'save_to_album' })
    } else {
      taskStore.checkTrigger({ type: 'save_animal_photo' })
    }
  }
  showContextMenu.value = false
}

// 复制文字
function copyText() {
  if (contextMenuTarget.value?.type === 'text') {
    navigator.clipboard?.writeText(contextMenuTarget.value.data)
    showCopySuccess.value = true
    setTimeout(() => showCopySuccess.value = false, 2000)
    
    // 任务检查 - 复制文字
    taskStore.checkTrigger({ type: 'copy_text' })
  }
  showContextMenu.value = false
}

// 关闭菜单
function closeContextMenu() {
  showContextMenu.value = false
}

// 保存导览图
function saveGuideMap() {
  photosStore.saveImageFromUrl(
    zooGuideMapImage,
    '园区导览图',
    'map'
  )
  showSaveSuccess.value = true
  setTimeout(() => showSaveSuccess.value = false, 2000)
  
  // 任务检查 - 保存到相册即可完成任务4
  taskStore.checkTrigger({ type: 'save_to_album' })
}

onMounted(() => {
  taskStore.checkTrigger({ type: 'app_open', appId: 'safari' })
})
</script>

<template>
  <div class="h-full flex flex-col bg-white" @click="closeContextMenu">
    
    <!-- 浏览器工具栏 -->
    <div class="h-12 bg-gray-100 border-b flex items-center px-3 gap-2 shrink-0">
      <!-- 导航按钮 -->
      <div class="flex gap-1">
        <button @click="goBack" class="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
          <PhArrowLeft :size="16" class="text-gray-600" />
        </button>
        <button class="p-1.5 hover:bg-gray-200 rounded-lg transition-colors opacity-40">
          <PhArrowRight :size="16" class="text-gray-400" />
        </button>
        <button class="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
          <PhArrowClockwise :size="16" class="text-gray-600" />
        </button>
      </div>

      <!-- 地址栏 -->
      <div class="flex-1 h-8 bg-white rounded-lg border flex items-center px-3">
        <input 
          v-model="searchQuery"
          @keyup.enter="handleSearch"
          type="text"
          class="w-full text-sm outline-none"
          :placeholder="currentUrl"
        />
      </div>

      <!-- 工具按钮 -->
      <div class="flex gap-1">
        <button class="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
          <PhBookmarkSimple :size="16" class="text-gray-600" />
        </button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="flex-1 overflow-auto">
      
      <!-- 首页（搜索页） -->
      <template v-if="currentPage === 'home'">
        <div class="h-full flex flex-col items-center justify-center p-8 -mt-20">
          <h1 class="text-5xl font-light text-gray-300 mb-8 tracking-tight">Safari</h1>
          <div class="w-full max-w-lg relative">
            <input 
              v-model="searchQuery"
              @keyup.enter="handleSearch"
              type="text"
              class="w-full h-12 pl-12 pr-4 rounded-full border border-gray-300 shadow-sm text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              placeholder="搜索或输入网站名称"
            />
            <PhMagnifyingGlass class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" :size="18" />
          </div>
          
          <!-- 快捷入口 -->
          <div class="flex gap-6 mt-8">
            <button @click="goToZoo" class="flex flex-col items-center gap-2 group">
              <div class="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🦁
              </div>
              <span class="text-xs text-gray-500">动物园官网</span>
            </button>
            <button class="flex flex-col items-center gap-2 opacity-50">
              <div class="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl">
                🔍
              </div>
              <span class="text-xs text-gray-500">百度搜索</span>
            </button>
          </div>

        </div>
      </template>

      <!-- 搜索结果页 -->
      <template v-else-if="currentPage === 'search'">
        <div class="max-w-3xl mx-auto p-6">
          <p class="text-sm text-gray-500 mb-4">搜索结果：{{ searchKeyword }}</p>
          
          <div class="space-y-6">
            <div 
              v-for="(result, index) in searchResults"
              :key="index"
              class="group"
            >
              <div class="text-xs text-green-700 mb-1">{{ result.url }}</div>
              <h3 class="text-lg text-blue-700 group-hover:underline cursor-pointer font-medium">
                {{ result.title }}
              </h3>
              <p 
                class="text-sm text-gray-600 mt-1 selectable cursor-text"
                v-html="result.snippet"
                @contextmenu="handleContextMenu($event, 'text', result.snippet.replace(/<[^>]*>/g, ''))"
              ></p>
            </div>
          </div>

        </div>
      </template>

      <!-- 动物园官网 -->
      <template v-else-if="currentPage === 'zoo'">
        <!-- Hero Banner -->
        <div class="relative h-48 bg-gradient-to-r from-green-600 to-emerald-500 overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=1200"
            class="absolute inset-0 w-full h-full object-cover opacity-40"
          />
          <div class="absolute inset-0 flex flex-col items-center justify-center text-white">
            <h1 class="text-3xl font-bold drop-shadow-lg">新浦动物园</h1>
            <p class="text-white/80 mt-2">Lianyungang Wildlife Park</p>
            <div class="flex items-center gap-4 mt-4 text-sm">
              <span class="flex items-center gap-1"><PhMapPin :size="14" /> 海州区</span>
              <span class="flex items-center gap-1"><PhClock :size="14" /> 8:30-17:30</span>
              <span class="flex items-center gap-1"><PhStar :size="14" weight="fill" /> 4.8分</span>
            </div>
          </div>
        </div>

        <!-- 导航标签 -->
        <div class="flex border-b bg-white sticky top-0 z-10">
          <button 
            @click="selectedCategory = null"
            class="flex-1 py-3 text-sm font-medium border-b-2 transition-colors"
            :class="!selectedCategory ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500'"
          >
            全部动物
          </button>
          <button 
            v-for="cat in categories.slice(0, 3)"
            :key="cat.id"
            @click="selectedCategory = cat.id"
            class="flex-1 py-3 text-sm font-medium border-b-2 transition-colors"
            :class="selectedCategory === cat.id ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500'"
          >
            {{ cat.icon }} {{ cat.name }}
          </button>
        </div>

        <!-- 🗺️ 园区导览图（卡片形式） -->
        <div class="p-4 bg-gradient-to-br from-green-50 to-emerald-50">
          <div class="bg-white rounded-2xl shadow-lg overflow-hidden border border-green-100">
            <div class="p-4 flex items-center gap-4">
              <div class="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center text-3xl">
                🗺️
              </div>
              <div class="flex-1">
                <h3 class="font-bold text-gray-800 text-lg">园区导览图</h3>
                <p class="text-sm text-gray-500 mt-1">查看完整园区地图，规划游览路线</p>
              </div>
              <div class="flex gap-2">
                <button 
                  @click="showGuideMapPreview = true"
                  class="px-3 py-2 bg-green-100 text-green-600 text-sm font-bold rounded-xl flex items-center gap-1 hover:bg-green-200 transition-colors"
                >
                  <PhEye :size="16" />
                  预览
                </button>
                <button 
                  @click="saveGuideMap"
                  class="px-3 py-2 bg-green-500 text-white text-sm font-bold rounded-xl flex items-center gap-1 hover:bg-green-600 transition-colors"
                >
                  <PhDownload :size="16" />
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 动物图鉴 -->
        <div class="p-4">
          <h2 class="text-lg font-bold text-gray-800 mb-4">🦁 动物图鉴</h2>
          <div class="grid grid-cols-2 gap-4">
            <div 
              v-for="animal in filteredAnimals"
              :key="animal.id"
              @click="viewAnimal(animal)"
              @contextmenu="handleContextMenu($event, 'image', { url: animal.images[0], name: animal.name })"
              class="bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
            >
              <div class="relative h-32 overflow-hidden">
                <!-- 模糊背景层 -->
                <img
                  :src="animal.images[0]"
                  :alt="animal.name"
                  class="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-60"
                />
                <!-- 主图片 -->
                <img
                  :src="animal.images[0]"
                  :alt="animal.name"
                  class="relative w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                />
                <div class="absolute bottom-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded-full z-10">
                  {{ animal.categoryName }}
                </div>
              </div>
              <div class="p-3">
                <h3 class="font-bold text-gray-800">{{ animal.name }}</h3>
                <p class="text-xs text-gray-500 mt-1">{{ animal.englishName }}</p>
              </div>
            </div>
          </div>
        </div>



        <!-- 版权信息 -->
        <div class="p-4 text-center text-xs text-gray-400">
          © 2024 Lianyungang Wildlife Park. All rights reserved.
        </div>
      </template>

      <!-- 动物详情页 -->
      <template v-else-if="currentPage === 'animal' && selectedAnimal">
        <!-- 头图 -->
        <div
          class="relative h-56 overflow-hidden"
          @contextmenu="handleContextMenu($event, 'image', { url: selectedAnimal.images[0], name: selectedAnimal.name })"
        >
          <!-- 模糊背景层 -->
          <img
            :src="selectedAnimal.images[0]"
            class="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-70"
          />
          <!-- 主图片 -->
          <img
            :src="selectedAnimal.images[0]"
            class="relative w-full h-full object-contain"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
          <div class="absolute bottom-4 left-4 text-white z-10">
            <h1 class="text-2xl font-bold">{{ selectedAnimal.name }}</h1>
            <p class="text-white/80 text-sm">{{ selectedAnimal.englishName }}</p>
          </div>
        </div>

        <!-- 基本信息 -->
        <div class="p-4 bg-white border-b">
          <div class="flex items-center gap-2 mb-3">
            <span class="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg">
              {{ selectedAnimal.categoryName }}
            </span>
            <span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg">
              {{ selectedAnimal.conservation }}
            </span>
          </div>
          <p class="text-xs text-gray-400 italic">{{ selectedAnimal.scientificName }}</p>
        </div>

        <!-- 物种介绍 -->
        <div class="p-4 bg-white border-b">
          <h3 class="font-bold text-gray-800 mb-2">物种介绍</h3>
          <p 
            class="text-sm text-gray-600 leading-relaxed selectable"
            @contextmenu="handleContextMenu($event, 'text', selectedAnimal.description)"
          >
            {{ selectedAnimal.description }}
          </p>
        </div>

        <!-- 数据统计 -->
        <div class="p-4 bg-white border-b">
          <h3 class="font-bold text-gray-800 mb-3">物种数据</h3>
          <div class="grid grid-cols-2 gap-3">
            <div v-if="selectedAnimal.stats.height" class="bg-gray-50 rounded-xl p-3">
              <div class="text-xs text-gray-500">身高</div>
              <div class="font-bold text-gray-800">{{ selectedAnimal.stats.height }}</div>
            </div>
            <div v-if="selectedAnimal.stats.weight" class="bg-gray-50 rounded-xl p-3">
              <div class="text-xs text-gray-500">体重</div>
              <div class="font-bold text-gray-800">{{ selectedAnimal.stats.weight }}</div>
            </div>
            <div v-if="selectedAnimal.stats.lifespan" class="bg-gray-50 rounded-xl p-3">
              <div class="text-xs text-gray-500">寿命</div>
              <div class="font-bold text-gray-800">{{ selectedAnimal.stats.lifespan }}</div>
            </div>
            <div v-if="selectedAnimal.stats.speed" class="bg-gray-50 rounded-xl p-3">
              <div class="text-xs text-gray-500">速度</div>
              <div class="font-bold text-gray-800">{{ selectedAnimal.stats.speed }}</div>
            </div>
          </div>
        </div>

        <!-- 趣闻 -->
        <div class="p-4 bg-white">
          <h3 class="font-bold text-gray-800 mb-3">🎯 趣味小知识</h3>
          <ul class="space-y-2">
            <li 
              v-for="(fact, index) in selectedAnimal.funFacts"
              :key="index"
              class="flex gap-2 text-sm text-gray-600"
            >
              <span class="text-yellow-500">💡</span>
              <span class="selectable" @contextmenu="handleContextMenu($event, 'text', fact)">{{ fact }}</span>
            </li>
          </ul>
        </div>
      </template>
    </div>

    <!-- 右键菜单 -->
    <Transition name="fade">
      <div 
        v-if="showContextMenu"
        class="fixed bg-white rounded-xl shadow-2xl border overflow-hidden z-50"
        :style="{ left: `${contextMenuPosition.x}px`, top: `${contextMenuPosition.y}px` }"
      >
        <template v-if="contextMenuTarget?.type === 'image'">
          <button @click="saveImage" class="w-full px-4 py-3 text-sm text-left hover:bg-gray-100 flex items-center gap-2">
            <PhDownload :size="16" />
            保存到相册
          </button>
        </template>
        <template v-if="contextMenuTarget?.type === 'text'">
          <button @click="copyText" class="w-full px-4 py-3 text-sm text-left hover:bg-gray-100 flex items-center gap-2">
            <PhCopy :size="16" />
            拷贝
          </button>
        </template>
        <button @click="closeContextMenu" class="w-full px-4 py-3 text-sm text-left hover:bg-gray-100 text-gray-500">
          取消
        </button>
      </div>
    </Transition>

    <!-- 操作成功提示 -->
    <Transition name="fade">
      <div 
        v-if="showSaveSuccess"
        class="fixed top-20 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 z-50"
      >
        <PhCheckCircle :size="16" weight="fill" class="text-green-400" />
        已保存到相册
      </div>
    </Transition>
    <Transition name="fade">
      <div 
        v-if="showCopySuccess"
        class="fixed top-20 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 z-50"
      >
        <PhCheckCircle :size="16" weight="fill" class="text-green-400" />
        已复制到剪贴板
      </div>
    </Transition>

    <!-- 导览图预览弹窗 -->
    <Transition name="fade">
      <div 
        v-if="showGuideMapPreview"
        class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
        @click.self="showGuideMapPreview = false"
      >
        <div class="relative max-w-2xl w-full">
          <!-- 关闭按钮 -->
          <button 
            @click="showGuideMapPreview = false"
            class="absolute -top-12 right-0 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <PhX :size="24" />
          </button>
          
          <!-- 图片 -->
          <img 
            :src="zooGuideMapImage"
            alt="新浦动物园导览图"
            class="w-full rounded-2xl shadow-2xl"
            @contextmenu="handleContextMenu($event, 'image', { url: zooGuideMapImage, name: '园区导览图' })"
          />
          
          <!-- 保存按钮 -->
          <div class="mt-4 flex justify-center">
            <button 
              @click="saveGuideMap(); showGuideMapPreview = false"
              class="px-6 py-3 bg-green-500 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-green-600 transition-colors shadow-lg"
            >
              <PhDownload :size="18" />
              保存到相册
            </button>
          </div>
          
          <!-- 提示 -->
          <p class="text-center text-white/60 text-sm mt-3">💡 右键图片也可保存到相册</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
