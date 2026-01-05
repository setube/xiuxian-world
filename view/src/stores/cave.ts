import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { caveApi } from '@/api'

// 灵脉信息
export interface SpiritVeinInfo {
  level: number
  maxLevel: number
  currentEnergy: number
  pendingEnergy: number
  maxStorage: number
  productionPerHour: number
  canUpgrade: boolean
  upgradeCost?: { spiritStones: number; items?: { itemId: string; quantity: number }[] }
}

// 静室信息
export interface MeditationChamberInfo {
  level: number
  maxLevel: number
  conversionRate: number
  maxConversionPerHour: number
  pendingExp: number
  canUpgrade: boolean
  upgradeCost?: { spiritStones: number; items?: { itemId: string; quantity: number }[] }
}

// 宝物展示槽
export interface TreasureSlot {
  slot: number
  inventoryItemId: string
  itemId: string
  itemName: string
  displayedAt: number
}

// 当前访客
export interface CurrentVisitor {
  name: string
  description: string
  expiresAt: number
  remainingSeconds: number
}

// 访客结果
export interface VisitorResult {
  outcomeType: string
  description: string
  rewards?: {
    spiritStones?: number
    exp?: number
    items?: { itemId: string; quantity: number; itemName: string }[]
  }
  penalties?: {
    debuff?: { type: string; duration: number }
  }
}

// 洞府统计
export interface CaveStats {
  totalVisitorsReceived: number
  totalVisitorsExpelled: number
  totalGuestMessages: number
  totalPlayerVisits: number
}

// 洞府信息
export interface CaveInfo {
  id: string
  spiritVein: SpiritVeinInfo
  meditationChamber: MeditationChamberInfo
  treasureDisplay: TreasureSlot[]
  displayedSceneries: string[]
  currentVisitor?: CurrentVisitor
  stats: CaveStats
  createdAt: Date
}

// 景观配置
export interface SceneryConfig {
  id: string
  name: string
  description: string
  rarity: string
  condition: {
    type: string
    tier?: number
    subTier?: number
    minLevel?: number
    minCount?: number
    minExp?: number
  }
  isDisplayed?: boolean
}

// 景观画廊
export interface SceneryGallery {
  unlocked: (SceneryConfig & { isDisplayed: boolean })[]
  locked: SceneryConfig[]
}

// 拜访洞府结果
export interface CaveVisitResult {
  ownerName: string
  spiritVeinLevel: number
  meditationChamberLevel: number
  displayedSceneries: { id: string; name: string; description: string }[]
  treasureDisplay: { slot: number; itemName: string; itemId: string }[]
  stats: {
    totalPlayerVisits: number
    totalGuestMessages: number
  }
}

// 留言
export interface GuestMessage {
  id: string
  visitorName: string
  content: string
  createdAt: number
  isRead: boolean
}

// 访客日志
export interface VisitorLog {
  id: string
  visitorType: string
  visitorName: string
  action: string
  result?: VisitorResult
  visitedAt: number
}

export const useCaveStore = defineStore('cave', () => {
  // 状态
  const hasCave = ref(false)
  const cave = ref<CaveInfo | null>(null)
  const sceneryGallery = ref<SceneryGallery | null>(null)
  const messages = ref<GuestMessage[]>([])
  const messagesTotal = ref(0)
  const visitorLogs = ref<VisitorLog[]>([])
  const visitorLogsTotal = ref(0)
  const loading = ref(false)
  const actionLoading = ref(false)

  // 计算属性
  const spiritVein = computed(() => cave.value?.spiritVein || null)
  const meditationChamber = computed(() => cave.value?.meditationChamber || null)
  const treasureDisplay = computed(() => cave.value?.treasureDisplay || [])
  const displayedSceneries = computed(() => cave.value?.displayedSceneries || [])
  const currentVisitor = computed(() => cave.value?.currentVisitor || null)
  const stats = computed(() => cave.value?.stats || null)

  const unlockedSceneries = computed(() => sceneryGallery.value?.unlocked || [])
  const lockedSceneries = computed(() => sceneryGallery.value?.locked || [])

  const hasPendingEnergy = computed(() => (spiritVein.value?.pendingEnergy || 0) > 0)
  const hasPendingExp = computed(() => (meditationChamber.value?.pendingExp || 0) > 0)
  const hasVisitor = computed(() => currentVisitor.value !== null)
  const unreadMessagesCount = computed(() => messages.value.filter(m => !m.isRead).length)

  // ==================== 获取数据 ====================

  // 检查是否可以开辟洞府
  const checkCanOpen = async () => {
    try {
      const { data } = await caveApi.canOpen()
      return data
    } catch {
      return { canOpen: false, reason: '检查失败' }
    }
  }

  // 获取洞府信息
  const fetchCaveInfo = async () => {
    loading.value = true
    try {
      const { data } = await caveApi.getInfo()
      hasCave.value = data.hasCave
      cave.value = data.cave || null
      return data
    } finally {
      loading.value = false
    }
  }

  // 获取景观画廊
  const fetchSceneryGallery = async () => {
    try {
      const { data } = await caveApi.getSceneryGallery()
      sceneryGallery.value = data
      return data
    } catch {
      return null
    }
  }

  // 获取留言列表
  const fetchMessages = async (page: number = 1) => {
    try {
      const { data } = await caveApi.getMessages(page)
      messages.value = data.messages
      messagesTotal.value = data.total
      return data
    } catch {
      return null
    }
  }

  // 获取访客记录
  const fetchVisitorLogs = async (page: number = 1) => {
    try {
      const { data } = await caveApi.getVisitorLogs(page)
      visitorLogs.value = data.logs
      visitorLogsTotal.value = data.total
      return data
    } catch {
      return null
    }
  }

  // ==================== 洞府管理 ====================

  // 开辟洞府
  const openCave = async () => {
    actionLoading.value = true
    try {
      const { data } = await caveApi.open()
      await fetchCaveInfo()
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // ==================== 灵脉系统 ====================

  // 收取灵气
  const harvestEnergy = async () => {
    actionLoading.value = true
    try {
      const { data } = await caveApi.harvestEnergy()
      await fetchCaveInfo()
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // 升级灵脉
  const upgradeSpiritVein = async () => {
    actionLoading.value = true
    try {
      const { data } = await caveApi.upgradeSpiritVein()
      await fetchCaveInfo()
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // ==================== 静室系统 ====================

  // 转化灵气为修为
  const convertEnergy = async () => {
    actionLoading.value = true
    try {
      const { data } = await caveApi.convertEnergy()
      await fetchCaveInfo()
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // 升级静室
  const upgradeMeditation = async () => {
    actionLoading.value = true
    try {
      const { data } = await caveApi.upgradeMeditation()
      await fetchCaveInfo()
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // ==================== 万宝阁 ====================

  // 上架物品
  const displayTreasure = async (inventoryItemId: string, slot: number) => {
    actionLoading.value = true
    try {
      const { data } = await caveApi.displayTreasure(inventoryItemId, slot)
      await fetchCaveInfo()
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // 取下物品
  const removeTreasure = async (slot: number) => {
    actionLoading.value = true
    try {
      const { data } = await caveApi.removeTreasure(slot)
      await fetchCaveInfo()
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // ==================== 景观系统 ====================

  // 布置/取消布置景观
  const toggleScenery = async (sceneryId: string) => {
    actionLoading.value = true
    try {
      const { data } = await caveApi.toggleScenery(sceneryId)
      await Promise.all([fetchCaveInfo(), fetchSceneryGallery()])
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // ==================== 访客系统 ====================

  // 接待访客
  const receiveVisitor = async (): Promise<VisitorResult> => {
    actionLoading.value = true
    try {
      const { data } = await caveApi.receiveVisitor()
      await fetchCaveInfo()
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // 驱逐访客
  const expelVisitor = async (): Promise<VisitorResult> => {
    actionLoading.value = true
    try {
      const { data } = await caveApi.expelVisitor()
      await fetchCaveInfo()
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // ==================== 社交系统 ====================

  // 拜访他人洞府
  const visitCave = async (targetName: string): Promise<CaveVisitResult> => {
    actionLoading.value = true
    try {
      const { data } = await caveApi.visitCave(targetName)
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // 留言
  const leaveMessage = async (targetName: string, content: string) => {
    actionLoading.value = true
    try {
      const { data } = await caveApi.leaveMessage(targetName, content)
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // 标记留言已读
  const markMessageRead = async (messageId: string) => {
    try {
      await caveApi.markMessageRead(messageId)
      // 更新本地状态
      const msg = messages.value.find(m => m.id === messageId)
      if (msg) {
        msg.isRead = true
      }
    } catch {
      // 忽略错误
    }
  }

  // ==================== 辅助方法 ====================

  // 初始化（获取所有数据）
  const initialize = async () => {
    await fetchCaveInfo()
    if (hasCave.value) {
      await Promise.all([fetchSceneryGallery(), fetchMessages()])
    }
  }

  // 清空状态
  const clear = () => {
    hasCave.value = false
    cave.value = null
    sceneryGallery.value = null
    messages.value = []
    messagesTotal.value = 0
    visitorLogs.value = []
    visitorLogsTotal.value = 0
  }

  return {
    // 状态
    hasCave,
    cave,
    sceneryGallery,
    messages,
    messagesTotal,
    visitorLogs,
    visitorLogsTotal,
    loading,
    actionLoading,

    // 计算属性
    spiritVein,
    meditationChamber,
    treasureDisplay,
    displayedSceneries,
    currentVisitor,
    stats,
    unlockedSceneries,
    lockedSceneries,
    hasPendingEnergy,
    hasPendingExp,
    hasVisitor,
    unreadMessagesCount,

    // 方法
    checkCanOpen,
    fetchCaveInfo,
    fetchSceneryGallery,
    fetchMessages,
    fetchVisitorLogs,
    openCave,
    harvestEnergy,
    upgradeSpiritVein,
    convertEnergy,
    upgradeMeditation,
    displayTreasure,
    removeTreasure,
    toggleScenery,
    receiveVisitor,
    expelVisitor,
    visitCave,
    leaveMessage,
    markMessageRead,
    initialize,
    clear
  }
})
