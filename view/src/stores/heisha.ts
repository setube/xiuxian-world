/**
 * 黑煞教魔道禁术 Pinia Store
 * 管理夺舍魔功、魔染红尘、煞气淬体、丹魔之咒的状态
 */
import { defineStore } from 'pinia'
import { heishaApi, pvpApi, extractErrorMessage } from '@/api'

// ========== 类型定义 ==========

export interface ShaEnergyStatus {
  current: number
  max: number
  bonusPercent: number
  nextDecay: number
  decayAmount: number
}

export interface PuppetInfo {
  id: string
  puppetId: string
  puppetName: string
  enslaveStartAt: number
  enslaveExpiresAt: number
  remainingMs: number
}

export interface StolenConsortInfo {
  id: string
  consortId: string
  consortName: string
  originalOwnerName: string
  stolenAt: number
  expiresAt: number
  remainingMs: number
  brainwashCount: number
  brainwashMaxCount: number
  extractCount: number
  extractMaxCount: number
}

export interface HeishaStatus {
  isMember: boolean
  realm: number
  shaEnergy: ShaEnergyStatus
  soulSeize: {
    canUse: boolean
    cooldownMs: number
    puppetCount: number
    maxPuppets: number
    puppetBonus: number
  }
  consortTheft: {
    canUse: boolean
    cooldownMs: number
    hasStolenConsort: boolean
  }
  extractBuff: {
    active: boolean
    expiresAt: number | null
    bonus: { attack: number; defense: number } | null
  }
}

export interface PvpStatus {
  dailyChallenges: number
  maxChallenges: number
  canChallenge: boolean
  todayDate: string
}

export interface PvpTarget {
  id: string
  name: string
  realm: number
  realmName: string
  power: number
  sectId: string | null
  sectName: string | null
}

export interface PvpHistoryItem {
  id: string
  opponentName: string
  opponentId: string
  isChallenger: boolean
  result: 'win' | 'lose' | 'draw'
  powerDiff: number
  cultivationChange: number
  createdAt: number
}

export interface SeizeResult {
  success: boolean
  message: string
  puppet?: PuppetInfo
  backlash?: {
    hpLost: number
    currentHp: number
  }
}

export interface ChallengeResult {
  id: string
  success: boolean
  message: string
  challengerPower: number
  defenderPower: number
  result: 'challenger_win' | 'defender_win' | 'draw'
  rewards: {
    cultivationChange: number
    shaEnergyGain: number
  }
}

// ========== 丹魔之咒类型 ==========

export interface CurseStatus {
  isCursed: boolean
  curseType: string | null
  casterName: string | null
  startTime: number | null
  expiresAt: number | null
  remainingMs: number | null
  storedCultivation: number
}

export interface CasterCurseRecord {
  targetId: string
  targetName: string
  storedCultivation: number
  expiresAt: number
  remainingMs: number
}

export interface CurseStatusResponse {
  cursed: CurseStatus
  castRecords: CasterCurseRecord[]
}

export interface CastCurseResult {
  success: boolean
  message: string
  targetName?: string
  successRate?: number
}

export interface HarvestCurseResult {
  success: boolean
  message: string
  cultivationGained?: number
  targetName?: string
}

export interface RemoveCurseResult {
  success: boolean
  message: string
  cultivationLost?: number
}

// ========== Store定义 ==========

interface HeishaState {
  // 是否是黑煞教弟子
  isMember: boolean
  // 煞气状态
  shaEnergy: ShaEnergyStatus | null
  // 夺舍状态
  soulSeizeStatus: HeishaStatus['soulSeize'] | null
  // 侍妾窃取状态
  consortTheft: HeishaStatus['consortTheft'] | null
  // 强索元阴buff状态
  extractBuff: HeishaStatus['extractBuff'] | null
  // 傀儡列表
  puppets: PuppetInfo[]
  // 被窃取的侍妾
  stolenConsort: StolenConsortInfo | null
  // PvP状态
  pvpStatus: PvpStatus | null
  // PvP目标列表
  pvpTargets: PvpTarget[]
  // PvP历史
  pvpHistory: PvpHistoryItem[]
  // 丹魔之咒 - 被诅咒状态
  curseStatus: CurseStatus | null
  // 丹魔之咒 - 施咒记录
  castRecords: CasterCurseRecord[]
  // 加载状态
  loading: boolean
  // 错误信息
  error: string | null
  // 上次刷新时间
  lastRefresh: number
}

export const useHeishaStore = defineStore('heisha', {
  state: (): HeishaState => ({
    isMember: false,
    shaEnergy: null,
    soulSeizeStatus: null,
    consortTheft: null,
    extractBuff: null,
    puppets: [],
    stolenConsort: null,
    pvpStatus: null,
    pvpTargets: [],
    pvpHistory: [],
    curseStatus: null,
    castRecords: [],
    loading: false,
    error: null,
    lastRefresh: 0
  }),

  getters: {
    // 是否可以发动夺舍
    canSeize(): boolean {
      return this.soulSeizeStatus?.canUse ?? false
    },

    // 是否可以窃取侍妾
    canSteal(): boolean {
      return this.consortTheft?.canUse ?? false
    },

    // 是否有被窃取的侍妾
    hasStolenConsort(): boolean {
      return this.stolenConsort !== null
    },

    // 是否可以魔音灌脑
    canBrainwash(): boolean {
      if (!this.stolenConsort) return false
      return this.stolenConsort.brainwashCount < this.stolenConsort.brainwashMaxCount
    },

    // 是否可以强索元阴
    canExtract(): boolean {
      if (!this.stolenConsort) return false
      return this.stolenConsort.extractCount < this.stolenConsort.extractMaxCount
    },

    // 煞气战力加成百分比
    shaBonusPercent(): number {
      return this.shaEnergy?.bonusPercent ?? 0
    },

    // 傀儡战力加成百分比
    puppetBonusPercent(): number {
      return this.soulSeizeStatus?.puppetBonus ?? 0
    },

    // 是否可以发起PvP挑战
    canPvpChallenge(): boolean {
      return this.pvpStatus?.canChallenge ?? false
    },

    // 是否被诅咒
    isCursed(): boolean {
      return this.curseStatus?.isCursed ?? false
    },

    // 是否有施咒目标
    hasCurseTargets(): boolean {
      return this.castRecords.length > 0
    }
  },

  actions: {
    /**
     * 获取魔道禁术完整状态
     */
    async fetchStatus(force = false) {
      // 5秒内不重复刷新
      if (!force && Date.now() - this.lastRefresh < 5000) return

      this.loading = true
      this.error = null

      try {
        const response = await heishaApi.getStatus()
        const status = response.data as HeishaStatus

        this.isMember = status.isMember
        this.shaEnergy = status.shaEnergy
        this.soulSeizeStatus = status.soulSeize
        this.consortTheft = status.consortTheft
        this.extractBuff = status.extractBuff
        this.lastRefresh = Date.now()
      } catch (error) {
        this.error = extractErrorMessage(error, '获取魔道禁术状态失败')
      } finally {
        this.loading = false
      }
    },

    /**
     * 获取傀儡列表
     */
    async fetchPuppets() {
      try {
        const response = await heishaApi.getPuppets()
        this.puppets = response.data as PuppetInfo[]
      } catch (error) {
        console.error('获取傀儡列表失败:', error)
      }
    },

    /**
     * 发动夺舍
     */
    async soulSeize(targetId: string): Promise<SeizeResult> {
      this.loading = true
      try {
        const response = await heishaApi.soulSeize(targetId)
        const result = response.data as SeizeResult
        await this.fetchStatus(true)
        await this.fetchPuppets()
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 释放傀儡
     */
    async releasePuppet(puppetId: string) {
      this.loading = true
      try {
        await heishaApi.releasePuppet(puppetId)
        await this.fetchStatus(true)
        await this.fetchPuppets()
      } finally {
        this.loading = false
      }
    },

    /**
     * 获取被窃取的侍妾
     */
    async fetchStolenConsort() {
      try {
        const response = await heishaApi.getStolenConsort()
        this.stolenConsort = response.data as StolenConsortInfo | null
      } catch (error) {
        console.error('获取被窃取侍妾失败:', error)
      }
    },

    /**
     * 窃取侍妾
     */
    async stealConsort(targetId: string): Promise<StolenConsortInfo> {
      this.loading = true
      try {
        const response = await heishaApi.stealConsort(targetId)
        const result = response.data as StolenConsortInfo
        this.stolenConsort = result
        await this.fetchStatus(true)
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 魔音灌脑
     */
    async brainwash(): Promise<{ cultivationGain: number; remainingCount: number }> {
      this.loading = true
      try {
        const response = await heishaApi.brainwash()
        const result = response.data as { cultivationGain: number; remainingCount: number }
        await this.fetchStolenConsort()
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 强索元阴
     */
    async extract(): Promise<{ bonus: { attack: number; defense: number }; remainingCount: number }> {
      this.loading = true
      try {
        const response = await heishaApi.extract()
        const result = response.data as { bonus: { attack: number; defense: number }; remainingCount: number }
        await this.fetchStatus(true)
        await this.fetchStolenConsort()
        return result
      } finally {
        this.loading = false
      }
    },

    // ========== PvP相关 ==========

    /**
     * 获取PvP状态
     */
    async fetchPvpStatus() {
      try {
        const response = await pvpApi.getStatus()
        this.pvpStatus = response.data as PvpStatus
      } catch (error) {
        console.error('获取PvP状态失败:', error)
      }
    },

    /**
     * 获取PvP目标列表
     */
    async fetchPvpTargets(limit = 20) {
      try {
        const response = await pvpApi.getTargets(limit)
        this.pvpTargets = response.data as PvpTarget[]
      } catch (error) {
        console.error('获取PvP目标失败:', error)
      }
    },

    /**
     * 发起PvP挑战
     */
    async pvpChallenge(targetId: string): Promise<ChallengeResult> {
      this.loading = true
      try {
        const response = await pvpApi.challenge(targetId)
        const result = response.data as ChallengeResult
        await this.fetchPvpStatus()
        await this.fetchStatus(true) // 刷新煞气状态
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 获取PvP历史
     */
    async fetchPvpHistory(limit = 20) {
      try {
        const response = await pvpApi.getHistory(limit)
        this.pvpHistory = response.data as PvpHistoryItem[]
      } catch (error) {
        console.error('获取PvP历史失败:', error)
      }
    },

    // ========== 丹魔之咒相关 ==========

    /**
     * 获取咒印状态
     */
    async fetchCurseStatus() {
      try {
        const response = await heishaApi.getCurseStatus()
        const data = response.data as CurseStatusResponse
        this.curseStatus = data.cursed
        this.castRecords = data.castRecords
      } catch (error) {
        console.error('获取咒印状态失败:', error)
      }
    },

    /**
     * 施放丹魔之咒
     */
    async castCurse(targetId: string): Promise<CastCurseResult> {
      this.loading = true
      try {
        const response = await heishaApi.castCurse(targetId)
        const result = response.data as CastCurseResult
        await this.fetchCurseStatus()
        await this.fetchStatus(true) // 刷新修为
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 收割诅咒修为
     */
    async harvestCurse(targetId: string): Promise<HarvestCurseResult> {
      this.loading = true
      try {
        const response = await heishaApi.harvestCurse(targetId)
        const result = response.data as HarvestCurseResult
        await this.fetchCurseStatus()
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 解除自身诅咒
     */
    async removeCurse(): Promise<RemoveCurseResult> {
      this.loading = true
      try {
        const response = await heishaApi.removeCurse()
        const result = response.data as RemoveCurseResult
        await this.fetchCurseStatus()
        return result
      } finally {
        this.loading = false
      }
    }
  }
})
