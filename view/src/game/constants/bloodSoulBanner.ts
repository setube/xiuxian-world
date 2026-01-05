/**
 * 血魂幡系统前端常量配置
 * 镜像后端配置，用于UI展示
 */

// ==================== 血魂幡等级配置 ====================

export interface BannerLevelConfig {
  slots: number // 炼化槽数量
  maxSoulGrade: number // 可炼化魂魄最高等级
  upgradeCost: number // 升级消耗阴魂丝数量
}

export const BANNER_LEVEL_CONFIG: Record<number, BannerLevelConfig> = {
  1: { slots: 1, maxSoulGrade: 1, upgradeCost: 0 },
  2: { slots: 1, maxSoulGrade: 1, upgradeCost: 500 },
  3: { slots: 2, maxSoulGrade: 2, upgradeCost: 1000 },
  4: { slots: 2, maxSoulGrade: 2, upgradeCost: 2000 },
  5: { slots: 3, maxSoulGrade: 3, upgradeCost: 4000 },
  6: { slots: 3, maxSoulGrade: 3, upgradeCost: 8000 },
  7: { slots: 4, maxSoulGrade: 4, upgradeCost: 15000 },
  8: { slots: 4, maxSoulGrade: 4, upgradeCost: 25000 },
  9: { slots: 5, maxSoulGrade: 4, upgradeCost: 40000 },
  10: { slots: 5, maxSoulGrade: 4, upgradeCost: 60000 }
}

export const BANNER_MAX_LEVEL = 10

// ==================== 魂魄类型配置 ====================

export interface SoulTypeConfig {
  id: string
  name: string
  grade: number // 魂魄等级
  refineTimeMs: number // 炼化时间（毫秒）
  shaCost: number // 消耗煞气
  obtainMethod: string // 获取途径描述
  primaryOutput: string // 核心产出名称
  rareOutput: string // 稀有产出名称
  rareChance: number // 稀有产出几率
}

export const SOUL_TYPES: Record<string, SoulTypeConfig> = {
  grievance_soul: {
    id: 'grievance_soul',
    name: '怨魂',
    grade: 1,
    refineTimeMs: 30 * 60 * 1000,
    shaCost: 20,
    obtainMethod: 'PvP胜利20%几率',
    primaryOutput: '阴魂丝 1-3',
    rareOutput: '凝血草',
    rareChance: 15
  },
  cultivator_remnant: {
    id: 'cultivator_remnant',
    name: '修士残魂',
    grade: 2,
    refineTimeMs: 60 * 60 * 1000,
    shaCost: 40,
    obtainMethod: 'PvP胜利10%几率',
    primaryOutput: '二级妖丹 1-2',
    rareOutput: '养魂木',
    rareChance: 20
  },
  beast_spirit: {
    id: 'beast_spirit',
    name: '妖兽精魄',
    grade: 3,
    refineTimeMs: 2 * 60 * 60 * 1000,
    shaCost: 80,
    obtainMethod: '血洗山林',
    primaryOutput: '三级妖丹 1-2',
    rareOutput: '清灵草',
    rareChance: 25
  },
  fierce_soul: {
    id: 'fierce_soul',
    name: '凶兽戾魄',
    grade: 4,
    refineTimeMs: 4 * 60 * 60 * 1000,
    shaCost: 150,
    obtainMethod: '召唤魔影',
    primaryOutput: '四级妖丹 1',
    rareOutput: '法则碎片·暗',
    rareChance: 10
  }
}

// ==================== 煞气池配置 ====================

export const SHA_POOL_CONFIG = {
  // 每日献祭
  dailySacrifice: {
    baseSha: 10,
    killCountBonus: 0.5,
    maxBonus: 50
  },
  // 化功为煞
  cultivationToSha: {
    ratio: 5,
    dailyLimit: 100
  },
  // PvP煞气获取
  pvpShaGain: {
    min: 50,
    max: 100
  },
  // 煞气上限
  maxShaEnergy: 100,
  // 战力加成
  shaEnergyBonus: 0.5,
  killCountBonus: 0.1,
  maxKillCountBonus: 50
}

// ==================== 稳定度配置 ====================

export const STABILITY_CONFIG = {
  decayIntervalMs: 30 * 60 * 1000,
  decayAmount: 10,
  maintenanceCost: 10,
  maintenanceRestore: 30,
  failureThreshold: 20,
  failurePenalty: 0.5
}

// ==================== 血洗山林配置 ====================

export const BLOOD_FOREST_CONFIG = {
  minRealm: 2,
  dailyLimit: 5,
  shaCost: 30,
  realmName: '筑基期'
}

// ==================== 召唤魔影配置 ====================

export const SHADOW_SUMMON_CONFIG = {
  minRealm: 3,
  dailyLimit: 3,
  sacrificeItemName: '三级妖丹',
  sacrificeQuantity: 5,
  realmName: '结丹期'
}

// ==================== 辅助函数 ====================

/**
 * 格式化炼化时间
 */
export function formatRefineTime(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000))
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))

  if (hours > 0) {
    return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`
  }
  return `${minutes}分钟`
}

/**
 * 获取魂魄等级颜色
 */
export function getSoulGradeColor(grade: number): string {
  const colors: Record<number, string> = {
    1: '#a8a8a8', // 灰色
    2: '#4ade80', // 绿色
    3: '#60a5fa', // 蓝色
    4: '#c084fc' // 紫色
  }
  return colors[grade] || '#a8a8a8'
}

/**
 * 获取魂魄等级名称
 */
export function getSoulGradeName(grade: number): string {
  const names: Record<number, string> = {
    1: '凡品',
    2: '良品',
    3: '上品',
    4: '极品'
  }
  return names[grade] || '未知'
}

/**
 * 获取稳定度颜色
 */
export function getStabilityColor(stability: number): string {
  if (stability >= 70) return '#4ade80' // 绿色
  if (stability >= 40) return '#fbbf24' // 黄色
  if (stability >= 20) return '#f97316' // 橙色
  return '#ef4444' // 红色
}
