/**
 * 元婴宗密卷系统 Pinia Store
 * 管理元婴系统的状态
 */
import { defineStore } from 'pinia'
import { yuanyingApi, extractErrorMessage } from '@/api'
import {
  NASCENT_SOUL_LEVELS,
  NASCENT_SOUL_STATUS_CONFIG,
  ROOT_ELEMENT_CONFIG,
  FRAGMENT_CONFIG,
  GREEN_SWORD_CONFIG,
  type NascentSoulStatus,
  type NascentSoulLevelConfig,
  type RootElement,
  type FragmentType
} from '@/game/constants/yuanying'

// ========== 类型定义 ==========

export interface NascentSoulState {
  level: number
  exp: number
  expToNextLevel: number
  levelProgress: number
  status: NascentSoulStatus
  activityStartAt: number | null
  elapsedTime: number
  accumulatedRewards: {
    cultivation?: number
    items?: { id: string; quantity: number }[]
  }
  projectionInfo?: {
    totalDuration: number
    remainingTime: number
    progressPercent: number
    rootElement: RootElement
    expectedYields: string[]
  }
  cultivationInfo?: {
    settleCycleMs: number
    cultivationBonusPerCycle: number
    cyclesCompleted: number
    pendingCultivation: number
  }
}

export interface FragmentState {
  upper: boolean
  middle: boolean
  lower: boolean
  canMaster: boolean
}

export interface ProjectionResult {
  success: boolean
  message: string
  rootElement: RootElement
  estimatedDuration: number
  expectedYields: string[]
}

export interface CultivationResult {
  success: boolean
  message: string
  cultivationBonusPerCycle: number
}

export interface RecallResult {
  success: boolean
  message: string
  wasProjecting: boolean
  wasCultivating: boolean
  rewards: {
    cultivation?: number
    items?: { id: string; name: string; quantity: number }[]
  }
  interrupted: boolean
}

export interface SeekTruthResult {
  success: boolean
  message: string
  rewardType: 'cultivation' | 'material' | 'nascentExp' | 'fragment'
  rewards: {
    cultivation?: number
    items?: { id: string; name: string; quantity: number }[]
    nascentExp?: number
    fragment?: { type: FragmentType; name: string }
  }
  cooldownEndsAt: number
}

export interface MasterSwordResult {
  success: boolean
  message: string
  effects: {
    swordDamageBonus: number
    cultivationBonus: number
    specialSkill: string
  }
}

// ========== Store定义 ==========

interface YuanyingStoreState {
  // 是否是元婴宗弟子
  isMember: boolean
  // 是否可以使用元婴功能（元婴期以上）
  canUseNascentSoul: boolean
  // 元婴状态
  soul: NascentSoulState | null
  // 残篇状态
  fragments: FragmentState | null
  // 是否已领悟青元剑诀
  greenSwordMastered: boolean
  // 问道寻真冷却
  seekTruthCooldown: number | null
  // 加载状态
  loading: boolean
  // 错误信息
  error: string | null
  // 上次刷新时间
  lastRefresh: number
}

export const useYuanyingStore = defineStore('yuanying', {
  state: (): YuanyingStoreState => ({
    isMember: false,
    canUseNascentSoul: false,
    soul: null,
    fragments: null,
    greenSwordMastered: false,
    seekTruthCooldown: null,
    loading: false,
    error: null,
    lastRefresh: 0
  }),

  getters: {
    // 元婴是否处于活动中
    isSoulActive(): boolean {
      return this.soul?.status !== 'idle'
    },

    // 元婴是否在出窍中
    isProjecting(): boolean {
      return this.soul?.status === 'projecting'
    },

    // 元婴是否在闭关中
    isCultivating(): boolean {
      return this.soul?.status === 'cultivating'
    },

    // 获取元婴状态配置
    soulStatusConfig(): typeof NASCENT_SOUL_STATUS_CONFIG[NascentSoulStatus] | null {
      if (!this.soul) return null
      return NASCENT_SOUL_STATUS_CONFIG[this.soul.status]
    },

    // 获取元婴等级配置
    soulLevelConfig(): NascentSoulLevelConfig | null {
      const soul = this.soul as NascentSoulState | null
      if (!soul) return null
      return NASCENT_SOUL_LEVELS[soul.level] || null
    },

    // 获取灵根元素配置
    rootElementConfig(): typeof ROOT_ELEMENT_CONFIG[RootElement] | null {
      if (!this.soul?.projectionInfo) return null
      return ROOT_ELEMENT_CONFIG[this.soul.projectionInfo.rootElement]
    },

    // 是否可以问道寻真
    canSeekTruth(): boolean {
      if (!this.isMember) return false
      if (this.seekTruthCooldown && this.seekTruthCooldown > 0) return false
      return true
    },

    // 是否可以领悟青元剑诀
    canMasterGreenSword(): boolean {
      if (!this.fragments) return false
      return this.fragments.canMaster
    },

    // 已收集的残篇数量
    fragmentsCollected(): number {
      if (!this.fragments) return 0
      return (this.fragments.upper ? 1 : 0) +
             (this.fragments.middle ? 1 : 0) +
             (this.fragments.lower ? 1 : 0)
    },

    // 出窍进度百分比
    projectionProgress(): number {
      return this.soul?.projectionInfo?.progressPercent || 0
    },

    // 问道寻真冷却时间格式化
    seekTruthCooldownDisplay(): string {
      if (!this.seekTruthCooldown || this.seekTruthCooldown <= 0) return '可用'
      const hours = Math.floor(this.seekTruthCooldown / (60 * 60 * 1000))
      const minutes = Math.floor((this.seekTruthCooldown % (60 * 60 * 1000)) / (60 * 1000))
      return `${hours}时${minutes}分`
    }
  },

  actions: {
    /**
     * 获取元婴宗系统状态
     */
    async fetchStatus() {
      this.loading = true
      this.error = null

      try {
        const response = await yuanyingApi.getStatus()
        const data = response.data

        this.isMember = data.isYuanyingMember
        this.canUseNascentSoul = data.canUseNascentSoul
        this.soul = data.soul
        this.fragments = data.fragments
        this.greenSwordMastered = data.greenSwordMastered
        this.seekTruthCooldown = data.seekTruthCooldown
        this.lastRefresh = Date.now()
      } catch (error) {
        this.error = extractErrorMessage(error, '获取状态失败')
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 元神出窍
     */
    async startProjection(): Promise<ProjectionResult> {
      this.loading = true

      try {
        const response = await yuanyingApi.startProjection()
        const result = response.data as ProjectionResult

        // 更新本地状态
        if (this.soul) {
          this.soul.status = 'projecting'
          this.soul.activityStartAt = Date.now()
          this.soul.projectionInfo = {
            totalDuration: result.estimatedDuration,
            remainingTime: result.estimatedDuration,
            progressPercent: 0,
            rootElement: result.rootElement,
            expectedYields: result.expectedYields
          }
        }

        return result
      } catch (error) {
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 元婴闭关
     */
    async startCultivation(): Promise<CultivationResult> {
      this.loading = true

      try {
        const response = await yuanyingApi.startCultivation()
        const result = response.data as CultivationResult

        // 更新本地状态
        if (this.soul) {
          this.soul.status = 'cultivating'
          this.soul.activityStartAt = Date.now()
          this.soul.cultivationInfo = {
            settleCycleMs: 4 * 60 * 60 * 1000,
            cultivationBonusPerCycle: result.cultivationBonusPerCycle,
            cyclesCompleted: 0,
            pendingCultivation: 0
          }
        }

        return result
      } catch (error) {
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 元婴归窍
     */
    async recallSoul(): Promise<RecallResult> {
      this.loading = true

      try {
        const response = await yuanyingApi.recallSoul()
        const result = response.data as RecallResult

        // 更新本地状态
        if (this.soul) {
          this.soul.status = 'idle'
          this.soul.activityStartAt = null
          this.soul.projectionInfo = undefined
          this.soul.cultivationInfo = undefined
          this.soul.accumulatedRewards = {}
        }

        return result
      } catch (error) {
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 问道寻真
     */
    async seekTruth(): Promise<SeekTruthResult> {
      this.loading = true

      try {
        const response = await yuanyingApi.seekTruth()
        const result = response.data as SeekTruthResult

        // 更新冷却时间
        this.seekTruthCooldown = result.cooldownEndsAt - Date.now()

        // 如果获得了残篇，更新状态
        if (result.rewardType === 'fragment' && result.rewards.fragment) {
          if (this.fragments) {
            this.fragments[result.rewards.fragment.type] = true
            this.fragments.canMaster = this.fragments.upper && this.fragments.middle && this.fragments.lower && !this.greenSwordMastered
          }
        }

        return result
      } catch (error) {
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 获取残篇状态
     */
    async fetchFragments(): Promise<FragmentState> {
      try {
        const response = await yuanyingApi.getFragments()
        this.fragments = response.data as FragmentState
        return this.fragments
      } catch (error) {
        throw error
      }
    },

    /**
     * 领悟青元剑诀
     */
    async masterGreenSword(): Promise<MasterSwordResult> {
      this.loading = true

      try {
        const response = await yuanyingApi.masterGreenSword()
        const result = response.data as MasterSwordResult

        // 更新状态
        this.greenSwordMastered = true
        if (this.fragments) {
          this.fragments.canMaster = false
        }

        return result
      } catch (error) {
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 获取残篇配置
     */
    getFragmentConfig(type: FragmentType) {
      return FRAGMENT_CONFIG[type]
    },

    /**
     * 获取青元剑诀效果配置
     */
    getGreenSwordEffects() {
      return GREEN_SWORD_CONFIG.effects
    },

    /**
     * 重置状态
     */
    reset() {
      this.isMember = false
      this.canUseNascentSoul = false
      this.soul = null
      this.fragments = null
      this.greenSwordMastered = false
      this.seekTruthCooldown = null
      this.loading = false
      this.error = null
      this.lastRefresh = 0
    }
  }
})
