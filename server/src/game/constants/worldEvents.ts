/**
 * 天道法则 - 世界事件常量配置
 */

// 世界事件类型
export const WORLD_EVENT_TYPES = {
  BLESSING: 'blessing', // 祥瑞
  CALAMITY: 'calamity', // 厄运
} as const

// 效果类型
export const EFFECT_TYPES = {
  // 祥瑞效果
  EXP_BONUS: 'exp_bonus', // 修为奖励
  SPIRIT_STONES: 'spirit_stones', // 灵石奖励
  CULTIVATION_BUFF: 'cultivation_buff', // 修炼加成buff
  RARE_ITEM: 'rare_item', // 稀有物品

  // 厄运效果
  EXP_LOSS: 'exp_loss', // 修为损失
  SPIRIT_STONES_LOSS: 'spirit_stones_loss', // 灵石损失
  CULTIVATION_DEBUFF: 'cultivation_debuff', // 修炼减益debuff
  ITEM_LOSS: 'item_loss', // 物品丢失
} as const

// 祥瑞事件配置
export const BLESSING_EVENTS = [
  {
    effectType: EFFECT_TYPES.EXP_BONUS,
    weight: 30, // 权重，用于随机选择
    name: '天降甘露',
    description: '{name}沐浴天道恩泽，获得{value}点修为',
    minValue: 1000,
    maxValue: 10000,
    valueMultiplierByTier: 1.5, // 按境界提升倍率
  },
  {
    effectType: EFFECT_TYPES.SPIRIT_STONES,
    weight: 25,
    name: '福缘深厚',
    description: '{name}福星高照，获得{value}灵石',
    minValue: 100,
    maxValue: 500,
    valueMultiplierByTier: 1.3,
  },
  {
    effectType: EFFECT_TYPES.CULTIVATION_BUFF,
    weight: 25,
    name: '灵气潮汐',
    description: '{name}被灵气潮汐眷顾，修炼效率提升{value}%，持续1小时',
    minValue: 20,
    maxValue: 50,
    duration: 60 * 60 * 1000, // 1小时
  },
  {
    effectType: EFFECT_TYPES.RARE_ITEM,
    weight: 20,
    name: '天降奇缘',
    description: '{name}机缘巧合，获得{itemName}',
    possibleItems: [
      { itemId: 'spirit_gathering_pill', weight: 40 },
      { itemId: 'qi_condensing_pill', weight: 30 },
      { itemId: 'foundation_establishment_pill', weight: 15 },
      { itemId: 'heavenly_fire_liquid', weight: 8 },
      { itemId: 'soul_condensing_pill', weight: 7 },
    ],
  },
]

// 厄运事件配置
export const CALAMITY_EVENTS = [
  {
    effectType: EFFECT_TYPES.EXP_LOSS,
    weight: 30,
    name: '心魔入侵',
    description: '{name}遭心魔侵袭，损失{value}点修为',
    minValue: 500,
    maxValue: 5000,
    valueMultiplierByTier: 1.3,
    maxLossPercent: 0.1, // 最多损失当前修为的10%
  },
  {
    effectType: EFFECT_TYPES.SPIRIT_STONES_LOSS,
    weight: 25,
    name: '盗贼光顾',
    description: '{name}被神秘窃贼偷走{value}灵石',
    minValue: 50,
    maxValue: 200,
    valueMultiplierByTier: 1.2,
    maxLossPercent: 0.15, // 最多损失15%灵石
  },
  {
    effectType: EFFECT_TYPES.CULTIVATION_DEBUFF,
    weight: 30,
    name: '灵气紊乱',
    description: '{name}周身灵气紊乱，修炼效率降低{value}%，持续1小时',
    minValue: 10,
    maxValue: 30,
    duration: 60 * 60 * 1000, // 1小时
  },
  {
    effectType: EFFECT_TYPES.ITEM_LOSS,
    weight: 15,
    name: '飞来横祸',
    description: '{name}遭遇飞来横祸，丢失了{itemName}',
    // 只会丢失普通物品，不会丢失珍贵物品
    targetItemQualities: ['common', 'uncommon'],
  },
]

// 事件触发概率配置
export const EVENT_PROBABILITY = {
  BLESSING_CHANCE: 0.6, // 60%概率是祥瑞
  CALAMITY_CHANCE: 0.4, // 40%概率是厄运
}

// 南宫婉奇遇配置
export const NANGONG_WAN_CONFIG = {
  // 触发概率（筑基期修炼时）
  TRIGGER_CHANCE: 0.001, // 0.1%

  // 触发条件：筑基期（tier = 2）
  REQUIRED_TIER: 2,

  // 奇遇持续时间（24小时）
  DURATION: 24 * 60 * 60 * 1000,

  // 境界跌落到炼气初期
  FALL_TO_TIER: 1,
  FALL_TO_SUB_TIER: 1,

  // 修为返还倍率（储存的修为 * 此倍率）
  EXP_RETURN_MULTIPLIER: 1.0,

  // 触发消息
  TRIGGER_MESSAGE:
    '你在修炼中突然感到一阵眩晕，醒来时发现自己身处一片桃花林中。一位绝世容颜的女子正含笑看着你...',

  // 结束消息
  END_MESSAGE: '南宫婉的身影渐渐消散，你从梦境中醒来。虽然境界跌落，但所有储存的修为已经返还给你。',
}

// 渡劫配置
export const TRIBULATION_CONFIG = {
  // 筑基之劫
  FOUNDATION: {
    // 触发条件：炼气圆满（tier=1, subTier=4）
    REQUIRED_TIER: 1,
    REQUIRED_SUB_TIER: 4,

    // 所需物品
    REQUIRED_ITEMS: [{ itemId: 'foundation_establishment_pill', quantity: 1, name: '筑基丹' }],

    // 成功率（有筑基丹时100%成功）
    SUCCESS_RATE: 1.0,

    // 失败不会死亡
    DEATH_ON_FAILURE: false,
  },

  // 结丹之劫
  CORE_FORMATION: {
    // 触发条件：筑基圆满（tier=2, subTier=4）
    REQUIRED_TIER: 2,
    REQUIRED_SUB_TIER: 4,

    // 所需物品（结丹三宝）
    REQUIRED_ITEMS: [
      { itemId: 'heavenly_fire_liquid', quantity: 1, name: '天火液' },
      { itemId: 'soul_condensing_pill', quantity: 1, name: '凝魂丹' },
      { itemId: 'triple_revolving_pill', quantity: 1, name: '三转重元丹' },
    ],

    // 基础成功率
    BASE_SUCCESS_RATE: 0.7, // 70%

    // 失败会死亡
    DEATH_ON_FAILURE: true,
  },

  // 元婴之劫
  NASCENT_SOUL: {
    // 触发条件：结丹圆满（tier=3, subTier=4）
    REQUIRED_TIER: 3,
    REQUIRED_SUB_TIER: 4,

    // 所需物品（元婴三宝）
    REQUIRED_ITEMS: [
      { itemId: 'soul_nurturing_wood', quantity: 25, name: '养魂木' },
      { itemId: 'nine_bend_spirit_ginseng_pill', quantity: 1, name: '九曲灵参丹' },
      { itemId: 'azure_luan_sky_shield', quantity: 1, name: '青鸾天盾' },
    ],

    // 基础成功率
    BASE_SUCCESS_RATE: 0.5, // 50%

    // 失败会死亡
    DEATH_ON_FAILURE: true,
  },
}

// 渡劫类型常量
export const TRIBULATION_TYPES = {
  FOUNDATION: 'foundation',
  CORE_FORMATION: 'core_formation',
  NASCENT_SOUL: 'nascent_soul',
} as const

// 天机回溯配置
export const ROLLBACK_CONFIG = {
  // 只有管理员可以执行
  REQUIRE_ADMIN: true,

  // 回溯时限（渡劫失败后7天内可回溯）
  TIME_LIMIT: 7 * 24 * 60 * 60 * 1000,
}
