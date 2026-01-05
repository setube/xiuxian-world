/**
 * 元婴宗 - 元婴密卷系统前端常量
 */

// 元婴宗宗门ID
export const YUANYING_SECT_ID = 'yuanying'

// 元婴等级配置
export interface NascentSoulLevelConfig {
  expRequired: number
  cultivationBonusPerCycle: number
  projectionBonusPercent: number
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
  10: { expRequired: 35000, cultivationBonusPerCycle: 500, projectionBonusPercent: 50 },
}

export const MAX_NASCENT_SOUL_LEVEL = 10

// 元神出窍配置
export const SOUL_PROJECTION_CONFIG = {
  minRealm: 4, // 元婴期
  durationMs: 8 * 60 * 60 * 1000, // 8小时
  durationHours: 8,
  interruptPenalty: 0.5,
}

// 灵根类型
export type RootElement = 'metal' | 'wood' | 'water' | 'fire' | 'earth' | 'mixed'

// 灵根显示配置
export const ROOT_ELEMENT_CONFIG: Record<RootElement, { name: string; color: string; icon: string }> = {
  metal: { name: '金灵根', color: '#fbbf24', icon: 'Coins' },
  wood: { name: '木灵根', color: '#22c55e', icon: 'TreePine' },
  water: { name: '水灵根', color: '#3b82f6', icon: 'Droplet' },
  fire: { name: '火灵根', color: '#ef4444', icon: 'Flame' },
  earth: { name: '土灵根', color: '#a16207', icon: 'Mountain' },
  mixed: { name: '混元灵根', color: '#8b5cf6', icon: 'Sparkles' },
}

// 灵根对应产出物品（用于显示）
export const PROJECTION_YIELDS_BY_ROOT: Record<RootElement, { description: string }> = {
  metal: { description: '玄铁矿、精金碎片' },
  wood: { description: '千年灵药、古木精华' },
  water: { description: '寒冰髓、水灵珠' },
  fire: { description: '火灵核、赤炎石' },
  earth: { description: '灵土块、地心玄晶' },
  mixed: { description: '随机获得五行材料' },
}

// 元婴闭关配置
export const NASCENT_CULTIVATION_CONFIG = {
  settleCycleMs: 4 * 60 * 60 * 1000, // 每4小时结算一次
  settleCycleHours: 4,
}

// 问道寻真配置
export const SEEK_TRUTH_CONFIG = {
  expCost: 1000, // 消耗1000修为
  cooldownMs: 12 * 60 * 60 * 1000, // 12小时冷却
  cooldownHours: 12,
  rewards: {
    cultivation: { name: '修为提升', chance: 50, description: '获得500-2000修为' },
    material: { name: '珍稀材料', chance: 30, description: '获得灵石、丹药等' },
    nascentExp: { name: '元婴经验', chance: 15, description: '获得100-300经验' },
    fragment: { name: '剑诀残篇', chance: 5, description: '获得青元剑诀残篇' },
  },
}

// 青元剑诀残篇类型
export type FragmentType = 'upper' | 'middle' | 'lower'

// 青元剑诀配置
export const GREEN_SWORD_CONFIG = {
  expCost: 10000, // 领悟消耗10000修为
  fragmentsRequired: ['upper', 'middle', 'lower'] as FragmentType[],
  effects: {
    swordDamageBonus: 30, // 剑类伤害+30%
    cultivationBonus: 15, // 修炼效率+15%
    specialSkill: 'green_sword_qi',
  },
}

// 青元剑诀残篇显示配置
export const FRAGMENT_CONFIG: Record<FragmentType, { id: string; name: string; description: string }> = {
  upper: {
    id: 'green_sword_fragment_upper',
    name: '青元剑诀·上篇',
    description: '记载剑诀精义，阐述剑道本源'
  },
  middle: {
    id: 'green_sword_fragment_middle',
    name: '青元剑诀·中篇',
    description: '记载剑意心法，修炼剑气根基'
  },
  lower: {
    id: 'green_sword_fragment_lower',
    name: '青元剑诀·下篇',
    description: '记载剑诀奥义，领悟无上剑道'
  },
}

// 元婴状态
export type NascentSoulStatus = 'idle' | 'projecting' | 'cultivating'

// 元婴状态显示配置
export const NASCENT_SOUL_STATUS_CONFIG: Record<NascentSoulStatus, {
  name: string
  color: string
  description: string
}> = {
  idle: {
    name: '静养中',
    color: '#22c55e',
    description: '元婴正在丹田内静养，可以进行出窍或闭关'
  },
  projecting: {
    name: '出窍中',
    color: '#3b82f6',
    description: '元婴正在外出寻宝，完成后可收集材料'
  },
  cultivating: {
    name: '闭关中',
    color: '#a855f7',
    description: '元婴正在闭关修炼，每4小时结算一次修为'
  },
}

// 获取下一级所需经验
export function getExpToNextLevel(currentLevel: number, currentExp: number): number {
  if (currentLevel >= MAX_NASCENT_SOUL_LEVEL) return 0
  const nextLevelConfig = NASCENT_SOUL_LEVELS[currentLevel + 1]
  if (!nextLevelConfig) return 0
  return Math.max(0, nextLevelConfig.expRequired - currentExp)
}

// 获取当前等级进度百分比
export function getLevelProgress(currentLevel: number, currentExp: number): number {
  if (currentLevel >= MAX_NASCENT_SOUL_LEVEL) return 100
  const currentConfig = NASCENT_SOUL_LEVELS[currentLevel]
  const nextConfig = NASCENT_SOUL_LEVELS[currentLevel + 1]
  if (!currentConfig || !nextConfig) return 0

  const expInCurrentLevel = currentExp - currentConfig.expRequired
  const expNeededForLevel = nextConfig.expRequired - currentConfig.expRequired
  return Math.min(100, Math.max(0, (expInCurrentLevel / expNeededForLevel) * 100))
}
