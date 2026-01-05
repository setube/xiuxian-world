/**
 * 万灵宗 - 灵兽养成系统常量配置
 *
 * 万灵宗万灵秘术：
 * 1. 寻觅灵兽 - 探索获得新灵兽
 * 2. 灵兽养成 - 喂养、出战、休息、改名、放生
 * 3. 灵兽偷菜 - 派遣灵兽潜入黄枫谷药园窃取灵草
 * 4. 灵兽进化 - 灵兽成长与进化
 */

// 万灵宗宗门ID
export const WANLING_SECT_ID = 'wanling'

// ========== 灵兽模板 ==========
export interface BeastTemplate {
  id: string
  name: string
  description: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  baseStats: {
    attack: number
    defense: number
    speed: number
    hp: number
  }
  growthRate: {
    attack: number
    defense: number
    speed: number
    hp: number
  }
  skills: string[]
  evolvesTo?: string // 进化目标ID
  evolveLevel?: number // 进化所需等级
  evolveItems?: { itemId: string; count: number }[] // 进化所需材料
}

export const BEAST_TEMPLATES: Record<string, BeastTemplate> = {
  // 普通灵兽
  beast_spirit_rabbit: {
    id: 'beast_spirit_rabbit',
    name: '灵兔',
    description: '通体雪白的灵兔，速度极快，擅长躲避攻击',
    rarity: 'common',
    baseStats: { attack: 5, defense: 3, speed: 12, hp: 30 },
    growthRate: { attack: 1, defense: 0.5, speed: 2, hp: 5 },
    skills: ['skill_swift_dodge'],
    evolvesTo: 'beast_moon_rabbit',
    evolveLevel: 20
  },
  beast_iron_beetle: {
    id: 'beast_iron_beetle',
    name: '铁甲虫',
    description: '外壳坚硬如铁的虫类，防御出众',
    rarity: 'common',
    baseStats: { attack: 4, defense: 10, speed: 3, hp: 40 },
    growthRate: { attack: 0.8, defense: 2, speed: 0.3, hp: 8 },
    skills: ['skill_iron_shell'],
    evolvesTo: 'beast_gold_beetle',
    evolveLevel: 20
  },
  beast_fire_fox: {
    id: 'beast_fire_fox',
    name: '火灵狐',
    description: '浑身燃烧着灵火的狐狸，攻击犀利',
    rarity: 'common',
    baseStats: { attack: 10, defense: 4, speed: 8, hp: 25 },
    growthRate: { attack: 2, defense: 0.6, speed: 1.5, hp: 4 },
    skills: ['skill_fire_breath'],
    evolvesTo: 'beast_nine_tail_fox',
    evolveLevel: 30
  },

  // 精良灵兽
  beast_gold_eating_bug: {
    id: 'beast_gold_eating_bug',
    name: '噬金虫',
    description: '以金属为食的奇虫，可以腐蚀敌人的防御',
    rarity: 'uncommon',
    baseStats: { attack: 12, defense: 6, speed: 5, hp: 35 },
    growthRate: { attack: 2.2, defense: 1, speed: 0.8, hp: 6 },
    skills: ['skill_corrode_armor', 'skill_metal_devour'],
    evolvesTo: 'beast_golden_swarm',
    evolveLevel: 30,
    evolveItems: [{ itemId: 'item_gold_essence', count: 5 }]
  },
  beast_moon_rabbit: {
    id: 'beast_moon_rabbit',
    name: '月华兔',
    description: '吸收月华精华的灵兔，拥有治愈能力',
    rarity: 'uncommon',
    baseStats: { attack: 8, defense: 6, speed: 15, hp: 45 },
    growthRate: { attack: 1.5, defense: 1, speed: 2.5, hp: 8 },
    skills: ['skill_swift_dodge', 'skill_moonlight_heal']
  },
  beast_gold_beetle: {
    id: 'beast_gold_beetle',
    name: '金甲虫王',
    description: '铁甲虫的进化形态，防御更加惊人',
    rarity: 'uncommon',
    baseStats: { attack: 8, defense: 18, speed: 4, hp: 60 },
    growthRate: { attack: 1.2, defense: 3, speed: 0.4, hp: 12 },
    skills: ['skill_iron_shell', 'skill_golden_reflection']
  },

  // 稀有灵兽
  beast_soul_cry: {
    id: 'beast_soul_cry',
    name: '啼魂兽',
    description: '发出的啼叫可以震慑敌人魂魄的神秘灵兽',
    rarity: 'rare',
    baseStats: { attack: 15, defense: 8, speed: 10, hp: 50 },
    growthRate: { attack: 2.5, defense: 1.2, speed: 1.5, hp: 8 },
    skills: ['skill_soul_cry', 'skill_spirit_devour', 'skill_phantom_strike'],
    evolvesTo: 'beast_soul_emperor',
    evolveLevel: 40,
    evolveItems: [
      { itemId: 'item_soul_crystal', count: 3 },
      { itemId: 'item_spirit_essence', count: 10 }
    ]
  },
  beast_golden_swarm: {
    id: 'beast_golden_swarm',
    name: '万蚀金虫',
    description: '噬金虫的进化形态，由万虫组成的虫群',
    rarity: 'rare',
    baseStats: { attack: 20, defense: 10, speed: 8, hp: 55 },
    growthRate: { attack: 3, defense: 1.5, speed: 1.2, hp: 10 },
    skills: ['skill_corrode_armor', 'skill_metal_devour', 'skill_swarm_attack']
  },
  beast_nine_tail_fox: {
    id: 'beast_nine_tail_fox',
    name: '九尾灵狐',
    description: '修炼成精的火灵狐，拥有九条尾巴',
    rarity: 'rare',
    baseStats: { attack: 22, defense: 8, speed: 14, hp: 45 },
    growthRate: { attack: 3.5, defense: 1, speed: 2, hp: 7 },
    skills: ['skill_fire_breath', 'skill_nine_tail_flame', 'skill_charm']
  },

  // 史诗灵兽
  beast_soul_emperor: {
    id: 'beast_soul_emperor',
    name: '啼魂帝君',
    description: '啼魂兽的最终形态，其啼叫可以震碎敌人神魂',
    rarity: 'epic',
    baseStats: { attack: 30, defense: 15, speed: 15, hp: 80 },
    growthRate: { attack: 4, defense: 2, speed: 2, hp: 12 },
    skills: ['skill_soul_cry', 'skill_spirit_devour', 'skill_phantom_strike', 'skill_soul_shatter']
  },
  beast_thunder_qilin: {
    id: 'beast_thunder_qilin',
    name: '雷霆麒麟',
    description: '身披雷电的上古神兽后裔，威力惊人',
    rarity: 'epic',
    baseStats: { attack: 28, defense: 18, speed: 12, hp: 75 },
    growthRate: { attack: 3.8, defense: 2.5, speed: 1.8, hp: 11 },
    skills: ['skill_thunder_strike', 'skill_qilin_blessing', 'skill_lightning_armor']
  },

  // 传说灵兽
  beast_ancient_dragon: {
    id: 'beast_ancient_dragon',
    name: '太古真龙',
    description: '远古时代遗留的真龙血脉，万兽之皇',
    rarity: 'legendary',
    baseStats: { attack: 50, defense: 30, speed: 20, hp: 150 },
    growthRate: { attack: 6, defense: 4, speed: 3, hp: 20 },
    skills: ['skill_dragon_breath', 'skill_dragon_might', 'skill_ancient_fury', 'skill_emperor_domain']
  }
} as const

// ========== 灵兽稀有度配置 ==========
export const BEAST_RARITY_CONFIG = {
  common: { name: '普通', color: '#9ca3af', expMultiplier: 1.0, dropWeight: 60 },
  uncommon: { name: '精良', color: '#22c55e', expMultiplier: 1.2, dropWeight: 25 },
  rare: { name: '稀有', color: '#3b82f6', expMultiplier: 1.5, dropWeight: 10 },
  epic: { name: '史诗', color: '#a855f7', expMultiplier: 2.0, dropWeight: 4 },
  legendary: { name: '传说', color: '#f59e0b', expMultiplier: 3.0, dropWeight: 1 }
} as const

// ========== 寻觅灵兽配置 ==========
export const BEAST_SEARCH_CONFIG = {
  cooldownMs: 4 * 60 * 60 * 1000, // 4小时冷却
  dailyLimit: 3, // 每日最多寻觅3次
  minRealm: 1, // 炼气期可开始
  baseSuccessRate: 80, // 基础成功率80%
  realmBonusRate: 2, // 每境界+2%成功率
  // 各稀有度出现概率（按权重）
  rarityWeights: {
    common: 60,
    uncommon: 25,
    rare: 10,
    epic: 4,
    legendary: 1
  }
} as const

// ========== 灵兽喂养配置 ==========
export const BEAST_FEED_CONFIG = {
  // 喂养食物类型
  foods: {
    food_spirit_grass: {
      name: '灵草',
      expGain: 10,
      satietyGain: 20,
      cost: 50 // 灵石购买价格
    },
    food_beast_pellet: {
      name: '灵兽丹',
      expGain: 50,
      satietyGain: 30,
      cost: 200
    },
    food_blood_essence: {
      name: '精血丹',
      expGain: 100,
      satietyGain: 40,
      cost: 500
    },
    food_dragon_marrow: {
      name: '龙髓丹',
      expGain: 300,
      satietyGain: 50,
      cost: 2000
    }
  },
  maxSatiety: 100, // 饱食度上限
  hungryThreshold: 30, // 饥饿阈值（低于此值影响战斗力）
  satietyDecayPerHour: 5, // 每小时饱食度衰减
  hungryPenalty: 0.3 // 饥饿时战力惩罚30%
} as const

// ========== 灵兽等级配置 ==========
export const BEAST_LEVEL_CONFIG = {
  maxLevel: 50,
  expPerLevel: 100, // 每级所需基础经验
  levelMultiplier: 1.15, // 经验递增系数
  // 等级提升的属性加成计算：基础值 + 成长率 * (等级 - 1)
  statsPerLevel: (template: BeastTemplate, level: number) => ({
    attack: Math.floor(template.baseStats.attack + template.growthRate.attack * (level - 1)),
    defense: Math.floor(template.baseStats.defense + template.growthRate.defense * (level - 1)),
    speed: Math.floor(template.baseStats.speed + template.growthRate.speed * (level - 1)),
    hp: Math.floor(template.baseStats.hp + template.growthRate.hp * (level - 1))
  })
} as const

// ========== 灵兽出战配置 ==========
export const BEAST_DEPLOY_CONFIG = {
  maxDeployed: 1, // 同时出战灵兽数量上限
  deployBonusPercent: 10, // 出战灵兽提供主人10%属性加成
  loyaltyBonusThreshold: 80, // 忠诚度高于此值获得额外加成
  loyaltyBonusPercent: 5 // 高忠诚度额外加成
} as const

// ========== 灵兽偷菜配置 ==========
export const BEAST_RAID_CONFIG = {
  minRealm: 2, // 筑基期可开始
  cooldownMs: 2 * 60 * 60 * 1000, // 2小时冷却
  dailyLimit: 5, // 每日最多偷菜5次
  // 成功率计算：基础 + 灵兽速度加成 - 药园防御
  baseSuccessRate: 50,
  speedBonusRate: 0.5, // 每点速度+0.5%成功率
  maxSuccessRate: 90,
  // 失败惩罚
  failureDamagePercent: 20, // 失败时灵兽受伤，损失20%HP
  injuryRecoveryMs: 30 * 60 * 1000, // 受伤恢复时间30分钟
  // 奖励配置
  rewards: {
    // 成功奖励 - 随机灵草
    success: [
      { itemId: 'herb_lingcao', weight: 40, minCount: 1, maxCount: 3 },
      { itemId: 'herb_qingling', weight: 30, minCount: 1, maxCount: 2 },
      { itemId: 'herb_zicao', weight: 20, minCount: 1, maxCount: 2 },
      { itemId: 'herb_huangjing', weight: 10, minCount: 1, maxCount: 1 }
    ],
    // 保底奖励
    fallback: { itemId: 'herb_common', count: 1 }
  },
  // 忠诚度影响
  loyaltySuccessBonus: 0.1 // 每点忠诚度+0.1%成功率
} as const

// ========== 灵兽忠诚度配置 ==========
export const BEAST_LOYALTY_CONFIG = {
  initialLoyalty: 50, // 初始忠诚度
  maxLoyalty: 100,
  minLoyalty: 0,
  // 忠诚度变化
  feedLoyaltyGain: 2, // 喂养+2忠诚度
  deployLoyaltyDecay: 1, // 出战每小时-1忠诚度
  restLoyaltyGain: 5, // 休息每小时+5忠诚度
  injuryLoyaltyLoss: 10, // 受伤-10忠诚度
  // 忠诚度等级
  levels: {
    hostile: { min: 0, max: 19, name: '敌视', effect: -20 },
    unfriendly: { min: 20, max: 39, name: '冷淡', effect: -10 },
    neutral: { min: 40, max: 59, name: '中立', effect: 0 },
    friendly: { min: 60, max: 79, name: '友好', effect: 10 },
    devoted: { min: 80, max: 100, name: '忠诚', effect: 20 }
  }
} as const

// ========== 灵兽技能配置 ==========
export const BEAST_SKILLS: Record<string, { name: string; description: string; effect: string }> = {
  // 基础技能
  skill_swift_dodge: { name: '灵动闪避', description: '提高闪避率', effect: 'dodge_rate+15%' },
  skill_iron_shell: { name: '铁甲护体', description: '提高防御力', effect: 'defense+20%' },
  skill_fire_breath: { name: '火焰吐息', description: '造成火焰伤害', effect: 'fire_damage+30%' },

  // 进阶技能
  skill_corrode_armor: { name: '腐蚀护甲', description: '降低敌人防御', effect: 'enemy_defense-15%' },
  skill_metal_devour: { name: '噬金术', description: '攻击时恢复HP', effect: 'lifesteal+10%' },
  skill_moonlight_heal: { name: '月华治愈', description: '每回合恢复HP', effect: 'regen+5%' },
  skill_golden_reflection: { name: '金光反射', description: '反弹部分伤害', effect: 'reflect+10%' },

  // 高级技能
  skill_soul_cry: { name: '啼魂之音', description: '有几率使敌人眩晕', effect: 'stun_chance+20%' },
  skill_spirit_devour: { name: '噬魂术', description: '攻击时窃取敌人修为', effect: 'soul_drain+5%' },
  skill_phantom_strike: { name: '幻影突袭', description: '无视部分防御', effect: 'armor_pierce+25%' },
  skill_swarm_attack: { name: '虫群狂袭', description: '多段攻击', effect: 'multi_hit+3' },
  skill_nine_tail_flame: { name: '九尾焚天', description: '强力火焰AOE', effect: 'fire_aoe+50%' },
  skill_charm: { name: '魅惑', description: '降低敌人攻击', effect: 'enemy_attack-20%' },

  // 终极技能
  skill_soul_shatter: { name: '碎魂绝唱', description: '对神魂造成巨额伤害', effect: 'soul_damage+100%' },
  skill_thunder_strike: { name: '雷霆万钧', description: '召唤雷电攻击', effect: 'lightning_damage+80%' },
  skill_qilin_blessing: { name: '麒麟祝福', description: '提升全属性', effect: 'all_stats+15%' },
  skill_lightning_armor: { name: '雷电护甲', description: '被攻击时反击', effect: 'counter+30%' },
  skill_dragon_breath: { name: '龙息', description: '毁灭性吐息', effect: 'true_damage+100' },
  skill_dragon_might: { name: '龙威', description: '降低敌人全属性', effect: 'enemy_all_stats-20%' },
  skill_ancient_fury: { name: '太古之怒', description: '暴击率大幅提升', effect: 'crit_rate+50%' },
  skill_emperor_domain: { name: '帝王领域', description: '免疫控制效果', effect: 'cc_immune' }
} as const

// ========== 灵兽状态 ==========
export type BeastStatus = 'idle' | 'deployed' | 'resting' | 'injured' | 'raiding'

// ========== 类型定义 ==========
export interface SpiritBeastInfo {
  id: string
  templateId: string
  name: string
  customName?: string
  rarity: string
  level: number
  exp: number
  expToNextLevel: number
  stats: {
    attack: number
    defense: number
    speed: number
    hp: number
    currentHp: number
  }
  satiety: number
  loyalty: number
  status: BeastStatus
  deployedAt?: number
  injuredUntil?: number
  skills: string[]
  canEvolve: boolean
  evolveInfo?: {
    targetId: string
    targetName: string
    requiredLevel: number
    requiredItems: { itemId: string; itemName: string; count: number; owned: number }[]
  }
}

export interface WanlingStatus {
  isMember: boolean
  realm: number
  // 灵兽列表
  beasts: SpiritBeastInfo[]
  maxBeasts: number
  deployedBeast: SpiritBeastInfo | null
  // 寻觅状态
  search: {
    canSearch: boolean
    cooldownMs: number
    dailySearches: number
    maxDailySearches: number
  }
  // 偷菜状态
  raid: {
    canRaid: boolean
    cooldownMs: number
    dailyRaids: number
    maxDailyRaids: number
  }
}

export interface SearchResult {
  success: boolean
  message: string
  beast?: SpiritBeastInfo
}

export interface FeedResult {
  success: boolean
  message: string
  expGain: number
  satietyGain: number
  loyaltyGain: number
  levelUp: boolean
  newLevel?: number
}

export interface RaidResult {
  success: boolean
  message: string
  targetName: string // 被偷的玩家名
  rewards: { itemId: string; itemName: string; count: number }[]
  beastInjured: boolean
  loyaltyChange: number
}

export interface EvolveResult {
  success: boolean
  message: string
  oldBeast: { templateId: string; name: string }
  newBeast: SpiritBeastInfo
}

// ========== 灵兽容量配置 ==========
export const BEAST_CAPACITY_CONFIG = {
  baseCapacity: 3, // 基础容量3只
  realmBonus: 1, // 每境界+1容量
  maxCapacity: 10 // 最大容量10只
} as const

// ========== 万兽渊探渊配置 ==========
export const ABYSS_EXPLORE_CONFIG = {
  minRealm: 3, // 结丹期可开始
  cooldownMs: 4 * 60 * 60 * 1000, // 4小时冷却
  dailyLimit: 3, // 每日最多探渊3次
  // 妖兽战力范围
  beastPowerRange: {
    min: 10000,
    max: 100000
  },
  // 战斗成功率计算：(角色战力 / 妖兽战力) * 100，上限80%
  maxSuccessRate: 80,
  // 基础奖励
  baseRewards: {
    cultivation: 1000, // 基础修为
    spiritStones: 500 // 基础灵石
  },
  // 气运爆发配置（战胜50000+战力妖兽时触发）
  luckBurst: {
    minBeastPower: 50000, // 妖兽战力门槛
    chance: 0.15, // 15%触发概率
    itemId: 'fire_phoenix_feather', // 火凤之翎
    description: '气运爆发！火凤之翎从天而降！'
  }
} as const

export interface AbyssExploreResult {
  success: boolean
  message: string
  beastName: string
  beastPower: number
  victory: boolean
  rewards?: {
    cultivation: number
    spiritStones: number
  }
  luckBurst?: {
    triggered: boolean
    itemId: string
    itemName: string
  }
}
