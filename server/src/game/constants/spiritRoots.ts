// 灵根类型定义
export type RootType = 'heavenly' | 'variant' | 'true' | 'pseudo' | 'waste'

export interface SpiritRoot {
  id: string
  name: string
  element: string
  elements: string[]
  color: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
  rootType: RootType
  description: string
  cultivationBonus: number
  combatPowerBonus: number
  attributes: {
    attack?: number
    defense?: number
    speed?: number
    luck?: number
  }
}

// 灵根类型配置
export const ROOT_TYPE_CONFIG: Record<RootType, { label: string; color: string; bonus: number }> = {
  heavenly: { label: '天灵根', color: '#f0e6c8', bonus: 15 },
  variant: { label: '异灵根', color: '#9c7ab8', bonus: 12 },
  true: { label: '真灵根', color: '#6b9fc9', bonus: 10 },
  pseudo: { label: '伪灵根', color: '#9ca3af', bonus: 5 },
  waste: { label: '废灵根', color: '#6b6560', bonus: 0 }
}

// 五行相克关系
export const ELEMENT_COUNTER: Record<string, string[]> = {
  金: ['木'],
  木: ['土'],
  土: ['水'],
  水: ['火'],
  火: ['金'],
  雷: ['金', '木', '水', '火', '土'],
  冰: ['火'],
  风: []
}

// 相克伤害加成
export const COUNTER_DAMAGE_BONUS = 0.15

// 检查是否能触发相克
export function canTriggerCounter(root: SpiritRoot): boolean {
  return root.rootType === 'heavenly' || root.rootType === 'variant'
}

// 获取相克伤害加成
export function getCounterBonus(attacker: SpiritRoot, defender: SpiritRoot): number {
  if (!canTriggerCounter(attacker)) return 0

  for (const attackElement of attacker.elements) {
    const counters = ELEMENT_COUNTER[attackElement] || []
    for (const defenderElement of defender.elements) {
      if (counters.includes(defenderElement)) {
        return COUNTER_DAMAGE_BONUS
      }
    }
  }
  return 0
}

// 五行灵根
export const SPIRIT_ROOTS: Record<string, SpiritRoot> = {
  // 默认灵根（凡人）
  mortal_root: {
    id: 'mortal_root',
    name: '凡人体质',
    element: '无',
    elements: [],
    color: '#6b6560',
    rarity: 'common',
    rootType: 'waste',
    description: '没有灵根的凡人体质，无法感应灵气',
    cultivationBonus: 0,
    combatPowerBonus: 0,
    attributes: {}
  },

  // 天灵根 - 单灵根 (传说级)
  metal_pure: {
    id: 'metal_pure',
    name: '天金灵根',
    element: '金',
    elements: ['金'],
    color: '#c9a959',
    rarity: 'legendary',
    rootType: 'heavenly',
    description: '纯净金灵根，攻伐无双，修炼速度极快',
    cultivationBonus: 100,
    combatPowerBonus: 15,
    attributes: { attack: 50 }
  },
  wood_pure: {
    id: 'wood_pure',
    name: '天木灵根',
    element: '木',
    elements: ['木'],
    color: '#7cb88a',
    rarity: 'legendary',
    rootType: 'heavenly',
    description: '纯净木灵根，生生不息，恢复力极强',
    cultivationBonus: 100,
    combatPowerBonus: 15,
    attributes: { defense: 30, luck: 20 }
  },
  water_pure: {
    id: 'water_pure',
    name: '天水灵根',
    element: '水',
    elements: ['水'],
    color: '#6b9fc9',
    rarity: 'legendary',
    rootType: 'heavenly',
    description: '纯净水灵根，柔中带刚，领悟力极高',
    cultivationBonus: 100,
    combatPowerBonus: 15,
    attributes: { speed: 50 }
  },
  fire_pure: {
    id: 'fire_pure',
    name: '天火灵根',
    element: '火',
    elements: ['火'],
    color: '#c96a5a',
    rarity: 'legendary',
    rootType: 'heavenly',
    description: '纯净火灵根，烈焰焚天，攻击力极强',
    cultivationBonus: 100,
    combatPowerBonus: 15,
    attributes: { attack: 40, speed: 10 }
  },
  earth_pure: {
    id: 'earth_pure',
    name: '天土灵根',
    element: '土',
    elements: ['土'],
    color: '#a08040',
    rarity: 'legendary',
    rootType: 'heavenly',
    description: '纯净土灵根，厚德载物，防御力极高',
    cultivationBonus: 100,
    combatPowerBonus: 15,
    attributes: { defense: 50 }
  },

  // 异灵根 (神话级)
  thunder: {
    id: 'thunder',
    name: '雷灵根',
    element: '雷',
    elements: ['雷'],
    color: '#9c7ab8',
    rarity: 'mythic',
    rootType: 'variant',
    description: '天生雷体，可引动天雷之力，克制万法，极为稀有',
    cultivationBonus: 120,
    combatPowerBonus: 13,
    attributes: { attack: 60, speed: 30 }
  },
  ice: {
    id: 'ice',
    name: '冰灵根',
    element: '冰',
    elements: ['冰'],
    color: '#5ab8b8',
    rarity: 'mythic',
    rootType: 'variant',
    description: '天生寒体，可驾驭极寒之力，克制火系，极为稀有',
    cultivationBonus: 120,
    combatPowerBonus: 12,
    attributes: { attack: 40, defense: 30 }
  },
  wind: {
    id: 'wind',
    name: '风灵根',
    element: '风',
    elements: ['风'],
    color: '#7a9e8e',
    rarity: 'mythic',
    rootType: 'variant',
    description: '天生风体，来去如风，速度无双',
    cultivationBonus: 120,
    combatPowerBonus: 12,
    attributes: { speed: 80 }
  },

  // 真灵根 - 双灵根 (史诗级)
  metal_water: {
    id: 'metal_water',
    name: '金水真灵根',
    element: '金水',
    elements: ['金', '水'],
    color: '#8ab4c9',
    rarity: 'epic',
    rootType: 'true',
    description: '金水相生，攻守兼备',
    cultivationBonus: 60,
    combatPowerBonus: 10,
    attributes: { attack: 25, speed: 25 }
  },
  wood_fire: {
    id: 'wood_fire',
    name: '木火真灵根',
    element: '木火',
    elements: ['木', '火'],
    color: '#b8826a',
    rarity: 'epic',
    rootType: 'true',
    description: '木火相生，生生不息',
    cultivationBonus: 60,
    combatPowerBonus: 10,
    attributes: { attack: 20, defense: 15, luck: 15 }
  },
  water_wood: {
    id: 'water_wood',
    name: '水木真灵根',
    element: '水木',
    elements: ['水', '木'],
    color: '#6bab8a',
    rarity: 'epic',
    rootType: 'true',
    description: '水木相生，领悟力强',
    cultivationBonus: 60,
    combatPowerBonus: 10,
    attributes: { speed: 20, luck: 30 }
  },
  fire_earth: {
    id: 'fire_earth',
    name: '火土真灵根',
    element: '火土',
    elements: ['火', '土'],
    color: '#b8785a',
    rarity: 'epic',
    rootType: 'true',
    description: '火土相生，刚猛无比',
    cultivationBonus: 60,
    combatPowerBonus: 10,
    attributes: { attack: 30, defense: 20 }
  },
  earth_metal: {
    id: 'earth_metal',
    name: '土金真灵根',
    element: '土金',
    elements: ['土', '金'],
    color: '#b8a060',
    rarity: 'epic',
    rootType: 'true',
    description: '土金相生，坚不可摧',
    cultivationBonus: 60,
    combatPowerBonus: 10,
    attributes: { defense: 35, attack: 15 }
  },

  // 伪灵根 - 三灵根 (稀有级)
  metal_water_wood: {
    id: 'metal_water_wood',
    name: '金水木伪灵根',
    element: '金水木',
    elements: ['金', '水', '木'],
    color: '#7aab9e',
    rarity: 'rare',
    rootType: 'pseudo',
    description: '三灵齐聚，资质上乘，修行不易',
    cultivationBonus: 35,
    combatPowerBonus: 5,
    attributes: { attack: 15, speed: 15, luck: 10 }
  },
  wood_fire_earth: {
    id: 'wood_fire_earth',
    name: '木火土伪灵根',
    element: '木火土',
    elements: ['木', '火', '土'],
    color: '#ab8060',
    rarity: 'rare',
    rootType: 'pseudo',
    description: '三灵齐聚，攻防均衡，修行不易',
    cultivationBonus: 35,
    combatPowerBonus: 5,
    attributes: { attack: 15, defense: 15, luck: 10 }
  },
  water_fire_metal: {
    id: 'water_fire_metal',
    name: '水火金伪灵根',
    element: '水火金',
    elements: ['水', '火', '金'],
    color: '#a08090',
    rarity: 'rare',
    rootType: 'pseudo',
    description: '三灵齐聚，刚柔并济，修行不易',
    cultivationBonus: 35,
    combatPowerBonus: 5,
    attributes: { attack: 20, speed: 10, defense: 10 }
  },

  // 伪灵根 - 四灵根 (普通级)
  four_elements: {
    id: 'four_elements',
    name: '四灵伪根',
    element: '金木水火',
    elements: ['金', '木', '水', '火'],
    color: '#9ca3af',
    rarity: 'common',
    rootType: 'pseudo',
    description: '四灵杂糅，修炼艰难，但胜在稳健',
    cultivationBonus: 15,
    combatPowerBonus: 5,
    attributes: { attack: 8, defense: 8, speed: 8, luck: 8 }
  },

  // 五行混元根 (普通级但战力加成高)
  five_elements: {
    id: 'five_elements',
    name: '五行混元根',
    element: '金木水火土',
    elements: ['金', '木', '水', '火', '土'],
    color: '#d4a5c9',
    rarity: 'common',
    rootType: 'pseudo',
    description: '五行俱全，法力生生不息，根基之浑厚甚至超越真灵根',
    cultivationBonus: 10,
    combatPowerBonus: 11,
    attributes: { attack: 5, defense: 5, speed: 5, luck: 10 }
  }
}

// 稀有度配置
export const RARITY_CONFIG = {
  common: { label: '凡品', color: '#9ca3af', weight: 40 },
  rare: { label: '灵品', color: '#7cb88a', weight: 30 },
  epic: { label: '玄品', color: '#6b9fc9', weight: 20 },
  legendary: { label: '地品', color: '#c9a959', weight: 8 },
  mythic: { label: '天品', color: '#9c7ab8', weight: 2 }
}

// 随机获取灵根
export function randomSpiritRoot(): SpiritRoot {
  const roots = Object.values(SPIRIT_ROOTS)
  const totalWeight = roots.reduce((sum, root) => {
    return sum + (RARITY_CONFIG[root.rarity]?.weight || 1)
  }, 0)

  let random = Math.random() * totalWeight
  for (const root of roots) {
    const weight = RARITY_CONFIG[root.rarity]?.weight || 1
    random -= weight
    if (random <= 0) {
      return root
    }
  }
  return roots[roots.length - 1]
}
