/**
 * 试炼古塔配置
 * 一座通天古塔，塔内有无数强大守卫
 */

// ========== 基础配置 ==========
export const TOWER_CONFIG = {
  maxFloor: 100, // 最高层数
  dailyFreeAttempts: 1, // 每日免费挑战次数
  resetCostBase: 1000, // 重置消耗基础修为
  resetCostMultiplier: 1.5, // 每次重置消耗倍数
  maxDailyResets: 3, // 每日最大重置次数

  // 精英层和首领层
  eliteFloorInterval: 5, // 精英层间隔（5的倍数）
  bossFloorInterval: 10, // 首领层间隔（10的倍数）

  // 高阶加成（结丹及以上）
  highRealmBonusThreshold: 3, // 结丹期
  highRealmBonusMultiplier: 1.5, // 奖励加成倍数

  // 战斗配置
  baseRounds: 30, // 基础战斗回合
  roundsPerFloor: 1 // 每层增加回合数
} as const

// ========== 层级类型 ==========
export enum FloorType {
  NORMAL = 'normal', // 普通层
  ELITE = 'elite', // 精英层（5的倍数）
  BOSS = 'boss' // 首领层（10的倍数）
}

// ========== 层级配置 ==========
export interface FloorConfig {
  floor: number
  type: FloorType
  name: string
  guardianName: string
  powerMultiplier: number // 战力倍数（相对玩家）
  rewards: FloorRewards
  firstClearRewards: FloorRewards // 首通奖励
}

export interface FloorRewards {
  spiritStones: number
  experience: number
  items?: { itemId: string; count: number; chance: number }[]
}

// ========== 守卫名称模板 ==========
const GUARDIAN_NAMES = {
  normal: ['石傀儡', '铁甲卫', '魔化兵', '幻影士', '暗夜卫'],
  elite: ['精英守卫', '护塔使者', '古塔将军', '封印魔将', '镇塔神将'],
  boss: [
    '第一层守护者·玄武',
    '第二层守护者·白虎',
    '第三层守护者·青龙',
    '第四层守护者·朱雀',
    '第五层守护者·麒麟',
    '第六层守护者·应龙',
    '第七层守护者·凤凰',
    '第八层守护者·黄龙',
    '第九层守护者·混沌',
    '塔顶守护者·鸿钧'
  ]
}

/**
 * 获取层级类型
 */
export function getFloorType(floor: number): FloorType {
  if (floor % TOWER_CONFIG.bossFloorInterval === 0) {
    return FloorType.BOSS
  }
  if (floor % TOWER_CONFIG.eliteFloorInterval === 0) {
    return FloorType.ELITE
  }
  return FloorType.NORMAL
}

/**
 * 获取守卫名称
 */
export function getGuardianName(floor: number, type: FloorType): string {
  if (type === FloorType.BOSS) {
    const bossIndex = Math.floor(floor / TOWER_CONFIG.bossFloorInterval) - 1
    return GUARDIAN_NAMES.boss[Math.min(bossIndex, GUARDIAN_NAMES.boss.length - 1)]
  }
  if (type === FloorType.ELITE) {
    const eliteIndex = (floor / TOWER_CONFIG.eliteFloorInterval - 1) % GUARDIAN_NAMES.elite.length
    return `${GUARDIAN_NAMES.elite[eliteIndex]}·第${floor}层`
  }
  const normalIndex = (floor - 1) % GUARDIAN_NAMES.normal.length
  return `${GUARDIAN_NAMES.normal[normalIndex]}·第${floor}层`
}

/**
 * 获取层级战力倍数
 */
export function getFloorPowerMultiplier(floor: number, type: FloorType): number {
  // 基础倍数随层数增长
  const baseMultiplier = 0.8 + floor * 0.03

  // 不同类型的额外倍数
  switch (type) {
    case FloorType.BOSS:
      return baseMultiplier * 1.5
    case FloorType.ELITE:
      return baseMultiplier * 1.2
    default:
      return baseMultiplier
  }
}

/**
 * 获取层级奖励
 */
export function getFloorRewards(floor: number, type: FloorType): FloorRewards {
  // 基础奖励随层数增长
  const baseStones = 50 + floor * 20
  const baseExp = 100 + floor * 50

  switch (type) {
    case FloorType.BOSS:
      return {
        spiritStones: baseStones * 5,
        experience: baseExp * 5,
        items: [
          { itemId: 'pill_breakthrough', count: 1, chance: 30 },
          { itemId: 'stone_spirit', count: 3, chance: 50 }
        ]
      }
    case FloorType.ELITE:
      return {
        spiritStones: baseStones * 2,
        experience: baseExp * 2,
        items: [{ itemId: 'stone_spirit', count: 1, chance: 40 }]
      }
    default:
      return {
        spiritStones: baseStones,
        experience: baseExp
      }
  }
}

/**
 * 获取首通奖励
 */
export function getFirstClearRewards(floor: number, type: FloorType): FloorRewards {
  if (type === FloorType.BOSS) {
    const bossIndex = floor / TOWER_CONFIG.bossFloorInterval
    return {
      spiritStones: 1000 * bossIndex,
      experience: 2000 * bossIndex,
      items: [
        { itemId: 'tower_chest_boss', count: 1, chance: 100 },
        { itemId: 'pill_rare', count: bossIndex, chance: 50 }
      ]
    }
  }
  if (type === FloorType.ELITE) {
    const eliteIndex = floor / TOWER_CONFIG.eliteFloorInterval
    return {
      spiritStones: 300 * eliteIndex,
      experience: 500 * eliteIndex,
      items: [{ itemId: 'tower_chest_elite', count: 1, chance: 100 }]
    }
  }
  return {
    spiritStones: 0,
    experience: 0
  }
}

/**
 * 获取完整层级配置
 */
export function getFloorConfig(floor: number): FloorConfig {
  const type = getFloorType(floor)
  return {
    floor,
    type,
    name: `第${floor}层`,
    guardianName: getGuardianName(floor, type),
    powerMultiplier: getFloorPowerMultiplier(floor, type),
    rewards: getFloorRewards(floor, type),
    firstClearRewards: getFirstClearRewards(floor, type)
  }
}

/**
 * 计算重置消耗
 */
export function getResetCost(resetCount: number): number {
  return Math.floor(TOWER_CONFIG.resetCostBase * Math.pow(TOWER_CONFIG.resetCostMultiplier, resetCount))
}

/**
 * 全服首杀奖励
 */
export const SERVER_FIRST_REWARDS = {
  spiritStones: 10000,
  experience: 20000,
  title: '天道宠儿', // 称号
  announcement: true // 全服公告
} as const
