// 药园系统常量 (黄枫谷专属)

import type { ItemQuality } from './items'

// ==================== 类型定义 ====================

// 地块类型
export type PlotType = 'normal' | 'elder'

// 地块状态
export type PlotStatus = 'empty' | 'growing' | 'mature' | 'withered'

// 事件类型
export type GardenEventType = 'none' | 'weed' | 'pest' | 'drought'

// 事件处理动作
export type EventAction = 'weed' | 'pesticide' | 'water'

// 探索事件类型
export type ExploreEventType = 'monster' | 'treasure' | 'gather' | 'nothing'

// 战斗动作
export type CombatAction = 'attack' | 'flee'

// ==================== 种子配置 ====================

export interface HerbSeed {
  id: string
  name: string
  quality: ItemQuality
  growthHours: number // 生长时间（小时，真实时间）
  yieldItemId: string // 产出物品ID
  yieldMin: number // 最小产量
  yieldMax: number // 最大产量
  requiredPlotType: PlotType | 'any' // 所需地块类型
  description: string
}

export const HERB_SEEDS: Record<string, HerbSeed> = {
  seed_common_herb: {
    id: 'seed_common_herb',
    name: '凡品灵草种子',
    quality: 'common',
    growthHours: 4,
    yieldItemId: 'spirit_herb_common',
    yieldMin: 2,
    yieldMax: 4,
    requiredPlotType: 'any',
    description: '最常见的灵草种子，生长迅速。'
  },
  seed_spirit_herb: {
    id: 'seed_spirit_herb',
    name: '灵品灵草种子',
    quality: 'uncommon',
    growthHours: 8,
    yieldItemId: 'spirit_herb_uncommon',
    yieldMin: 1,
    yieldMax: 3,
    requiredPlotType: 'any',
    description: '品质较高的灵草种子，需要更长的培育时间。'
  },
  seed_rare_herb: {
    id: 'seed_rare_herb',
    name: '玄品灵草种子',
    quality: 'rare',
    growthHours: 24,
    yieldItemId: 'spirit_herb_rare',
    yieldMin: 1,
    yieldMax: 2,
    requiredPlotType: 'any',
    description: '珍稀的灵草种子，成熟需要一整天。'
  },
  seed_golden_herb: {
    id: 'seed_golden_herb',
    name: '金叶仙草种子',
    quality: 'epic',
    growthHours: 48,
    yieldItemId: 'golden_spirit_herb',
    yieldMin: 1,
    yieldMax: 1,
    requiredPlotType: 'elder',
    description: '传说中的仙草种子，只有丹道长老的专属灵田才能培育。'
  },
  seed_mystic_flower: {
    id: 'seed_mystic_flower',
    name: '玄灵花种子',
    quality: 'rare',
    growthHours: 16,
    yieldItemId: 'mystic_flower',
    yieldMin: 1,
    yieldMax: 2,
    requiredPlotType: 'any',
    description: '蕴含神秘灵气的花卉种子。'
  }
}

// ==================== 事件配置 ====================

export interface GardenEvent {
  type: GardenEventType
  name: string
  description: string
  effect: 'slow_growth' | 'reduce_yield' | 'wither_risk'
  penalty: number // 惩罚系数
  requiredAction: EventAction // 需要的处理动作
  actionName: string // 处理动作名称
  maxDuration: number // 最大持续时间（小时），超过则造成严重后果
}

export const GARDEN_EVENTS: Record<GardenEventType, GardenEvent | null> = {
  none: null,
  weed: {
    type: 'weed',
    name: '杂草丛生',
    description: '灵田中长满杂草，严重影响灵草生长。',
    effect: 'slow_growth',
    penalty: 0.5, // 生长速度降低50%
    requiredAction: 'weed',
    actionName: '除草',
    maxDuration: 12 // 12小时内必须处理
  },
  pest: {
    type: 'pest',
    name: '虫害侵扰',
    description: '害虫正在啃食灵草，收成将大幅减少。',
    effect: 'reduce_yield',
    penalty: 0.3, // 产量降低30%
    requiredAction: 'pesticide',
    actionName: '除虫',
    maxDuration: 8 // 8小时内必须处理
  },
  drought: {
    type: 'drought',
    name: '灵气干涸',
    description: '灵田缺水，灵草有枯萎的风险。',
    effect: 'wither_risk',
    penalty: 0.2, // 20%概率枯萎
    requiredAction: 'water',
    actionName: '浇水',
    maxDuration: 6 // 6小时内必须处理，否则枯萎
  }
}

// 事件触发配置
export const EVENT_TRIGGER_CONFIG = {
  baseChance: 0.15, // 15%基础触发概率
  minInterval: 2 * 60 * 60 * 1000, // 最小间隔2小时（毫秒）
  eventWeights: {
    weed: 40, // 杂草权重
    pest: 35, // 虫害权重
    drought: 25 // 干涸权重
  }
}

// ==================== 扩建配置 ====================

export const GARDEN_EXPANSION = {
  initialPlots: 3, // 初始灵田数量
  baseCost: 100, // 基础贡献消耗
  costMultiplier: 1.5, // 每块递增倍率
  maxNormalPlots: 8, // 普通灵田上限
  elderPlotStart: 8, // 长老灵田起始编号（0-based）
  elderPlotEnd: 10 // 长老灵田结束编号（0-based，共3块）
}

// 计算扩建费用
export function calculateExpansionCost(currentPlots: number): number {
  if (currentPlots >= GARDEN_EXPANSION.maxNormalPlots) {
    return -1 // 已达上限
  }
  const expansion = currentPlots - GARDEN_EXPANSION.initialPlots
  return Math.floor(GARDEN_EXPANSION.baseCost * Math.pow(GARDEN_EXPANSION.costMultiplier, expansion))
}

// ==================== 丹道长老配置 ====================

export const ALCHEMY_ELDER_REQUIREMENT = {
  minRealmTier: 2, // 筑基期
  minRealmStage: 2, // 中期 (stage: 0初期, 1早期, 2中期, 3圆满)
  contributionCost: 5000, // 贡献消耗
  sectId: 'huangfeng' // 限定黄枫谷
}

// ==================== 采收种子掉落配置 ====================

export const HARVEST_SEED_DROP = {
  baseDropRate: 0.15, // 15%基础掉落率
  elderPlotBonus: 0.05, // 长老灵田额外5%
  qualityDrops: {
    common: { seedId: 'seed_common_herb', rate: 0.2 },
    uncommon: { seedId: 'seed_spirit_herb', rate: 0.12 },
    rare: { seedId: 'seed_rare_herb', rate: 0.05 },
    epic: { seedId: 'seed_golden_herb', rate: 0.02 },
    legendary: { seedId: 'seed_golden_herb', rate: 0.01 }
  }
}

// ==================== 洞天寻宝配置（太上长老专属） ====================

export const SECRET_REALM_CONFIG = {
  requiredRank: 'elder', // 需要长老身份
  dailyLimit: 3, // 每日探索次数上限
  plotRequired: [8, 9, 10], // 只能在长老灵田探索
  eventWeights: {
    monster: 30, // 妖兽遭遇
    treasure: 40, // 发现宝箱
    gather: 20, // 采集灵材
    nothing: 10 // 无事发生
  }
}

// 秘境妖兽配置
export interface RealmMonster {
  id: string
  name: string
  level: number
  hp: number
  attack: number
  defense: number
  description: string
  dropTable: {
    itemId: string
    chance: number // 掉落概率 (0-100)
    quantityMin: number
    quantityMax: number
  }[]
}

export const REALM_MONSTERS: Record<string, RealmMonster> = {
  vine_demon: {
    id: 'vine_demon',
    name: '藤蔓妖',
    level: 1,
    hp: 500,
    attack: 50,
    defense: 20,
    description: '由灵气滋养的藤蔓化成的妖物，擅长缠绕。',
    dropTable: [
      { itemId: 'spirit_herb_rare', chance: 30, quantityMin: 1, quantityMax: 2 },
      { itemId: 'monster_core_common', chance: 50, quantityMin: 1, quantityMax: 1 },
      { itemId: 'seed_rare_herb', chance: 10, quantityMin: 1, quantityMax: 1 }
    ]
  },
  poison_flower: {
    id: 'poison_flower',
    name: '毒花精',
    level: 2,
    hp: 800,
    attack: 80,
    defense: 30,
    description: '剧毒花卉修炼成精，散发迷人却致命的香气。',
    dropTable: [
      { itemId: 'spirit_herb_rare', chance: 40, quantityMin: 1, quantityMax: 3 },
      { itemId: 'monster_core_uncommon', chance: 40, quantityMin: 1, quantityMax: 1 },
      { itemId: 'poison_sac', chance: 20, quantityMin: 1, quantityMax: 1 },
      { itemId: 'seed_mystic_flower', chance: 15, quantityMin: 1, quantityMax: 1 }
    ]
  },
  wood_spirit: {
    id: 'wood_spirit',
    name: '木灵',
    level: 3,
    hp: 1500,
    attack: 120,
    defense: 50,
    description: '千年古木孕育的精灵，拥有强大的生命力。',
    dropTable: [
      { itemId: 'golden_spirit_herb', chance: 25, quantityMin: 1, quantityMax: 1 },
      { itemId: 'monster_core_rare', chance: 50, quantityMin: 1, quantityMax: 1 },
      { itemId: 'ancient_bark', chance: 30, quantityMin: 1, quantityMax: 2 },
      { itemId: 'seed_golden_herb', chance: 10, quantityMin: 1, quantityMax: 1 }
    ]
  },
  spirit_butterfly: {
    id: 'spirit_butterfly',
    name: '灵蝶',
    level: 1,
    hp: 300,
    attack: 40,
    defense: 10,
    description: '美丽的灵气蝴蝶，虽弱但灵敏。',
    dropTable: [
      { itemId: 'butterfly_wing', chance: 60, quantityMin: 1, quantityMax: 2 },
      { itemId: 'spirit_herb_uncommon', chance: 40, quantityMin: 2, quantityMax: 4 }
    ]
  }
}

// 宝箱配置
export interface TreasureChest {
  type: 'common' | 'fine' | 'rare'
  name: string
  weight: number // 出现权重
  rewards: {
    spiritStones: { min: number; max: number }
    items: { itemId: string; chance: number; quantityMin: number; quantityMax: number }[]
  }
}

export const TREASURE_CHESTS: Record<string, TreasureChest> = {
  common: {
    type: 'common',
    name: '普通宝箱',
    weight: 60,
    rewards: {
      spiritStones: { min: 50, max: 100 },
      items: [
        { itemId: 'spirit_herb_common', chance: 80, quantityMin: 3, quantityMax: 5 },
        { itemId: 'spirit_herb_uncommon', chance: 40, quantityMin: 1, quantityMax: 2 }
      ]
    }
  },
  fine: {
    type: 'fine',
    name: '精良宝箱',
    weight: 30,
    rewards: {
      spiritStones: { min: 100, max: 200 },
      items: [
        { itemId: 'spirit_herb_uncommon', chance: 70, quantityMin: 2, quantityMax: 4 },
        { itemId: 'spirit_herb_rare', chance: 30, quantityMin: 1, quantityMax: 2 },
        { itemId: 'seed_spirit_herb', chance: 20, quantityMin: 1, quantityMax: 1 }
      ]
    }
  },
  rare: {
    type: 'rare',
    name: '稀有宝箱',
    weight: 10,
    rewards: {
      spiritStones: { min: 200, max: 500 },
      items: [
        { itemId: 'spirit_herb_rare', chance: 60, quantityMin: 2, quantityMax: 3 },
        { itemId: 'golden_spirit_herb', chance: 20, quantityMin: 1, quantityMax: 1 },
        { itemId: 'seed_rare_herb', chance: 40, quantityMin: 1, quantityMax: 1 },
        { itemId: 'seed_golden_herb', chance: 10, quantityMin: 1, quantityMax: 1 }
      ]
    }
  }
}

// 采集事件奖励
export const GATHER_REWARDS = {
  spiritStones: { min: 30, max: 80 },
  items: [
    { itemId: 'spirit_herb_rare', chance: 50, quantityMin: 1, quantityMax: 2 },
    { itemId: 'mystic_flower', chance: 30, quantityMin: 1, quantityMax: 1 },
    { itemId: 'seed_rare_herb', chance: 15, quantityMin: 1, quantityMax: 1 }
  ]
}

// 无事发生时的小奖励
export const NOTHING_REWARDS = {
  spiritStones: { min: 10, max: 30 }
}

// ==================== 战斗配置 ====================

export const COMBAT_CONFIG = {
  fleeSuccessRate: 0.5, // 逃跑成功率50%
  fleeFailDamagePercent: 0.1, // 逃跑失败扣10%HP
  maxRounds: 50 // 最大回合数
}

// 计算伤害
export function calculateDamage(attack: number, defense: number): number {
  // 伤害公式: damage = attack * (1 - defense / (defense + 100))
  const damageReduction = defense / (defense + 100)
  return Math.floor(attack * (1 - damageReduction))
}

// ==================== 工具函数 ====================

/**
 * 获取种子配置
 */
export function getSeed(seedId: string): HerbSeed | undefined {
  return HERB_SEEDS[seedId]
}

/**
 * 获取所有种子
 */
export function getAllSeeds(): HerbSeed[] {
  return Object.values(HERB_SEEDS)
}

/**
 * 获取事件配置
 */
export function getGardenEvent(eventType: GardenEventType): GardenEvent | null {
  return GARDEN_EVENTS[eventType]
}

/**
 * 随机选择事件类型
 */
export function rollRandomEvent(): GardenEventType {
  const weights = EVENT_TRIGGER_CONFIG.eventWeights
  const total = weights.weed + weights.pest + weights.drought
  const roll = Math.random() * total

  if (roll < weights.weed) return 'weed'
  if (roll < weights.weed + weights.pest) return 'pest'
  return 'drought'
}

/**
 * 判断是否触发事件
 */
export function shouldTriggerEvent(lastEventTime: number | null): boolean {
  const now = Date.now()

  // 检查最小间隔
  if (lastEventTime && now - lastEventTime < EVENT_TRIGGER_CONFIG.minInterval) {
    return false
  }

  // 概率触发
  return Math.random() < EVENT_TRIGGER_CONFIG.baseChance
}

/**
 * 随机选择秘境事件
 */
export function rollExploreEvent(): ExploreEventType {
  const weights = SECRET_REALM_CONFIG.eventWeights
  const total = weights.monster + weights.treasure + weights.gather + weights.nothing
  const roll = Math.random() * total

  let cumulative = 0
  cumulative += weights.monster
  if (roll < cumulative) return 'monster'

  cumulative += weights.treasure
  if (roll < cumulative) return 'treasure'

  cumulative += weights.gather
  if (roll < cumulative) return 'gather'

  return 'nothing'
}

/**
 * 随机选择妖兽
 */
export function rollRandomMonster(): RealmMonster {
  const monsters = Object.values(REALM_MONSTERS)
  // 低等级妖兽概率更高
  const weights = monsters.map(m => Math.max(1, 4 - m.level))
  const total = weights.reduce((a, b) => a + b, 0)
  let roll = Math.random() * total

  for (let i = 0; i < monsters.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return monsters[i]
  }
  return monsters[0]
}

/**
 * 随机选择宝箱
 */
export function rollRandomChest(): TreasureChest {
  const chests = Object.values(TREASURE_CHESTS)
  const total = chests.reduce((a, b) => a + b.weight, 0)
  let roll = Math.random() * total

  for (const chest of chests) {
    roll -= chest.weight
    if (roll <= 0) return chest
  }
  return chests[0]
}

/**
 * 计算采收时的种子掉落
 */
export function rollSeedDrop(harvestedItemQuality: ItemQuality, isElderPlot: boolean): { seedId: string; quantity: number } | null {
  const config = HARVEST_SEED_DROP
  let dropRate = config.baseDropRate
  if (isElderPlot) {
    dropRate += config.elderPlotBonus
  }

  // 先判断是否掉落
  if (Math.random() > dropRate) {
    return null
  }

  // 根据品质确定掉落种子
  const dropConfig = config.qualityDrops[harvestedItemQuality]
  if (!dropConfig) return null

  // 再次概率判定
  if (Math.random() > dropConfig.rate) {
    // 降级掉落普通种子
    return { seedId: 'seed_common_herb', quantity: 1 }
  }

  return { seedId: dropConfig.seedId, quantity: 1 }
}

/**
 * 随机数范围
 */
export function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 计算生长进度（百分比）
 */
export function calculateGrowthProgress(plantedAt: number, growthHours: number): number {
  const now = Date.now()
  const elapsed = now - plantedAt
  const totalMs = growthHours * 60 * 60 * 1000
  return Math.min(100, Math.floor((elapsed / totalMs) * 100))
}

/**
 * 检查是否成熟
 */
export function isMature(plantedAt: number, growthHours: number): boolean {
  const now = Date.now()
  const elapsed = now - plantedAt
  const totalMs = growthHours * 60 * 60 * 1000
  return elapsed >= totalMs
}

/**
 * 获取剩余生长时间（毫秒）
 */
export function getRemainingGrowthTime(plantedAt: number, growthHours: number): number {
  const now = Date.now()
  const elapsed = now - plantedAt
  const totalMs = growthHours * 60 * 60 * 1000
  return Math.max(0, totalMs - elapsed)
}

/**
 * 格式化剩余时间
 */
export function formatRemainingTime(ms: number): string {
  if (ms <= 0) return '已成熟'

  const hours = Math.floor(ms / (60 * 60 * 1000))
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))

  if (hours > 0) {
    return `${hours}小时${minutes}分`
  }
  return `${minutes}分钟`
}
