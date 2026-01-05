/**
 * 太一门专属系统 - 神识与引道
 * 太一门弟子通过引道参悟五行大道，获取神识点数和增益效果
 */

// 五行元素类型
export type ElementType = 'metal' | 'wood' | 'water' | 'fire' | 'earth'

// 元素中文名映射
export const ELEMENT_NAMES: Record<ElementType, string> = {
  metal: '金',
  wood: '木',
  water: '水',
  fire: '火',
  earth: '土'
}

// 元素对应大道名称
export const ELEMENT_DAO_NAMES: Record<ElementType, string> = {
  metal: '金石大道',
  wood: '生木大道',
  water: '润水大道',
  fire: '烈火大道',
  earth: '厚土大道'
}

// 引道增益配置
export interface GuidanceBuff {
  id: string
  name: string
  description: string
  element: ElementType
  durationHours: number
  effect: {
    type: 'crafting_bonus' | 'alchemy_bonus' | 'cultivation_bonus' | 'combat_bonus' | 'failure_reduction'
    value: number  // 百分比值
    extraChance?: number  // 额外触发几率
  }
}

export const GUIDANCE_BUFFS: Record<ElementType, GuidanceBuff> = {
  metal: {
    id: 'buff_metal_guidance',
    name: '金石感应',
    description: '炼器时有几率返还材料或提升法宝品质',
    element: 'metal',
    durationHours: 12,
    effect: {
      type: 'crafting_bonus',
      value: 25,  // 25% 几率返还材料
      extraChance: 10  // 10% 几率提升品质
    }
  },
  wood: {
    id: 'buff_wood_guidance',
    name: '生木之息',
    description: '炼丹时有几率额外产出丹药',
    element: 'wood',
    durationHours: 12,
    effect: {
      type: 'alchemy_bonus',
      value: 30,  // 30% 几率额外产出
      extraChance: 20  // 额外产出数量加成20%
    }
  },
  water: {
    id: 'buff_water_guidance',
    name: '润水之息',
    description: '闭关修炼时修为获取增加45%',
    element: 'water',
    durationHours: 12,
    effect: {
      type: 'cultivation_bonus',
      value: 45  // 45% 修为加成
    }
  },
  fire: {
    id: 'buff_fire_guidance',
    name: '烈火之息',
    description: '斗法时伤害提升65%',
    element: 'fire',
    durationHours: 12,
    effect: {
      type: 'combat_bonus',
      value: 65  // 65% 伤害加成
    }
  },
  earth: {
    id: 'buff_earth_guidance',
    name: '厚土之息',
    description: '闭关失败时惩罚降低95%',
    element: 'earth',
    durationHours: 12,
    effect: {
      type: 'failure_reduction',
      value: 95  // 95% 惩罚降低
    }
  }
}

// 引道系统配置
export const GUIDANCE_CONFIG = {
  cooldownHours: 12,           // 引道冷却时间（小时）
  consciousnessGain: 100,      // 每次引道获得的神识点数
  buffDurationHours: 12        // 增益持续时间（小时）
}

// 神识锻造配置
export const CONSCIOUSNESS_CONFIG = {
  // 被动效果：道心通明
  passive: {
    name: '道心通明',
    description: '每200点神识，永久增加1%的闭关成功率',
    consciousnessPerBonus: 200,  // 每200点神识
    bonusPerTier: 1,              // 增加1%成功率
    maxBonus: 20                  // 最高20%
  },

  // 主动技能：神识冲击
  consciousnessStrike: {
    name: '神识冲击',
    description: '消耗100点神识，对斗法失败方进行追击，使其在12小时内闭关失败率增加',
    cost: 100,                    // 消耗100点神识
    debuffDurationHours: 12,      // 持续12小时
    failureRateIncrease: 15,      // 失败率增加15%
    successChance: 70             // 70%成功率触发
  }
}

// 神识冲击造成的减益
export interface ConsciousnessDebuff {
  sourceCharacterId: string
  appliedAt: number  // 时间戳
  expiresAt: number  // 过期时间戳
  failureRateIncrease: number
}

// 太一门系统状态
export interface TaiyiStatus {
  consciousness: number          // 当前神识点数
  lastGuidanceTime: number | null  // 上次引道时间
  activeBuffElement: ElementType | null  // 当前激活的引道增益元素
  buffExpiresAt: number | null    // 增益过期时间
  consciousnessDebuffs: ConsciousnessDebuff[]  // 被施加的神识冲击减益
}

// 计算神识带来的闭关成功率加成
export function calculateConsciousnessBonus(consciousness: number): number {
  const { consciousnessPerBonus, bonusPerTier, maxBonus } = CONSCIOUSNESS_CONFIG.passive
  const tiers = Math.floor(consciousness / consciousnessPerBonus)
  const bonus = tiers * bonusPerTier
  return Math.min(bonus, maxBonus)
}

// 检查引道冷却是否结束
export function canUseGuidance(lastGuidanceTime: number | null): boolean {
  if (!lastGuidanceTime) return true
  const cooldownMs = GUIDANCE_CONFIG.cooldownHours * 60 * 60 * 1000
  return Date.now() >= lastGuidanceTime + cooldownMs
}

// 获取引道剩余冷却时间（毫秒）
export function getGuidanceCooldownRemaining(lastGuidanceTime: number | null): number {
  if (!lastGuidanceTime) return 0
  const cooldownMs = GUIDANCE_CONFIG.cooldownHours * 60 * 60 * 1000
  const remaining = (lastGuidanceTime + cooldownMs) - Date.now()
  return Math.max(0, remaining)
}

// 检查增益是否有效
export function isBuffActive(buffExpiresAt: number | null): boolean {
  if (!buffExpiresAt) return false
  return Date.now() < buffExpiresAt
}

// 获取增益剩余时间（毫秒）
export function getBuffRemainingTime(buffExpiresAt: number | null): number {
  if (!buffExpiresAt) return 0
  const remaining = buffExpiresAt - Date.now()
  return Math.max(0, remaining)
}

// 清理过期的神识冲击减益
export function cleanExpiredDebuffs(debuffs: ConsciousnessDebuff[]): ConsciousnessDebuff[] {
  const now = Date.now()
  return debuffs.filter(d => d.expiresAt > now)
}

// 计算总的神识冲击减益效果
export function calculateTotalDebuffEffect(debuffs: ConsciousnessDebuff[]): number {
  const activeDebuffs = cleanExpiredDebuffs(debuffs)
  // 多个减益叠加，但有上限
  const total = activeDebuffs.reduce((sum, d) => sum + d.failureRateIncrease, 0)
  return Math.min(total, 50)  // 最高50%失败率增加
}
