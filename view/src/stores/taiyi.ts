/**
 * 太一门系统 Store - 神识与引道
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { taiyiApi } from '@/api'
import type { ElementType, GuidanceBuff } from '@/game/constants/taiyi'
import { ELEMENT_NAMES, formatTimeRemaining } from '@/game/constants/taiyi'

// 太一门系统状态
export interface TaiyiStatus {
  isTaiyiMember: boolean
  consciousness: number
  consciousnessBonus: number
  lastGuidanceTime: number | null
  canUseGuidance: boolean
  guidanceCooldownRemaining: number
  activeBuff: {
    element: ElementType
    buff: GuidanceBuff
    expiresAt: number
    remainingTime: number
  } | null
  debuffs: {
    sourceCharacterId: string
    appliedAt: number
    expiresAt: number
    failureRateIncrease: number
  }[]
  totalDebuffEffect: number
}

// 元素信息
export interface ElementInfo {
  element: ElementType
  name: string
  daoName: string
  buff: GuidanceBuff
}

// 引道结果
export interface GuidanceResult {
  success: boolean
  element: ElementType
  consciousnessGained: number
  newConsciousness: number
  buff: GuidanceBuff
  buffExpiresAt: number
  message: string
}

// 神识冲击结果
export interface ConsciousnessStrikeResult {
  success: boolean
  consciousnessConsumed: number
  targetName: string
  effectApplied: boolean
  failureRateIncrease: number
  debuffDuration: number
  message: string
}

export const useTaiyiStore = defineStore('taiyi', () => {
  // 状态
  const status = ref<TaiyiStatus | null>(null)
  const elements = ref<ElementInfo[]>([])
  const loading = ref(false)
  const actionLoading = ref(false)

  // 计算属性
  const isTaiyiMember = computed(() => status.value?.isTaiyiMember ?? false)
  const consciousness = computed(() => status.value?.consciousness ?? 0)
  const consciousnessBonus = computed(() => status.value?.consciousnessBonus ?? 0)
  const canUseGuidance = computed(() => status.value?.canUseGuidance ?? false)
  const guidanceCooldownText = computed(() => {
    if (!status.value) return ''
    return formatTimeRemaining(status.value.guidanceCooldownRemaining)
  })
  const activeBuff = computed(() => status.value?.activeBuff ?? null)
  const activeBuffText = computed(() => {
    if (!activeBuff.value) return null
    return {
      name: activeBuff.value.buff.name,
      element: ELEMENT_NAMES[activeBuff.value.element],
      description: activeBuff.value.buff.description,
      remainingTime: formatTimeRemaining(activeBuff.value.remainingTime)
    }
  })
  const totalDebuffEffect = computed(() => status.value?.totalDebuffEffect ?? 0)

  // 获取太一门系统状态
  async function fetchStatus() {
    loading.value = true
    try {
      const response = await taiyiApi.getStatus()
      status.value = response.data as TaiyiStatus
    } catch (error) {
      console.error('获取太一门状态失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 获取元素列表
  async function fetchElements() {
    try {
      const response = await taiyiApi.getElements()
      elements.value = response.data as ElementInfo[]
    } catch (error) {
      console.error('获取元素列表失败:', error)
      throw error
    }
  }

  // 使用引道
  async function useGuidance(element: ElementType): Promise<GuidanceResult> {
    actionLoading.value = true
    try {
      const response = await taiyiApi.useGuidance(element)
      const result = response.data as GuidanceResult

      // 更新状态
      await fetchStatus()

      return result
    } catch (error) {
      console.error('使用引道失败:', error)
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  // 使用神识冲击
  async function useConsciousnessStrike(targetCharacterId: string): Promise<ConsciousnessStrikeResult> {
    actionLoading.value = true
    try {
      const response = await taiyiApi.useConsciousnessStrike(targetCharacterId)
      const result = response.data as ConsciousnessStrikeResult

      // 更新状态
      await fetchStatus()

      return result
    } catch (error) {
      console.error('使用神识冲击失败:', error)
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  // 初始化
  async function initialize() {
    await Promise.all([fetchStatus(), fetchElements()])
  }

  // 重置状态
  function reset() {
    status.value = null
    elements.value = []
    loading.value = false
    actionLoading.value = false
  }

  return {
    // 状态
    status,
    elements,
    loading,
    actionLoading,

    // 计算属性
    isTaiyiMember,
    consciousness,
    consciousnessBonus,
    canUseGuidance,
    guidanceCooldownText,
    activeBuff,
    activeBuffText,
    totalDebuffEffect,

    // 方法
    fetchStatus,
    fetchElements,
    useGuidance,
    useConsciousnessStrike,
    initialize,
    reset
  }
})
