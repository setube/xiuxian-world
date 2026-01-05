/**
 * 黑煞教 - 魔道禁术系统常量配置
 *
 * 黑煞教四大魔道禁术：
 * 1. 夺舍魔功 - 奴役其他玩家
 * 2. 魔染红尘 - 窃取星宫弟子侍妾
 * 3. 煞气淬体 - 击败敌人累积煞气提升战力
 * 4. 丹魔之咒 - 隔空下咒吸取他人修为
 */

// 黑煞教宗门ID
export const HEISHA_SECT_ID = 'heisha'

// ========== 夺舍魔功配置 ==========
export const SOUL_SEIZE_CONFIG = {
  minRealm: 2, // 筑基期
  cooldownMs: 3 * 60 * 60 * 1000, // 3小时冷却
  enslaveDurationMs: 35 * 60 * 1000, // 奴役35分钟
  baseSuccessRate: 60, // 基础成功率60%
  realmBonusRate: 5, // 每高一个境界+5%成功率
  backlashHpPercent: 20, // 反噬损失20%生命
  cultivationCost: 100, // 消耗修为
  maxPuppets: 3, // 最多同时拥有3个傀儡
  puppetCombatBonusPercent: 30, // 每个傀儡+30%战力
  maxPuppetBonus: 100 // 傀儡加成上限100%
} as const

// ========== 魔染红尘（侍妾窃取）配置 ==========
export const CONSORT_THEFT_CONFIG = {
  minRealm: 3, // 结丹期
  cooldownMs: 24 * 60 * 60 * 1000, // 24小时冷却
  stolenDurationMs: 24 * 60 * 60 * 1000, // 窃取持续24小时
  brainwash: {
    maxCount: 3, // 每日最多3次
    cultivationGain: 200 // 每次获得200修为
  },
  extract: {
    maxCount: 2, // 每日最多2次
    durationMs: 60 * 60 * 1000, // 加成持续1小时
    attributeBonus: {
      attack: 5,
      defense: 3
    }
  }
} as const

// ========== 煞气淬体配置 ==========
export const SHA_ENERGY_CONFIG = {
  pvpKillGain: 10, // PvP击杀获得
  pveKillGainBase: 2, // PvE基础获得
  pveRealmMultiplier: 0.5, // 每境界额外+0.5
  bonusPerPoint: 0.5, // 每点煞气+0.5%战力
  maxBonusPercent: 50, // 最大50%加成
  maxShaEnergy: 100, // 煞气上限
  dailyDecay: 5 // 每日衰减5点
} as const

// ========== 丹魔之咒配置 ==========
export const DEMON_CURSE_CONFIG = {
  // 下咒所需物品
  curseItemId: 'danmo_xinlian',
  curseItemCost: 1,

  // 下咒修为消耗
  cultivationCost: 500,

  // 咒印持续时间（12小时）
  curseDurationMs: 12 * 60 * 60 * 1000,

  // 修为吸取间隔（10分钟）
  drainIntervalMs: 10 * 60 * 1000,

  // 每次吸取修为范围
  drainAmountMin: 100,
  drainAmountMax: 200,

  // 炼丹/炼器成功率降低
  alchemyPenalty: 0.10, // 10%

  // 成功率计算
  baseSuccessRate: 50, // 基础成功率50%
  realmBonusRate: 10, // 每高一个境界+10%
  realmPenaltyRate: 15, // 每低一个境界-15%
  minSuccessRate: 10, // 最低成功率10%
  maxSuccessRate: 95, // 最高成功率95%

  // 咒印类型
  curseType: 'danmo_erosion' // 丹魔侵蚀
} as const

// 解咒丹药ID
export const CURSE_ANTIDOTE_ID = 'jiuzhuan_jie_dan'

// ========== 简易PvP配置 ==========
export const PVP_CONFIG = {
  dailyChallengeLimit: 5, // 每日发起上限
  basePowerVariance: 0.1, // 战力浮动10%
  winnerCultivationGain: 50, // 胜者获得修为
  loserCultivationLoss: 20, // 败者损失修为
  winnerShaGain: 10, // 胜者获得煞气（黑煞教专属）
  minRealm: 2 // 最低筑基期可参与
} as const

// ========== 奴役限制 ==========
export const ENSLAVE_RESTRICTIONS = {
  // 被奴役时禁止的功能
  blockedFeatures: [
    'cultivation', // 闭关修炼
    'breakthrough', // 突破
    'taiyi_arts', // 太一道法
    'starpalace', // 星宫功能
    'herb_garden' // 药园
  ],
  // 被奴役时允许的功能
  allowedFeatures: [
    'chat', // 聊天
    'inventory', // 背包
    'sect', // 宗门基础
    'market', // 市场
    'auction' // 拍卖
  ]
} as const

// ========== 傀儡状态 ==========
export type PuppetStatus = 'active' | 'expired'

// ========== 被窃取侍妾状态 ==========
export type StolenConsortStatus = 'active' | 'returned'

// ========== PvP挑战结果 ==========
export type PvpChallengeResult = 'pending' | 'challenger_win' | 'defender_win' | 'draw'

// ========== 类型定义 ==========
export interface ShaEnergyStatus {
  current: number
  max: number
  bonusPercent: number
  nextDecay: number
  decayAmount: number
}

export interface PuppetInfo {
  id: string
  puppetId: string
  puppetName: string
  enslaveStartAt: number
  enslaveExpiresAt: number
  remainingMs: number
}

export interface StolenConsortInfo {
  id: string
  consortId: string
  consortName: string
  originalOwnerName: string
  stolenAt: number
  expiresAt: number
  remainingMs: number
  brainwashCount: number
  brainwashMaxCount: number
  extractCount: number
  extractMaxCount: number
}

export interface HeishaStatus {
  // 基础状态
  isMember: boolean
  realm: number

  // 煞气系统
  shaEnergy: ShaEnergyStatus

  // 夺舍系统
  soulSeize: {
    canUse: boolean
    cooldownMs: number
    puppetCount: number
    maxPuppets: number
    puppetBonus: number // 傀儡提供的战力加成百分比
  }

  // 侍妾窃取系统
  consortTheft: {
    canUse: boolean
    cooldownMs: number
    hasStolenConsort: boolean
  }

  // 强索元阴加成状态
  extractBuff: {
    active: boolean
    expiresAt: number | null
    bonus: { attack: number; defense: number } | null
  }
}

export interface SeizeResult {
  success: boolean
  message: string
  puppet?: PuppetInfo
  backlash?: {
    hpLost: number
    currentHp: number
  }
}

export interface PvpChallengeInfo {
  id: string
  challengerId: string
  challengerName: string
  defenderId: string
  defenderName: string
  result: PvpChallengeResult
  challengerPower: number
  defenderPower: number
  rewards: {
    winnerId: string | null
    cultivationChange: number
    shaEnergyGain: number
  }
  createdAt: number
}

export interface PvpStatus {
  dailyChallenges: number
  maxChallenges: number
  canChallenge: boolean
}

export interface PvpTarget {
  id: string
  name: string
  realm: number
  realmName: string
  power: number
  sectId: string | null
  sectName: string | null
}

// ========== 丹魔之咒类型定义 ==========

// 咒印状态
export interface CurseStatus {
  isCursed: boolean
  curseType: string | null
  casterName: string | null
  startTime: number | null
  expiresAt: number | null
  remainingMs: number | null
  storedCultivation: number
}

// 施咒者的咒印记录
export interface CasterCurseRecord {
  targetId: string
  targetName: string
  storedCultivation: number
  expiresAt: number
  remainingMs: number
}

// 下咒结果
export interface CastCurseResult {
  success: boolean
  message: string
  targetName?: string
  successRate?: number
}

// 收割结果
export interface HarvestCurseResult {
  success: boolean
  message: string
  cultivationGained?: number
  targetName?: string
}

// 解咒结果
export interface RemoveCurseResult {
  success: boolean
  message: string
  cultivationLost?: number // 被吸取的总修为
}
