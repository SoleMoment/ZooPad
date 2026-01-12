<script setup lang="ts">
// ==========================================
// 天气 App - 连云港实时天气 (使用 wttr.in API)
// ==========================================
import { ref, onMounted } from 'vue'
import { useTaskStore } from '@/stores/task'
import { useSystemStore } from '@/stores/system'
import { 
  PhSun, 
  PhCloud, 
  PhCloudRain, 
  PhCloudSnow,
  PhCloudFog,
  PhWind,
  PhDropHalf,
  PhThermometer,
  PhArrowUp,
  PhArrowDown,
  PhSpinner
} from '@phosphor-icons/vue'

const taskStore = useTaskStore()
const systemStore = useSystemStore()

// 加载状态
const isLoading = ref(true)
const loadError = ref('')

// 天气数据
const weatherData = ref({
  location: '连云港市 · 海州区',
  temperature: 0,
  feelsLike: 0,
  text: '加载中...',
  icon: 'sun',
  humidity: 0,
  windDir: '',
  windScale: '',
  uvIndex: '',
  pressure: '',
  visibility: ''
})

// 24小时预报
const hourlyForecast = ref<Array<{ time: string; temp: number; icon: string }>>([])

// 7日预报
const dailyForecast = ref<Array<{ day: string; high: number; low: number; icon: string; text: string }>>([])

// 悟空问答状态
const hasAnswered = ref(false)
const answerFeedback = ref('')

// 出行建议 - 根据天气情况生成
import { computed } from 'vue'

const travelSuggestion = computed(() => {
  const temp = weatherData.value.temperature
  const icon = weatherData.value.icon
  const humidity = weatherData.value.humidity
  
  let suggestion = ''
  let emoji = ''
  let tips: string[] = []
  
  // 根据天气状况
  if (icon === 'rain' || icon === 'snow') {
    emoji = icon === 'rain' ? '☔' : '❄️'
    suggestion = icon === 'rain' ? '今日有雨，建议携带雨具' : '今日有雪，注意保暖防滑'
    tips.push('🌂 记得带伞')
  } else if (icon === 'sun') {
    emoji = '☀️'
    suggestion = '阳光明媚，适合户外活动'
    tips.push('🧢 建议戴帽子防晒')
  } else {
    emoji = '☁️'
    suggestion = '多云天气，适宜出行'
  }
  
  // 根据温度
  if (temp < 10) {
    tips.push('🧥 天气寒冷，穿羽绒服')
  } else if (temp < 18) {
    tips.push('🧣 温度较低，注意保暖')
  } else if (temp > 30) {
    tips.push('🧊 天气炎热，注意防暑')
  } else {
    tips.push('👕 温度适宜，穿着舒适')
  }
  
  // 根据湿度
  if (humidity > 80) {
    tips.push('💧 湿度较大，注意防潮')
  }
  
  return { emoji, suggestion, tips }
})

// 天气代码到图标的映射
function weatherCodeToIcon(code: string): string {
  const codeNum = parseInt(code)
  if (codeNum === 113) return 'sun' // 晴
  if (codeNum === 116 || codeNum === 119) return 'cloud' // 多云/阴
  if (codeNum === 122) return 'fog' // 雾
  if ([176, 263, 266, 293, 296, 299, 302, 305, 308, 311, 314, 317, 320, 353, 356, 359].includes(codeNum)) return 'rain' // 雨
  if ([179, 182, 185, 227, 230, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377, 392, 395].includes(codeNum)) return 'snow' // 雪
  return 'cloud'
}

// 天气代码到中文描述
function weatherCodeToText(code: string): string {
  const codeNum = parseInt(code)
  const textMap: Record<number, string> = {
    113: '晴', 116: '多云', 119: '阴', 122: '雾',
    176: '小雨', 263: '毛毛雨', 266: '小雨', 293: '小雨', 296: '小雨',
    299: '中雨', 302: '中雨', 305: '大雨', 308: '暴雨',
    179: '小雪', 227: '小雪', 230: '暴雪', 323: '小雪', 326: '小雪',
    329: '中雪', 332: '中雪', 335: '大雪', 338: '大雪'
  }
  return textMap[codeNum] || '多云'
}

// 风向转中文
function windDirToChinese(dir: string): string {
  const dirMap: Record<string, string> = {
    'N': '北风', 'NNE': '东北偏北', 'NE': '东北风', 'ENE': '东北偏东',
    'E': '东风', 'ESE': '东南偏东', 'SE': '东南风', 'SSE': '东南偏南',
    'S': '南风', 'SSW': '西南偏南', 'SW': '西南风', 'WSW': '西南偏西',
    'W': '西风', 'WNW': '西北偏西', 'NW': '西北风', 'NNW': '西北偏北'
  }
  return dirMap[dir] || dir
}

// 星期几
function getDayName(index: number): string {
  const days = ['今天', '明天', '后天']
  if (index < 3) return days[index]
  const date = new Date()
  date.setDate(date.getDate() + index)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return weekdays[date.getDay()]
}

// 天气图标组件映射
function getWeatherIcon(icon: string) {
  switch (icon) {
    case 'sun': return PhSun
    case 'cloud': return PhCloud
    case 'rain': return PhCloudRain
    case 'snow': return PhCloudSnow
    case 'fog': return PhCloudFog
    default: return PhSun
  }
}

// 获取天气数据
async function fetchWeather() {
  isLoading.value = true
  loadError.value = ''
  
  try {
    // 使用 wttr.in API 获取连云港天气
    const response = await fetch('https://wttr.in/Lianyungang?format=j1&lang=zh')
    
    if (!response.ok) {
      throw new Error('天气服务暂时不可用')
    }
    
    const data = await response.json()
    
    // 解析当前天气
    const current = data.current_condition[0]
    const today = data.weather[0]
    
    weatherData.value = {
      location: '连云港市 · 海州区',
      temperature: parseInt(current.temp_C),
      feelsLike: parseInt(current.FeelsLikeC),
      text: weatherCodeToText(current.weatherCode),
      icon: weatherCodeToIcon(current.weatherCode),
      humidity: parseInt(current.humidity),
      windDir: windDirToChinese(current.winddir16Point),
      windScale: current.windspeedKmph + ' km/h',
      uvIndex: parseInt(current.uvIndex) <= 2 ? '低' : parseInt(current.uvIndex) <= 5 ? '中等' : '高',
      pressure: current.pressure + ' hPa',
      visibility: current.visibility + ' km'
    }
    
    // 解析24小时预报
    const now = new Date()
    const currentHour = now.getHours()
    const hourlyData: Array<{ time: string; temp: number; icon: string }> = []
    
    // 从今天和明天的小时数据中取接下来8个小时
    const allHours = [...today.hourly, ...(data.weather[1]?.hourly || [])]
    let count = 0
    
    for (const hour of allHours) {
      const hourNum = parseInt(hour.time) / 100
      if (data.weather.indexOf(today) === 0 && hourNum < currentHour) continue
      if (count >= 8) break
      
      hourlyData.push({
        time: count === 0 ? '现在' : `${hourNum.toString().padStart(2, '0')}:00`,
        temp: parseInt(hour.tempC),
        icon: weatherCodeToIcon(hour.weatherCode)
      })
      count++
    }
    
    hourlyForecast.value = hourlyData
    
    // 解析7日预报（wttr.in 只提供3天）
    dailyForecast.value = data.weather.map((day: any, index: number) => ({
      day: getDayName(index),
      high: parseInt(day.maxtempC),
      low: parseInt(day.mintempC),
      icon: weatherCodeToIcon(day.hourly[4]?.weatherCode || '116'),
      text: weatherCodeToText(day.hourly[4]?.weatherCode || '116')
    }))
    
    isLoading.value = false
    
  } catch (error) {
    console.error('获取天气失败:', error)
    loadError.value = '天气数据加载失败，请稍后重试'
    isLoading.value = false
    
    // 使用备用数据
    weatherData.value = {
      location: '连云港市 · 海州区',
      temperature: 15,
      feelsLike: 14,
      text: '多云',
      icon: 'cloud',
      humidity: 60,
      windDir: '东北风',
      windScale: '12 km/h',
      uvIndex: '中等',
      pressure: '1015 hPa',
      visibility: '10 km'
    }
    
    hourlyForecast.value = [
      { time: '现在', temp: 15, icon: 'cloud' },
      { time: '15:00', temp: 16, icon: 'cloud' },
      { time: '16:00', temp: 15, icon: 'cloud' },
      { time: '17:00', temp: 14, icon: 'cloud' },
      { time: '18:00', temp: 13, icon: 'cloud' },
      { time: '19:00', temp: 12, icon: 'cloud' },
      { time: '20:00', temp: 11, icon: 'cloud' },
      { time: '21:00', temp: 10, icon: 'cloud' },
    ]
    
    dailyForecast.value = [
      { day: '今天', high: 16, low: 8, icon: 'cloud', text: '多云' },
      { day: '明天', high: 18, low: 9, icon: 'sun', text: '晴' },
      { day: '后天', high: 17, low: 10, icon: 'cloud', text: '多云' },
    ]
  }
}

// 处理回答 - 根据实际明天温度判断
function handleAnswer(answer: 'cold' | 'warm') {
  hasAnswered.value = true
  
  const tomorrowHigh = dailyForecast.value[1]?.high || 20
  const isWarm = tomorrowHigh >= 20
  
  if ((answer === 'warm' && isWarm) || (answer === 'cold' && !isWarm)) {
    answerFeedback.value = `回答正确！明天最高温度${tomorrowHigh}°C，${isWarm ? '穿短袖就可以啦' : '记得穿外套哦'}！`
    
    // 直接触发任务检查
    setTimeout(() => {
      taskStore.checkTrigger({ type: 'answer', value: answer })
    }, 1500)
  } else {
    answerFeedback.value = `再看看温度哦～明天最高${tomorrowHigh}°C，${isWarm ? '其实挺暖和的' : '有点冷呢'}！`
  }
}

// 组件挂载时获取天气数据并自动完成任务
onMounted(() => {
  fetchWeather()
  // 打开天气App后自动完成任务1
  setTimeout(() => {
    taskStore.completeTask('task_1')
  }, 1000)
})
</script>

<template>
  <div class="h-full flex flex-col bg-gradient-to-b from-sky-400 via-blue-500 to-indigo-600 text-white relative overflow-hidden">

    <!-- 加载状态 -->
    <div v-if="isLoading" class="flex-1 flex flex-col items-center justify-center">
      <PhSpinner :size="48" class="animate-spin text-white/80 mb-4" />
      <p class="text-white/80">正在获取天气数据...</p>
    </div>

    <!-- 错误提示 -->
    <div v-else-if="loadError" class="flex-1 flex flex-col items-center justify-center p-6">
      <div class="text-6xl mb-4">🌧️</div>
      <p class="text-white/80 text-center mb-4">{{ loadError }}</p>
      <button
        @click="fetchWeather"
        class="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors"
      >
        重新加载
      </button>
    </div>

    <!-- 主内容区 -->
    <div v-else class="flex-1 p-4 overflow-hidden flex flex-col">
      <!-- 位置信息 -->
      <div class="text-center mb-2">
        <h1 class="text-xl font-bold drop-shadow-lg">{{ weatherData.location }}</h1>
        <p class="text-white/80 text-sm">{{ systemStore.formattedFullDate }}</p>
      </div>

      <!-- 主天气展示 -->
      <div class="flex flex-col items-center mb-3">
        <component
          :is="getWeatherIcon(weatherData.icon)"
          :size="56"
          weight="fill"
          class="text-yellow-300 drop-shadow-2xl"
        />
        <div class="text-6xl font-extralight mt-1 drop-shadow-lg tracking-tighter">
          {{ weatherData.temperature }}°
        </div>
        <div class="text-lg font-medium mt-1 opacity-90">{{ weatherData.text }}</div>
        <div v-if="dailyForecast.length > 0" class="flex items-center gap-4 mt-2 text-sm opacity-80">
          <span class="flex items-center gap-1">
            <PhArrowUp :size="12" /> {{ dailyForecast[0].high }}°
          </span>
          <span class="flex items-center gap-1">
            <PhArrowDown :size="12" /> {{ dailyForecast[0].low }}°
          </span>
          <span>体感 {{ weatherData.feelsLike }}°</span>
        </div>
      </div>

      <!-- 详细数据卡片 -->
      <div class="grid grid-cols-3 gap-3 mb-3">
        <div class="bg-white/15 backdrop-blur-md rounded-xl p-3 text-center">
          <PhDropHalf :size="20" class="mx-auto mb-1 text-white/80" />
          <div class="text-xs text-white/70">湿度</div>
          <div class="text-base font-bold">{{ weatherData.humidity }}%</div>
        </div>
        <div class="bg-white/15 backdrop-blur-md rounded-xl p-3 text-center">
          <PhWind :size="20" class="mx-auto mb-1 text-white/80" />
          <div class="text-xs text-white/70">风力</div>
          <div class="text-base font-bold">{{ weatherData.windDir }}</div>
        </div>
        <div class="bg-white/15 backdrop-blur-md rounded-xl p-3 text-center">
          <PhThermometer :size="20" class="mx-auto mb-1 text-white/80" />
          <div class="text-xs text-white/70">紫外线</div>
          <div class="text-base font-bold">{{ weatherData.uvIndex }}</div>
        </div>
      </div>

      <!-- 出行建议 -->
      <div class="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 backdrop-blur-md rounded-xl p-3 mb-3 border border-yellow-400/30">
        <h3 class="text-sm font-bold mb-1.5 flex items-center gap-1.5">
          <span class="w-1 h-4 bg-green-400 rounded-full"></span>
          出行建议
        </h3>
        <div class="flex items-center gap-3">
          <div class="text-2xl">{{ travelSuggestion.emoji }}</div>
          <div class="flex-1">
            <p class="text-sm font-medium">{{ travelSuggestion.suggestion }}</p>
            <div class="flex flex-wrap gap-1.5 mt-1.5">
              <span
                v-for="tip in travelSuggestion.tips"
                :key="tip"
                class="text-xs bg-white/20 px-2 py-0.5 rounded-full"
              >
                {{ tip }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 24小时预报 -->
      <div class="bg-white/15 backdrop-blur-md rounded-xl p-3 mb-3">
        <h3 class="text-sm font-bold mb-2 flex items-center gap-1.5">
          <span class="w-1 h-4 bg-yellow-400 rounded-full"></span>
          24小时预报
        </h3>
        <div class="flex gap-4 overflow-x-auto pb-1 hide-scrollbar">
          <div v-for="hour in hourlyForecast" :key="hour.time" class="flex flex-col items-center min-w-[3rem]">
            <span class="text-xs text-white/70 mb-1">{{ hour.time }}</span>
            <component :is="getWeatherIcon(hour.icon)" :size="20" weight="fill" class="text-yellow-200 mb-1" />
            <span class="text-sm font-bold">{{ hour.temp }}°</span>
          </div>
        </div>
      </div>

      <!-- 多日预报 -->
      <div class="bg-white/15 backdrop-blur-md rounded-xl p-3 flex-1 flex flex-col min-h-0">
        <h3 class="text-sm font-bold mb-2 flex items-center gap-1.5">
          <span class="w-1 h-4 bg-yellow-400 rounded-full"></span>
          多日预报
        </h3>
        <div class="flex-1 flex flex-col justify-around">
          <div
            v-for="day in dailyForecast"
            :key="day.day"
            class="flex items-center justify-between text-sm py-1"
            :class="{ 'bg-yellow-400/20 -mx-2 px-2 py-1.5 rounded-lg': day.day === '明天' }"
          >
            <span class="w-12 font-medium">{{ day.day }}</span>
            <component :is="getWeatherIcon(day.icon)" :size="18" weight="fill" class="text-yellow-200" />
            <span class="text-white/70 w-12">{{ day.text }}</span>
            <div class="flex items-center gap-2 text-sm">
              <span class="text-white/70">{{ day.low }}°</span>
              <div class="w-14 h-1 bg-gradient-to-r from-blue-300/50 to-orange-300/50 rounded-full"></div>
              <span>{{ day.high }}°</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
</style>
