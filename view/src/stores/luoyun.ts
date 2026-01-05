/**
 * 落云宗灵眼之树 Pinia Store
 * 管理灵眼之树系统的状态
 */
import { defineStore } from 'pinia'
import { luoyunApi, extractErrorMessage } from '@/api'

// ========== 类型定义 ==========

// 环境类型
export type TreeEnvironment = 'thirsty' | 'unstable' | 'withered' | 'frozen' | 'overgrown'

// 五行元素类型
export type ElementType = 'water' | 'earth' | 'wood' | 'fire' | 'metal'

// 环境配置接口
export interface EnvironmentConfig {
  name: string
  description: string
  requiredElement: ElementType
  icon: string
  color: string
}

// 成长阶段配置接口
export interface GrowthStageConfig {
  name: string
  woodRequired: number
  maxPatterns: number
  description: string
}

// 果实品质配置接口
export interface FruitQualityConfig {
  name: string
  baseCultivation: number
  color: string
}

export interface LingyanTreeState {
  maturity: number
  maturityPercent: number
  cycle: number
  status: 'growing' | 'harvesting' | 'invaded'
  invasionStartedAt: number | null
  invasionTimeRemaining: number | null
  defendersCount: number
  defendersNeeded: number
  canHarvest: boolean
  // 环境系统字段
  environment: TreeEnvironment
  lastEnvironmentChangeAt: number
  environmentSatisfied: boolean
  environmentSatisfiedBy: string | null
  // 成长阶段字段
  currentStage: number
  stageElementPool: Record<ElementType, number>
  spiritPatterns: number
}

export interface PlayerContributionState {
  contribution: number
  rank: number
  canWater: boolean
  wateredToday: boolean
  defendedInvasion: boolean
  rewardsClaimed: boolean
  estimatedReward: {
    base: { itemId: string; quantity: number; exp: number }
    bonus: { itemId: string; quantity: number } | null
  }
  // 元素贡献记录
  elementContributions: Record<ElementType, number>
  environmentSatisfyCount: number
}

export interface SatisfyEnvironmentResult {
  success: boolean
  message: string
  contributedElement: ElementType
  contributedAmount: number
  woodElementGained: number
  contributionGain: number
  newContribution: number
  stageEvolved: boolean
  newStage: number | null
  patternsGained: number
}

export interface ContributionRanking {
  rank: number
  characterId: string
  characterName: string
  contribution: number
  rewardQuantity: number
}

export interface WateringResult {
  success: boolean
  message: string
  maturityGain: number
  contributionGain: number
  newMaturity: number
  newContribution: number
  hasWoodRootBonus: boolean
}

export interface OfferPillResult {
  success: boolean
  message: string
  tier: number
  count: number
  maturityGain: number
  contributionGain: number
  newMaturity: number
  newContribution: number
}

export interface DefendResult {
  success: boolean
  message: string
  contributionGain: number
  newContribution: number
  defendersCount: number
  defendersNeeded: number
}

export interface HarvestResult {
  success: boolean
  message: string
  rewards: {
    itemId: string
    itemName: string
    quantity: number
  }[]
  expGained: number
  rank: number
  isTopRanked: boolean
}

export interface LiquidUseResult {
  success: boolean
  message: string
  effect: 'root' | 'herb'
  rootUpgraded?: {
    oldRoot: string
    newRoot: string
  }
  herbBuffExpires?: number
}

// ========== 常量配置 ==========

// 妖丹配置
export const DEMON_PILL_CONFIG = {
  1: { id: 'demon_pill_tier1', name: '一阶妖丹', maturityGain: 20, contributionGain: 10, quality: 'common', color: '#9ca3af' },
  2: { id: 'demon_pill_tier2', name: '二阶妖丹', maturityGain: 50, contributionGain: 30, quality: 'uncommon', color: '#22c55e' },
  3: { id: 'demon_pill_tier3', name: '三阶妖丹', maturityGain: 100, contributionGain: 60, quality: 'rare', color: '#3b82f6' },
  4: { id: 'demon_pill_tier4', name: '四阶妖丹', maturityGain: 200, contributionGain: 100, quality: 'epic', color: '#a855f7' },
  5: { id: 'demon_pill_tier5', name: '五阶妖丹', maturityGain: 500, contributionGain: 200, quality: 'legendary', color: '#f59e0b' }
} as const

// 灵树状态配置
export const TREE_STATUS_CONFIG = {
  growing: { name: '生长中', color: '#22c55e', icon: 'TreePine' },
  harvesting: { name: '收获期', color: '#f59e0b', icon: 'Sparkles' },
  invaded: { name: '被入侵', color: '#ef4444', icon: 'Sword' }
} as const

// 环境配置
export const ENVIRONMENT_CONFIG: Record<TreeEnvironment, EnvironmentConfig> = {
  thirsty: {
    name: '干渴',
    description: '土壤干裂，急需水灵力滋润',
    requiredElement: 'water',
    icon: 'Droplets',
    color: '#3b82f6'
  },
  unstable: {
    name: '根基松动',
    description: '根系不稳，需要土灵力加固',
    requiredElement: 'earth',
    icon: 'Mountain',
    color: '#a16207'
  },
  withered: {
    name: '生机萎靡',
    description: '缺乏生机，需要木灵力注入',
    requiredElement: 'wood',
    icon: 'Leaf',
    color: '#22c55e'
  },
  frozen: {
    name: '寒气侵蚀',
    description: '寒气入侵，需要火灵力驱散',
    requiredElement: 'fire',
    icon: 'Flame',
    color: '#ef4444'
  },
  overgrown: {
    name: '枝叶杂乱',
    description: '枝叶疯长，需要金灵力修剪',
    requiredElement: 'metal',
    icon: 'Scissors',
    color: '#9ca3af'
  }
}

// 元素配置
export const ELEMENT_CONFIG: Record<ElementType, { name: string; color: string; icon: string }> = {
  water: { name: '水', color: '#3b82f6', icon: 'Droplets' },
  earth: { name: '土', color: '#a16207', icon: 'Mountain' },
  wood: { name: '木', color: '#22c55e', icon: 'Leaf' },
  fire: { name: '火', color: '#ef4444', icon: 'Flame' },
  metal: { name: '金', color: '#9ca3af', icon: 'Scissors' }
}

// 成长阶段配置
export const GROWTH_STAGE_CONFIG: Record<number, GrowthStageConfig> = {
  1: { name: '萌芽期', woodRequired: 0, maxPatterns: 1, description: '灵眼之树初生，蕴含一缕木灵' },
  2: { name: '生长期', woodRequired: 100, maxPatterns: 2, description: '枝叶舒展，灵纹初显' },
  3: { name: '成熟期', woodRequired: 300, maxPatterns: 3, description: '根深叶茂，灵纹璀璨' },
  4: { name: '结果期', woodRequired: 600, maxPatterns: 4, description: '灵果欲坠，四纹齐聚' }
}

// 果实品质配置
export const FRUIT_QUALITY_CONFIG: Record<number, FruitQualityConfig> = {
  0: { name: '凡品', baseCultivation: 5000, color: '#9ca3af' },
  1: { name: '灵品', baseCultivation: 10000, color: '#22c55e' },
  2: { name: '仙品', baseCultivation: 18000, color: '#3b82f6' },
  3: { name: '极品', baseCultivation: 25000, color: '#a855f7' },
  4: { name: '神品', baseCultivation: 30000, color: '#f59e0b' }
}

// 灵根元素映射（用于前端判断）
export const SPIRIT_ROOT_ELEMENT_MAP: Record<string, { elements: ElementType[]; canSatisfyAny: boolean }> = {
  // 单灵根
  metal_pure: { elements: ['metal'], canSatisfyAny: false },
  wood_pure: { elements: ['wood'], canSatisfyAny: false },
  water_pure: { elements: ['water'], canSatisfyAny: false },
  fire_pure: { elements: ['fire'], canSatisfyAny: false },
  earth_pure: { elements: ['earth'], canSatisfyAny: false },
  // 天灵根
  metal_heaven: { elements: ['metal', 'wood'], canSatisfyAny: false },
  wood_heaven: { elements: ['wood'], canSatisfyAny: false },
  water_heaven: { elements: ['water', 'wood'], canSatisfyAny: false },
  fire_heaven: { elements: ['fire', 'wood'], canSatisfyAny: false },
  earth_heaven: { elements: ['earth', 'wood'], canSatisfyAny: false },
  // 双灵根
  metal_wood: { elements: ['metal', 'wood'], canSatisfyAny: false },
  metal_water: { elements: ['metal', 'water'], canSatisfyAny: false },
  metal_fire: { elements: ['metal', 'fire'], canSatisfyAny: false },
  metal_earth: { elements: ['metal', 'earth'], canSatisfyAny: false },
  wood_water: { elements: ['wood', 'water'], canSatisfyAny: false },
  wood_fire: { elements: ['wood', 'fire'], canSatisfyAny: false },
  wood_earth: { elements: ['wood', 'earth'], canSatisfyAny: false },
  water_fire: { elements: ['water', 'fire'], canSatisfyAny: false },
  water_earth: { elements: ['water', 'earth'], canSatisfyAny: false },
  fire_earth: { elements: ['fire', 'earth'], canSatisfyAny: false },
  // 特殊灵根
  pseudo: { elements: [], canSatisfyAny: true },
  waste: { elements: [], canSatisfyAny: true },
  mixed: { elements: [], canSatisfyAny: true }
}

// ========== Store定义 ==========

interface LuoyunState {
  // 是否是落云宗弟子
  isMember: boolean
  // 灵树状态
  tree: LingyanTreeState | null
  // 个人贡献状态
  contribution: PlayerContributionState | null
  // 贡献排行榜
  rankings: ContributionRanking[]
  // 加载状态
  loading: boolean
  // 错误信息
  error: string | null
  // 上次刷新时间
  lastRefresh: number
}

export const useLuoyunStore = defineStore('luoyun', {
  state: (): LuoyunState => ({
    isMember: false,
    tree: null,
    contribution: null,
    rankings: [],
    loading: false,
    error: null,
    lastRefresh: 0
  }),

  getters: {
    // 是否可以浇灌
    canWater(): boolean {
      return this.contribution?.canWater ?? false
    },

    // 是否可以收获
    canHarvest(): boolean {
      return this.tree?.canHarvest ?? false
    },

    // 是否正在被入侵
    isInvaded(): boolean {
      return this.tree?.status === 'invaded'
    },

    // 是否已参与防御
    hasDefended(): boolean {
      return this.contribution?.defendedInvasion ?? false
    },

    // 是否已领取奖励
    hasClaimed(): boolean {
      return this.contribution?.rewardsClaimed ?? false
    },

    // 成熟度百分比（格式化）
    maturityDisplay(): string {
      if (!this.tree) return '0.00%'
      return `${this.tree.maturityPercent.toFixed(2)}%`
    },

    // 我的排名
    myRank(): number {
      return this.contribution?.rank ?? 0
    },

    // 是否在前10名
    isTopRanked(): boolean {
      const rank = this.myRank
      return rank > 0 && rank <= 10
    },

    // 获取状态配置
    treeStatusConfig(): (typeof TREE_STATUS_CONFIG)[keyof typeof TREE_STATUS_CONFIG] | null {
      if (!this.tree) return null
      return TREE_STATUS_CONFIG[this.tree.status]
    },

    // 获取当前环境配置
    currentEnvironmentConfig(): EnvironmentConfig | null {
      if (!this.tree) return null
      return ENVIRONMENT_CONFIG[this.tree.environment]
    },

    // 获取当前阶段配置
    currentStageConfig(): GrowthStageConfig | null {
      if (!this.tree) return null
      return GROWTH_STAGE_CONFIG[this.tree.currentStage] ?? GROWTH_STAGE_CONFIG[1] ?? null
    },

    // 获取当前果实品质
    currentFruitQuality(): FruitQualityConfig {
      const patterns = this.tree?.spiritPatterns || 0
      return FRUIT_QUALITY_CONFIG[patterns] ?? FRUIT_QUALITY_CONFIG[0] ?? { name: '凡品', baseCultivation: 5000, color: '#9ca3af' }
    },

    // 获取木元素总量
    totalWoodElement(): number {
      if (!this.tree?.stageElementPool) return 0
      return this.tree.stageElementPool.wood || 0
    },

    // 获取下一阶段进度百分比
    stageProgress(): number {
      if (!this.tree) return 0
      const currentStage = this.tree.currentStage
      const woodAmount = this.totalWoodElement

      const currentConfig = GROWTH_STAGE_CONFIG[currentStage]
      const nextStage = currentStage + 1

      if (nextStage > 4 || !currentConfig) return 100

      const nextConfig = GROWTH_STAGE_CONFIG[nextStage]
      if (!nextConfig) return 100

      const stageWoodNeeded = nextConfig.woodRequired - currentConfig.woodRequired
      const currentWoodInStage = woodAmount - currentConfig.woodRequired

      return Math.min(100, Math.floor((currentWoodInStage / stageWoodNeeded) * 100))
    },

    // 环境变化剩余时间（毫秒）
    environmentTimeRemaining(): number {
      if (!this.tree) return 0
      const elapsed = Date.now() - this.tree.lastEnvironmentChangeAt
      const intervalMs = 60 * 60 * 1000 // 1小时
      return Math.max(0, intervalMs - elapsed)
    }
  },

  actions: {
    /**
     * 获取落云宗系统状态
     */
    async fetchStatus() {
      this.loading = true
      this.error = null

      try {
        const response = await luoyunApi.getStatus()
        const data = response.data

        this.isMember = data.isLuoyunMember
        this.tree = data.tree
        this.contribution = data.contribution
        this.rankings = data.rankings || []
        this.lastRefresh = Date.now()
      } catch (error) {
        this.error = extractErrorMessage(error, '获取状态失败')
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 浇灌灵树
     */
    async waterTree(): Promise<WateringResult> {
      this.loading = true

      try {
        const response = await luoyunApi.waterTree()
        const result = response.data as WateringResult

        // 更新本地状态
        if (this.tree) {
          this.tree.maturity = result.newMaturity
          this.tree.maturityPercent = result.newMaturity / 100
        }
        if (this.contribution) {
          this.contribution.contribution = result.newContribution
          this.contribution.canWater = false
          this.contribution.wateredToday = true
        }

        return result
      } catch (error) {
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 献祭妖丹
     */
    async offerPill(tier: number, count: number): Promise<OfferPillResult> {
      this.loading = true

      try {
        const response = await luoyunApi.offerPill(tier, count)
        const result = response.data as OfferPillResult

        // 更新本地状态
        if (this.tree) {
          this.tree.maturity = result.newMaturity
          this.tree.maturityPercent = result.newMaturity / 100
        }
        if (this.contribution) {
          this.contribution.contribution = result.newContribution
        }

        return result
      } catch (error) {
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 参与防御
     */
    async defend(): Promise<DefendResult> {
      this.loading = true

      try {
        const response = await luoyunApi.defend()
        const result = response.data as DefendResult

        // 更新本地状态
        if (this.tree) {
          this.tree.defendersCount = result.defendersCount
        }
        if (this.contribution) {
          this.contribution.contribution = result.newContribution
          this.contribution.defendedInvasion = true
        }

        return result
      } catch (error) {
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 领取收获奖励
     */
    async claimHarvest(): Promise<HarvestResult> {
      this.loading = true

      try {
        const response = await luoyunApi.claimHarvest()
        const result = response.data as HarvestResult

        // 更新本地状态
        if (this.contribution) {
          this.contribution.rewardsClaimed = true
        }

        return result
      } catch (error) {
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 获取贡献排行榜
     */
    async fetchRankings(limit: number = 20): Promise<ContributionRanking[]> {
      try {
        const response = await luoyunApi.getRankings(limit)
        this.rankings = response.data as ContributionRanking[]
        return this.rankings
      } catch (error) {
        throw error
      }
    },

    /**
     * 使用灵眼之液
     */
    async useLiquid(effect: 'root' | 'herb'): Promise<LiquidUseResult> {
      this.loading = true

      try {
        const response = await luoyunApi.useLiquid(effect)
        return response.data as LiquidUseResult
      } catch (error) {
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 满足环境需求
     */
    async satisfyEnvironment(): Promise<SatisfyEnvironmentResult> {
      this.loading = true

      try {
        const response = await luoyunApi.satisfyEnvironment()
        const result = response.data as SatisfyEnvironmentResult

        // 更新本地状态
        if (this.tree) {
          this.tree.environmentSatisfied = true
          if (result.stageEvolved && result.newStage) {
            this.tree.currentStage = result.newStage
          }
          this.tree.spiritPatterns += result.patternsGained
        }
        if (this.contribution) {
          this.contribution.contribution = result.newContribution
          this.contribution.environmentSatisfyCount++
        }

        return result
      } catch (error) {
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 检查灵根是否能满足当前环境
     */
    canSatisfyCurrentEnvironment(spiritRootId: string): boolean {
      if (!this.tree) return false
      if (this.tree.environmentSatisfied) return false

      const rootMapping = SPIRIT_ROOT_ELEMENT_MAP[spiritRootId]
      if (!rootMapping) return true // 默认可满足

      if (rootMapping.canSatisfyAny) return true

      const requiredElement = ENVIRONMENT_CONFIG[this.tree.environment]?.requiredElement
      if (!requiredElement) return false

      return rootMapping.elements.includes(requiredElement)
    },

    /**
     * 获取妖丹配置
     */
    getPillConfig(tier: number) {
      return DEMON_PILL_CONFIG[tier as keyof typeof DEMON_PILL_CONFIG]
    },

    /**
     * 重置状态
     */
    reset() {
      this.isMember = false
      this.tree = null
      this.contribution = null
      this.rankings = []
      this.loading = false
      this.error = null
      this.lastRefresh = 0
    }
  }
})
