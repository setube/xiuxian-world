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

// ==================== 种子配置 ====================

export interface HerbSeed {
  id: string
  name: string
  quality: ItemQuality
  growthHours: number
  yieldItemId: string
  yieldMin: number
  yieldMax: number
  requiredPlotType: PlotType | 'any'
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
  effect: string
  actionName: string
  action: EventAction
}

export const GARDEN_EVENTS: Record<GardenEventType, GardenEvent | null> = {
  none: null,
  weed: {
    type: 'weed',
    name: '杂草丛生',
    description: '灵田中长满杂草，严重影响灵草生长。',
    effect: '生长速度降低50%',
    actionName: '除草',
    action: 'weed'
  },
  pest: {
    type: 'pest',
    name: '虫害侵扰',
    description: '害虫正在啃食灵草，收成将大幅减少。',
    effect: '产量降低30%',
    actionName: '除虫',
    action: 'pesticide'
  },
  drought: {
    type: 'drought',
    name: '灵气干涸',
    description: '灵田缺水，灵草有枯萎的风险。',
    effect: '20%概率枯萎',
    actionName: '浇水',
    action: 'water'
  }
}

// ==================== 扩建配置 ====================

export const GARDEN_EXPANSION = {
  initialPlots: 3,
  baseCost: 100,
  costMultiplier: 1.5,
  maxNormalPlots: 8,
  elderPlotStart: 8,
  elderPlotEnd: 10
}

// ==================== 丹道长老配置 ====================

export const ALCHEMY_ELDER_REQUIREMENT = {
  minRealmTier: 2,
  minRealmStage: 2,
  contributionCost: 5000
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
 * 获取品质颜色
 */
export function getQualityColor(quality: ItemQuality): string {
  const colors: Record<ItemQuality, string> = {
    common: '#9d9d9d',
    uncommon: '#1eff00',
    rare: '#0070dd',
    epic: '#a335ee',
    legendary: '#ff8000'
  }
  return colors[quality]
}

/**
 * 获取状态显示信息
 */
export function getStatusDisplay(status: PlotStatus): { text: string; color: string } {
  const displays: Record<PlotStatus, { text: string; color: string }> = {
    empty: { text: '空闲', color: '#666' },
    growing: { text: '生长中', color: '#52c41a' },
    mature: { text: '可采收', color: '#faad14' },
    withered: { text: '已枯萎', color: '#f5222d' }
  }
  return displays[status]
}

/**
 * 格式化剩余时间
 */
export function formatRemainingTime(remainingTime: string): string {
  if (!remainingTime || remainingTime === '已成熟') return remainingTime
  return remainingTime
}
