/**
 * 血魂幡系统 Pinia Store
 * 管理血魂幡、煞气池、魂魄储备、炼化槽、PvE系统的状态
 */
import { defineStore } from 'pinia'
import { bloodSoulBannerApi, extractErrorMessage } from '@/api'

// ========== 类型定义 ==========

export interface BannerStatus {
  level: number
  slots: number
  maxSoulGrade: number
  nextUpgradeCost: number | null
  canUpgrade: boolean
  stability: number // 稳定度
  upgradeProgress?: {
    current: number
    required: number
  }
}

export interface ShaPoolStatus {
  current: number
  max: number
  bonusPercent: number
  canSacrifice: boolean
  sacrificeCooldown: number
  dailyConverted: number
  dailyConvertLimit: number
  killCountBonus: number // 杀戮加成
}

export interface SoulStorageStatus {
  souls: Record<string, { count: number; name: string; grade: number }>
}

export interface RefinementSlotInfo {
  slotIndex: number
  status: 'empty' | 'refining' | 'complete'
  soulType: string | null
  soulName: string | null
  stability: number
  progress: number
  remainingMs: number
  canCollect: boolean
  needsMaintenance: boolean
}

export interface RefinementResult {
  success: boolean
  outputs: { itemId: string; itemName: string; quantity: number }[]
  message: string
}

export interface BloodForestStatus {
  canRaid: boolean
  dailyRemaining: number
  dailyLimit: number
  shaCost: number
  minRealm: number
}

export interface RaidResult {
  success: boolean
  victory: boolean
  enemy: { name: string; power: number }
  rewards: {
    spiritStones: number
    souls: { type: string; name: string; count: number }[]
    materials: { itemId: string; name: string; count: number }[]
  }
  message: string
}

export interface ShadowSummonStatus {
  canSummon: boolean
  dailyRemaining: number
  dailyLimit: number
  sacrificeRequired: { itemId: string; itemName: string; quantity: number }
  hasSacrifice: boolean
  minRealm: number
}

export interface SummonResult {
  success: boolean
  victory: boolean
  boss: { name: string; power: number }
  rewards: {
    spiritStones: number
    souls: { type: string; name: string; count: number }[]
    materials: { itemId: string; name: string; count: number }[]
  }
  message: string
}

// ========== Store定义 ==========

interface BloodSoulBannerState {
  // 血魂幡状态
  bannerStatus: BannerStatus | null
  // 煞气池状态
  shaPoolStatus: ShaPoolStatus | null
  // 魂魄储备
  soulStorage: SoulStorageStatus | null
  // 炼化槽列表
  refinementSlots: RefinementSlotInfo[]
  // 血洗山林状态
  bloodForestStatus: BloodForestStatus | null
  // 召唤魔影状态
  shadowSummonStatus: ShadowSummonStatus | null
  // 是否已解锁血魂幡
  bannerUnlocked: boolean
  // 加载状态
  loading: boolean
  // 错误信息
  error: string | null
  // 上次刷新时间
  lastRefresh: number
}

export const useBloodSoulBannerStore = defineStore('bloodSoulBanner', {
  state: (): BloodSoulBannerState => ({
    bannerStatus: null,
    shaPoolStatus: null,
    soulStorage: null,
    refinementSlots: [],
    bloodForestStatus: null,
    shadowSummonStatus: null,
    bannerUnlocked: false,
    loading: false,
    error: null,
    lastRefresh: 0
  }),

  getters: {
    // 是否已解锁血魂幡
    isUnlocked(): boolean {
      return this.bannerUnlocked
    },

    // 血魂幡等级
    bannerLevel(): number {
      return this.bannerStatus?.level ?? 0
    },

    // 当前煞气
    currentSha(): number {
      return this.shaPoolStatus?.current ?? 0
    },

    // 最大煞气
    maxSha(): number {
      return this.shaPoolStatus?.max ?? 100
    },

    // 是否可以献祭
    canSacrifice(): boolean {
      return this.shaPoolStatus?.canSacrifice ?? false
    },

    // 是否可以血洗山林
    canRaidForest(): boolean {
      return this.bloodForestStatus?.canRaid ?? false
    },

    // 是否可以召唤魔影
    canSummon(): boolean {
      return this.shadowSummonStatus?.canSummon ?? false
    },

    // 可用炼化槽数量
    availableSlots(): number {
      return this.refinementSlots.filter(s => s.status === 'empty').length
    },

    // 炼化中槽位数量
    refiningSlots(): number {
      return this.refinementSlots.filter(s => s.status === 'refining').length
    },

    // 可收取槽位数量
    collectableSlots(): number {
      return this.refinementSlots.filter(s => s.canCollect).length
    },

    // 总魂魄数量
    totalSouls(): number {
      if (!this.soulStorage?.souls) return 0
      return Object.values(this.soulStorage.souls).reduce((sum, soul) => sum + soul.count, 0)
    }
  },

  actions: {
    /**
     * 获取血魂幡状态
     */
    async fetchBannerStatus(force = false) {
      if (!force && Date.now() - this.lastRefresh < 5000) return

      this.loading = true
      this.error = null

      try {
        const response = await bloodSoulBannerApi.getStatus()
        this.bannerStatus = response.data as BannerStatus
        this.bannerUnlocked = true
        this.lastRefresh = Date.now()
      } catch (error: unknown) {
        // 检查是否是"未解锁"错误
        const err = error as { response?: { data?: { code?: number } } }
        if (err.response?.data?.code === 30201) {
          // HEISHA_BANNER_NOT_UNLOCKED
          this.bannerUnlocked = false
          this.error = null
        } else {
          this.error = extractErrorMessage(error, '获取血魂幡状态失败')
        }
      } finally {
        this.loading = false
      }
    },

    /**
     * 升级血魂幡
     */
    async upgradeBanner(): Promise<{ success: boolean; newLevel: number; message: string }> {
      this.loading = true
      try {
        const response = await bloodSoulBannerApi.upgrade()
        const result = response.data as { success: boolean; newLevel: number; message: string }
        await this.fetchBannerStatus(true)
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 获取煞气池状态
     */
    async fetchShaPoolStatus() {
      try {
        const response = await bloodSoulBannerApi.getShaPoolStatus()
        this.shaPoolStatus = response.data as ShaPoolStatus
      } catch (error) {
        console.error('获取煞气池状态失败:', error)
      }
    },

    /**
     * 每日献祭
     */
    async dailySacrifice(): Promise<{ shaGained: number; totalSha: number; message: string }> {
      this.loading = true
      try {
        const response = await bloodSoulBannerApi.dailySacrifice()
        const result = response.data as { shaGained: number; totalSha: number; message: string }
        await this.fetchShaPoolStatus()
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 化功为煞
     */
    async convertCultivation(amount: number): Promise<{ shaGained: number; cultivationUsed: number; message: string }> {
      this.loading = true
      try {
        const response = await bloodSoulBannerApi.convertCultivation(amount)
        const result = response.data as { shaGained: number; cultivationUsed: number; message: string }
        await this.fetchShaPoolStatus()
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 获取魂魄储备
     */
    async fetchSoulStorage() {
      try {
        const response = await bloodSoulBannerApi.getSoulStorage()
        this.soulStorage = response.data as SoulStorageStatus
      } catch (error) {
        console.error('获取魂魄储备失败:', error)
      }
    },

    /**
     * 获取炼化槽列表
     */
    async fetchRefinementSlots() {
      try {
        const response = await bloodSoulBannerApi.getRefinementSlots()
        this.refinementSlots = response.data as RefinementSlotInfo[]
      } catch (error) {
        console.error('获取炼化槽失败:', error)
      }
    },

    /**
     * 开始炼化（囚禁魂魄）
     */
    async startRefinement(slotIndex: number, soulType: string): Promise<{ success: boolean; message: string }> {
      this.loading = true
      try {
        const response = await bloodSoulBannerApi.startRefinement(slotIndex, soulType)
        const result = response.data as { success: boolean; message: string }
        await this.fetchRefinementSlots()
        await this.fetchSoulStorage()
        await this.fetchShaPoolStatus()
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 安抚幡灵（维护槽位）
     */
    async maintainSlot(slotIndex: number): Promise<{ success: boolean; newStability: number; message: string }> {
      this.loading = true
      try {
        const response = await bloodSoulBannerApi.maintainSlot(slotIndex)
        const result = response.data as { success: boolean; newStability: number; message: string }
        await this.fetchRefinementSlots()
        await this.fetchShaPoolStatus()
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 收取精华（收取炼化产物）
     */
    async collectRefinement(slotIndex: number): Promise<RefinementResult> {
      this.loading = true
      try {
        const response = await bloodSoulBannerApi.collectRefinement(slotIndex)
        const result = response.data as RefinementResult
        await this.fetchRefinementSlots()
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 获取血洗山林状态
     */
    async fetchBloodForestStatus() {
      try {
        const response = await bloodSoulBannerApi.getBloodForestStatus()
        this.bloodForestStatus = response.data as BloodForestStatus
      } catch (error) {
        console.error('获取血洗山林状态失败:', error)
      }
    },

    /**
     * 血洗山林
     */
    async raidBloodForest(): Promise<RaidResult> {
      this.loading = true
      try {
        const response = await bloodSoulBannerApi.raidBloodForest()
        const result = response.data as RaidResult
        await this.fetchBloodForestStatus()
        await this.fetchShaPoolStatus()
        await this.fetchSoulStorage()
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 获取召唤魔影状态
     */
    async fetchShadowSummonStatus() {
      try {
        const response = await bloodSoulBannerApi.getShadowSummonStatus()
        this.shadowSummonStatus = response.data as ShadowSummonStatus
      } catch (error) {
        console.error('获取召唤魔影状态失败:', error)
      }
    },

    /**
     * 召唤魔影
     */
    async summonShadow(): Promise<SummonResult> {
      this.loading = true
      try {
        const response = await bloodSoulBannerApi.summonShadow()
        const result = response.data as SummonResult
        await this.fetchShadowSummonStatus()
        await this.fetchSoulStorage()
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 刷新所有状态
     */
    async refreshAll(force = false) {
      if (!force && Date.now() - this.lastRefresh < 5000) return

      this.loading = true
      try {
        await Promise.all([
          this.fetchBannerStatus(force),
          this.fetchShaPoolStatus(),
          this.fetchSoulStorage(),
          this.fetchRefinementSlots(),
          this.fetchBloodForestStatus(),
          this.fetchShadowSummonStatus()
        ])
        this.lastRefresh = Date.now()
      } finally {
        this.loading = false
      }
    }
  }
})
