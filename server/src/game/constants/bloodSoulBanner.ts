/**
 * 血魂幡系统常量配置
 * 黑煞教本命魔宝 - 炼化魂魄获取材料
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
export const BANNER_UPGRADE_MATERIAL = 'yin_soul_silk' // 升级消耗阴魂丝

// ==================== 魂魄类型配置 ====================

export interface SoulOutputConfig {
  itemId: string
  chance: number // 0-100
  min: number
  max: number
}

export interface SoulTypeConfig {
  id: string
  name: string
  grade: number // 魂魄等级，决定可炼化需要的血魂幡等级
  refineTimeMs: number // 炼化时间（毫秒）
  shaCost: number // 消耗煞气
  outputs: {
    primary: SoulOutputConfig // 核心产出 (100%几率)
    rare: SoulOutputConfig // 稀有产出
  }
  obtainMethod: string // 获取途径描述
}

export const SOUL_TYPES: Record<string, SoulTypeConfig> = {
  grievance_soul: {
    id: 'grievance_soul',
    name: '怨魂',
    grade: 1,
    refineTimeMs: 30 * 60 * 1000, // 30分钟
    shaCost: 20,
    outputs: {
      primary: { itemId: 'yin_soul_silk', chance: 100, min: 1, max: 3 },
      rare: { itemId: 'blood_coagulating_grass', chance: 15, min: 1, max: 1 }
    },
    obtainMethod: 'PvP胜利20%几率'
  },
  cultivator_remnant: {
    id: 'cultivator_remnant',
    name: '修士残魂',
    grade: 2,
    refineTimeMs: 60 * 60 * 1000, // 1小时
    shaCost: 40,
    outputs: {
      primary: { itemId: 'demon_pill_tier2', chance: 100, min: 1, max: 2 },
      rare: { itemId: 'soul_nurture_wood', chance: 20, min: 1, max: 1 }
    },
    obtainMethod: 'PvP胜利10%几率'
  },
  beast_spirit: {
    id: 'beast_spirit',
    name: '妖兽精魄',
    grade: 3,
    refineTimeMs: 2 * 60 * 60 * 1000, // 2小时
    shaCost: 80,
    outputs: {
      primary: { itemId: 'demon_pill_tier3', chance: 100, min: 1, max: 2 },
      rare: { itemId: 'spirit_herb_rare', chance: 25, min: 1, max: 2 }
    },
    obtainMethod: '血洗山林PvE'
  },
  fierce_soul: {
    id: 'fierce_soul',
    name: '凶兽戾魄',
    grade: 4,
    refineTimeMs: 4 * 60 * 60 * 1000, // 4小时
    shaCost: 150,
    outputs: {
      primary: { itemId: 'demon_pill_tier4', chance: 100, min: 1, max: 1 },
      rare: { itemId: 'law_fragment_dark', chance: 10, min: 1, max: 1 }
    },
    obtainMethod: '召唤魔影Boss'
  }
}

// ==================== 煞气池配置 ====================

export const SHA_POOL_CONFIG = {
  // 每日献祭
  dailySacrifice: {
    baseSha: 10, // 基础煞气
    killCountBonus: 0.5, // 每点杀戮值额外煞气
    maxBonus: 50 // 杀戮值加成上限
  },
  // 化功为煞
  cultivationToSha: {
    ratio: 5, // 5修为 = 1煞气
    dailyLimit: 100 // 每日转换上限100煞气
  },
  // PvP煞气获取
  pvpShaGain: {
    min: 50,
    max: 100
  },
  // 煞气上限（已有系统）
  maxShaEnergy: 100,
  // 战力加成
  shaEnergyBonus: 0.5, // 每点煞气+0.5%战力（已有）
  killCountBonus: 0.1, // 每点杀戮值+0.1%战力
  maxKillCountBonus: 50 // 杀戮值加成上限50%
}

// ==================== 稳定度配置 ====================

export const STABILITY_CONFIG = {
  decayIntervalMs: 30 * 60 * 1000, // 每30分钟衰减一次
  decayAmount: 10, // 每次衰减10点
  maintenanceCost: 10, // 安抚幡灵消耗煞气
  maintenanceRestore: 30, // 每次恢复30点稳定度
  failureThreshold: 20, // 低于20%时产出减少
  failurePenalty: 0.5 // 低稳定度产出减半
}

// ==================== 血洗山林配置 ====================

export interface BloodForestEnemyConfig {
  id: string
  name: string
  powerMultiplier: number // 战力倍率（相对玩家）
  rewards: {
    spiritStones: number
    soulChance: number // 获得妖兽精魄的几率
  }
}

export const BLOOD_FOREST_CONFIG = {
  minRealm: 2, // 筑基期解锁
  dailyLimit: 5, // 每日5次
  shaCost: 30, // 每次消耗煞气
  enemies: [
    { id: 'blood_wolf', name: '血煞妖狼', powerMultiplier: 0.8, rewards: { spiritStones: 100, soulChance: 60 } },
    { id: 'red_snake', name: '赤目魔蛇', powerMultiplier: 0.9, rewards: { spiritStones: 150, soulChance: 70 } },
    { id: 'soul_crow', name: '噬魂阴鸦', powerMultiplier: 1.0, rewards: { spiritStones: 200, soulChance: 80 } },
    { id: 'blood_tiger', name: '血骨妖虎', powerMultiplier: 1.1, rewards: { spiritStones: 250, soulChance: 90 } }
  ] as BloodForestEnemyConfig[],
  soulDrops: {
    itemId: 'beast_spirit',
    min: 1,
    max: 2
  },
  materialDrops: [
    { itemId: 'yin_soul_silk', chance: 30, min: 1, max: 2 },
    { itemId: 'blood_coagulating_grass', chance: 40, min: 1, max: 3 }
  ]
}

// ==================== 召唤魔影配置 ====================

export interface ShadowBossConfig {
  id: string
  name: string
  powerMultiplier: number // 战力倍率（相对玩家）
  rewards: {
    spiritStones: number
    soulChance: number // 获得凶兽戾魄的几率
    soulCount: number // 获得数量
  }
}

export const SHADOW_SUMMON_CONFIG = {
  minRealm: 3, // 结丹期解锁
  dailyLimit: 3, // 每日3次
  sacrificeItemId: 'demon_pill_tier3', // 祭品：三级妖丹
  sacrificeQuantity: 5, // 每次消耗5个
  bosses: [
    { id: 'blood_rakshasa', name: '魔影·血狱罗刹', powerMultiplier: 1.5, rewards: { spiritStones: 500, soulChance: 50, soulCount: 1 } },
    { id: 'netherworld_king', name: '魔影·九幽冥王', powerMultiplier: 2.0, rewards: { spiritStones: 800, soulChance: 70, soulCount: 1 } },
    { id: 'demon_lord', name: '魔影·天魔尊者', powerMultiplier: 2.5, rewards: { spiritStones: 1200, soulChance: 90, soulCount: 2 } }
  ] as ShadowBossConfig[],
  soulDrop: {
    itemId: 'fierce_soul'
  },
  materialDrops: [
    { itemId: 'demon_pill_tier4', chance: 30, min: 1, max: 1 },
    { itemId: 'yin_soul_silk', chance: 50, min: 2, max: 5 }
  ]
}

// ==================== PvP魂魄掉落配置 ====================

export const PVP_SOUL_DROP_CONFIG = {
  grievance_soul: { chance: 20 }, // 20%几率获得怨魂
  cultivator_remnant: { chance: 10 } // 10%几率获得修士残魂
}

// ==================== 解锁条件 ====================

export const BLOOD_SOUL_BANNER_UNLOCK = {
  minRealm: 2, // 筑基期解锁
  sectId: 'heisha' // 仅限黑煞教
}
