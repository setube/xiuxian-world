/**
 * 太一门专属系统 - 神识与引道 (前端常量)
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

// 元素对应颜色
export const ELEMENT_COLORS: Record<ElementType, string> = {
  metal: '#c9a959', // 金色
  wood: '#52c41a', // 绿色
  water: '#1890ff', // 蓝色
  fire: '#f5222d', // 红色
  earth: '#8b4513' // 棕色
}

// 元素对应图标背景渐变
export const ELEMENT_GRADIENTS: Record<ElementType, string> = {
  metal: 'linear-gradient(135deg, #c9a959 0%, #ffd700 100%)',
  wood: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
  water: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
  fire: 'linear-gradient(135deg, #f5222d 0%, #ff4d4f 100%)',
  earth: 'linear-gradient(135deg, #8b4513 0%, #a0522d 100%)'
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
    value: number
    extraChance?: number
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
      value: 25,
      extraChance: 10
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
      value: 30,
      extraChance: 20
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
      value: 45
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
      value: 65
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
      value: 95
    }
  }
}

// 引道系统配置
export const GUIDANCE_CONFIG = {
  cooldownHours: 12,
  consciousnessGain: 100,
  buffDurationHours: 12
}

// 神识锻造配置
export const CONSCIOUSNESS_CONFIG = {
  passive: {
    name: '道心通明',
    description: '每200点神识，永久增加1%的闭关成功率',
    consciousnessPerBonus: 200,
    bonusPerTier: 1,
    maxBonus: 20
  },
  consciousnessStrike: {
    name: '神识冲击',
    description: '消耗100点神识，对斗法失败方进行追击，使其在12小时内闭关失败率增加',
    cost: 100,
    debuffDurationHours: 12,
    failureRateIncrease: 15,
    successChance: 70
  }
}

// 格式化时间显示
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '已就绪'

  const hours = Math.floor(ms / (60 * 60 * 1000))
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }
  return `${minutes}分钟`
}

// 计算神识带来的闭关成功率加成
export function calculateConsciousnessBonus(consciousness: number): number {
  const { consciousnessPerBonus, bonusPerTier, maxBonus } = CONSCIOUSNESS_CONFIG.passive
  const tiers = Math.floor(consciousness / consciousnessPerBonus)
  const bonus = tiers * bonusPerTier
  return Math.min(bonus, maxBonus)
}
