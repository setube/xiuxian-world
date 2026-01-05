import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { diplomacyApi, extractErrorMessage } from '@/api'
import { useSectStore } from './sect'
import { SECTS } from '@/game/constants/sects'

// ==================== 类型定义 ====================

export type DiplomacyStatus = 'friendly' | 'hostile' | 'allied' | 'neutral'

export interface DiplomacyRelation {
  sectId: string
  sectName: string
  status: DiplomacyStatus
  lastChangedAt: number | null
  canChange: boolean
  cooldownRemainingMs: number | null
}

export interface PendingAllianceRequest {
  fromSectId: string
  fromSectName: string
  proposedAt: number
  expiresAt: number
  remainingMs: number
}

export interface MasterInfo {
  sectId: string
  sectName: string
  masterId: string | null
  masterName: string | null
  masterExperience: number | null
  masterRealmTier: number | null
  masterRealmSubTier: number | null
  updatedAt: number
}

export interface WorldSituationItem {
  sourceSectId: string
  sourceSectName: string
  targetSectId: string
  targetSectName: string
  status: 'allied' | 'hostile'
  createdAt: number
}

export interface WorldSituation {
  alliances: WorldSituationItem[]
  hostilities: WorldSituationItem[]
  lastUpdated: number
}

// 外交状态配置
export const DIPLOMACY_STATUS_CONFIG: Record<DiplomacyStatus, { name: string; description: string; color: string; icon: string }> = {
  friendly: {
    name: '友好',
    description: '善意为先，战利品掉落几率降低5%',
    color: '#22c55e',
    icon: 'Heart'
  },
  hostile: {
    name: '敌对',
    description: '战意高涨，额外夺取15%修为与15%宗门贡献',
    color: '#ef4444',
    icon: 'Swords'
  },
  allied: {
    name: '结盟',
    description: '盟友的祝福，斗法时基础战力永久提升5%',
    color: '#3b82f6',
    icon: 'Handshake'
  },
  neutral: {
    name: '中立',
    description: '公事公办，无特殊影响',
    color: '#9ca3af',
    icon: 'Minus'
  }
}

export const useDiplomacyStore = defineStore('diplomacy', () => {
  const sectStore = useSectStore()

  // ==================== 状态 ====================
  const isMaster = ref(false)
  const masterId = ref<string | null>(null)
  const masterName = ref<string | null>(null)
  const sectId = ref<string | null>(null)
  const sectName = ref<string | null>(null)
  const hasAnyAlliance = ref(false)
  const alliancePenaltyUntil = ref<number | null>(null)
  const relations = ref<DiplomacyRelation[]>([])
  const incomingRelations = ref<DiplomacyRelation[]>([])
  const pendingAllianceRequests = ref<PendingAllianceRequest[]>([])
  const allMasters = ref<MasterInfo[]>([])
  const worldSituation = ref<WorldSituation | null>(null)
  const loading = ref(false)

  // ==================== 计算属性 ====================

  // 是否在背盟惩罚期
  const isInAlliancePenalty = computed(() => {
    if (!alliancePenaltyUntil.value) return false
    return Date.now() < alliancePenaltyUntil.value
  })

  // 背盟惩罚剩余时间
  const alliancePenaltyRemaining = computed(() => {
    if (!alliancePenaltyUntil.value) return null
    const remaining = alliancePenaltyUntil.value - Date.now()
    if (remaining <= 0) return null

    const hours = Math.floor(remaining / 3600000)
    const minutes = Math.floor((remaining % 3600000) / 60000)
    return `${hours}小时${minutes}分钟`
  })

  // 盟友列表
  const allies = computed(() => {
    return relations.value.filter(r => r.status === 'allied')
  })

  // 敌对列表
  const enemies = computed(() => {
    return relations.value.filter(r => r.status === 'hostile')
  })

  // 友好列表
  const friends = computed(() => {
    return relations.value.filter(r => r.status === 'friendly')
  })

  // 可以发起外交的宗门（非自己宗门）
  const otherSects = computed(() => {
    if (!sectId.value) return []
    return Object.values(SECTS).filter(s => s.id !== sectId.value)
  })

  // ==================== 方法 ====================

  // 获取外交状态
  const fetchStatus = async () => {
    if (!sectStore.hasSect) return

    loading.value = true

    try {
      const { data } = await diplomacyApi.getStatus()

      isMaster.value = data.isMaster
      masterId.value = data.masterId
      masterName.value = data.masterName
      sectId.value = data.sectId
      sectName.value = data.sectName
      hasAnyAlliance.value = data.hasAnyAlliance
      alliancePenaltyUntil.value = data.alliancePenaltyUntil
      relations.value = data.relations || []
      incomingRelations.value = data.incomingRelations || []
      pendingAllianceRequests.value = data.pendingAllianceRequests || []
    } catch (error) {
      console.error('获取外交状态失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 获取所有掌门
  const fetchAllMasters = async () => {
    loading.value = true

    try {
      const { data } = await diplomacyApi.getAllMasters()
      allMasters.value = data || []
    } catch (error) {
      console.error('获取掌门列表失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 获取天下大势
  const fetchWorldSituation = async () => {
    loading.value = true

    try {
      const { data } = await diplomacyApi.getWorldSituation()
      worldSituation.value = data
    } catch (error) {
      console.error('获取天下大势失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 设置友好关系
  const setFriendly = async (targetSectId: string): Promise<{ success: boolean; message: string }> => {
    if (!isMaster.value) {
      return { success: false, message: '只有掌门才能进行外交操作' }
    }

    loading.value = true

    try {
      const { data } = await diplomacyApi.setFriendly(targetSectId)
      await fetchStatus()
      return { success: true, message: data.message || '已设置为友好关系' }
    } catch (error) {
      console.error('设置友好失败:', error)
      return { success: false, message: extractErrorMessage(error, '操作失败') }
    } finally {
      loading.value = false
    }
  }

  // 设置敌对关系
  const setHostile = async (targetSectId: string): Promise<{ success: boolean; message: string }> => {
    if (!isMaster.value) {
      return { success: false, message: '只有掌门才能进行外交操作' }
    }

    loading.value = true

    try {
      const { data } = await diplomacyApi.setHostile(targetSectId)
      await fetchStatus()
      return { success: true, message: data.message || '已设置为敌对关系' }
    } catch (error) {
      console.error('设置敌对失败:', error)
      return { success: false, message: extractErrorMessage(error, '操作失败') }
    } finally {
      loading.value = false
    }
  }

  // 发起结盟请求
  const proposeAlliance = async (targetSectId: string): Promise<{ success: boolean; message: string }> => {
    if (!isMaster.value) {
      return { success: false, message: '只有掌门才能进行外交操作' }
    }

    if (isInAlliancePenalty.value) {
      return { success: false, message: `背盟惩罚期间无法结盟，剩余${alliancePenaltyRemaining.value}` }
    }

    loading.value = true

    try {
      const { data } = await diplomacyApi.proposeAlliance(targetSectId)
      await fetchStatus()
      return { success: true, message: data.message || '结盟请求已发送' }
    } catch (error) {
      console.error('发起结盟失败:', error)
      return { success: false, message: extractErrorMessage(error, '操作失败') }
    } finally {
      loading.value = false
    }
  }

  // 接受结盟请求
  const acceptAlliance = async (fromSectId: string): Promise<{ success: boolean; message: string }> => {
    if (!isMaster.value) {
      return { success: false, message: '只有掌门才能进行外交操作' }
    }

    loading.value = true

    try {
      const { data } = await diplomacyApi.acceptAlliance(fromSectId)
      await fetchStatus()
      return { success: true, message: data.message || '结盟成功' }
    } catch (error) {
      console.error('接受结盟失败:', error)
      return { success: false, message: extractErrorMessage(error, '操作失败') }
    } finally {
      loading.value = false
    }
  }

  // 解除关系
  const cancelRelation = async (targetSectId: string): Promise<{ success: boolean; message: string }> => {
    if (!isMaster.value) {
      return { success: false, message: '只有掌门才能进行外交操作' }
    }

    loading.value = true

    try {
      const { data } = await diplomacyApi.cancelRelation(targetSectId)
      await fetchStatus()
      return { success: true, message: data.message || '已解除关系' }
    } catch (error) {
      console.error('解除关系失败:', error)
      return { success: false, message: extractErrorMessage(error, '操作失败') }
    } finally {
      loading.value = false
    }
  }

  // 获取与指定宗门的关系
  const getRelationWith = (targetSectId: string): DiplomacyRelation | null => {
    return relations.value.find(r => r.sectId === targetSectId) || null
  }

  // 获取指定宗门对我方的态度
  const getIncomingRelationFrom = (sourceSectId: string): DiplomacyRelation | null => {
    return incomingRelations.value.find(r => r.sectId === sourceSectId) || null
  }

  // 格式化冷却时间
  const formatCooldown = (ms: number | null): string => {
    if (!ms || ms <= 0) return ''
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    return `${hours}时${minutes}分`
  }

  // 初始化
  const init = async () => {
    if (sectStore.hasSect) {
      await Promise.all([fetchStatus(), fetchAllMasters()])
    }
  }

  // 处理Socket事件：结盟请求
  const handleAllianceRequest = (data: { fromSectId: string; fromSectName: string; expiresAt: number }) => {
    // 添加到待处理列表
    pendingAllianceRequests.value.push({
      fromSectId: data.fromSectId,
      fromSectName: data.fromSectName,
      proposedAt: Date.now(),
      expiresAt: data.expiresAt,
      remainingMs: data.expiresAt - Date.now()
    })
  }

  // 处理Socket事件：全服公告
  const handleDiplomacyAnnouncement = (data: { type: string; message: string; sectIds?: string[]; timestamp: number }) => {
    // 如果涉及本宗门，刷新数据
    if (data.sectIds?.includes(sectId.value || '')) {
      fetchStatus()
    }
  }

  return {
    // 状态
    isMaster,
    masterId,
    masterName,
    sectId,
    sectName,
    hasAnyAlliance,
    alliancePenaltyUntil,
    relations,
    incomingRelations,
    pendingAllianceRequests,
    allMasters,
    worldSituation,
    loading,

    // 计算属性
    isInAlliancePenalty,
    alliancePenaltyRemaining,
    allies,
    enemies,
    friends,
    otherSects,

    // 常量
    DIPLOMACY_STATUS_CONFIG,

    // 方法
    fetchStatus,
    fetchAllMasters,
    fetchWorldSituation,
    setFriendly,
    setHostile,
    proposeAlliance,
    acceptAlliance,
    cancelRelation,
    getRelationWith,
    getIncomingRelationFrom,
    formatCooldown,
    init,
    handleAllianceRequest,
    handleDiplomacyAnnouncement
  }
})
