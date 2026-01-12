// ==========================================
// ZooPad Photos Store - 相册管理
// ==========================================
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Photo } from '@/types'

export const usePhotosStore = defineStore('photos', () => {
    // ========== 相册图片列表 ==========
    const photos = ref<Photo[]>([
        // 预置动物素材
        {
            id: 'preset_1',
            name: '长颈鹿',
            url: '/src/assets/images/长颈鹿.png',
            category: 'animal',
            savedAt: new Date('2024-01-01')
        },
        {
            id: 'preset_2',
            name: '火烈鸟',
            url: '/src/assets/images/火烈鸟.png',
            category: 'animal',
            savedAt: new Date('2024-01-01')
        },
        {
            id: 'preset_3',
            name: '大熊猫',
            url: '/src/assets/images/大熊猫.jpg',
            category: 'animal',
            savedAt: new Date('2024-01-01')
        }
    ])

    // ========== 当前选中的图片 ==========
    const selectedPhotoId = ref<string | null>(null)
    const isEditing = ref(false)

    // ========== 计算属性 ==========
    const selectedPhoto = computed(() =>
        photos.value.find(p => p.id === selectedPhotoId.value)
    )

    const photosByCategory = computed(() => ({
        animal: photos.value.filter(p => p.category === 'animal'),
        map: photos.value.filter(p => p.category === 'map'),
        screenshot: photos.value.filter(p => p.category === 'screenshot'),
        saved: photos.value.filter(p => p.category === 'saved')
    }))

    const recentPhotos = computed(() =>
        [...photos.value].sort((a, b) =>
            new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
        ).slice(0, 20)
    )

    // ========== 方法 ==========
    function addPhoto(photo: Omit<Photo, 'id' | 'savedAt'>) {
        const newPhoto: Photo = {
            ...photo,
            id: `photo_${Date.now()}`,
            savedAt: new Date()
        }
        photos.value.unshift(newPhoto)
        return newPhoto.id
    }

    function saveImageFromUrl(url: string, name: string, category: Photo['category'] = 'saved') {
        return addPhoto({ url, name, category })
    }

    function deletePhoto(photoId: string) {
        const index = photos.value.findIndex(p => p.id === photoId)
        if (index > -1) {
            photos.value.splice(index, 1)
            if (selectedPhotoId.value === photoId) {
                selectedPhotoId.value = null
            }
        }
    }

    function selectPhoto(photoId: string | null) {
        selectedPhotoId.value = photoId
        isEditing.value = false
    }

    function startEditing() {
        if (selectedPhotoId.value) {
            isEditing.value = true
        }
    }

    function stopEditing() {
        isEditing.value = false
    }

    function addAnnotation(photoId: string, annotation: Photo['annotations'][0]) {
        const photo = photos.value.find(p => p.id === photoId)
        if (photo) {
            if (!photo.annotations) {
                photo.annotations = []
            }
            photo.annotations.push(annotation)
        }
    }

    return {
        photos,
        selectedPhotoId,
        selectedPhoto,
        isEditing,
        photosByCategory,
        recentPhotos,

        addPhoto,
        saveImageFromUrl,
        deletePhoto,
        selectPhoto,
        startEditing,
        stopEditing,
        addAnnotation
    }
})
