/**
 * 万灵宗灵兽养成 Pinia Store
 * 管理灵兽养成、寻觅、偷菜系统的状态
 */
import { defineStore } from 'pinia'
import { wanlingApi, extractErrorMessage } from '@/api'

// ========== 类型定义 ==========

export interface SpiritBeastInfo {
  id: string
  templateId: string
  name: string
  customName?: string
  rarity: string
  level: number
  exp: number
  expToNextLevel: number
  stats: {
    attack: number
    defense: number
    speed: number
    hp: number
    currentHp: number
  }
  satiety: number
  loyalty: number
  status: 'idle' | 'deployed' | 'resting' | 'injured' | 'raiding'
  deployedAt?: number
  injuredUntil?: number
  skills: string[]
  canEvolve: boolean
  evolveInfo?: {
    targetId: string
    targetName: string
    requiredLevel: number
    requiredItems: { itemId: string; itemName: string; count: number; owned: number }[]
  }
}

export interface WanlingStatus {
  isMember: boolean
  realm: number
  beasts: SpiritBeastInfo[]
  maxBeasts: number
  deployedBeast: SpiritBeastInfo | null
  search: {
    canSearch: boolean
    cooldownMs: number
    dailySearches: number
    maxDailySearches: number
  }
  raid: {
    canRaid: boolean
    cooldownMs: number
    dailyRaids: number
    maxDailyRaids: number
  }
}

export interface SearchResult {
  success: boolean
  message: string
  beast?: SpiritBeastInfo
}

export interface FeedResult {
  success: boolean
  message: string
  expGain: number
  satietyGain: number
  loyaltyGain: number
  levelUp: boolean
  newLevel?: number
}

export interface RaidResult {
  success: boolean
  message: string
  targetName: string
  rewards: { itemId: string; itemName: string; count: number }[]
  beastInjured: boolean
  loyaltyChange: number
}

export interface RaidTarget {
  id: string
  name: string
  realm: number
  realmName: string
}

export interface RaidHistoryItem {
  id: string
  raiderName: string
  beastName: string
  targetName: string
  success: boolean
  rewards: { itemId: string; itemName: string; count: number }[]
  beastInjured: boolean
  loyaltyChange: number
  createdAt: string
}

export interface EvolveResult {
  success: boolean
  message: string
  oldBeast: { templateId: string; name: string }
  newBeast: SpiritBeastInfo
}

// ========== 常量配置 ==========

// 稀有度配置
export const BEAST_RARITY_CONFIG = {
  common: { name: '普通', color: '#9ca3af' },
  uncommon: { name: '精良', color: '#22c55e' },
  rare: { name: '稀有', color: '#3b82f6' },
  epic: { name: '史诗', color: '#a855f7' },
  legendary: { name: '传说', color: '#f59e0b' }
} as const

// 喂养食物配置
export const BEAST_FOODS = {
  food_spirit_grass: { name: '灵草', expGain: 10, cost: 50 },
  food_beast_pellet: { name: '灵兽丹', expGain: 50, cost: 200 },
  food_blood_essence: { name: '精血丹', expGain: 100, cost: 500 },
  food_dragon_marrow: { name: '龙髓丹', expGain: 300, cost: 2000 }
} as const

// 忠诚度等级
export const LOYALTY_LEVELS = {
  hostile: { min: 0, max: 19, name: '敌视', color: '#ef4444' },
  unfriendly: { min: 20, max: 39, name: '冷淡', color: '#f97316' },
  neutral: { min: 40, max: 59, name: '中立', color: '#eab308' },
  friendly: { min: 60, max: 79, name: '友好', color: '#22c55e' },
  devoted: { min: 80, max: 100, name: '忠诚', color: '#3b82f6' }
} as const

// ========== Store定义 ==========

interface WanlingState {
  // 是否是万灵宗弟子
  isMember: boolean
  // 灵兽列表
  beasts: SpiritBeastInfo[]
  // 灵兽最大数量
  maxBeasts: number
  // 当前出战灵兽
  deployedBeast: SpiritBeastInfo | null
  // 寻觅状态
  searchStatus: WanlingStatus['search'] | null
  // 偷菜状态
  raidStatus: WanlingStatus['raid'] | null
  // 偷菜目标列表
  raidTargets: RaidTarget[]
  // 偷菜历史
  raidHistory: RaidHistoryItem[]
  // 加载状态
  loading: boolean
  // 错误信息
  error: string | null
  // 上次刷新时间
  lastRefresh: number
}

export const useWanlingStore = defineStore('wanling', {
  state: (): WanlingState => ({
    isMember: false,
    beasts: [],
    maxBeasts: 3,
    deployedBeast: null,
    searchStatus: null,
    raidStatus: null,
    raidTargets: [],
    raidHistory: [],
    loading: false,
    error: null,
    lastRefresh: 0
  }),

  getters: {
    // 是否可以寻觅灵兽
    canSearch(): boolean {
      return this.searchStatus?.canSearch ?? false
    },

    // 是否可以偷菜
    canRaid(): boolean {
      return this.raidStatus?.canRaid ?? false
    },

    // 是否有出战灵兽
    hasDeployedBeast(): boolean {
      return this.deployedBeast !== null
    },

    // 灵兽是否已满
    isBeastFull(): boolean {
      return this.beasts.length >= this.maxBeasts
    },

    // 获取灵兽显示名
    getBeastDisplayName: () => (beast: SpiritBeastInfo) => {
      return beast.customName || beast.name
    },

    // 获取稀有度配置
    getRarityConfig: () => (rarity: string) => {
      return BEAST_RARITY_CONFIG[rarity as keyof typeof BEAST_RARITY_CONFIG] || BEAST_RARITY_CONFIG.common
    },

    // 获取忠诚度等级
    getLoyaltyLevel: () => (loyalty: number) => {
      for (const [, config] of Object.entries(LOYALTY_LEVELS)) {
        if (loyalty >= config.min && loyalty <= config.max) {
          return config
        }
      }
      return LOYALTY_LEVELS.neutral
    }
  },

  actions: {
    /**
     * 获取万灵宗完整状态
     */
    async fetchStatus(force = false) {
      // 5秒内不重复刷新
      if (!force && Date.now() - this.lastRefresh < 5000) return

      this.loading = true
      this.error = null

      try {
        const response = await wanlingApi.getStatus()
        const status = response.data as WanlingStatus

        this.isMember = status.isMember
        this.beasts = status.beasts
        this.maxBeasts = status.maxBeasts
        this.deployedBeast = status.deployedBeast
        this.searchStatus = status.search
        this.raidStatus = status.raid
        this.lastRefresh = Date.now()
      } catch (error) {
        this.error = extractErrorMessage(error, '获取万灵宗状态失败')
      } finally {
        this.loading = false
      }
    },

    /**
     * 寻觅灵兽
     */
    async searchBeast(): Promise<SearchResult> {
      this.loading = true
      try {
        const response = await wanlingApi.searchBeast()
        const result = response.data as SearchResult
        await this.fetchStatus(true)
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 喂养灵兽
     */
    async feedBeast(beastId: string, foodId: string): Promise<FeedResult> {
      this.loading = true
      try {
        const response = await wanlingApi.feedBeast(beastId, foodId)
        const result = response.data as FeedResult
        await this.fetchStatus(true)
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 出战灵兽
     */
    async deployBeast(beastId: string): Promise<SpiritBeastInfo> {
      this.loading = true
      try {
        const response = await wanlingApi.deployBeast(beastId)
        const result = response.data as SpiritBeastInfo
        await this.fetchStatus(true)
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 收回灵兽
     */
    async recallBeast(beastId: string): Promise<SpiritBeastInfo> {
      this.loading = true
      try {
        const response = await wanlingApi.recallBeast(beastId)
        const result = response.data as SpiritBeastInfo
        await this.fetchStatus(true)
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 灵兽休息
     */
    async restBeast(beastId: string): Promise<SpiritBeastInfo> {
      this.loading = true
      try {
        const response = await wanlingApi.restBeast(beastId)
        const result = response.data as SpiritBeastInfo
        await this.fetchStatus(true)
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 灵兽改名
     */
    async renameBeast(beastId: string, newName: string): Promise<SpiritBeastInfo> {
      this.loading = true
      try {
        const response = await wanlingApi.renameBeast(beastId, newName)
        const result = response.data as SpiritBeastInfo
        await this.fetchStatus(true)
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 放生灵兽
     */
    async releaseBeast(beastId: string): Promise<{ success: boolean; message: string }> {
      this.loading = true
      try {
        const response = await wanlingApi.releaseBeast(beastId)
        const result = response.data as { success: boolean; message: string }
        await this.fetchStatus(true)
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 进化灵兽
     */
    async evolveBeast(beastId: string): Promise<EvolveResult> {
      this.loading = true
      try {
        const response = await wanlingApi.evolveBeast(beastId)
        const result = response.data as EvolveResult
        await this.fetchStatus(true)
        return result
      } finally {
        this.loading = false
      }
    },

    // ========== 偷菜相关 ==========

    /**
     * 获取偷菜目标列表
     */
    async fetchRaidTargets() {
      try {
        const response = await wanlingApi.getRaidTargets()
        this.raidTargets = response.data as RaidTarget[]
      } catch (error) {
        console.error('获取偷菜目标失败:', error)
      }
    },

    /**
     * 执行偷菜
     */
    async raidGarden(targetId: string): Promise<RaidResult> {
      this.loading = true
      try {
        const response = await wanlingApi.raidGarden(targetId)
        const result = response.data as RaidResult
        await this.fetchStatus(true)
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 获取偷菜历史
     */
    async fetchRaidHistory() {
      try {
        const response = await wanlingApi.getRaidHistory()
        this.raidHistory = response.data as RaidHistoryItem[]
      } catch (error) {
        console.error('获取偷菜历史失败:', error)
      }
    }
  }
})
