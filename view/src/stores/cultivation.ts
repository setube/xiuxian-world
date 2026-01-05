import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usePlayerStore } from './player'
import { cultivationApi } from '@/api'
import {
  checkCooldown,
  getDaoHeartLevel,
  calculateCultivationRates,
  canEnablePeaceMode,
  CULTIVATION_COOLDOWN_MIN,
  CULTIVATION_COOLDOWN_MAX,
  DEEP_CULTIVATION_DURATION,
  DEEP_CULTIVATION_COOLDOWN,
  ACTIVITY_SOURCES,
  POISON_CONFIG,
  type CultivationExecuteResult,
  type DaoHeartLevel,
  type CultivationRates,
  type DeepCultivationSession,
  type DeepCultivationResult,
  type PoisonStack
} from '@/game/systems/cultivation'

export const useCultivationStore = defineStore('cultivation', () => {
  const playerStore = usePlayerStore()

  // ==================== 状态 ====================
  const lastCultivationTime = ref<number | null>(null)
  const currentCooldown = ref<number>(600000)
  const activityPoints = ref(30)
  const activityHistory = ref<Record<string, number>>({})
  const isCultivating = ref(false)
  const lastResult = ref<CultivationExecuteResult | null>(null)
  const showResultModal = ref(false)

  // 深度闭关
  const deepSession = ref<DeepCultivationSession | null>(null)
  const lastDeepCultivationTime = ref<number | null>(null)
  const deepResult = ref<DeepCultivationResult | null>(null)
  const showDeepResultModal = ref(false)

  // 丹毒
  const poisonStacks = ref<PoisonStack[]>([])

  // 和平模式
  const peaceMode = ref(false)

  // 被动修炼结果
  const passiveResult = ref<{ exp: number; duration: number } | null>(null)
  const showPassiveResultModal = ref(false)

  // 加载状态
  const loading = ref(false)

  // ==================== 计算属性 ====================
  const daoHeart = computed<DaoHeartLevel>(() => {
    return getDaoHeartLevel(activityPoints.value)
  })

  const totalPoisonStacks = computed(() => {
    return poisonStacks.value.reduce((sum, p) => sum + p.stacks, 0)
  })

  const cultivationRates = computed<CultivationRates | null>(() => {
    const spiritRoot = playerStore.spiritRoot
    if (!spiritRoot) return null
    return calculateCultivationRates(spiritRoot, activityPoints.value, totalPoisonStacks.value)
  })

  const cooldownStatus = computed(() => {
    return checkCooldown(lastCultivationTime.value, currentCooldown.value)
  })

  const canCultivate = computed(() => {
    return cooldownStatus.value.canCultivate && !isCultivating.value && playerStore.spiritRoot && !deepSession.value?.isActive
  })

  // 深度闭关状态
  const deepCooldownStatus = computed(() => {
    return checkCooldown(lastDeepCultivationTime.value, DEEP_CULTIVATION_COOLDOWN)
  })

  const canStartDeepCultivation = computed(() => {
    return deepCooldownStatus.value.canCultivate && !deepSession.value?.isActive && playerStore.spiritRoot
  })

  const deepSessionRemainingTime = computed(() => {
    if (!deepSession.value?.isActive) return null
    const remaining = deepSession.value.endTime - Date.now()
    if (remaining <= 0) return null

    const hours = Math.floor(remaining / 3600000)
    const minutes = Math.floor((remaining % 3600000) / 60000)
    return `${hours}时${minutes}分`
  })

  // 和平模式
  const canTogglePeaceMode = computed(() => {
    const realmTier = playerStore.character?.realm?.tier || 1
    return canEnablePeaceMode(realmTier)
  })

  // ==================== API 方法 ====================

  // 从服务器加载状态
  const loadFromServer = async () => {
    loading.value = true
    try {
      const { data } = await cultivationApi.getStatus()
      updateStateFromServer(data)
    } catch (error) {
      console.error('加载修炼状态失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 从服务器响应更新本地状态
  const updateStateFromServer = (data: any) => {
    if (data.lastCultivationTime !== undefined) {
      lastCultivationTime.value = data.lastCultivationTime
    }
    if (data.currentCooldown !== undefined) {
      currentCooldown.value = data.currentCooldown
    }
    if (data.activityPoints !== undefined) {
      activityPoints.value = data.activityPoints
    }
    if (data.activityHistory !== undefined) {
      // 确保是对象
      activityHistory.value = typeof data.activityHistory === 'string'
        ? JSON.parse(data.activityHistory)
        : (data.activityHistory || {})
    }
    if (data.deepSession !== undefined) {
      deepSession.value = data.deepSession
    }
    if (data.lastDeepCultivationTime !== undefined) {
      lastDeepCultivationTime.value = data.lastDeepCultivationTime
    }
    if (data.poisonStacks !== undefined) {
      // 确保是数组
      if (Array.isArray(data.poisonStacks)) {
        poisonStacks.value = data.poisonStacks
      } else if (typeof data.poisonStacks === 'string') {
        poisonStacks.value = JSON.parse(data.poisonStacks)
      } else {
        poisonStacks.value = []
      }
    }
    if (data.peaceMode !== undefined) {
      peaceMode.value = data.peaceMode
    }
  }

  // 执行闭关修炼
  const startCultivation = async (): Promise<CultivationExecuteResult | null> => {
    if (!canCultivate.value) {
      return null
    }

    isCultivating.value = true

    try {
      const { data } = await cultivationApi.start()

      updateStateFromServer(data)

      lastResult.value = data.result
      showResultModal.value = true

      // 如果发生了突破，刷新角色信息
      if (data.result?.breakthrough) {
        await playerStore.fetchStats()
      }

      return data.result
    } catch (error: any) {
      console.error('闭关修炼失败:', error)
      return null
    } finally {
      isCultivating.value = false
    }
  }

  // 开始深度闭关
  const startDeepCultivation = async (): Promise<boolean> => {
    if (!canStartDeepCultivation.value) {
      return false
    }

    try {
      const { data } = await cultivationApi.startDeep()
      updateStateFromServer(data)
      return true
    } catch (error) {
      console.error('开始深度闭关失败:', error)
      return false
    }
  }

  // 结束深度闭关
  const finishDeepCultivation = async (forceExit: boolean = false): Promise<DeepCultivationResult | null> => {
    try {
      const { data } = await cultivationApi.finishDeep(forceExit)

      updateStateFromServer(data)

      deepResult.value = data.result
      showDeepResultModal.value = true

      // 如果发生了突破，刷新角色信息
      if (data.result?.breakthrough) {
        await playerStore.fetchStats()
      }

      return data.result
    } catch (error) {
      console.error('结束深度闭关失败:', error)
      return null
    }
  }

  // 强行出关
  const forceExitDeepCultivation = (): Promise<DeepCultivationResult | null> => {
    return finishDeepCultivation(true)
  }

  // 切换和平模式
  const togglePeaceMode = async (): Promise<boolean> => {
    if (!canTogglePeaceMode.value) {
      return false
    }

    try {
      const { data } = await cultivationApi.togglePeaceMode()
      peaceMode.value = data.peaceMode
      return true
    } catch (error) {
      console.error('切换和平模式失败:', error)
      return false
    }
  }

  // 清除所有丹毒（使用清灵丹）
  const clearAllPoison = async (): Promise<boolean> => {
    try {
      await cultivationApi.clearPoison()
      poisonStacks.value = []
      return true
    } catch (error) {
      console.error('清除丹毒失败:', error)
      return false
    }
  }

  // 处理上线（被动修炼结算）
  const handleOnline = async (): Promise<void> => {
    try {
      const { data } = await cultivationApi.handleOnline()

      updateStateFromServer(data)

      if (data.passiveExp && data.passiveExp > 0) {
        passiveResult.value = {
          exp: data.passiveExp,
          duration: data.offlineDuration || 0
        }
        showPassiveResultModal.value = true
      }
    } catch (error) {
      console.error('处理上线失败:', error)
    }
  }

  // 获取活跃度来源的剩余次数
  const getActivityRemaining = (sourceId: string): number => {
    const source = ACTIVITY_SOURCES.find(s => s.id === sourceId)
    if (!source) return 0
    const currentCount = activityHistory.value[sourceId] || 0
    return Math.max(0, source.dailyLimit - currentCount)
  }

  // 关闭结果弹窗
  const closeResultModal = () => {
    showResultModal.value = false
  }

  const closeDeepResultModal = () => {
    showDeepResultModal.value = false
  }

  const closePassiveResultModal = () => {
    showPassiveResultModal.value = false
  }

  // 初始化
  const init = async () => {
    await loadFromServer()
    // 处理上线结算
    await handleOnline()

    // 检查深度闭关是否已结束
    if (deepSession.value?.isActive && deepSession.value.endTime <= Date.now()) {
      await finishDeepCultivation()
    }
  }

  return {
    // 状态
    lastCultivationTime,
    currentCooldown,
    activityPoints,
    activityHistory,
    isCultivating,
    lastResult,
    showResultModal,
    deepSession,
    lastDeepCultivationTime,
    deepResult,
    showDeepResultModal,
    poisonStacks,
    peaceMode,
    passiveResult,
    showPassiveResultModal,
    loading,

    // 计算属性
    daoHeart,
    totalPoisonStacks,
    cultivationRates,
    cooldownStatus,
    canCultivate,
    deepCooldownStatus,
    canStartDeepCultivation,
    deepSessionRemainingTime,
    canTogglePeaceMode,

    // 常量
    CULTIVATION_COOLDOWN_MIN,
    CULTIVATION_COOLDOWN_MAX,
    DEEP_CULTIVATION_DURATION,
    DEEP_CULTIVATION_COOLDOWN,
    ACTIVITY_SOURCES,
    POISON_CONFIG,

    // 方法
    loadFromServer,
    startCultivation,
    startDeepCultivation,
    finishDeepCultivation,
    forceExitDeepCultivation,
    getActivityRemaining,
    clearAllPoison,
    togglePeaceMode,
    handleOnline,
    closeResultModal,
    closeDeepResultModal,
    closePassiveResultModal,
    init
  }
})
