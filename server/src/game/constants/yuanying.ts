/**
 * 元婴宗 - 元婴密卷系统常量配置
 */

// 元婴宗宗门ID
export const YUANYING_SECT_ID = 'yuanying'

// 元婴等级配置
export interface NascentSoulLevelConfig {
  expRequired: number
  cultivationBonusPerCycle: number // 每4小时闭关修为
  projectionBonusPercent: number // 出窍产出加成%
}

export const NASCENT_SOUL_LEVELS: Record<number, NascentSoulLevelConfig> = {
  1: { expRequired: 0, cultivationBonusPerCycle: 100, projectionBonusPercent: 0 },
  2: { expRequired: 500, cultivationBonusPerCycle: 130, projectionBonusPercent: 5 },
  3: { expRequired: 1200, cultivationBonusPerCycle: 170, projectionBonusPercent: 10 },
  4: { expRequired: 2500, cultivationBonusPerCycle: 210, projectionBonusPercent: 15 },
  5: { expRequired: 5000, cultivationBonusPerCycle: 250, projectionBonusPercent: 20 },
  6: { expRequired: 8000, cultivationBonusPerCycle: 300, projectionBonusPercent: 25 },
  7: { expRequired: 12000, cultivationBonusPerCycle: 360, projectionBonusPercent: 30 },
  8: { expRequired: 18000, cultivationBonusPerCycle: 420, projectionBonusPercent: 35 },
  9: { expRequired: 25000, cultivationBonusPerCycle: 480, projectionBonusPercent: 40 },
  10: { expRequired: 35000, cultivationBonusPerCycle: 500, projectionBonusPercent: 50 }
}

export const MAX_NASCENT_SOUL_LEVEL = 10

// 元神出窍配置
export const SOUL_PROJECTION_CONFIG = {
  minRealm: 4, // 元婴期 (realm tier 4)
  durationMs: 8 * 60 * 60 * 1000, // 8小时
  interruptPenalty: 0, // 中断时无任何收益（设计要求）
  baseExpReward: 200 // 完成出窍基础元婴经验
}

// 灵根类型
export type RootElement = 'metal' | 'wood' | 'water' | 'fire' | 'earth' | 'mixed'

// 灵根对应产出物品（设计要求：妖丹、养魂木、稀有丹方等高阶材料）
export interface ProjectionYieldItem {
  id: string
  name: string
  minQty: number
  maxQty: number
}

export const PROJECTION_YIELDS_BY_ROOT: Record<
  RootElement,
  {
    items: ProjectionYieldItem[]
  }
> = {
  metal: {
    items: [
      { id: 'demon_pill_tier2', name: '二阶妖丹', minQty: 1, maxQty: 3 },
      { id: 'demon_pill_tier3', name: '三阶妖丹', minQty: 0, maxQty: 1 },
      { id: 'soul_nurture_wood', name: '养魂木', minQty: 1, maxQty: 2 }
    ]
  },
  wood: {
    items: [
      { id: 'demon_pill_tier2', name: '二阶妖丹', minQty: 1, maxQty: 3 },
      { id: 'soul_nurture_wood', name: '养魂木', minQty: 2, maxQty: 4 },
      { id: 'rare_herb_seed', name: '稀有灵草种子', minQty: 1, maxQty: 2 }
    ]
  },
  water: {
    items: [
      { id: 'demon_pill_tier2', name: '二阶妖丹', minQty: 1, maxQty: 3 },
      { id: 'demon_pill_tier3', name: '三阶妖丹', minQty: 0, maxQty: 1 },
      { id: 'cold_soul_marrow', name: '寒魂髓', minQty: 1, maxQty: 2 }
    ]
  },
  fire: {
    items: [
      { id: 'demon_pill_tier2', name: '二阶妖丹', minQty: 2, maxQty: 4 },
      { id: 'demon_pill_tier3', name: '三阶妖丹', minQty: 0, maxQty: 2 },
      { id: 'fire_essence_crystal', name: '火精晶', minQty: 1, maxQty: 2 }
    ]
  },
  earth: {
    items: [
      { id: 'demon_pill_tier2', name: '二阶妖丹', minQty: 1, maxQty: 3 },
      { id: 'soul_nurture_wood', name: '养魂木', minQty: 1, maxQty: 3 },
      { id: 'earth_spirit_stone', name: '地灵石', minQty: 2, maxQty: 4 }
    ]
  },
  mixed: {
    items: [] // 混元灵根随机选择上述之一
  }
}

// 稀有丹方掉落配置（出窍时有小概率获得）
export const RARE_RECIPE_DROP = {
  chance: 0.05, // 5%概率
  recipes: [
    { id: 'recipe_soul_pill', name: '凝魂丹丹方' },
    { id: 'recipe_nascent_pill', name: '元婴丹丹方' },
    { id: 'recipe_spirit_pill', name: '聚灵丹丹方' }
  ]
}

// 元婴闭关配置
export const NASCENT_CULTIVATION_CONFIG = {
  settleCycleMs: 4 * 60 * 60 * 1000 // 每4小时结算一次
}

// 问道寻真配置
export const SEEK_TRUTH_CONFIG = {
  expCost: 1000, // 消耗1000修为
  cooldownMs: 12 * 60 * 60 * 1000, // 12小时冷却
  rewards: {
    cultivation: {
      chance: 0.5, // 50%概率
      minGain: 500,
      maxGain: 2000
    },
    material: {
      chance: 0.3, // 30%概率
      items: [
        { id: 'spirit_stone_medium', name: '中品灵石', qty: 5 },
        { id: 'essence_pill', name: '精元丹', qty: 2 },
        { id: 'soul_crystal', name: '魂晶', qty: 1 }
      ]
    },
    nascentExp: {
      chance: 0.15, // 15%概率
      minGain: 100,
      maxGain: 300
    },
    fragment: {
      chance: 0.05, // 5%概率
      types: ['upper', 'middle', 'lower'] as const // 随机获得一篇
    }
  }
}

// 青元剑诀残篇类型
export type FragmentType = 'upper' | 'middle' | 'lower'

// 青元剑诀配置
export const GREEN_SWORD_CONFIG = {
  expCost: 10000, // 领悟消耗10000修为
  fragmentsRequired: ['upper', 'middle', 'lower'] as FragmentType[], // 需要三篇
  effects: {
    swordDamageBonus: 30, // 剑类伤害+30%
    cultivationBonus: 15, // 修炼效率+15%
    specialSkill: 'green_sword_qi' // 解锁技能
  }
}

// 青元剑诀残篇物品
export const FRAGMENT_ITEMS: Record<FragmentType, { id: string; name: string }> = {
  upper: { id: 'green_sword_fragment_upper', name: '青元剑诀·上篇' },
  middle: { id: 'green_sword_fragment_middle', name: '青元剑诀·中篇' },
  lower: { id: 'green_sword_fragment_lower', name: '青元剑诀·下篇' }
}

// 元婴状态
export type NascentSoulStatus = 'idle' | 'projecting' | 'cultivating'

// 元婴状态显示配置
export const NASCENT_SOUL_STATUS_CONFIG: Record<NascentSoulStatus, { name: string; color: string }> = {
  idle: { name: '静养中', color: '#22c55e' },
  projecting: { name: '出窍中', color: '#3b82f6' },
  cultivating: { name: '闭关中', color: '#a855f7' }
}

// 火鹤之羽掉落配置（问道寻真专属）
export const FIRE_CRANE_DROP_CONFIG = {
  itemId: 'fire_crane_feather',
  name: '火鹤之羽',
  chance: 0.03, // 3%概率
  minRealm: 4, // 需要元婴期
  description: '问道之际，天边一只火鹤掠过，遗落一根珍贵羽毛！'
}
