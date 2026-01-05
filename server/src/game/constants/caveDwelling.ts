// ========== 洞府系统常量配置 ==========

// 开辟洞府境界要求
export const CAVE_REQUIRED_REALM = {
  tier: 2, // 筑基期
  subTier: 1, // 初期
}

// 开辟洞府消耗
export const CAVE_OPENING_COST = {
  spiritStones: 500,
  items: [
    { itemId: 'demon_pill_tier2', quantity: 5 }, // 二阶妖丹
  ],
}

// ========== 灵脉配置 ==========

export interface SpiritVeinLevelConfig {
  level: number
  productionPerHour: number // 每小时产出灵气
  maxStorage: number // 最大存储量
  upgradeCost: {
    spiritStones: number
    items?: { itemId: string; quantity: number }[]
  } | null // null 表示无法继续升级
}

export const SPIRIT_VEIN_CONFIG: SpiritVeinLevelConfig[] = [
  { level: 1, productionPerHour: 100, maxStorage: 1000, upgradeCost: { spiritStones: 500 } },
  { level: 2, productionPerHour: 200, maxStorage: 2000, upgradeCost: { spiritStones: 1500 } },
  { level: 3, productionPerHour: 350, maxStorage: 3500, upgradeCost: { spiritStones: 4000 } },
  { level: 4, productionPerHour: 550, maxStorage: 5500, upgradeCost: { spiritStones: 10000 } },
  {
    level: 5,
    productionPerHour: 800,
    maxStorage: 8000,
    upgradeCost: { spiritStones: 25000, items: [{ itemId: 'spirit_crystal', quantity: 5 }] },
  },
  {
    level: 6,
    productionPerHour: 1100,
    maxStorage: 11000,
    upgradeCost: { spiritStones: 60000, items: [{ itemId: 'spirit_crystal', quantity: 15 }] },
  },
  {
    level: 7,
    productionPerHour: 1500,
    maxStorage: 15000,
    upgradeCost: { spiritStones: 150000, items: [{ itemId: 'spirit_crystal', quantity: 30 }] },
  },
  {
    level: 8,
    productionPerHour: 2000,
    maxStorage: 20000,
    upgradeCost: { spiritStones: 350000, items: [{ itemId: 'spirit_crystal', quantity: 50 }] },
  },
  {
    level: 9,
    productionPerHour: 2600,
    maxStorage: 26000,
    upgradeCost: { spiritStones: 800000, items: [{ itemId: 'spirit_essence', quantity: 10 }] },
  },
  { level: 10, productionPerHour: 3500, maxStorage: 35000, upgradeCost: null }, // 满级
]

export const SPIRIT_VEIN_MAX_LEVEL = 10

// 获取灵脉配置
export function getSpiritVeinConfig(level: number): SpiritVeinLevelConfig | undefined {
  return SPIRIT_VEIN_CONFIG.find((c) => c.level === level)
}

// ========== 静室配置 ==========

export interface MeditationChamberLevelConfig {
  level: number
  conversionRate: number // 灵气转化修为的比率 (1灵气 = conversionRate修为)
  maxConversionPerHour: number // 每小时最大转化灵气量
  upgradeCost: {
    spiritStones: number
    items?: { itemId: string; quantity: number }[]
  } | null
}

export const MEDITATION_CHAMBER_CONFIG: MeditationChamberLevelConfig[] = [
  { level: 1, conversionRate: 0.5, maxConversionPerHour: 80, upgradeCost: { spiritStones: 500 } },
  { level: 2, conversionRate: 0.6, maxConversionPerHour: 150, upgradeCost: { spiritStones: 1500 } },
  { level: 3, conversionRate: 0.7, maxConversionPerHour: 250, upgradeCost: { spiritStones: 4000 } },
  { level: 4, conversionRate: 0.8, maxConversionPerHour: 400, upgradeCost: { spiritStones: 10000 } },
  {
    level: 5,
    conversionRate: 0.9,
    maxConversionPerHour: 600,
    upgradeCost: { spiritStones: 25000, items: [{ itemId: 'meditation_stone', quantity: 5 }] },
  },
  {
    level: 6,
    conversionRate: 1.0,
    maxConversionPerHour: 850,
    upgradeCost: { spiritStones: 60000, items: [{ itemId: 'meditation_stone', quantity: 15 }] },
  },
  {
    level: 7,
    conversionRate: 1.1,
    maxConversionPerHour: 1150,
    upgradeCost: { spiritStones: 150000, items: [{ itemId: 'meditation_stone', quantity: 30 }] },
  },
  {
    level: 8,
    conversionRate: 1.2,
    maxConversionPerHour: 1500,
    upgradeCost: { spiritStones: 350000, items: [{ itemId: 'meditation_stone', quantity: 50 }] },
  },
  {
    level: 9,
    conversionRate: 1.35,
    maxConversionPerHour: 2000,
    upgradeCost: { spiritStones: 800000, items: [{ itemId: 'enlightenment_jade', quantity: 10 }] },
  },
  { level: 10, conversionRate: 1.5, maxConversionPerHour: 2800, upgradeCost: null }, // 满级
]

export const MEDITATION_CHAMBER_MAX_LEVEL = 10

// 获取静室配置
export function getMeditationChamberConfig(level: number): MeditationChamberLevelConfig | undefined {
  return MEDITATION_CHAMBER_CONFIG.find((c) => c.level === level)
}

// ========== 万宝阁配置 ==========

export const TREASURE_DISPLAY_SLOTS = 3 // 固定3个展示槽位

// ========== 访客系统配置 ==========

export const VISITOR_CONFIG = {
  checkInterval: 30 * 60 * 1000, // 30分钟检查一次
  triggerChance: 0.15, // 15%触发概率
  decisionTimeout: 5 * 60 * 1000, // 5分钟决策时间
}

// 访客结果类型
export type VisitorOutcomeType =
  | 'gift_spirit_stones' // 赠送灵石
  | 'gift_exp' // 赠送修为
  | 'gift_item' // 赠送物品
  | 'trade_offer' // 交易机会
  | 'curse' // 诅咒(debuff)
  | 'fight' // 战斗
  | 'nothing' // 无事发生

export interface VisitorOutcome {
  type: VisitorOutcomeType
  weight: number
  minValue?: number
  maxValue?: number
  items?: { itemId: string; weight: number }[]
  debuffType?: string
  debuffDuration?: number
  description: string
}

export interface VisitorTypeConfig {
  id: string
  name: string
  description: string
  weight: number // 出现权重
  receiveOutcomes: VisitorOutcome[] // 接待结果
  expelOutcomes: VisitorOutcome[] // 驱逐结果
}

export const VISITOR_TYPES: VisitorTypeConfig[] = [
  {
    id: 'wandering_cultivator',
    name: '游方散修',
    description: '一位四处游历的散修前来拜访',
    weight: 40,
    receiveOutcomes: [
      {
        type: 'gift_spirit_stones',
        weight: 35,
        minValue: 50,
        maxValue: 200,
        description: '散修感念你的热情招待，留下了一些灵石作为谢礼',
      },
      {
        type: 'gift_exp',
        weight: 25,
        minValue: 30,
        maxValue: 150,
        description: '与散修论道交流，你对修炼有了新的感悟',
      },
      {
        type: 'gift_item',
        weight: 20,
        items: [
          { itemId: 'herb_seed_common', weight: 50 },
          { itemId: 'spirit_herb_common', weight: 30 },
          { itemId: 'recovery_pill_small', weight: 20 },
        ],
        description: '散修将随身携带的物品赠予你',
      },
      { type: 'nothing', weight: 20, description: '散修与你闲聊一番后便告辞离去' },
    ],
    expelOutcomes: [
      { type: 'nothing', weight: 70, description: '散修摇头叹息，转身离去' },
      {
        type: 'curse',
        weight: 30,
        debuffType: 'cultivation_debuff',
        debuffDuration: 3600000,
        description: '散修怒道："好个狂妄之辈！"施展秘法留下诅咒后愤然离去',
      },
    ],
  },
  {
    id: 'mysterious_merchant',
    name: '神秘商人',
    description: '一位行商坊市的神秘商人到访',
    weight: 20,
    receiveOutcomes: [
      {
        type: 'trade_offer',
        weight: 100,
        description: '商人向你展示了一些稀有货物，你可以用灵石购买',
      },
    ],
    expelOutcomes: [{ type: 'nothing', weight: 100, description: '商人收起货物，略有遗憾地离开了' }],
  },
  {
    id: 'spirit_beast',
    name: '迷途灵兽',
    description: '一只迷路的低阶灵兽徘徊在洞府外',
    weight: 25,
    receiveOutcomes: [
      {
        type: 'gift_item',
        weight: 60,
        items: [
          { itemId: 'monster_core_common', weight: 60 },
          { itemId: 'beast_fur_common', weight: 30 },
          { itemId: 'monster_core_uncommon', weight: 10 },
        ],
        description: '灵兽对你表示亲近，留下了一些天然灵材',
      },
      {
        type: 'gift_exp',
        weight: 40,
        minValue: 20,
        maxValue: 100,
        description: '观察灵兽的举动，你对天地灵气有了更深的理解',
      },
    ],
    expelOutcomes: [
      { type: 'nothing', weight: 60, description: '灵兽被你驱离，消失在山林之中' },
      {
        type: 'fight',
        weight: 40,
        description: '灵兽受惊发狂，对你发起攻击！',
      },
    ],
  },
  {
    id: 'fallen_cultivator',
    name: '落难修士',
    description: '一位伤痕累累的修士请求借用洞府疗伤',
    weight: 10,
    receiveOutcomes: [
      {
        type: 'gift_spirit_stones',
        weight: 30,
        minValue: 200,
        maxValue: 500,
        description: '修士伤愈后，留下重谢作为答谢',
      },
      {
        type: 'gift_item',
        weight: 30,
        items: [
          { itemId: 'technique_fragment', weight: 40 },
          { itemId: 'rare_material', weight: 40 },
          { itemId: 'storage_bag_small', weight: 20 },
        ],
        description: '修士感激不尽，将随身法宝相赠',
      },
      {
        type: 'gift_exp',
        weight: 40,
        minValue: 100,
        maxValue: 300,
        description: '修士传授了一些修炼心得作为答谢',
      },
    ],
    expelOutcomes: [
      { type: 'nothing', weight: 80, description: '修士无奈离去，另寻他处' },
      {
        type: 'curse',
        weight: 20,
        debuffType: 'karma_debuff',
        debuffDuration: 7200000,
        description: '修士临走前叹道："见死不救，因果循环..."你感到一阵心悸',
      },
    ],
  },
  {
    id: 'demon_cultivator',
    name: '魔道修士',
    description: '一位气息诡异的魔道修士到访',
    weight: 5,
    receiveOutcomes: [
      {
        type: 'gift_item',
        weight: 40,
        items: [
          { itemId: 'demon_blood', weight: 50 },
          { itemId: 'demon_pill_tier2', weight: 35 },
          { itemId: 'demon_pill_tier3', weight: 15 },
        ],
        description: '魔修与你做了一笔交易，留下了一些魔道材料',
      },
      {
        type: 'gift_spirit_stones',
        weight: 30,
        minValue: 100,
        maxValue: 400,
        description: '魔修似乎对你颇为欣赏，留下了不少灵石',
      },
      {
        type: 'curse',
        weight: 30,
        debuffType: 'demon_qi',
        debuffDuration: 1800000,
        description: '魔修的气息污染了你的洞府，需要时间净化',
      },
    ],
    expelOutcomes: [
      { type: 'nothing', weight: 50, description: '魔修冷笑一声，飘然离去' },
      {
        type: 'fight',
        weight: 50,
        description: '魔修大怒："区区蝼蚁，也敢拒绝本座？"向你发起攻击！',
      },
    ],
  },
]

// 根据权重选择访客类型
export function selectRandomVisitor(): VisitorTypeConfig {
  const totalWeight = VISITOR_TYPES.reduce((sum, v) => sum + v.weight, 0)
  let random = Math.random() * totalWeight
  for (const visitor of VISITOR_TYPES) {
    random -= visitor.weight
    if (random <= 0) return visitor
  }
  return VISITOR_TYPES[0]
}

// 根据权重选择结果
export function selectRandomOutcome(outcomes: VisitorOutcome[]): VisitorOutcome {
  const totalWeight = outcomes.reduce((sum, o) => sum + o.weight, 0)
  let random = Math.random() * totalWeight
  for (const outcome of outcomes) {
    random -= outcome.weight
    if (random <= 0) return outcome
  }
  return outcomes[0]
}

// ========== 洞天景观配置 ==========

export type SceneryConditionType =
  | 'realm_reached' // 达到境界
  | 'ranking_position' // 排行榜名次
  | 'craft_count' // 炼制次数
  | 'pvp_kills' // PvP击杀数
  | 'total_exp' // 累计修为
  | 'visitor_count' // 累计接待访客数
  | 'cave_level' // 洞府总等级

export interface SceneryCondition {
  type: SceneryConditionType
  tier?: number // realm_reached
  subTier?: number // realm_reached
  rankingType?: string // ranking_position
  position?: number // ranking_position
  minCount?: number // craft_count, pvp_kills, visitor_count
  minExp?: number // total_exp
  minLevel?: number // cave_level (灵脉等级+静室等级)
}

export interface SceneryConfig {
  id: string
  name: string
  description: string
  condition: SceneryCondition
}

export const SCENERY_CONFIG: SceneryConfig[] = [
  {
    id: 'foundation_stone',
    name: '筑基碑',
    description: '记录你成功筑基的荣耀时刻',
    condition: { type: 'realm_reached', tier: 2, subTier: 1 },
  },
  {
    id: 'golden_core',
    name: '金丹圣台',
    description: '结丹成功的见证',
    condition: { type: 'realm_reached', tier: 3, subTier: 1 },
  },
  {
    id: 'nascent_soul_shrine',
    name: '元婴神殿',
    description: '元婴大成的标志',
    condition: { type: 'realm_reached', tier: 4, subTier: 1 },
  },
  {
    id: 'alchemy_cauldron',
    name: '九转丹鼎',
    description: '成功炼制100颗丹药的丹道成就',
    condition: { type: 'craft_count', minCount: 100 },
  },
  {
    id: 'master_cauldron',
    name: '万丹鼎',
    description: '成功炼制1000颗丹药的丹道宗师成就',
    condition: { type: 'craft_count', minCount: 1000 },
  },
  {
    id: 'battle_monument',
    name: '战功碑',
    description: 'PvP击杀100人的战斗成就',
    condition: { type: 'pvp_kills', minCount: 100 },
  },
  {
    id: 'exp_tree',
    name: '悟道神树',
    description: '累计修为达到100万的修炼成就',
    condition: { type: 'total_exp', minExp: 1000000 },
  },
  {
    id: 'exp_mountain',
    name: '参天道峰',
    description: '累计修为达到1000万的修炼大成就',
    condition: { type: 'total_exp', minExp: 10000000 },
  },
  {
    id: 'hospitable_pavilion',
    name: '迎宾阁',
    description: '累计接待100位访客的好客成就',
    condition: { type: 'visitor_count', minCount: 100 },
  },
  {
    id: 'spirit_fountain',
    name: '灵泉',
    description: '洞府总等级达到10的建设成就',
    condition: { type: 'cave_level', minLevel: 10 },
  },
  {
    id: 'cave_paradise',
    name: '洞天福地',
    description: '洞府总等级达到满级的终极成就',
    condition: { type: 'cave_level', minLevel: 20 },
  },
  {
    id: 'ranking_champion',
    name: '榜首华表',
    description: '曾登顶修为榜榜首',
    condition: { type: 'ranking_position', rankingType: 'exp', position: 1 },
  },
  {
    id: 'ranking_top10',
    name: '十强石碑',
    description: '进入修为榜前十',
    condition: { type: 'ranking_position', rankingType: 'exp', position: 10 },
  },
]

// 获取景观配置
export function getSceneryConfig(sceneryId: string): SceneryConfig | undefined {
  return SCENERY_CONFIG.find((s) => s.id === sceneryId)
}

// 获取所有景观配置
export function getAllSceneryConfigs(): SceneryConfig[] {
  return SCENERY_CONFIG
}

// ========== 留言系统配置 ==========

export const MESSAGE_CONFIG = {
  maxLength: 200, // 留言最大长度
  maxMessagesPerDay: 10, // 每日最多留言次数
  pageSize: 20, // 分页大小
}
