/**
 * 落云宗 - 灵眼之树系统常量
 */

// 落云宗宗门ID
export const LUOYUN_SECT_ID = 'luoyun'

// 灵眼之树状态
export type LingyanTreeStatus = 'growing' | 'harvesting' | 'invaded'

// ========== 环境系统 ==========

// 环境类型
export type TreeEnvironment = 'thirsty' | 'unstable' | 'withered' | 'frozen' | 'overgrown'

// 五行元素类型
export type ElementType = 'water' | 'earth' | 'wood' | 'fire' | 'metal'

// 环境配置
export interface EnvironmentConfig {
  name: string
  description: string
  requiredElement: ElementType
  penaltyPerHour: number // 未满足时每小时成熟度惩罚
  icon: string
}

export const ENVIRONMENT_CONFIG: Record<TreeEnvironment, EnvironmentConfig> = {
  thirsty: {
    name: '干渴',
    description: '土壤干裂，急需水灵力滋润',
    requiredElement: 'water',
    penaltyPerHour: 500, // 5%成熟度 (500/10000)
    icon: 'Droplets'
  },
  unstable: {
    name: '根基松动',
    description: '根系不稳，需要土灵力加固',
    requiredElement: 'earth',
    penaltyPerHour: 500,
    icon: 'Mountain'
  },
  withered: {
    name: '生机萎靡',
    description: '缺乏生机，需要木灵力注入',
    requiredElement: 'wood',
    penaltyPerHour: 500,
    icon: 'Leaf'
  },
  frozen: {
    name: '寒气侵蚀',
    description: '寒气入侵，需要火灵力驱散',
    requiredElement: 'fire',
    penaltyPerHour: 500,
    icon: 'Flame'
  },
  overgrown: {
    name: '枝叶杂乱',
    description: '枝叶疯长，需要金灵力修剪',
    requiredElement: 'metal',
    penaltyPerHour: 500,
    icon: 'Scissors'
  }
}

// 所有环境类型列表
export const ALL_ENVIRONMENTS: TreeEnvironment[] = ['thirsty', 'unstable', 'withered', 'frozen', 'overgrown']

// 环境变化配置
export const ENVIRONMENT_CHANGE_CONFIG = {
  intervalMs: 60 * 60 * 1000, // 每小时变化一次
  satisfyElementAmount: 20 // 满足环境需要的元素量
}

// ========== 成长阶段系统 ==========

// 成长阶段配置
export interface GrowthStageConfig {
  name: string
  woodRequired: number // 进入此阶段所需的累计木元素
  maxPatterns: number // 此阶段可获得的最大灵纹数
  description: string
}

export const GROWTH_STAGE_CONFIG: Record<number, GrowthStageConfig> = {
  1: {
    name: '萌芽期',
    woodRequired: 0,
    maxPatterns: 1,
    description: '灵眼之树初生，蕴含一缕木灵'
  },
  2: {
    name: '生长期',
    woodRequired: 100,
    maxPatterns: 2,
    description: '枝叶舒展，灵纹初显'
  },
  3: {
    name: '成熟期',
    woodRequired: 300,
    maxPatterns: 3,
    description: '根深叶茂，灵纹璀璨'
  },
  4: {
    name: '结果期',
    woodRequired: 600,
    maxPatterns: 4,
    description: '灵果欲坠，四纹齐聚'
  }
}

export const MAX_GROWTH_STAGE = 4
export const MAX_SPIRIT_PATTERNS = 4

// ========== 果实品质系统 ==========

// 果实品质配置
export interface FruitQualityConfig {
  name: string
  baseCultivation: number // 基础修为奖励
  bonusItems: { itemId: string; quantity: number }[]
  color: string // 品质颜色
}

export const FRUIT_QUALITY_CONFIG: Record<number, FruitQualityConfig> = {
  0: {
    name: '凡品',
    baseCultivation: 5000,
    bonusItems: [],
    color: '#9ca3af' // 灰色
  },
  1: {
    name: '灵品',
    baseCultivation: 10000,
    bonusItems: [{ itemId: 'spirit_herb_common', quantity: 2 }],
    color: '#22c55e' // 绿色
  },
  2: {
    name: '仙品',
    baseCultivation: 18000,
    bonusItems: [{ itemId: 'spirit_herb_uncommon', quantity: 1 }],
    color: '#3b82f6' // 蓝色
  },
  3: {
    name: '极品',
    baseCultivation: 25000,
    bonusItems: [{ itemId: 'demon_pill_tier2', quantity: 1 }],
    color: '#a855f7' // 紫色
  },
  4: {
    name: '神品',
    baseCultivation: 30000,
    bonusItems: [{ itemId: 'spirit_herb_rare', quantity: 1 }],
    color: '#f59e0b' // 金色
  }
}

// ========== 灵根贡献系统 ==========

// 灵根元素映射配置
export interface SpiritRootElementMapping {
  primaryElement: ElementType | null // 主要元素
  secondaryElement: ElementType | null // 次要元素（天灵根才有）
  woodConversionRate: number // 木元素转化率
  isHeavenly: boolean // 是否天灵根
  canSatisfyAnyEnvironment: boolean // 是否可满足任意环境（伪/废灵根）
}

// 灵根ID到元素的映射
export const SPIRIT_ROOT_ELEMENT_MAP: Record<string, SpiritRootElementMapping> = {
  // 五行单灵根
  metal_pure: {
    primaryElement: 'metal',
    secondaryElement: null,
    woodConversionRate: 0.7,
    isHeavenly: false,
    canSatisfyAnyEnvironment: false
  },
  wood_pure: {
    primaryElement: 'wood',
    secondaryElement: null,
    woodConversionRate: 1.0,
    isHeavenly: false,
    canSatisfyAnyEnvironment: false
  },
  water_pure: {
    primaryElement: 'water',
    secondaryElement: null,
    woodConversionRate: 0.7,
    isHeavenly: false,
    canSatisfyAnyEnvironment: false
  },
  fire_pure: {
    primaryElement: 'fire',
    secondaryElement: null,
    woodConversionRate: 0.7,
    isHeavenly: false,
    canSatisfyAnyEnvironment: false
  },
  earth_pure: {
    primaryElement: 'earth',
    secondaryElement: null,
    woodConversionRate: 0.7,
    isHeavenly: false,
    canSatisfyAnyEnvironment: false
  },

  // 天灵根（双属性+双倍）
  metal_heaven: {
    primaryElement: 'metal',
    secondaryElement: 'wood',
    woodConversionRate: 2.0,
    isHeavenly: true,
    canSatisfyAnyEnvironment: false
  },
  wood_heaven: {
    primaryElement: 'wood',
    secondaryElement: 'wood',
    woodConversionRate: 2.0,
    isHeavenly: true,
    canSatisfyAnyEnvironment: false
  },
  water_heaven: {
    primaryElement: 'water',
    secondaryElement: 'wood',
    woodConversionRate: 2.0,
    isHeavenly: true,
    canSatisfyAnyEnvironment: false
  },
  fire_heaven: {
    primaryElement: 'fire',
    secondaryElement: 'wood',
    woodConversionRate: 2.0,
    isHeavenly: true,
    canSatisfyAnyEnvironment: false
  },
  earth_heaven: {
    primaryElement: 'earth',
    secondaryElement: 'wood',
    woodConversionRate: 2.0,
    isHeavenly: true,
    canSatisfyAnyEnvironment: false
  },

  // 真灵根（双属性）
  metal_wood: {
    primaryElement: 'metal',
    secondaryElement: 'wood',
    woodConversionRate: 0.85,
    isHeavenly: false,
    canSatisfyAnyEnvironment: false
  },
  metal_water: {
    primaryElement: 'metal',
    secondaryElement: 'water',
    woodConversionRate: 0.7,
    isHeavenly: false,
    canSatisfyAnyEnvironment: false
  },
  metal_fire: {
    primaryElement: 'metal',
    secondaryElement: 'fire',
    woodConversionRate: 0.7,
    isHeavenly: false,
    canSatisfyAnyEnvironment: false
  },
  metal_earth: {
    primaryElement: 'metal',
    secondaryElement: 'earth',
    woodConversionRate: 0.7,
    isHeavenly: false,
    canSatisfyAnyEnvironment: false
  },
  wood_water: {
    primaryElement: 'wood',
    secondaryElement: 'water',
    woodConversionRate: 0.85,
    isHeavenly: false,
    canSatisfyAnyEnvironment: false
  },
  wood_fire: {
    primaryElement: 'wood',
    secondaryElement: 'fire',
    woodConversionRate: 0.85,
    isHeavenly: false,
    canSatisfyAnyEnvironment: false
  },
  wood_earth: {
    primaryElement: 'wood',
    secondaryElement: 'earth',
    woodConversionRate: 0.85,
    isHeavenly: false,
    canSatisfyAnyEnvironment: false
  },
  water_fire: {
    primaryElement: 'water',
    secondaryElement: 'fire',
    woodConversionRate: 0.7,
    isHeavenly: false,
    canSatisfyAnyEnvironment: false
  },
  water_earth: {
    primaryElement: 'water',
    secondaryElement: 'earth',
    woodConversionRate: 0.7,
    isHeavenly: false,
    canSatisfyAnyEnvironment: false
  },
  fire_earth: {
    primaryElement: 'fire',
    secondaryElement: 'earth',
    woodConversionRate: 0.7,
    isHeavenly: false,
    canSatisfyAnyEnvironment: false
  },

  // 伪灵根/废灵根（可救场，低转化率）
  pseudo: { primaryElement: null, secondaryElement: null, woodConversionRate: 0.3, isHeavenly: false, canSatisfyAnyEnvironment: true },
  waste: { primaryElement: null, secondaryElement: null, woodConversionRate: 0.3, isHeavenly: false, canSatisfyAnyEnvironment: true },

  // 混元灵根
  mixed: { primaryElement: null, secondaryElement: null, woodConversionRate: 0.5, isHeavenly: false, canSatisfyAnyEnvironment: true }
}

// 默认灵根配置（未知灵根时使用）
export const DEFAULT_SPIRIT_ROOT_MAPPING: SpiritRootElementMapping = {
  primaryElement: null,
  secondaryElement: null,
  woodConversionRate: 0.5,
  isHeavenly: false,
  canSatisfyAnyEnvironment: true
}

// ========== 工具函数 ==========

/**
 * 获取灵根的元素映射
 */
export function getSpiritRootElementMapping(spiritRootId: string): SpiritRootElementMapping {
  return SPIRIT_ROOT_ELEMENT_MAP[spiritRootId] || DEFAULT_SPIRIT_ROOT_MAPPING
}

/**
 * 检查灵根是否能满足指定环境
 */
export function canSatisfyEnvironment(spiritRootId: string, environment: TreeEnvironment): boolean {
  const mapping = getSpiritRootElementMapping(spiritRootId)
  const requiredElement = ENVIRONMENT_CONFIG[environment].requiredElement

  // 伪灵根/废灵根可以满足任意环境
  if (mapping.canSatisfyAnyEnvironment) {
    return true
  }

  // 检查主元素或次元素是否匹配
  return mapping.primaryElement === requiredElement || mapping.secondaryElement === requiredElement
}

/**
 * 计算灵根贡献的元素类型和木元素转化量
 */
export function calculateElementContribution(
  spiritRootId: string,
  baseAmount: number
): {
  primaryElement: ElementType | null
  primaryAmount: number
  woodAmount: number
} {
  const mapping = getSpiritRootElementMapping(spiritRootId)

  // 计算木元素转化量
  const woodAmount = Math.floor(baseAmount * mapping.woodConversionRate)

  return {
    primaryElement: mapping.primaryElement,
    primaryAmount: baseAmount,
    woodAmount
  }
}

/**
 * 随机选择下一个环境
 */
export function getRandomEnvironment(currentEnvironment?: TreeEnvironment): TreeEnvironment {
  // 过滤掉当前环境，避免连续相同
  const availableEnvironments = currentEnvironment ? ALL_ENVIRONMENTS.filter(e => e !== currentEnvironment) : ALL_ENVIRONMENTS

  const randomIndex = Math.floor(Math.random() * availableEnvironments.length)
  return availableEnvironments[randomIndex]
}

/**
 * 根据木元素累计量计算当前阶段
 */
export function calculateGrowthStage(totalWoodElement: number): number {
  for (let stage = MAX_GROWTH_STAGE; stage >= 1; stage--) {
    if (totalWoodElement >= GROWTH_STAGE_CONFIG[stage].woodRequired) {
      return stage
    }
  }
  return 1
}

/**
 * 获取阶段进度百分比
 */
export function getStageProgress(totalWoodElement: number, currentStage: number): number {
  const currentConfig = GROWTH_STAGE_CONFIG[currentStage]
  const nextStage = currentStage + 1

  if (nextStage > MAX_GROWTH_STAGE) {
    return 100 // 已达最高阶段
  }

  const nextConfig = GROWTH_STAGE_CONFIG[nextStage]
  const stageWoodNeeded = nextConfig.woodRequired - currentConfig.woodRequired
  const currentWoodInStage = totalWoodElement - currentConfig.woodRequired

  return Math.min(100, Math.floor((currentWoodInStage / stageWoodNeeded) * 100))
}

/**
 * 根据灵纹数量获取果实品质
 */
export function getFruitQuality(spiritPatterns: number): FruitQualityConfig {
  const patterns = Math.min(spiritPatterns, MAX_SPIRIT_PATTERNS)
  return FRUIT_QUALITY_CONFIG[patterns] || FRUIT_QUALITY_CONFIG[0]
}

// 灵眼之树基础配置
export const LINGYAN_TREE_CONFIG = {
  maxMaturity: 10000, // 100.00% (0-10000 表示 0-100.00%)
  invasionDurationMs: 3 * 60 * 60 * 1000, // 3小时
  minDefendersToSucceed: 3, // 最少需要3人防御才能成功
  harvestWindowMs: 24 * 60 * 60 * 1000 // 收获窗口期24小时
}

// 浇灌配置
export const WATERING_CONFIG = {
  expCost: 50, // 消耗50修为
  maturityGain: 50, // 增加0.5%成熟度 (50/10000)
  contributionGain: 10, // 增加10贡献
  dailyLimit: 1, // 每日1次
  woodRootBonus: 2.0, // 木灵根双倍贡献
  elementAmount: 10 // 浇灌贡献的元素量
}

// 妖丹配置接口
export interface DemonPillConfig {
  id: string
  name: string
  maturityGain: number
  contributionGain: number
  elementAmount: number // 元素贡献量
}

// 妖丹配置
export const DEMON_PILL_CONFIG: Record<number, DemonPillConfig> = {
  1: { id: 'demon_pill_tier1', name: '一阶妖丹', maturityGain: 20, contributionGain: 10, elementAmount: 5 },
  2: { id: 'demon_pill_tier2', name: '二阶妖丹', maturityGain: 50, contributionGain: 30, elementAmount: 12 },
  3: { id: 'demon_pill_tier3', name: '三阶妖丹', maturityGain: 100, contributionGain: 60, elementAmount: 25 },
  4: { id: 'demon_pill_tier4', name: '四阶妖丹', maturityGain: 200, contributionGain: 100, elementAmount: 50 },
  5: { id: 'demon_pill_tier5', name: '五阶妖丹', maturityGain: 500, contributionGain: 200, elementAmount: 100 }
}

// 获取妖丹配置
export const getDemonPillConfig = (tier: number): DemonPillConfig | undefined => {
  return DEMON_PILL_CONFIG[tier]
}

// 防御配置
export const DEFENSE_CONFIG = {
  contributionReward: 20 // 参与防御额外贡献
}

// 收获配置
export const HARVEST_CONFIG = {
  baseRewards: {
    itemId: 'lingyan_branch',
    quantity: 1,
    expBonus: 200
  },
  topRewards: {
    itemId: 'lingyan_liquid',
    ranks: {
      1: 3, // 第1名: 3瓶
      2: 2, // 第2名: 2瓶
      3: 2, // 第3名: 2瓶
      4: 1,
      5: 1,
      6: 1,
      7: 1,
      8: 1,
      9: 1,
      10: 1 // 4-10名: 各1瓶
    } as Record<number, number>
  }
}

// 获取排名奖励数量
export const getTopRewardQuantity = (rank: number): number => {
  return HARVEST_CONFIG.topRewards.ranks[rank] || 0
}

// 叛教惩罚配置
export const BETRAYAL_CONFIG = {
  penaltyDurationMs: 7 * 24 * 60 * 60 * 1000, // 7天
  resourcePenaltyPercent: 30 // 30%产出减少
}

// 灵眼之液效果配置
export const LINGYAN_LIQUID_EFFECTS = {
  rootUpgrade: {
    usageLimit: 1 // 终身仅限一次
  },
  herbRipening: {
    speedMultiplier: 2.0, // 2倍成熟速度
    durationMs: 4 * 60 * 60 * 1000 // 持续4小时
  }
}

// 灵眼之液效果类型
export type LingyanLiquidEffect = 'root' | 'herb'

// 贡献排名接口
export interface ContributionRanking {
  rank: number
  characterId: string
  characterName: string
  contribution: number
  rewardQuantity: number
}

// 灵眼之树状态接口
export interface LingyanTreeState {
  maturity: number
  maturityPercent: number
  cycle: number
  status: LingyanTreeStatus
  invasionStartedAt: number | null
  invasionTimeRemaining: number | null
  defendersCount: number
  defendersNeeded: number
  canHarvest: boolean
  // 环境系统
  environment: TreeEnvironment
  lastEnvironmentChangeAt: number
  environmentSatisfied: boolean
  environmentSatisfiedBy: string | null
  // 成长阶段系统
  currentStage: number
  stageElementPool: Record<ElementType, number>
  spiritPatterns: number
}

// 玩家贡献状态接口
export interface PlayerContributionState {
  contribution: number
  rank: number
  canWater: boolean
  wateredToday: boolean
  defendedInvasion: boolean
  rewardsClaimed: boolean
  estimatedReward: {
    base: { itemId: string; quantity: number; exp: number }
    bonus: { itemId: string; quantity: number } | null
  }
  // 元素贡献
  elementContributions: Record<ElementType, number>
  environmentSatisfyCount: number
}

// 今日日期字符串 (用于每日重置检查)
export const getTodayDateString = (): string => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
