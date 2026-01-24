<script setup lang="ts">
// ==========================================
// 天气 App - 连云港实时天气 (使用 Open-Meteo API)
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

// 连云港市坐标 (Open-Meteo 使用经纬度)
const LIANYUNGANG_LAT = 34.60
const LIANYUNGANG_LON = 119.22

// WMO 天气代码到图标的映射
function wmoCodeToIcon(code: number): string {
  if (code <= 1) return 'sun'
  if (code <= 3) return 'cloud'
  if (code === 45 || code === 48) return 'fog'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'rain'
  return 'cloud'
}

// WMO 天气代码到中文描述
function wmoCodeToText(code: number): string {
  const textMap: Record<number, string> = {
    0: '晴', 1: '晴', 2: '多云', 3: '阴',
    45: '雾', 48: '雾凇',
    51: '小雨', 53: '小雨', 55: '小雨',
    61: '小雨', 63: '中雨', 65: '大雨',
    71: '小雪', 73: '中雪', 75: '大雪',
    80: '阵雨', 81: '阵雨', 82: '暴雨',
    85: '小雪', 86: '大雪',
    95: '雷阵雨', 96: '雷阵雨', 99: '雷暴'
  }
  return textMap[code] || '多云'
}

// 风向角度转中文
function windDegreeToDir(degree: number): string {
  const dirs = ['北风', '东北风', '东风', '东南风', '南风', '西南风', '西风', '西北风']
  return dirs[Math.round(degree / 45) % 8]
}

// 风速转风力等级
function windSpeedToScale(speed: number): string {
  if (speed < 1) return '0级'
  if (speed < 6) return '1级'
  if (speed < 12) return '2级'
  if (speed < 20) return '3级'
  if (speed < 29) return '4级'
  if (speed < 39) return '5级'
  return '6级以上'
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
    // 使用 Open-Meteo API (免费，无需 API Key，支持 CORS)
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LIANYUNGANG_LAT}&longitude=${LIANYUNGANG_LON}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m` +
      `&hourly=temperature_2m,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max` +
      `&timezone=Asia/Shanghai&forecast_days=7`
    )
    
    if (!response.ok) {
      throw new Error('天气服务暂时不可用')
    }
    
    const data = await response.json()
    const current = data.current
    const hourly = data.hourly
    const daily = data.daily
    
    weatherData.value = {
      location: '连云港市 · 海州区',
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      text: wmoCodeToText(current.weather_code),
      icon: wmoCodeToIcon(current.weather_code),
      humidity: Math.round(current.relative_humidity_2m),
      windDir: windDegreeToDir(current.wind_direction_10m),
      windScale: windSpeedToScale(current.wind_speed_10m),
      uvIndex: (daily.uv_index_max?.[0] || 3) <= 2 ? '低' : (daily.uv_index_max?.[0] || 3) <= 5 ? '中等' : '高',
      pressure: Math.round(current.surface_pressure) + ' hPa',
      visibility: '10 km'
    }
    
    // 解析24小时预报 - 从当前小时开始取8个
    const currentHour = new Date().getHours()
    const hourlyData: Array<{ time: string; temp: number; icon: string }> = []
    
    for (let i = 0; i < 8; i++) {
      const hourIndex = currentHour + i
      if (hourIndex < hourly.time.length) {
        const time = hourly.time[hourIndex]
        hourlyData.push({
          time: i === 0 ? '现在' : time.slice(11, 16),
          temp: Math.round(hourly.temperature_2m[hourIndex]),
          icon: wmoCodeToIcon(hourly.weather_code[hourIndex])
        })
      }
    }
    
    hourlyForecast.value = hourlyData
    
    // 解析3日预报（与 wttr.in 保持一致）
    dailyForecast.value = daily.time.slice(0, 3).map((date: string, index: number) => ({
      day: getDayName(index),
      high: Math.round(daily.temperature_2m_max[index]),
      low: Math.round(daily.temperature_2m_min[index]),
      icon: wmoCodeToIcon(daily.weather_code[index]),
      text: wmoCodeToText(daily.weather_code[index])
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
