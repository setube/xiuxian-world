import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { worldEventApi } from '@/api'

// 世界事件接口
interface WorldEvent {
  id: string
  type: 'blessing' | 'calamity'
  effectType: string
  targetCharacterName: string
  description: string
  value: number
  itemName: string | null
  triggeredAt: number
}

// Buff接口
interface WorldEventBuff {
  type: string
  effectType: string
  value: number
  expiresAt: number
  remainingTime: number
}

export const useWorldEventStore = defineStore('worldEvent', () => {
  // ==================== 状态 ====================
  const recentEvents = ref<WorldEvent[]>([])
  const myBuffs = ref<WorldEventBuff[]>([])
  const myEventHistory = ref<WorldEvent[]>([])
  const cultivationMultiplier = ref(1.0)
  const loading = ref(false)

  // ==================== 计算属性 ====================
  const hasActiveBuff = computed(() => myBuffs.value.length > 0)

  const activeBlessing = computed(() => {
    return myBuffs.value.filter((b) => b.type === 'blessing')
  })

  const activeCalamity = computed(() => {
    return myBuffs.value.filter((b) => b.type === 'calamity')
  })

  const cultivationBonus = computed(() => {
    return Math.round((cultivationMultiplier.value - 1) * 100)
  })

  // ==================== API 方法 ====================

  // 获取近期世界事件
  const fetchRecentEvents = async (limit?: number) => {
    loading.value = true
    try {
      const { data } = await worldEventApi.getRecentEvents(limit)
      recentEvents.value = data.events || []
    } catch (error) {
      console.error('获取世界事件失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 获取我的buff/debuff
  const fetchMyBuffs = async () => {
    try {
      const { data } = await worldEventApi.getMyBuffs()
      myBuffs.value = data.buffs || []
    } catch (error) {
      console.error('获取buff失败:', error)
    }
  }

  // 获取我的事件历史
  const fetchMyHistory = async (limit?: number) => {
    try {
      const { data } = await worldEventApi.getMyHistory(limit)
      myEventHistory.value = data.events || []
    } catch (error) {
      console.error('获取事件历史失败:', error)
    }
  }

  // 获取修炼效率加成
  const fetchCultivationMultiplier = async () => {
    try {
      const { data } = await worldEventApi.getCultivationMultiplier()
      cultivationMultiplier.value = data.multiplier || 1.0
    } catch (error) {
      console.error('获取修炼加成失败:', error)
    }
  }

  // 添加新事件（从Socket.IO接收）
  const addEvent = (event: WorldEvent) => {
    recentEvents.value.unshift(event)
    // 保持最多50条
    if (recentEvents.value.length > 50) {
      recentEvents.value = recentEvents.value.slice(0, 50)
    }
  }

  // 处理 Socket 世界事件
  const handleWorldEvent = (data: { event: any; message: string }) => {
    if (data.event) {
      addEvent(data.event)
    }
    // 刷新buff（可能被世界事件影响）
    fetchMyBuffs()
    fetchCultivationMultiplier()
  }

  // 初始化
  const init = async () => {
    await Promise.all([fetchRecentEvents(), fetchMyBuffs(), fetchCultivationMultiplier()])
  }

  // 刷新buff状态
  const refreshBuffs = () => {
    const now = Date.now()
    myBuffs.value = myBuffs.value
      .map((buff) => ({
        ...buff,
        remainingTime: Math.max(0, buff.expiresAt - now),
      }))
      .filter((buff) => buff.remainingTime > 0)
  }

  return {
    // 状态
    recentEvents,
    myBuffs,
    myEventHistory,
    cultivationMultiplier,
    loading,

    // 计算属性
    hasActiveBuff,
    activeBlessing,
    activeCalamity,
    cultivationBonus,

    // 方法
    fetchRecentEvents,
    fetchMyBuffs,
    fetchMyHistory,
    fetchCultivationMultiplier,
    addEvent,
    handleWorldEvent,
    refreshBuffs,
    init,
  }
})
