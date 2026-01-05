/**
 * 七焰扇系统配置
 *
 * 【通天灵宝 · 七焰扇】
 * 上古火系至宝，分为三焰扇（仿品）和七焰扇（真品）两个版本。
 * 火灵根修士装备后可发挥全部威力，获得伤害加成。
 */

import type { ItemQuality } from './items'

// ========== 类型定义 ==========

export interface FlameFanStatus {
  hasThreeFlameFan: boolean
  hasSevenFlameFan: boolean
  equipped: 'three_flame_fan' | 'seven_flame_fan' | null
  debuff: FlameFanDebuff | null
  debuffRemaining: number
}

export interface FlameFanDebuff {
  type: 'minor' | 'major' | 'severe'
  cultivationReduction: number // 修炼效率降低百分比
  combatPowerReduction: number // 战力降低百分比
  description: string
  expiresAt: number
}

// ========== 装备基础配置 ==========

export const FLAME_FAN_CONFIG = {
  threeFlameFan: {
    id: 'three_flame_fan' as const,
    name: '三焰扇',
    quality: 'epic' as ItemQuality,
    combatPower: 11800,
    description: '古法炼制的火系法宝仿品，虽非真品，亦蕴含不俗火焰之力。'
  },
  sevenFlameFan: {
    id: 'seven_flame_fan' as const,
    name: '七焰扇',
    quality: 'legendary' as ItemQuality,
    combatPower: 35000,
    description: '上古火系至宝，七种异火凝聚而成，威力惊天。火灵根修士持之，可发挥其全部威能。'
  }
}

// ========== 火灵根共鸣配置 ==========

export const FIRE_RESONANCE_CONFIG = {
  enabled: true,
  // 完全共鸣 - 纯火灵根
  fullResonanceBonus: 0.5, // 50%伤害加成
  fullResonanceRoots: ['fire_pure'], // 天火灵根
  // 部分共鸣 - 含火真灵根
  partialResonanceBonus: 0.25, // 25%伤害加成
  partialResonanceRoots: ['wood_fire', 'fire_earth'], // 木火真灵根、火土真灵根
  description: '火灵根与七焰扇产生共鸣，伤害大幅提升！'
}

// ========== 炼制配置 ==========

export const CRAFTING_CONFIG = {
  threeFlameFan: {
    baseSuccessRate: 10, // 10%基础成功率
    minRealm: 3, // 结丹期
    materials: [
      { itemId: 'scarlet_refined_bone', quantity: 1 }, // 赤炼金骨（扇骨）
      { itemId: 'fire_phoenix_feather', quantity: 1 }, // 火凤之翎
      { itemId: 'fire_crane_feather', quantity: 1 }, // 火鹤之羽
      { itemId: 'three_legged_crow_feather', quantity: 1 } // 三足乌翎
    ],
    spiritStoneCost: 5000
  },
  sevenFlameFan: {
    baseSuccessRate: 5, // 5%基础成功率
    minRealm: 4, // 元婴期
    requiresThreeFlameFan: true, // 需要三焰扇作为基材
    materials: [
      { itemId: 'three_flame_fan', quantity: 1 }, // 三焰扇（基材）
      { itemId: 'ice_phoenix_feather', quantity: 1 }, // 冰凤之翎
      { itemId: 'thunder_peng_feather', quantity: 1 }, // 雷鹏之羽
      { itemId: 'green_luan_feather', quantity: 1 }, // 青鸾长翎
      { itemId: 'kunpeng_feather', quantity: 1 }, // 鲲鹏之羽
      { itemId: 'primordial_purple_qi', quantity: 1 } // 鸿蒙紫气
    ],
    spiritStoneCost: 50000
  }
}

// ========== 成功率加成来源 ==========

export const SUCCESS_RATE_BONUSES = {
  fireRoot: 5, // 火灵根+5%
  alchemyElder: 3, // 丹道长老+3%（预留）
  xutianDing: 5, // 虚天鼎+5%（预留）
  sectBonus: {
    huangfeng: 2 // 黄枫谷炼丹世家+2%
  } as Record<string, number>,
  maxSuccessRate: 50 // 成功率上限50%
}

// ========== 失败惩罚配置 ==========

export const FAILURE_PENALTY_CONFIG = {
  threeFlameFan: {
    materialLossRate: 1.0, // 100%材料损失
    cultivationLossPercent: 5, // 损失5%总修为
    debuffChance: 0.3, // 30%几率获得debuff
    debuffDuration: 2 * 60 * 60 * 1000, // 2小时
    debuff: {
      type: 'minor' as const,
      cultivationReduction: 10, // 修炼效率-10%
      combatPowerReduction: 5, // 战力-5%
      description: '【火焰反噬】炼器失败，灵力紊乱，修炼效率-10%，战力-5%，持续2小时'
    }
  },
  sevenFlameFan: {
    materialLossRate: 1.0, // 100%材料损失
    cultivationLossPercent: 10, // 损失10%总修为
    debuffChance: 0.6, // 60%几率获得debuff
    debuffDuration: 6 * 60 * 60 * 1000, // 6小时
    debuffOptions: [
      {
        type: 'major' as const,
        weight: 70, // 70%概率
        cultivationReduction: 20, // 修炼效率-20%
        combatPowerReduction: 15, // 战力-15%
        description: '【七焰焚体】异火反噬，经脉受损，修炼效率-20%，战力-15%，持续6小时'
      },
      {
        type: 'severe' as const,
        weight: 30, // 30%概率
        cultivationReduction: 30, // 修炼效率-30%
        combatPowerReduction: 25, // 战力-25%
        description: '【七焰焚魂】异火入体，神魂动荡，修炼效率-30%，战力-25%，持续6小时'
      }
    ]
  }
}

// ========== 工具函数 ==========

/**
 * 检查角色是否有火灵根共鸣
 */
export function checkFireResonance(spiritRootId: string): {
  hasResonance: boolean
  bonusPercent: number
  type: 'full' | 'partial' | 'none'
} {
  if (FIRE_RESONANCE_CONFIG.fullResonanceRoots.includes(spiritRootId)) {
    return {
      hasResonance: true,
      bonusPercent: FIRE_RESONANCE_CONFIG.fullResonanceBonus * 100,
      type: 'full'
    }
  }
  if (FIRE_RESONANCE_CONFIG.partialResonanceRoots.includes(spiritRootId)) {
    return {
      hasResonance: true,
      bonusPercent: FIRE_RESONANCE_CONFIG.partialResonanceBonus * 100,
      type: 'partial'
    }
  }
  return { hasResonance: false, bonusPercent: 0, type: 'none' }
}

/**
 * 检查灵根是否包含火元素（用于成功率加成判断）
 */
export function hasFireElement(spiritRootElements: string[]): boolean {
  return spiritRootElements.includes('火')
}

/**
 * 计算实际成功率
 */
export function calculateCraftSuccessRate(
  baseRate: number,
  bonuses: {
    hasFireRoot?: boolean
    isAlchemyElder?: boolean
    hasXutianDing?: boolean
    sectId?: string | null
  }
): number {
  let rate = baseRate

  if (bonuses.hasFireRoot) {
    rate += SUCCESS_RATE_BONUSES.fireRoot
  }
  if (bonuses.isAlchemyElder) {
    rate += SUCCESS_RATE_BONUSES.alchemyElder
  }
  if (bonuses.hasXutianDing) {
    rate += SUCCESS_RATE_BONUSES.xutianDing
  }
  if (bonuses.sectId && SUCCESS_RATE_BONUSES.sectBonus[bonuses.sectId]) {
    rate += SUCCESS_RATE_BONUSES.sectBonus[bonuses.sectId]
  }

  return Math.min(rate, SUCCESS_RATE_BONUSES.maxSuccessRate)
}

/**
 * 获取装备战力加成
 */
export function getFlameFanCombatPower(equippedType: 'three_flame_fan' | 'seven_flame_fan' | null): number {
  if (!equippedType) return 0
  if (equippedType === 'three_flame_fan') return FLAME_FAN_CONFIG.threeFlameFan.combatPower
  if (equippedType === 'seven_flame_fan') return FLAME_FAN_CONFIG.sevenFlameFan.combatPower
  return 0
}

/**
 * 随机选择debuff类型（七焰扇失败时）
 */
export function rollDebuffType(): (typeof FAILURE_PENALTY_CONFIG.sevenFlameFan.debuffOptions)[0] {
  const options = FAILURE_PENALTY_CONFIG.sevenFlameFan.debuffOptions
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0)
  let roll = Math.random() * totalWeight

  for (const option of options) {
    roll -= option.weight
    if (roll <= 0) return option
  }
  return options[0]
}

/**
 * 获取法宝名称
 */
export function getFlameFanName(type: 'three_flame_fan' | 'seven_flame_fan' | null): string {
  if (!type) return '未装备'
  if (type === 'three_flame_fan') return FLAME_FAN_CONFIG.threeFlameFan.name
  if (type === 'seven_flame_fan') return FLAME_FAN_CONFIG.sevenFlameFan.name
  return '未知'
}

/**
 * 获取境界名称（用于错误消息）
 */
export function getRealmName(tier: number): string {
  const names: Record<number, string> = {
    1: '炼气期',
    2: '筑基期',
    3: '结丹期',
    4: '元婴期',
    5: '化神期',
    6: '合体期',
    7: '大乘期',
    8: '渡劫期',
    9: '仙人'
  }
  return names[tier] || '未知'
}
