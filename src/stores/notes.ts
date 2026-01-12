// ==========================================
// ZooPad Notes Store - 备忘录管理
// ==========================================
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Note } from '@/types'

export const useNotesStore = defineStore('notes', () => {
    // ========== 笔记列表 ==========
    const notes = ref<Note[]>([
        {
            id: 'sample_note',
            title: '欢迎使用备忘录',
            content: '<p>这是一个示例笔记。</p><p>你可以在这里记录你的<strong>学习心得</strong>和<em>动物园之旅</em>！</p>',
            images: [],
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01')
        }
    ])

    // ========== 当前编辑的笔记 ==========
    const activeNoteId = ref<string | null>(null)

    // ========== 计算属性 ==========
    const activeNote = computed(() =>
        notes.value.find(n => n.id === activeNoteId.value)
    )

    const sortedNotes = computed(() =>
        [...notes.value].sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
    )

    // ========== 方法 ==========
    function createNote(title: string = '新建笔记') {
        const newNote: Note = {
            id: `note_${Date.now()}`,
            title,
            content: '',
            images: [],
            createdAt: new Date(),
            updatedAt: new Date()
        }
        notes.value.unshift(newNote)
        activeNoteId.value = newNote.id
        return newNote.id
    }

    function updateNote(noteId: string, updates: Partial<Pick<Note, 'title' | 'content' | 'images'>>) {
        const note = notes.value.find(n => n.id === noteId)
        if (note) {
            if (updates.title !== undefined) note.title = updates.title
            if (updates.content !== undefined) note.content = updates.content
            if (updates.images !== undefined) note.images = updates.images
            note.updatedAt = new Date()
        }
    }

    function deleteNote(noteId: string) {
        const index = notes.value.findIndex(n => n.id === noteId)
        if (index > -1) {
            notes.value.splice(index, 1)
            if (activeNoteId.value === noteId) {
                activeNoteId.value = notes.value[0]?.id || null
            }
        }
    }

    function selectNote(noteId: string | null) {
        activeNoteId.value = noteId
    }

    function addImageToNote(noteId: string, imageUrl: string) {
        const note = notes.value.find(n => n.id === noteId)
        if (note) {
            note.images.push(imageUrl)
            note.updatedAt = new Date()
        }
    }

    function appendContent(noteId: string, content: string) {
        const note = notes.value.find(n => n.id === noteId)
        if (note) {
            note.content += content
            note.updatedAt = new Date()
        }
    }

    return {
        notes,
        activeNoteId,
        activeNote,
        sortedNotes,

        createNote,
        updateNote,
        deleteNote,
        selectNote,
        addImageToNote,
        appendContent
    }
})
