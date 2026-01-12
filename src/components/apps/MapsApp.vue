<script setup lang="ts">
// ==========================================
// 百度地图 App - iOS版完整复刻
// ==========================================
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { useTaskStore } from '@/stores/task'
import { BAIDU_MAP_AK } from '@/config/bmap.config'
import {
  PhMagnifyingGlass,
  PhNavigationArrow,
  PhMapPin,
  PhX,
  PhCar,
  PhPersonSimpleWalk,
  PhBus,
  PhCrosshair,
  PhMinus,
  PhPlus,
  PhArrowLeft,
  PhMapTrifold,
  PhPhone,
  PhShareNetwork,
  PhStar,
  PhClock,
  PhPath,
  PhCaretRight,
  PhGps
} from '@phosphor-icons/vue'

const taskStore = useTaskStore()

// 地图实例和相关对象
let map: any = null
let geolocation: any = null
let driving: any = null
let walking: any = null
let transit: any = null
let localSearch: any = null
let autocomplete: any = null
let currentMarker: any = null
let startMarker: any = null
let endMarker: any = null
let searchMarkers: any[] = []
let currentInfoWindow: any = null
let routePolylines: any[] = []

// 地图容器引用
const mapContainer = ref<HTMLDivElement>()

// 界面状态
const searchQuery = ref('')
const showSearchResults = ref(false)
const showRoutePanel = ref(false)
const isPlanning = ref(false)
const isSearching = ref(false)
const mapLoaded = ref(false)

// 搜索模式: 'normal' 普通搜索 | 'route' 路线规划搜索
const searchMode = ref<'normal' | 'route'>('normal')

// 当前选中的POI详情
const selectedPoi = ref<any>(null)
const showPoiDetail = ref(false)

// 路线规划状态
const routeStart = ref('')
const routeStartPoint = ref<any>(null)
const routeEnd = ref('')
const routeEndPoint = ref<any>(null)
const routeMode = ref<'driving' | 'walking' | 'transit'>('driving')
const routeResults = ref<any[]>([])
const selectedRouteIndex = ref(0)
const routeError = ref('')

// 搜索结果
const searchResults = ref<any[]>([])

// 搜索历史
const searchHistory = ref<string[]>([])

// 热门搜索
const hotSearches = ['动物园', '餐厅', '加油站', '停车场', '医院', '超市', '银行', 'ATM']

// 默认位置 (连云港) - 百度坐标系
const defaultPoint = { lng: 119.231269, lat: 34.606214 }
const currentLocation = ref<any>(null)

// 输入框焦点状态
const isEndInputFocused = ref(false)
const isStartInputFocused = ref(false)

// 当前活跃的搜索目标: 'start' | 'end'
const activeSearchTarget = ref<'start' | 'end'>('end')

// 搜索防抖定时器
let searchDebounceTimer: any = null

// 动态加载百度地图脚本
function loadBMapScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).BMapGL) {
      resolve()
      return
    }
    if ((window as any).BMap) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = `https://api.map.baidu.com/api?v=3.0&ak=${BAIDU_MAP_AK}&callback=initBMapCallback`
    script.onerror = reject
    document.head.appendChild(script);

    (window as any).initBMapCallback = () => {
      resolve()
    }
  })
}

// 初始化地图
async function initMap() {
  try {
    await loadBMapScript()
    const BMap = (window as any).BMap

    // 创建地图实例
    map = new BMap.Map(mapContainer.value)
    const point = new BMap.Point(defaultPoint.lng, defaultPoint.lat)
    map.centerAndZoom(point, 14)

    // 启用各种交互
    map.enableScrollWheelZoom(true)
    map.enableDoubleClickZoom(true)
    map.enableKeyboard()
    map.enableDragging()

    // 添加地图控件
    map.addControl(new BMap.ScaleControl())

    // 地图点击事件 - 关闭POI详情
    map.addEventListener('click', () => {
      if (showPoiDetail.value && !showRoutePanel.value) {
        closePoiDetail()
      }
    })

    mapLoaded.value = true

    // 初始化定位
    initGeolocation()

    // 触发任务
    taskStore.checkTrigger({ type: 'app_open', appId: 'maps' })
  } catch (error) {
    console.error('百度地图加载失败:', error)
  }
}

// 初始化定位功能
function initGeolocation() {
  const BMap = (window as any).BMap
  geolocation = new BMap.Geolocation()
  locateMe()
}

// 定位到当前位置
function locateMe() {
  const BMap = (window as any).BMap
  if (!geolocation || !map) return

  geolocation.getCurrentPosition(function(r: any) {
    if (this.getStatus() == (window as any).BMAP_STATUS_SUCCESS) {
      currentLocation.value = r.point

      // 创建当前位置标记 - 使用蓝色圆点样式
      if (currentMarker) map.removeOverlay(currentMarker)

      // 创建自定义图标 - 模拟iOS蓝色定位点
      const locationIcon = new BMap.Icon(
        'data:image/svg+xml,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8" fill="#4285F4" stroke="white" stroke-width="3"/>
          </svg>
        `),
        new BMap.Size(24, 24),
        { anchor: new BMap.Size(12, 12) }
      )

      currentMarker = new BMap.Marker(r.point, { icon: locationIcon })
      map.addOverlay(currentMarker)
      map.panTo(r.point)

      // 设置默认起点
      if (!routeStart.value) {
        routeStart.value = '我的位置'
        routeStartPoint.value = r.point
      }
    } else {
      // 定位失败时使用默认位置
      currentLocation.value = new BMap.Point(defaultPoint.lng, defaultPoint.lat)
      routeStart.value = '我的位置'
      routeStartPoint.value = currentLocation.value
    }
  }, { enableHighAccuracy: true })
}

// 搜索输入处理 - 带防抖
function handleSearchInput(query: string, isRouteSearch: boolean = false, target: 'start' | 'end' = 'end') {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }

  // 根据目标确定搜索文本
  let searchText = ''
  if (isRouteSearch) {
    searchText = target === 'start' ? routeStart.value : routeEnd.value
    activeSearchTarget.value = target
  } else {
    searchText = searchQuery.value
  }

  if (!searchText || searchText.trim() === '' || searchText === '我的位置') {
    searchResults.value = []
    showSearchResults.value = false
    return
  }

  searchDebounceTimer = setTimeout(() => {
    performSearch(searchText)
  }, 300)
}

// 执行搜索
function performSearch(keyword: string) {
  if (!keyword || !map) return

  isSearching.value = true
  const BMap = (window as any).BMap

  // 使用LocalSearch进行POI搜索
  const search = new BMap.LocalSearch(map, {
    pageCapacity: 10,
    onSearchComplete: (results: any) => {
      isSearching.value = false

      if (search.getStatus() === (window as any).BMAP_STATUS_SUCCESS && results) {
        const pois: { uid: string; name: string; address: string; point: any; phone: string; type: string; distance: string }[] = []
        const numPois = results.getCurrentNumPois()

        for (let i = 0; i < numPois; i++) {
          const poi = results.getPoi(i)
          if (poi) {
            pois.push({
              uid: poi.uid || `poi_${i}`,
              name: poi.title,
              address: poi.address || '暂无地址信息',
              point: poi.point,
              phone: poi.phoneNumber || '',
              type: poi.type || '',
              distance: calculateDistance(poi.point)
            })
          }
        }

        searchResults.value = pois
        showSearchResults.value = pois.length > 0
      } else {
        searchResults.value = []
        showSearchResults.value = false
      }
    }
  })

  search.search(keyword)
}

// 计算距离
function calculateDistance(point: any): string {
  if (!currentLocation.value || !point) return ''

  const BMap = (window as any).BMap
  const distance = map.getDistance(currentLocation.value, point)

  if (distance < 1000) {
    return `${Math.round(distance)}m`
  } else {
    return `${(distance / 1000).toFixed(1)}km`
  }
}

// 选择搜索结果 - 普通搜索模式
function selectSearchResult(result: any) {
  // 保存到搜索历史
  addToHistory(result.name)

  if (searchMode.value === 'route') {
    // 路线规划模式 - 根据activeSearchTarget设置起点或终点
    if (activeSearchTarget.value === 'start') {
      routeStart.value = result.name
      routeStartPoint.value = result.point
      showSearchResults.value = false
      isStartInputFocused.value = false
    } else {
      routeEnd.value = result.name
      routeEndPoint.value = result.point
      showSearchResults.value = false
      isEndInputFocused.value = false
    }

    // 如果起点和终点都已设置，自动规划路线
    if (routeStartPoint.value && routeEndPoint.value) {
      planRoute()
    }
  } else {
    // 普通搜索模式 - 显示POI详情
    searchQuery.value = result.name
    showSearchResults.value = false
    showPoiOnMap(result)
  }
}

// 在地图上显示POI
function showPoiOnMap(poi: any) {
  if (!map || !poi.point) return

  const BMap = (window as any).BMap

  // 清除之前的搜索标记
  clearSearchMarkers()

  // 创建标记
  const marker = new BMap.Marker(poi.point)
  marker.setAnimation((window as any).BMAP_ANIMATION_DROP)
  map.addOverlay(marker)
  searchMarkers.push(marker)

  // 移动地图到该位置
  map.centerAndZoom(poi.point, 16)

  // 创建信息窗口
  const infoContent = `
    <div style="padding: 8px; min-width: 200px;">
      <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #333;">${poi.name}</h4>
      <p style="margin: 0 0 4px 0; font-size: 13px; color: #666;">${poi.address}</p>
      ${poi.phone ? `<p style="margin: 0; font-size: 13px; color: #4285F4;">📞 ${poi.phone}</p>` : ''}
    </div>
  `

  const infoWindow = new BMap.InfoWindow(infoContent, {
    width: 250,
    height: 0,
    title: ''
  })

  // 点击标记显示信息窗口
  marker.addEventListener('click', () => {
    map.openInfoWindow(infoWindow, poi.point)
  })

  // 立即打开信息窗口
  setTimeout(() => {
    map.openInfoWindow(infoWindow, poi.point)
  }, 500)

  // 设置选中的POI
  selectedPoi.value = poi
  showPoiDetail.value = true

  // 设置为路线规划的终点
  routeEnd.value = poi.name
  routeEndPoint.value = poi.point
}

// 清除搜索标记
function clearSearchMarkers() {
  searchMarkers.forEach(marker => {
    if (map) map.removeOverlay(marker)
  })
  searchMarkers = []

  if (currentInfoWindow && map) {
    map.closeInfoWindow()
  }
}

// 关闭POI详情
function closePoiDetail() {
  showPoiDetail.value = false
  selectedPoi.value = null
}

// 从POI详情开始导航
function startNavigationFromPoi() {
  if (!selectedPoi.value) return

  routeEnd.value = selectedPoi.value.name
  routeEndPoint.value = selectedPoi.value.point
  showPoiDetail.value = false
  openRoutePanel()
}

// 添加到搜索历史
function addToHistory(keyword: string) {
  if (!keyword) return

  const history = searchHistory.value.filter(h => h !== keyword)
  history.unshift(keyword)
  searchHistory.value = history.slice(0, 10)
}

// 使用历史搜索
function useHistorySearch(keyword: string) {
  if (searchMode.value === 'route') {
    if (activeSearchTarget.value === 'start') {
      routeStart.value = keyword
      handleSearchInput(keyword, true, 'start')
    } else {
      routeEnd.value = keyword
      handleSearchInput(keyword, true, 'end')
    }
  } else {
    searchQuery.value = keyword
    handleSearchInput(keyword, false)
  }
}

// 使用热门搜索
function useHotSearch(keyword: string) {
  useHistorySearch(keyword)
}

// 放大地图
function zoomIn() {
  if (map) map.zoomIn()
}

// 缩小地图
function zoomOut() {
  if (map) map.zoomOut()
}

// 打开路线规划
function openRoutePanel() {
  showRoutePanel.value = true
  searchMode.value = 'route'
  showPoiDetail.value = false

  // 如果起点未设置，尝试定位
  if (!routeStartPoint.value) {
    locateMe()
  }

  // 如果已有终点，自动规划
  if (routeStartPoint.value && routeEndPoint.value) {
    planRoute()
  }
}

// 关闭路线规划
function closeRoutePanel() {
  showRoutePanel.value = false
  searchMode.value = 'normal'
  clearRoute()
  clearSearchMarkers()
}

// 清除现有路线和标记
function clearRoute() {
  if (!map) return

  // 清除路线覆盖物
  routePolylines.forEach(polyline => {
    map.removeOverlay(polyline)
  })
  routePolylines = []

  // 清除起终点标记
  if (startMarker) {
    map.removeOverlay(startMarker)
    startMarker = null
  }
  if (endMarker) {
    map.removeOverlay(endMarker)
    endMarker = null
  }

  routeResults.value = []
  isPlanning.value = false
  routeError.value = ''
  selectedRouteIndex.value = 0
}

// 规划路线
async function planRoute() {
  if (!routeStartPoint.value || !routeEndPoint.value) {
    routeError.value = '请设置起点和终点'
    return
  }

  // 检查是否完成了"输入起点和终点"步骤
  taskStore.completeTaskStep('task_3', 'step_3_2')

  isPlanning.value = true
  routeError.value = ''

  // 先清除旧路线，但保留当前位置标记
  clearRoute()

  const BMap = (window as any).BMap

  // 创建起点标记 - 绿色
  const startIcon = new BMap.Icon(
    'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="#34C759"/>
        <circle cx="16" cy="16" r="6" fill="white"/>
      </svg>
    `),
    new BMap.Size(32, 40),
    { anchor: new BMap.Size(16, 40) }
  )
  startMarker = new BMap.Marker(routeStartPoint.value, { icon: startIcon })
  map.addOverlay(startMarker)

  // 创建终点标记 - 红色
  const endIcon = new BMap.Icon(
    'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="#FF3B30"/>
        <circle cx="16" cy="16" r="6" fill="white"/>
      </svg>
    `),
    new BMap.Size(32, 40),
    { anchor: new BMap.Size(16, 40) }
  )
  endMarker = new BMap.Marker(routeEndPoint.value, { icon: endIcon })
  map.addOverlay(endMarker)

  try {
    if (routeMode.value === 'driving') {
      planDrivingRoute()
    } else if (routeMode.value === 'walking') {
      planWalkingRoute()
    } else if (routeMode.value === 'transit') {
      planTransitRoute()
    }
  } catch (e) {
    console.error(e)
    isPlanning.value = false
    routeError.value = '路线规划失败，请重试'
  }
}

// 驾车规划
function planDrivingRoute() {
  const BMap = (window as any).BMap

  // 清除之前的实例
  if (driving) {
    driving.clearResults()
  }

  driving = new BMap.DrivingRoute(map, {
    renderOptions: {
      map: map,
      autoViewport: true,
      enableDragging: false
    },
    policy: (window as any).BMAP_DRIVING_POLICY_LEAST_TIME,
    onSearchComplete: function(results: any) {
      isPlanning.value = false

      if (driving.getStatus() !== (window as any).BMAP_STATUS_SUCCESS) {
        routeError.value = '未找到合适的驾车路线'
        return
      }

      // 解析结果
      const numPlans = results.getNumPlans ? results.getNumPlans() : 1
      const routes: { id: number; name: string; duration: any; distance: any; traffic: string; highlight: boolean; steps: { instruction: string; distance: string }[] }[] = []

      for (let i = 0; i < Math.min(numPlans, 3); i++) {
        const plan = results.getPlan(i)
        if (plan) {
          const distance = plan.getDistance(true)
          const duration = plan.getDuration(true)

          // 获取路线详细步骤
          const steps: Array<{instruction: string, distance: string}> = []
          const numRoutes = plan.getNumRoutes()
          for (let j = 0; j < numRoutes; j++) {
            const route = plan.getRoute(j)
            const numSteps = route.getNumSteps()
            for (let k = 0; k < numSteps; k++) {
              const step = route.getStep(k)
              // 优先使用HTML描述，然后转换为纯文本
              let desc = step.getDescription(true) || step.getDescription(false) || ''
              // 移除HTML标签
              desc = desc.replace(/<[^>]*>/g, '').trim()
              if (desc) {
                steps.push({
                  instruction: desc,
                  distance: step.getDistance(true) || ''
                })
              }
            }
          }

          routes.push({
            id: i + 1,
            name: i === 0 ? '推荐路线' : `备选路线${i}`,
            duration: duration,
            distance: distance,
            traffic: '畅通',
            highlight: i === 0,
            steps: steps
          })
        }
      }

      routeResults.value = routes
      checkTaskCompletion()
    },
    onPolylinesSet: function() {
      // 路线绑定完成
    }
  })

  driving.search(routeStartPoint.value, routeEndPoint.value)
}

// 步行规划
function planWalkingRoute() {
  const BMap = (window as any).BMap

  if (walking) {
    walking.clearResults()
  }

  walking = new BMap.WalkingRoute(map, {
    renderOptions: {
      map: map,
      autoViewport: true
    },
    onSearchComplete: function(results: any) {
      isPlanning.value = false

      if (walking.getStatus() !== (window as any).BMAP_STATUS_SUCCESS) {
        routeError.value = '距离过远，不建议步行'
        return
      }

      const plan = results.getPlan(0)
      if (plan) {
        // 获取步骤
        const steps: Array<{instruction: string, distance: string}> = []
        const route = plan.getRoute(0)
        if (route) {
          const numSteps = route.getNumSteps()
          for (let i = 0; i < numSteps; i++) {
            const step = route.getStep(i)
            // 优先使用HTML描述，然后转换为纯文本
            let desc = step.getDescription(true) || step.getDescription(false) || ''
            // 移除HTML标签
            desc = desc.replace(/<[^>]*>/g, '').trim()
            if (desc) {
              steps.push({
                instruction: desc,
                distance: step.getDistance(true) || ''
              })
            }
          }
        }

        routeResults.value = [{
          id: 1,
          name: '步行方案',
          duration: plan.getDuration(true),
          distance: plan.getDistance(true),
          traffic: '-',
          highlight: true,
          steps: steps
        }]
      }
    }
  })

  walking.search(routeStartPoint.value, routeEndPoint.value)
}

// 公交规划
function planTransitRoute() {
  const BMap = (window as any).BMap

  if (transit) {
    transit.clearResults()
  }

  transit = new BMap.TransitRoute(map, {
    renderOptions: {
      map: map,
      autoViewport: true
    },
    policy: (window as any).BMAP_TRANSIT_POLICY_LEAST_TIME,
    onSearchComplete: function(results: any) {
      isPlanning.value = false

      if (transit.getStatus() !== (window as any).BMAP_STATUS_SUCCESS) {
        routeError.value = '未找到公交路线'
        return
      }

      const numPlans = results.getNumPlans()
      const routes: { id: number; name: string; duration: any; distance: any; traffic: string; highlight: boolean; steps: { instruction: string; distance: string }[] }[] = []

      for (let i = 0; i < Math.min(numPlans, 5); i++) {
        const plan = results.getPlan(i)
        if (plan) {
          // 获取公交线路信息
          let lineInfo = ''
          const numLines = plan.getNumLines()
          const lines: string[] = []

          for (let j = 0; j < numLines; j++) {
            const line = plan.getLine(j)
            if (line) {
              lines.push(line.title)
            }
          }

          lineInfo = lines.join(' → ')

          routes.push({
            id: i + 1,
            name: lineInfo || `方案 ${i + 1}`,
            duration: plan.getDuration(true),
            distance: plan.getDistance(true),
            traffic: '-',
            highlight: i === 0,
            steps: []
          })
        }
      }

      routeResults.value = routes
      checkTaskCompletion()
    }
  })

  transit.search(routeStartPoint.value, routeEndPoint.value)
}

function checkTaskCompletion() {
  // 规划完成路线即可完成任务3（不限制出行方式）
  if (routeResults.value.length > 0 && routeEnd.value.includes('动物园')) {
    setTimeout(() => {
      taskStore.checkTrigger({ type: 'route_complete' })
    }, 1000)
  }
}

// 选择路线
function selectRoute(index: number) {
  selectedRouteIndex.value = index
  routeResults.value = routeResults.value.map((r, i) => ({
    ...r,
    highlight: i === index
  }))

  // 在选择路线时检查任务完成（规划完成路线即可）
  if (routeEnd.value.includes('动物园')) {
    setTimeout(() => {
      taskStore.checkTrigger({ type: 'route_complete' })
    }, 500)
  }
}

// 切换出行方式
function switchRouteMode(mode: 'driving' | 'walking' | 'transit') {
  if (routeMode.value === mode) return
  routeMode.value = mode

  if (routeStartPoint.value && routeEndPoint.value) {
    planRoute()
  }
}

// 清空终点
function clearEndPoint() {
  routeEnd.value = ''
  routeEndPoint.value = null
  searchResults.value = []
  clearRoute()
}

// 清空起点
function clearStartPoint() {
  routeStart.value = ''
  routeStartPoint.value = null
  searchResults.value = []
  clearRoute()
}

// 重置起点为我的位置
function resetToMyLocation() {
  routeStart.value = '我的位置'
  routeStartPoint.value = currentLocation.value
  searchResults.value = []
  isStartInputFocused.value = false
  
  // 如果有终点，自动重新规划路线
  if (routeEndPoint.value && currentLocation.value) {
    planRoute()
  }
}

// 延迟失焦处理（防止点击搜索结果时输入框失焦）
function delayedBlur(target: 'start' | 'end') {
  setTimeout(() => {
    if (target === 'start') {
      isStartInputFocused.value = false
    } else {
      isEndInputFocused.value = false
    }
  }, 200)
}

// 交换起终点
function swapStartEnd() {
  const tempName = routeStart.value
  const tempPoint = routeStartPoint.value

  routeStart.value = routeEnd.value
  routeStartPoint.value = routeEndPoint.value
  routeEnd.value = tempName
  routeEndPoint.value = tempPoint

  if (routeStartPoint.value && routeEndPoint.value) {
    planRoute()
  }
}

// 清空搜索
function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  showSearchResults.value = false
  clearSearchMarkers()
  closePoiDetail()
}

// 执行搜索按钮点击
function doSearch() {
  if (searchQuery.value.trim()) {
    performSearch(searchQuery.value)
  }
}

onMounted(async () => {
  await nextTick()
  if (mapContainer.value) {
    await initMap()
  }
})

onUnmounted(() => {
  // 清理定时器
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
})
</script>

<template>
  <div class="h-full flex bg-white font-sans overflow-hidden">

    <!-- 左侧：路线规划与结果面板 -->
    <Transition name="slide-in">
      <div
        v-if="showRoutePanel"
        class="w-96 h-full flex flex-col bg-white border-r border-gray-200 z-20 shadow-xl"
      >
        <!-- 顶部返回栏 -->
        <div class="h-14 flex items-center justify-between px-4 border-b border-gray-200 shrink-0 bg-gradient-to-r from-blue-600 to-blue-500">
          <button @click="closeRoutePanel" class="p-2 hover:bg-white/20 rounded-full transition-colors">
            <PhArrowLeft :size="20" class="text-white" />
          </button>
          <h2 class="font-bold text-lg text-white">路线规划</h2>
          <button @click="swapStartEnd" class="p-2 hover:bg-white/20 rounded-full transition-colors" title="交换起终点">
            <PhPath :size="20" class="text-white" />
          </button>
        </div>

        <!-- 输入区域 -->
        <div class="p-4 border-b border-gray-200 bg-white shrink-0">
          <div class="relative">
            <!-- 起终点连接线 -->
            <div class="absolute left-[18px] top-[28px] bottom-[28px] w-0.5 bg-gradient-to-b from-green-500 to-red-500"></div>

            <!-- 起点 -->
            <div class="flex items-center gap-3 mb-3">
              <div class="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold shadow-md z-10">起</div>
              <div class="flex-1 relative">
                <input
                  v-model="routeStart"
                  type="text"
                  class="w-full text-sm outline-none bg-gray-100 px-4 py-3 rounded-xl border-2 border-transparent focus:bg-white focus:border-green-500 transition-all pr-16"
                  placeholder="输入起点或使用当前位置"
                  @input="handleSearchInput(routeStart, true, 'start')"
                  @focus="isStartInputFocused = true; activeSearchTarget = 'start'; showSearchResults = true"
                  @blur="delayedBlur('start')"
                />
                <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    v-if="routeStart && routeStart !== '我的位置'"
                    @click="clearStartPoint"
                    class="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="清空起点"
                  >
                    <PhX :size="16" />
                  </button>
                  <button
                    @click="resetToMyLocation"
                    class="p-1 text-green-500 hover:text-green-600 transition-colors"
                    title="使用当前位置"
                  >
                    <PhGps :size="16" :weight="routeStart === '我的位置' ? 'fill' : 'regular'" />
                  </button>
                </div>
              </div>
            </div>

            <!-- 终点 -->
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold shadow-md z-10">终</div>
              <div class="flex-1 relative">
                <input
                  v-model="routeEnd"
                  type="text"
                  class="w-full text-sm outline-none bg-gray-100 px-4 py-3 rounded-xl border-2 border-transparent focus:bg-white focus:border-red-500 transition-all pr-10"
                  placeholder="输入目的地"
                  @input="handleSearchInput(routeEnd, true, 'end')"
                  @focus="isEndInputFocused = true; activeSearchTarget = 'end'; showSearchResults = true"
                  @blur="delayedBlur('end')"
                />
                <button
                  v-if="routeEnd"
                  @click="clearEndPoint"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <PhX :size="18" />
                </button>
              </div>
            </div>
          </div>

          <!-- 搜索联想列表 -->
          <Transition name="fade">
            <div v-if="searchResults.length > 0 && (isStartInputFocused || isEndInputFocused)" class="mt-3">
              <!-- 搜索目标提示 -->
              <div class="text-xs text-gray-500 mb-2 px-2">
                正在搜索{{ activeSearchTarget === 'start' ? '起点' : '终点' }}
              </div>
              <div class="bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                <div
                  v-for="(result, index) in searchResults"
                  :key="result.uid || index"
                  @click="selectSearchResult(result)"
                  class="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 flex items-start gap-3 transition-colors"
                >
                  <PhMapPin :size="18" :class="activeSearchTarget === 'start' ? 'text-green-500' : 'text-red-500'" class="mt-0.5 shrink-0" />
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-gray-800 text-sm truncate">{{ result.name }}</div>
                    <div class="text-xs text-gray-400 mt-0.5 truncate flex items-center gap-2">
                      <span>{{ result.address }}</span>
                      <span v-if="result.distance" class="text-blue-500">{{ result.distance }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Transition>

          <!-- 热门搜索 -->
          <div v-if="!routeEnd && !searchResults.length" class="mt-4">
            <div class="text-xs text-gray-400 mb-2">热门搜索</div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="hot in hotSearches"
                :key="hot"
                @click="useHotSearch(hot)"
                class="px-3 py-1.5 bg-gray-100 hover:bg-blue-100 hover:text-blue-600 rounded-full text-xs text-gray-600 transition-colors"
              >
                {{ hot }}
              </button>
            </div>
          </div>
        </div>

        <!-- 出行方式切换 -->
        <div class="px-4 py-3 border-b border-gray-200 flex gap-2 bg-gray-50 shrink-0">
          <button
            @click="switchRouteMode('driving')"
            class="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all text-sm font-medium"
            :class="routeMode === 'driving' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'"
          >
            <PhCar :size="18" :weight="routeMode === 'driving' ? 'fill' : 'regular'" />
            驾车
          </button>
          <button
            @click="switchRouteMode('transit')"
            class="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all text-sm font-medium"
            :class="routeMode === 'transit' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'"
          >
            <PhBus :size="18" :weight="routeMode === 'transit' ? 'fill' : 'regular'" />
            公交
          </button>
          <button
            @click="switchRouteMode('walking')"
            class="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all text-sm font-medium"
            :class="routeMode === 'walking' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'"
          >
            <PhPersonSimpleWalk :size="18" :weight="routeMode === 'walking' ? 'fill' : 'regular'" />
            步行
          </button>
        </div>

        <!-- 路线结果列表 -->
        <div class="flex-1 overflow-y-auto bg-gray-50">
          <!-- Loading -->
          <div v-if="isPlanning" class="flex flex-col items-center justify-center py-16 text-gray-400">
            <div class="relative">
              <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
              <PhMapTrifold :size="20" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600" />
            </div>
            <p class="text-sm mt-4 text-gray-500">正在为您规划最优路线...</p>
          </div>

          <!-- Error -->
          <div v-else-if="routeError" class="flex flex-col items-center justify-center py-16">
            <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <PhX :size="32" class="text-red-500" />
            </div>
            <p class="text-sm text-red-500 font-medium">{{ routeError }}</p>
            <button @click="planRoute" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
              重新规划
            </button>
          </div>

          <!-- Results -->
          <div v-else-if="routeResults.length > 0" class="p-4 space-y-3">
            <div
              v-for="(route, index) in routeResults"
              :key="route.id"
              @click="selectRoute(index)"
              class="bg-white p-4 rounded-2xl cursor-pointer transition-all hover:shadow-lg border-2"
              :class="selectedRouteIndex === index ? 'border-blue-500 shadow-lg shadow-blue-100' : 'border-transparent shadow-sm'"
            >
              <div class="flex justify-between items-start mb-3">
                <div class="flex items-baseline gap-2">
                  <span class="text-2xl font-bold text-gray-800">{{ route.duration }}</span>
                  <span class="text-sm text-gray-500">· {{ route.distance }}</span>
                </div>
                <span
                  v-if="route.highlight"
                  class="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs px-3 py-1 rounded-full font-medium shadow-sm"
                >推荐</span>
              </div>

              <div class="flex items-center gap-2">
                <div class="flex items-center gap-1">
                  <PhCar v-if="routeMode === 'driving'" :size="16" class="text-blue-500" />
                  <PhBus v-else-if="routeMode === 'transit'" :size="16" class="text-blue-500" />
                  <PhPersonSimpleWalk v-else :size="16" class="text-blue-500" />
                </div>
                <span class="text-sm text-gray-600">{{ route.name }}</span>
                <PhCaretRight :size="14" class="text-gray-400 ml-auto" />
              </div>

              <!-- 路线步骤预览 -->
              <div v-if="route.steps && route.steps.length > 0 && selectedRouteIndex === index" class="mt-3 pt-3 border-t border-gray-100">
                <div class="space-y-2 max-h-32 overflow-y-auto">
                  <div v-for="(step, stepIndex) in route.steps.slice(0, 3)" :key="stepIndex" class="flex items-start gap-2 text-xs text-gray-500">
                    <div class="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[10px] shrink-0 mt-0.5">{{ stepIndex + 1 }}</div>
                    <span class="line-clamp-1">{{ step.instruction }}</span>
                  </div>
                  <div v-if="route.steps.length > 3" class="text-xs text-blue-500 pl-6">
                    还有 {{ route.steps.length - 3 }} 个步骤...
                  </div>
                </div>
              </div>
            </div>

            <!-- Task Hint -->
            <div
              v-if="taskStore.inProgressTasks.some(t => t.id === 'task_3') && routeEnd.includes('动物园')"
              class="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 rounded-2xl flex items-start gap-3"
            >
              <div class="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-lg shrink-0">🎉</div>
              <div>
                <h4 class="text-sm font-bold text-green-800">任务完成提示</h4>
                <p class="text-xs text-green-700 mt-1">路线规划成功！选择一条最便捷的路线前往动物园吧。</p>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="flex flex-col items-center justify-center h-full text-gray-400 p-8">
            <div class="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <PhNavigationArrow :size="48" weight="light" class="text-gray-300" />
            </div>
            <p class="text-sm font-medium text-gray-500">输入目的地开始规划路线</p>
            <p class="text-xs text-gray-400 mt-1">支持驾车、公交、步行多种出行方式</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 右侧：地图容器 -->
    <div class="flex-1 relative h-full bg-gray-100 overflow-hidden">
      <!-- 搜索悬浮条 - 普通模式 -->
      <div
        v-if="!showRoutePanel"
        class="absolute top-4 left-4 right-4 z-20 max-w-lg"
      >
        <!-- 主搜索框 -->
        <div class="bg-white rounded-2xl shadow-lg transition-all hover:shadow-xl overflow-hidden">
          <div class="flex items-center p-2">
            <PhMagnifyingGlass :size="22" class="text-gray-400 ml-3" />
            <input
              v-model="searchQuery"
              type="text"
              class="flex-1 h-11 px-3 outline-none text-gray-700 text-base"
              placeholder="搜索地点、公交、路线"
              @input="handleSearchInput(searchQuery, false)"
              @focus="showSearchResults = true"
              @keyup.enter="doSearch"
            />
            <button
              v-if="searchQuery"
              @click="clearSearch"
              class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <PhX :size="18" />
            </button>
            <button
              @click="openRoutePanel"
              class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg ml-2"
            >
              <PhNavigationArrow :size="16" weight="fill" />
              路线
            </button>
          </div>

          <!-- 搜索结果下拉 -->
          <Transition name="fade">
            <div v-if="searchResults.length > 0 && showSearchResults && !showRoutePanel" class="border-t border-gray-100">
              <div class="max-h-80 overflow-y-auto">
                <div
                  v-for="(result, index) in searchResults"
                  :key="result.uid || index"
                  @click="selectSearchResult(result)"
                  class="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-start gap-3 transition-colors"
                >
                  <div class="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <PhMapPin :size="16" class="text-red-500" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-gray-800 text-sm">{{ result.name }}</div>
                    <div class="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                      <span class="truncate">{{ result.address }}</span>
                      <span v-if="result.distance" class="text-blue-500 shrink-0">{{ result.distance }}</span>
                    </div>
                  </div>
                  <PhCaretRight :size="16" class="text-gray-300 mt-2" />
                </div>
              </div>
            </div>
          </Transition>

          <!-- 搜索中状态 -->
          <div v-if="isSearching" class="border-t border-gray-100 p-4 flex items-center justify-center gap-2 text-gray-400">
            <div class="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
            <span class="text-sm">搜索中...</span>
          </div>
        </div>
      </div>

      <!-- POI详情卡片 -->
      <Transition name="slide-up">
        <div
          v-if="showPoiDetail && selectedPoi && !showRoutePanel"
          class="absolute bottom-24 left-4 right-4 z-20 max-w-lg"
        >
          <div class="bg-white rounded-2xl shadow-xl p-4">
            <div class="flex items-start gap-3">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shrink-0">
                <PhMapPin :size="24" class="text-white" weight="fill" />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-gray-800 text-lg truncate">{{ selectedPoi.name }}</h3>
                <p class="text-sm text-gray-500 mt-0.5 truncate">{{ selectedPoi.address }}</p>
                <div v-if="selectedPoi.distance" class="text-xs text-blue-500 mt-1">距您 {{ selectedPoi.distance }}</div>
              </div>
              <button @click="closePoiDetail" class="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <PhX :size="20" class="text-gray-400" />
              </button>
            </div>

            <div class="flex gap-3 mt-4">
              <button
                @click="startNavigationFromPoi"
                class="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
              >
                <PhNavigationArrow :size="18" weight="fill" />
                到这去
              </button>
              <button
                v-if="selectedPoi.phone"
                class="w-12 h-12 bg-green-500 text-white rounded-xl flex items-center justify-center hover:bg-green-600 transition-colors shadow-md"
              >
                <PhPhone :size="20" weight="fill" />
              </button>
              <button class="w-12 h-12 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
                <PhStar :size="20" />
              </button>
              <button class="w-12 h-12 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
                <PhShareNetwork :size="20" />
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 百度地图挂载点 -->
      <div ref="mapContainer" class="w-full h-full"></div>

      <!-- 地图工具栏 -->
      <div class="absolute bottom-24 right-4 flex flex-col gap-3 z-10">
        <!-- 定位 -->
        <button
          @click="locateMe"
          class="w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-gray-50 text-blue-600 active:scale-95 transition-all"
          title="定位当前位置"
        >
          <PhCrosshair :size="24" weight="bold" />
        </button>

        <!-- 缩放 -->
        <div class="bg-white rounded-xl shadow-lg flex flex-col overflow-hidden">
          <button
            @click="zoomIn"
            class="w-12 h-12 flex items-center justify-center hover:bg-gray-50 border-b border-gray-100 active:bg-gray-100 text-gray-600"
          >
            <PhPlus :size="22" weight="bold" />
          </button>
          <button
            @click="zoomOut"
            class="w-12 h-12 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 text-gray-600"
          >
            <PhMinus :size="22" weight="bold" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 左侧面板滑入动画 */
.slide-in-enter-active,
.slide-in-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-in-enter-from,
.slide-in-leave-to {
  transform: translateX(-100%);
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 底部滑入动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* 文本截断 */
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 隐藏百度地图版权信息 */
:deep(.BMap_cpyCtrl) {
  display: none !important;
}

:deep(.anchorBL) {
  display: none !important;
}

/* 优化百度地图信息窗口样式 */
:deep(.BMap_bubble_content) {
  padding: 0 !important;
}

:deep(.BMap_bubble_title) {
  display: none !important;
}

:deep(.BMap_bubble_pop) {
  border-radius: 12px !important;
  overflow: hidden !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
}

:deep(.BMap_bubble_top) {
  border-radius: 12px 12px 0 0 !important;
}

/* 路线样式优化 */
:deep(.BMap_Marker) {
  z-index: 100 !important;
}

/* 滚动条美化 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
