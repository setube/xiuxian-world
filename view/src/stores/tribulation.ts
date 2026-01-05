import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { tribulationApi } from '@/api'
import { usePlayerStore } from './player'

// 渡劫物品需求
interface TribulationItem {
  itemId: string
  name: string
  required: number
  owned: number
}

// 渡劫状态
interface TribulationTypeStatus {
  canAttempt: boolean
  hasRequiredItems: boolean
  requiredItems: TribulationItem[]
  successRate?: number
  reason?: string
}

// 渡劫结果
interface TribulationResult {
  success: boolean
  type: string
  message: string
  newRealm?: {
    id: number
    name: string
    tier: number
    subTier: number
  }
  characterDied?: boolean
}

// 渡劫记录
interface TribulationRecord {
  id: string
  characterName: string
  tribulationType: string
  success: boolean
  originalRealmName: string
  rolledBack: boolean
  attemptedAt: number
}

// 南宫婉状态
interface NangongWanStatus {
  active: boolean
  startTime: number | null
  endTime: number | null
  storedExp: number
  originalRealm: { tier: number; subTier: number } | null
  remainingTime: number | null
}

export const useTribulationStore = defineStore('tribulation', () => {
  const playerStore = usePlayerStore()

  // ==================== 状态 ====================
  const foundation = ref<TribulationTypeStatus | null>(null)
  const coreFormation = ref<TribulationTypeStatus | null>(null)
  const nascentSoul = ref<TribulationTypeStatus | null>(null)

  const records = ref<TribulationRecord[]>([])
  const nangongWan = ref<NangongWanStatus | null>(null)

  const loading = ref(false)
  const attempting = ref(false)
  const lastResult = ref<TribulationResult | null>(null)
  const showResultModal = ref(false)

  // ==================== 计算属性 ====================
  const canAttemptFoundation = computed(() => foundation.value?.canAttempt || false)
  const canAttemptCoreFormation = computed(() => coreFormation.value?.canAttempt || false)
  const canAttemptNascentSoul = computed(() => nascentSoul.value?.canAttempt || false)

  const isNangongWanActive = computed(() => nangongWan.value?.active || false)

  const nangongWanRemainingTimeDisplay = computed(() => {
    if (!nangongWan.value?.remainingTime) return null
    const remaining = nangongWan.value.remainingTime
    const hours = Math.floor(remaining / 3600000)
    const minutes = Math.floor((remaining % 3600000) / 60000)
    return `${hours}时${minutes}分`
  })

  // ==================== API 方法 ====================

  // 获取渡劫状态
  const fetchStatus = async () => {
    loading.value = true
    try {
      const { data } = await tribulationApi.getStatus()
      foundation.value = data.foundation
      coreFormation.value = data.coreFormation
      nascentSoul.value = data.nascentSoul
    } catch (error) {
      console.error('获取渡劫状态失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 尝试筑基之劫
  const attemptFoundation = async (): Promise<TribulationResult | null> => {
    if (!canAttemptFoundation.value) return null

    attempting.value = true
    try {
      const { data } = await tribulationApi.attemptFoundation()
      lastResult.value = data
      showResultModal.value = true

      // 刷新状态
      await fetchStatus()
      await playerStore.fetchStats()

      return data
    } catch (error) {
      console.error('筑基之劫失败:', error)
      return null
    } finally {
      attempting.value = false
    }
  }

  // 尝试结丹之劫
  const attemptCoreFormation = async (): Promise<TribulationResult | null> => {
    if (!canAttemptCoreFormation.value) return null

    attempting.value = true
    try {
      const { data } = await tribulationApi.attemptCoreFormation()
      lastResult.value = data
      showResultModal.value = true

      if (data.characterDied) {
        // 角色已死亡，清除玩家状态
        playerStore.clearCharacter()
      } else {
        await fetchStatus()
        await playerStore.fetchStats()
      }

      return data
    } catch (error) {
      console.error('结丹之劫失败:', error)
      return null
    } finally {
      attempting.value = false
    }
  }

  // 尝试元婴之劫
  const attemptNascentSoul = async (): Promise<TribulationResult | null> => {
    if (!canAttemptNascentSoul.value) return null

    attempting.value = true
    try {
      const { data } = await tribulationApi.attemptNascentSoul()
      lastResult.value = data
      showResultModal.value = true

      if (data.characterDied) {
        // 角色已死亡，清除玩家状态
        playerStore.clearCharacter()
      } else {
        await fetchStatus()
        await playerStore.fetchStats()
      }

      return data
    } catch (error) {
      console.error('元婴之劫失败:', error)
      return null
    } finally {
      attempting.value = false
    }
  }

  // 获取渡劫记录
  const fetchRecords = async (limit?: number) => {
    try {
      const { data } = await tribulationApi.getRecords(limit)
      records.value = data.records || []
    } catch (error) {
      console.error('获取渡劫记录失败:', error)
    }
  }

  // 获取南宫婉状态
  const fetchNangongWanStatus = async () => {
    try {
      const { data } = await tribulationApi.getNangongWanStatus()
      nangongWan.value = data
    } catch (error) {
      console.error('获取南宫婉状态失败:', error)
    }
  }

  // 关闭结果弹窗
  const closeResultModal = () => {
    showResultModal.value = false
  }

  // 刷新南宫婉剩余时间
  const refreshNangongWanTime = () => {
    if (nangongWan.value?.active && nangongWan.value.endTime) {
      const remaining = nangongWan.value.endTime - Date.now()
      nangongWan.value.remainingTime = Math.max(0, remaining)
    }
  }

  // ==================== Socket 事件处理 ====================

  // 处理渡劫广播（全服）
  const handleTribulationBroadcast = (data: {
    characterName: string
    type: string
    success: boolean
    newRealm?: string
  }) => {
    // 刷新渡劫记录
    fetchRecords()
    // 可以在这里触发全服公告弹幕等
    console.log(`[渡劫公告] ${data.characterName} ${data.success ? '成功' : '失败'}渡过${data.type}`)
  }

  // 处理南宫婉触发（个人）
  const handleNangongWanTrigger = (data: {
    message: string
    duration: number
    endTime: number
  }) => {
    nangongWan.value = {
      active: true,
      startTime: Date.now(),
      endTime: data.endTime,
      storedExp: 0,
      originalRealm: null,
      remainingTime: data.duration,
    }
    // 刷新玩家状态（境界已改变）
    playerStore.fetchStats()
  }

  // 处理南宫婉结束（个人）
  const handleNangongWanEnd = (_data: {
    returnedExp: number
    message: string
  }) => {
    nangongWan.value = {
      active: false,
      startTime: null,
      endTime: null,
      storedExp: 0,
      originalRealm: null,
      remainingTime: null,
    }
    // 刷新玩家状态（境界和修为已恢复）
    playerStore.fetchStats()
  }

  // 初始化
  const init = async () => {
    await Promise.all([fetchStatus(), fetchNangongWanStatus()])
  }

  return {
    // 状态
    foundation,
    coreFormation,
    nascentSoul,
    records,
    nangongWan,
    loading,
    attempting,
    lastResult,
    showResultModal,

    // 计算属性
    canAttemptFoundation,
    canAttemptCoreFormation,
    canAttemptNascentSoul,
    isNangongWanActive,
    nangongWanRemainingTimeDisplay,

    // 方法
    fetchStatus,
    attemptFoundation,
    attemptCoreFormation,
    attemptNascentSoul,
    fetchRecords,
    fetchNangongWanStatus,
    closeResultModal,
    refreshNangongWanTime,
    init,

    // Socket 事件处理
    handleTribulationBroadcast,
    handleNangongWanTrigger,
    handleNangongWanEnd,
  }
})
