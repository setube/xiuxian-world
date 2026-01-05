/**
 * 七焰扇系统 Pinia Store
 * 管理七焰扇装备、炼制、火灵根共鸣的状态
 */
import { defineStore } from 'pinia'
import { flameFanApi, extractErrorMessage } from '@/api'

// ========== 类型定义 ==========

export interface FlameFanStatus {
  hasThreeFlameFan: boolean
  hasSevenFlameFan: boolean
  equippedFlameFan: 'three_flame_fan' | 'seven_flame_fan' | null
  combatPower: number
  fireResonance: {
    hasResonance: boolean
    bonusPercent: number
    type: 'full' | 'partial' | 'none'
  }
  debuff: {
    type: string
    cultivationReduction: number
    combatPowerReduction: number
    description: string
    remainingMs: number
  } | null
  craftInfo: {
    threeFlameFan: CraftInfo
    sevenFlameFan: CraftInfo
  }
}

export interface CraftInfo {
  canCraft: boolean
  reason?: string
  successRate: number
  materials: { itemId: string; name: string; required: number; owned: number }[]
  spiritStoneCost: number
}

export interface CraftResult {
  success: boolean
  crafted: boolean
  message: string
  itemName: string
  penalties?: {
    materialsLost: boolean
    cultivationLost: number
    debuffApplied: boolean
    debuffDescription?: string
  }
}

export interface EquipResult {
  success: boolean
  message: string
  equippedFlameFan: 'three_flame_fan' | 'seven_flame_fan' | null
  combatPower: number
}

// ========== Store定义 ==========

interface FlameFanState {
  status: FlameFanStatus | null
  loading: boolean
  error: string | null
  lastRefresh: number
}

export const useFlameFanStore = defineStore('flameFan', {
  state: (): FlameFanState => ({
    status: null,
    loading: false,
    error: null,
    lastRefresh: 0
  }),

  getters: {
    // 是否拥有三焰扇
    hasThreeFlameFan(): boolean {
      return this.status?.hasThreeFlameFan ?? false
    },

    // 是否拥有七焰扇
    hasSevenFlameFan(): boolean {
      return this.status?.hasSevenFlameFan ?? false
    },

    // 当前装备的火焰扇
    equippedFlameFan(): 'three_flame_fan' | 'seven_flame_fan' | null {
      return this.status?.equippedFlameFan ?? null
    },

    // 当前战力加成
    combatPower(): number {
      return this.status?.combatPower ?? 0
    },

    // 火灵根共鸣信息
    fireResonance(): FlameFanStatus['fireResonance'] | null {
      return this.status?.fireResonance ?? null
    },

    // 当前debuff
    debuff(): FlameFanStatus['debuff'] {
      return this.status?.debuff ?? null
    },

    // 装备名称
    equippedFanName(): string {
      if (!this.status?.equippedFlameFan) return '未装备'
      return this.status.equippedFlameFan === 'three_flame_fan' ? '三焰扇' : '七焰扇'
    },

    // 共鸣类型名称
    resonanceTypeName(): string {
      if (!this.status?.fireResonance?.hasResonance) return '无共鸣'
      return this.status.fireResonance.type === 'full' ? '完全共鸣' : '部分共鸣'
    }
  },

  actions: {
    /**
     * 获取七焰扇状态
     */
    async fetchStatus(force = false) {
      if (!force && Date.now() - this.lastRefresh < 5000) return

      this.loading = true
      this.error = null

      try {
        const response = await flameFanApi.getStatus()
        this.status = response.data as FlameFanStatus
        this.lastRefresh = Date.now()
      } catch (error: unknown) {
        this.error = extractErrorMessage(error, '获取七焰扇状态失败')
      } finally {
        this.loading = false
      }
    },

    /**
     * 炼制火焰扇
     */
    async craft(type: 'three_flame_fan' | 'seven_flame_fan'): Promise<CraftResult> {
      this.loading = true
      try {
        const response = await flameFanApi.craft(type)
        const result = response.data as CraftResult
        await this.fetchStatus(true)
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 装备火焰扇
     */
    async equip(type: 'three_flame_fan' | 'seven_flame_fan'): Promise<EquipResult> {
      this.loading = true
      try {
        const response = await flameFanApi.equip(type)
        const result = response.data as EquipResult
        await this.fetchStatus(true)
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 卸下火焰扇
     */
    async unequip(): Promise<EquipResult> {
      this.loading = true
      try {
        const response = await flameFanApi.unequip()
        const result = response.data as EquipResult
        await this.fetchStatus(true)
        return result
      } finally {
        this.loading = false
      }
    }
  }
})
