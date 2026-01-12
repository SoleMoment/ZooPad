// ==========================================
// ZooPad Type Definitions
// ==========================================

// App Configuration
export interface AppConfig {
    id: string
    name: string
    icon: string
    componentName: string
    color: string       // Gradient colors for app icon
    category: 'system' | 'education' | 'utility'
}

// Running App Instance
export interface RunningApp {
    processId: number
    appId: string
    componentName: string
    zIndex: number
    isMinimized: boolean
    launchPosition?: { x: number; y: number }
}

// Task System
export type TaskStatus = 'locked' | 'pending' | 'in_progress' | 'completed'

export interface TaskStep {
    id: string
    description: string
    completed: boolean
    trigger?: {
        type: 'app_open' | 'action' | 'answer' | 'save_image' | 'copy_text' | 'route_select' | 'route_complete' | 'save_to_album' | 'browser_search' | 'save_animal_photo' | 'create_note' | 'ai_identify'
        appId?: string
        value?: string
    }
}

export interface Task {
    id: string
    phase: 1 | 2 | 3  // 游园前、游园中、游园后
    title: string
    description: string
    status: TaskStatus
    requiredAppId?: string
    guideText: string
    completeText: string
    steps: TaskStep[]
    reward?: InventoryItem
}

// Inventory System (背包系统)
export interface InventoryItem {
    id: string
    name: string
    type: 'ticket' | 'map' | 'photo' | 'note' | 'achievement'
    description: string
    imageUrl?: string
    obtainedAt?: Date
}

// Photo Album
export interface Photo {
    id: string
    name: string
    url: string
    category: 'animal' | 'map' | 'screenshot' | 'saved'
    savedAt: Date
    annotations?: PhotoAnnotation[]
}

export interface PhotoAnnotation {
    type: 'brush' | 'text'
    points?: { x: number; y: number }[]
    text?: string
    color: string
    position?: { x: number; y: number }
}

// Notes System
export interface Note {
    id: string
    title: string
    content: string
    images: string[]
    createdAt: Date
    updatedAt: Date
}

// Weather Data
export interface WeatherData {
    location: string
    temperature: number
    text: string
    icon: string
    humidity: number
    windDir: string
    windScale: string
    feelsLike: number
    hourlyForecast: HourlyForecast[]
    dailyForecast: DailyForecast[]
}

export interface HourlyForecast {
    time: string
    temp: number
    icon: string
    text: string
}

export interface DailyForecast {
    date: string
    dayText: string
    nightText: string
    tempMax: number
    tempMin: number
    iconDay: string
}

// Animal Data (for Zoo Website)
export interface Animal {
    id: string
    name: string
    englishName: string
    scientificName: string
    category: 'primate' | 'feline' | 'bird' | 'marine' | 'reptile' | 'herbivore'
    categoryName: string
    description: string
    habitat: string
    diet: string
    conservation: string
    funFacts: string[]
    images: string[]
    stats: {
        height?: string
        weight?: string
        lifespan?: string
        speed?: string
    }
}

// Route Planning
export interface Route {
    id: number
    type: 'bus' | 'car' | 'walk'
    duration: number
    distance: string
    name: string
    description: string
    price?: string
    highlight?: string
    steps: RouteStep[]
}

export interface RouteStep {
    type: 'walk' | 'bus' | 'transfer'
    instruction: string
    duration: number
}
