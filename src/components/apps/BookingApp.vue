<script setup lang="ts">
// ==========================================
// 订票通 App - 景点门票预订
// ==========================================
import { ref, computed, onMounted } from 'vue'
import { useTaskStore } from '@/stores/task'
import { useSystemStore } from '@/stores/system'
import { usePhotosStore } from '@/stores/photos'
import html2canvas from 'html2canvas'
import { 
  PhMagnifyingGlass, 
  PhTicket, 
  PhStar,
  PhMapPin,
  PhClock,
  PhCheckCircle,
  PhCreditCard,
  PhShieldCheck
} from '@phosphor-icons/vue'

const taskStore = useTaskStore()
const systemStore = useSystemStore()
const photosStore = usePhotosStore()

// 页面状态
const pageState = ref<'home' | 'search' | 'detail' | 'checkout' | 'success'>('home')
const searchQuery = ref('')
const selectedTicketType = ref<'adult' | 'student'>('student')
const selectedDate = ref('tomorrow')
const ticketSaved = ref(false)
const ticketCardRef = ref<HTMLElement | null>(null)
const showToast = ref(false)
const toastMessage = ref('')

// 热门景点
const hotSpots = [
  { id: 1, name: '新浦动物园', rating: 4.8, reviews: 2856, price: 120, image: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=400' },
  { id: 2, name: '花果山风景区', rating: 4.9, reviews: 5621, price: 90, image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400' },
  { id: 3, name: '连岛海滨度假区', rating: 4.7, reviews: 1823, price: 65, image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400' },
]

// 订单信息
const orderInfo = ref({
  orderNo: '',
  ticketName: '新浦动物园',
  ticketType: '学生优惠票',
  price: 60,
  date: '',
  quantity: 1
})

// 显示 Toast 提示
function displayToast(message: string) {
  toastMessage.value = message
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 2000)
}

// 生成订单号
function generateOrderNo() {
  const date = new Date()
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `LYG-${dateStr}-${random}`
}

// 搜索处理
function handleSearch() {
  if (searchQuery.value.includes('动物') || searchQuery.value.includes('连云港')) {
    pageState.value = 'search'
  }
}

// 选择景点
function selectSpot() {
  pageState.value = 'detail'
}

// 去结算
function goToCheckout() {
  pageState.value = 'checkout'
}

// 保存门票到相册
async function saveToAlbum() {
  if (!ticketCardRef.value) {
    displayToast('门票元素未找到')
    return
  }

  try {
    // 使用 html2canvas 截取门票卡片
    const canvas = await html2canvas(ticketCardRef.value, {
      backgroundColor: null,
      scale: 2, // 提高清晰度
      logging: false
    })
    
    // 将 canvas 转换为 base64 图片
    const imageDataUrl = canvas.toDataURL('image/png')
    
    // 保存到相册
    photosStore.saveImageFromUrl(
      imageDataUrl,
      `${orderInfo.value.ticketName} - ${orderInfo.value.ticketType}`,
      'saved'
    )
    
    ticketSaved.value = true
    displayToast('✅ 门票已保存到相册')
  } catch (error) {
    console.error('保存门票失败:', error)
    displayToast('❌ 保存失败，请重试')
  }
}

// 完成支付
function handlePayment() {
  orderInfo.value.orderNo = generateOrderNo()
  orderInfo.value.date = selectedDate.value === 'tomorrow' ? '明天' : '后天'
  orderInfo.value.ticketType = selectedTicketType.value === 'student' ? '学生优惠票' : '成人票'
  orderInfo.value.price = selectedTicketType.value === 'student' ? 60 : 120
  
  pageState.value = 'success'
  
  // 生成门票后立即完成任务2
  setTimeout(() => {
    taskStore.completeTask('task_2')
  }, 1000)
}

// 返回首页
function goHome() {
  pageState.value = 'home'
  searchQuery.value = ''
}

onMounted(() => {
  taskStore.checkTrigger({ type: 'app_open', appId: 'booking' })
})
</script>

<template>
  <div class="h-full flex flex-col bg-gray-50">
    
    <!-- 顶部搜索栏 -->
    <div class="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 px-4 py-4 shrink-0">
      <div class="flex items-center gap-3">
        <button 
          v-if="pageState !== 'home'" 
          @click="goHome" 
          class="text-white text-2xl"
        >
          ←
        </button>
        <div class="flex-1 relative">
          <input 
            v-model="searchQuery"
            @keyup.enter="handleSearch"
            type="text"
            class="w-full h-10 pl-10 pr-4 rounded-full bg-white/90 text-gray-800 text-sm outline-none placeholder-gray-400"
            placeholder="搜索景点、门票"
          />
          <PhMagnifyingGlass class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" :size="18" />
        </div>
      </div>

    </div>

    <!-- 内容区域 -->
    <div class="flex-1 overflow-auto">
      
      <!-- 首页 -->
      <template v-if="pageState === 'home'">
        <!-- 分类快捷入口 -->
        <div class="p-4 bg-white mb-2">
          <div class="grid grid-cols-4 gap-4">
            <div class="flex flex-col items-center">
              <div class="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-2xl mb-1">🎢</div>
              <span class="text-xs text-gray-600">景点</span>
            </div>
            <div class="flex flex-col items-center">
              <div class="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl mb-1">🎠</div>
              <span class="text-xs text-gray-600">乐园</span>
            </div>
            <div class="flex flex-col items-center">
              <div class="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-2xl mb-1">🦁</div>
              <span class="text-xs text-gray-600">动物园</span>
            </div>
            <div class="flex flex-col items-center">
              <div class="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-2xl mb-1">🏛️</div>
              <span class="text-xs text-gray-600">展览</span>
            </div>
          </div>
        </div>

        <!-- 热门推荐 -->
        <div class="p-4 bg-white">
          <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span class="text-orange-500">🔥</span> 连云港热门景点
          </h3>
          <div class="space-y-4">
            <div 
              v-for="spot in hotSpots" 
              :key="spot.id"
              @click="selectSpot"
              class="flex gap-4 p-3 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors"
              :class="{ 'ring-2 ring-green-500 bg-green-50': spot.name.includes('动物') }"
            >
              <img :src="spot.image" class="w-24 h-24 rounded-xl object-cover" />
              <div class="flex-1">
                <h4 class="font-bold text-gray-800 mb-1">{{ spot.name }}</h4>
                <div class="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <span class="flex items-center text-yellow-500">
                    <PhStar :size="12" weight="fill" /> {{ spot.rating }}
                  </span>
                  <span>{{ spot.reviews }}条评价</span>
                </div>
                <div class="flex items-center justify-between">
                  <div>
                    <span class="text-red-500 font-bold text-lg">¥{{ spot.price }}</span>
                    <span class="text-xs text-gray-400 ml-1">起</span>
                  </div>
                  <button class="px-4 py-1.5 bg-green-500 text-white text-xs font-bold rounded-full">
                    立即预订
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 搜索结果 -->
      <template v-else-if="pageState === 'search'">
        <div class="p-4">
          <p class="text-xs text-gray-500 mb-4">找到 1 个相关结果</p>
          <div 
            @click="selectSpot"
            class="bg-white p-4 rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          >
            <div class="flex gap-4">
              <img src="https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=400" class="w-28 h-28 rounded-xl object-cover" />
              <div class="flex-1">
                <div class="flex items-start justify-between">
                  <h4 class="font-bold text-gray-800">新浦动物园</h4>
                  <span class="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">热销</span>
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <span class="flex items-center text-yellow-500">
                    <PhStar :size="12" weight="fill" /> 4.8
                  </span>
                  <span>2856条评价</span>
                </div>
                <div class="flex items-center text-xs text-gray-400 mt-2">
                  <PhMapPin :size="12" /> 海州区秦东门大街269号
                </div>
                <div class="flex items-center justify-between mt-3">
                  <div>
                    <span class="text-xs text-gray-400 line-through">¥120</span>
                    <span class="text-red-500 font-bold text-xl ml-2">¥60</span>
                    <span class="text-xs text-gray-400">学生票</span>
                  </div>
                  <button class="px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold rounded-full shadow-lg">
                    去预订
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 景点详情 -->
      <template v-else-if="pageState === 'detail'">
        <!-- 头图 -->
        <div class="relative h-48">
          <img src="https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=800" class="w-full h-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div class="absolute bottom-4 left-4 text-white">
            <h1 class="text-xl font-bold">新浦动物园</h1>
            <div class="flex items-center gap-2 text-sm mt-1">
              <span class="flex items-center text-yellow-400">
                <PhStar :size="14" weight="fill" /> 4.8分
              </span>
              <span class="text-white/80">|</span>
              <span class="text-white/80">2856条评价</span>
            </div>
          </div>
        </div>

        <!-- 选择日期 -->
        <div class="p-4 bg-white mb-2">
          <h3 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <PhClock :size="16" /> 选择日期
          </h3>
          <div class="flex gap-3">
            <button 
              @click="selectedDate = 'tomorrow'"
              class="flex-1 py-3 rounded-xl border-2 transition-colors font-medium"
              :class="selectedDate === 'tomorrow' 
                ? 'border-green-500 bg-green-50 text-green-700' 
                : 'border-gray-200 text-gray-600'"
            >
              明天
            </button>
            <button 
              @click="selectedDate = 'dayAfter'"
              class="flex-1 py-3 rounded-xl border-2 transition-colors font-medium"
              :class="selectedDate === 'dayAfter' 
                ? 'border-green-500 bg-green-50 text-green-700' 
                : 'border-gray-200 text-gray-600'"
            >
              后天
            </button>
          </div>
        </div>

        <!-- 选择票种 -->
        <div class="p-4 bg-white mb-2">
          <h3 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <PhTicket :size="16" /> 选择票种
          </h3>
          <div class="space-y-3">
            <!-- 成人票 -->
            <label 
              @click="selectedTicketType = 'adult'"
              class="flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all"
              :class="selectedTicketType === 'adult' 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 hover:bg-gray-50'"
            >
              <div class="flex items-center gap-3">
                <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                     :class="selectedTicketType === 'adult' ? 'border-green-500' : 'border-gray-300'">
                  <div v-if="selectedTicketType === 'adult'" class="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div>
                  <div class="font-medium text-gray-800">成人全价票</div>
                  <div class="text-xs text-gray-500">适用于身高1.5米以上游客</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-lg font-bold text-gray-800">¥120</div>
              </div>
            </label>

            <!-- 学生票 (推荐) -->
            <label 
              @click="selectedTicketType = 'student'"
              class="flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all relative"
              :class="selectedTicketType === 'student' 
                ? 'border-orange-500 bg-orange-50' 
                : 'border-gray-200 hover:bg-gray-50'"
            >
              <div class="absolute -top-2 left-4 px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded">
                🐵 悟空推荐
              </div>
              <div class="flex items-center gap-3">
                <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                     :class="selectedTicketType === 'student' ? 'border-orange-500' : 'border-gray-300'">
                  <div v-if="selectedTicketType === 'student'" class="w-3 h-3 rounded-full bg-orange-500"></div>
                </div>
                <div>
                  <div class="font-medium text-gray-800">学生优惠票</div>
                  <div class="text-xs text-gray-500">凭有效学生证入园</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-xs text-gray-400 line-through">¥120</div>
                <div class="text-lg font-bold text-orange-600">¥60</div>
              </div>
            </label>
          </div>
        </div>

        <!-- 底部结算栏 -->
        <div class="sticky bottom-0 bg-white border-t p-4 flex items-center justify-between">
          <div>
            <span class="text-sm text-gray-500">应付金额</span>
            <span class="text-2xl font-bold text-red-500 ml-2">
              ¥{{ selectedTicketType === 'student' ? 60 : 120 }}
            </span>
          </div>
          <button 
            @click="goToCheckout"
            class="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full shadow-lg active:scale-95 transition-transform"
          >
            立即预订
          </button>
        </div>
      </template>

      <!-- 确认订单 -->
      <template v-else-if="pageState === 'checkout'">
        <div class="p-4 space-y-4">
          <!-- 订单信息 -->
          <div class="bg-white rounded-2xl p-4 shadow-sm">
            <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <PhTicket :size="18" class="text-green-500" />
              订单信息
            </h3>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">景点名称</span>
                <span class="font-medium">新浦动物园</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">票种</span>
                <span class="font-medium text-orange-600">{{ selectedTicketType === 'student' ? '学生优惠票' : '成人票' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">游玩日期</span>
                <span class="font-medium">{{ selectedDate === 'tomorrow' ? '明天' : '后天' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">数量</span>
                <span class="font-medium">1张</span>
              </div>
            </div>
          </div>

          <!-- 支付金额 -->
          <div class="bg-white rounded-2xl p-4 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-gray-600">实付金额</span>
              <span class="text-3xl font-bold text-red-500">
                ¥{{ selectedTicketType === 'student' ? 60 : 120 }}
              </span>
            </div>
          </div>

          <!-- 安全提示 -->
          <div class="flex items-center gap-2 text-xs text-gray-500 px-2">
            <PhShieldCheck :size="14" class="text-green-500" />
            <span>支付环境安全，请放心购买</span>
          </div>

          <!-- 支付按钮 -->
          <button 
            @click="handlePayment"
            class="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-green-200 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <PhCreditCard :size="20" />
            模拟支付
          </button>
        </div>
      </template>

      <!-- 支付成功 -->
      <template v-else-if="pageState === 'success'">
        <div class="flex flex-col items-center justify-center h-full p-6 text-center">
          <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <PhCheckCircle :size="48" weight="fill" class="text-green-500" />
          </div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">预订成功！</h2>
          <p class="text-gray-500 mb-6">电子门票已发送到您的账户</p>
          
          <!-- 电子票卡片 -->
          <div ref="ticketCardRef" class="w-full max-w-xs bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl p-5 text-white shadow-xl">
            <div class="flex items-center justify-between mb-4">
              <span class="font-bold">🎫 电子门票</span>
              <span class="text-xs opacity-80">{{ orderInfo.orderNo }}</span>
            </div>
            <div class="bg-white/20 rounded-xl p-3 mb-4">
              <div class="font-bold text-lg mb-1">{{ orderInfo.ticketName }}</div>
              <div class="text-sm opacity-90">{{ orderInfo.ticketType }} × 1</div>
            </div>
            <div class="flex justify-between text-sm">
              <span>游玩日期</span>
              <span class="font-bold">{{ orderInfo.date }}</span>
            </div>
            
            <!-- 二维码占位 -->
            <div class="mt-4 bg-white rounded-lg p-3 flex items-center justify-center">
              <div class="w-24 h-24 bg-gray-100 rounded grid grid-cols-5 gap-0.5 p-1">
                <template v-for="i in 25" :key="i">
                  <div :class="Math.random() > 0.5 ? 'bg-gray-800' : 'bg-white'" class="rounded-sm"></div>
                </template>
              </div>
            </div>
          </div>

          <!-- 保存门票按钮 -->
          <button 
            @click="saveToAlbum"
            :disabled="ticketSaved"
            class="mt-6 px-8 py-3 font-bold rounded-full shadow-lg active:scale-95 transition-all flex items-center gap-2 mx-auto"
            :class="ticketSaved 
              ? 'bg-green-100 text-green-600 cursor-not-allowed' 
              : 'bg-white text-green-600 hover:bg-green-50'"
          >
            <span v-if="ticketSaved">✅ 已保存到相册</span>
            <span v-else>📥 保存到相册</span>
          </button>

          <p class="mt-4 text-sm text-green-600 font-medium flex items-center gap-2 justify-center">
            ✅ 门票已保存到背包！
          </p>
        </div>
      </template>
    </div>

    <!-- Toast 提示 -->
    <Transition name="toast">
      <div 
        v-if="showToast"
        class="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 backdrop-blur-xl text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-medium"
      >
        {{ toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}
</style>
