<script setup lang="ts">
// ==========================================
// 备忘录 App - 富文本笔记编辑
// ==========================================
import { ref, onMounted, watch, nextTick } from 'vue'
import { useNotesStore } from '@/stores/notes'
import { usePhotosStore } from '@/stores/photos'
import { useTaskStore } from '@/stores/task'
import { 
  PhPlus,
  PhTrash,
  PhImage,
  PhTextBolder,
  PhTextItalic,
  PhListBullets,
  PhCheckSquare,
  PhClipboard,
  PhCheck,
  PhFolder,
  PhNote
} from '@phosphor-icons/vue'

const notesStore = useNotesStore()
const photosStore = usePhotosStore()
const taskStore = useTaskStore()

// 当前编辑的笔记内容
const editingTitle = ref('')
const editingContent = ref('')
const showPhotosPicker = ref(false)
const contentEditorRef = ref<HTMLDivElement | null>(null)

// 操作反馈
const showPasteSuccess = ref(false)
const showInsertSuccess = ref(false)

// 监听活跃笔记变化
watch(() => notesStore.activeNote, (note) => {
  if (note) {
    editingTitle.value = note.title
    editingContent.value = note.content
    // 使用 nextTick 确保 DOM 已更新后再设置内容
    nextTick(() => {
      if (contentEditorRef.value) {
        contentEditorRef.value.innerHTML = note.content
      }
    })
  }
}, { immediate: true })

// 创建新笔记
function createNewNote() {
  // 如果是任务9，使用特定标题
  const task9 = taskStore.tasks.find(t => t.id === 'task_9')
  const title = task9?.status === 'in_progress' 
    ? '我的新浦动物园之旅' 
    : '新建笔记'
  notesStore.createNote(title)
  editingTitle.value = title
  editingContent.value = ''
  
  // 任务检查 - 新建备忘录即可完成任务9
  taskStore.checkTrigger({ type: 'create_note' })
}

// 保存笔记
function saveNote() {
  if (notesStore.activeNoteId) {
    notesStore.updateNote(notesStore.activeNoteId, {
      title: editingTitle.value,
      content: editingContent.value
    })
  }
}

// 删除笔记
function deleteNote(noteId: string) {
  notesStore.deleteNote(noteId)
}

// 选择笔记
function selectNote(noteId: string) {
  notesStore.selectNote(noteId)
}

// 粘贴文字
async function pasteText() {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      // 直接操作 DOM 插入文本
      if (contentEditorRef.value) {
        const p = document.createElement('p')
        p.textContent = text
        contentEditorRef.value.appendChild(p)
        editingContent.value = contentEditorRef.value.innerHTML
      }
      saveNote()
      showPasteSuccess.value = true
      setTimeout(() => showPasteSuccess.value = false, 2000)
      
      // 任务检查
      taskStore.checkTrigger({ type: 'action', value: 'paste_text' })
    }
  } catch (err) {
    // 如果剪贴板API不可用，使用模拟数据
    const mockText = '金丝猴是中国特有的珍稀动物，是国家一级保护动物。它们主要栖息在海拔1500-3400米的高山针叶林中，以树叶、种子、嫩芽为食。'
    // 直接操作 DOM 插入文本
    if (contentEditorRef.value) {
      const p = document.createElement('p')
      p.textContent = mockText
      contentEditorRef.value.appendChild(p)
      editingContent.value = contentEditorRef.value.innerHTML
    }
    saveNote()
    showPasteSuccess.value = true
    setTimeout(() => showPasteSuccess.value = false, 2000)
    
    taskStore.checkTrigger({ type: 'action', value: 'paste_text' })
  }
}

// 插入图片
function insertImage(photo: any) {
  // 直接操作 DOM 插入图片
  if (contentEditorRef.value) {
    const p = document.createElement('p')
    const img = document.createElement('img')
    img.src = photo.url
    img.alt = photo.name
    img.style.cssText = 'max-width:100%; border-radius: 8px; margin: 8px 0;'
    p.appendChild(img)
    contentEditorRef.value.appendChild(p)
    editingContent.value = contentEditorRef.value.innerHTML
  }
  
  if (notesStore.activeNoteId) {
    notesStore.addImageToNote(notesStore.activeNoteId, photo.url)
  }
  
  saveNote()
  showPhotosPicker.value = false
  showInsertSuccess.value = true
  setTimeout(() => showInsertSuccess.value = false, 2000)
  
  // 任务检查
  taskStore.checkTrigger({ type: 'action', value: 'insert_image' })
}

// 应用格式 - 使用 document.execCommand 保持光标位置
function applyFormat(format: string) {
  if (!contentEditorRef.value) return
  contentEditorRef.value.focus()
  
  switch (format) {
    case 'bold':
      document.execCommand('bold', false)
      break
    case 'italic':
      document.execCommand('italic', false)
      break
    case 'list':
      document.execCommand('insertUnorderedList', false)
      break
  }
  
  editingContent.value = contentEditorRef.value.innerHTML
  saveNote()
}

// 格式化日期
function formatDate(date: Date) {
  const d = new Date(date)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}月${day}日 ${hours}:${minutes}`
}

onMounted(() => {
  taskStore.checkTrigger({ type: 'app_open', appId: 'notes' })
})
</script>

<template>
  <div class="h-full flex bg-gray-100">
    
    <!-- 侧边栏：笔记列表 -->
    <div class="w-64 bg-gray-50 border-r flex flex-col shrink-0">
      <!-- 头部 -->
      <div class="h-12 border-b flex items-center justify-between px-4">
        <h2 class="font-bold text-gray-800 flex items-center gap-2">
          <PhFolder :size="18" class="text-yellow-500" />
          备忘录
        </h2>
        <button 
          @click="createNewNote"
          class="w-7 h-7 bg-yellow-500 rounded-lg flex items-center justify-center text-white hover:bg-yellow-600 transition-colors"
        >
          <PhPlus :size="16" weight="bold" />
        </button>
      </div>

      <!-- 笔记列表 -->
      <div class="flex-1 overflow-auto">
        <div 
          v-for="note in notesStore.sortedNotes"
          :key="note.id"
          @click="selectNote(note.id)"
          class="p-3 border-b cursor-pointer transition-colors"
          :class="notesStore.activeNoteId === note.id ? 'bg-yellow-100' : 'hover:bg-gray-100'"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-gray-800 truncate text-sm">{{ note.title }}</h3>
              <p class="text-xs text-gray-500 mt-1">{{ formatDate(note.updatedAt) }}</p>
              <p class="text-xs text-gray-400 mt-1 line-clamp-1" v-html="note.content.replace(/<[^>]*>/g, '').slice(0, 50)"></p>
            </div>
            <button 
              @click.stop="deleteNote(note.id)"
              class="p-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <PhTrash :size="14" />
            </button>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="notesStore.notes.length === 0" class="p-8 text-center text-gray-400">
          <PhNote :size="40" class="mx-auto mb-2 opacity-50" />
          <p class="text-sm">暂无笔记</p>
          <p class="text-xs mt-1">点击右上角创建</p>
        </div>
      </div>
    </div>

    <!-- 主内容区：编辑器 -->
    <div class="flex-1 flex flex-col">
      <template v-if="notesStore.activeNote">
        <!-- 工具栏 -->
        <div class="h-12 bg-white border-b flex items-center px-4 gap-2 shrink-0">
          <button 
            @click="applyFormat('bold')"
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="粗体"
          >
            <PhTextBolder :size="18" class="text-gray-600" />
          </button>
          <button 
            @click="applyFormat('italic')"
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="斜体"
          >
            <PhTextItalic :size="18" class="text-gray-600" />
          </button>
          <button 
            @click="applyFormat('list')"
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="列表"
          >
            <PhListBullets :size="18" class="text-gray-600" />
          </button>
          
          <div class="w-px h-6 bg-gray-200 mx-2"></div>
          
          <button 
            @click="pasteText"
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
            title="粘贴"
          >
            <PhClipboard :size="18" class="text-gray-600" />
            <span class="text-xs text-gray-500">粘贴</span>
          </button>
          
          <button 
            @click="showPhotosPicker = true"
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
            title="插入图片"
          >
            <PhImage :size="18" class="text-gray-600" />
            <span class="text-xs text-gray-500">插入图片</span>
          </button>


        </div>

        <!-- 编辑区域 -->
        <div class="flex-1 overflow-auto bg-white">
          <div class="max-w-3xl mx-auto p-6">
            <!-- 标题输入 -->
            <input 
              v-model="editingTitle"
              @blur="saveNote"
              type="text"
              class="w-full text-2xl font-bold text-gray-800 outline-none border-0 mb-4 placeholder-gray-300"
              placeholder="标题"
            />

            <!-- 内容编辑 -->
            <div 
              ref="contentEditorRef"
              class="prose max-w-none min-h-[200px] outline-none text-gray-700"
              contenteditable="true"
              @input="(e) => { editingContent = (e.target as HTMLElement).innerHTML }"
              @blur="saveNote"
              :data-placeholder="editingContent ? '' : '开始书写...'"
            ></div>
          </div>
        </div>
      </template>

      <!-- 未选择笔记 -->
      <template v-else>
        <div class="flex-1 flex flex-col items-center justify-center text-gray-400">
          <PhNote :size="60" class="mb-4 opacity-30" />
          <p class="text-lg">选择或创建一个笔记</p>
          <button 
            @click="createNewNote"
            class="mt-4 px-6 py-2 bg-yellow-500 text-white font-medium rounded-xl hover:bg-yellow-600 transition-colors"
          >
            新建笔记
          </button>
        </div>
      </template>
    </div>

    <!-- 图片选择器弹窗 -->
    <Transition name="fade">
      <div 
        v-if="showPhotosPicker"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="showPhotosPicker = false"
      >
        <div class="bg-white rounded-2xl w-96 max-h-[80vh] overflow-hidden shadow-2xl">
          <div class="p-4 border-b flex items-center justify-between">
            <h3 class="font-bold text-gray-800">选择图片</h3>
            <button @click="showPhotosPicker = false" class="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
          
          <div class="p-4 max-h-[60vh] overflow-auto">
            <div v-if="photosStore.photos.length === 0" class="text-center py-8 text-gray-400">
              <PhImage :size="40" class="mx-auto mb-2 opacity-50" />
              <p class="text-sm">相册中暂无图片</p>
              <p class="text-xs mt-1">先在浏览器中保存一些图片吧</p>
            </div>
            
            <div v-else class="grid grid-cols-3 gap-2">
              <div 
                v-for="photo in photosStore.photos"
                :key="photo.id"
                @click="insertImage(photo)"
                class="aspect-square rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-yellow-500 transition-all"
              >
                <img :src="photo.url" :alt="photo.name" class="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 操作成功提示 -->
    <Transition name="fade">
      <div 
        v-if="showPasteSuccess"
        class="fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 z-50 shadow-lg"
      >
        <PhCheck :size="16" weight="bold" />
        文字已粘贴
      </div>
    </Transition>
    <Transition name="fade">
      <div 
        v-if="showInsertSuccess"
        class="fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 z-50 shadow-lg"
      >
        <PhCheck :size="16" weight="bold" />
        图片已插入
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

/* 占位文字 */
[contenteditable]:empty::before {
  content: attr(data-placeholder);
  color: #ccc;
  cursor: text;
}

/* 基础排版 */
.prose p {
  margin-bottom: 0.75rem;
}

.prose strong {
  font-weight: 600;
}

.prose em {
  font-style: italic;
}

.prose ul {
  list-style: disc;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.prose img {
  max-width: 100%;
  border-radius: 8px;
  margin: 8px 0;
}
</style>
