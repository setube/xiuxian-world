/**
 * 星宫宗门专属系统 - 道心侍妾、周天星斗大阵、星衍天机、牵星引灵之术
 * 星宫号称修仙界第一大势力，弟子待遇丰厚，拥有独特的侍妾和星阵系统
 */

// ==================== 侍妾系统 ====================

// 侍妾特殊技能效果类型
export type ConsortSkillEffectType =
  | 'cultivation_bonus' // 修炼加成
  | 'star_gathering_speed' // 凝聚速度加成
  | 'event_resistance' // 事件抵抗
  | 'failure_reduction' // 失败惩罚降低
  | 'free_change_fate' // 免费改命次数

// 侍妾特殊技能
export interface ConsortSkill {
  id: string
  name: string
  description: string
  effect: {
    type: ConsortSkillEffectType
    value: number
  }
}

// 侍妾模板
export interface ConsortTemplate {
  id: string
  name: string
  title: string
  description: string
  personality: string
  baseAffectionGain: number // 基础好感度增益
  specialSkill: ConsortSkill
}

// 侍妾模板列表
export const CONSORT_TEMPLATES: Record<string, ConsortTemplate> = {
  consort_xingyu: {
    id: 'consort_xingyu',
    name: '星雨',
    title: '星辰仙子',
    description: '温婉如水的星宫侍妾，擅长以星光滋养修为',
    personality: '温婉',
    baseAffectionGain: 5,
    specialSkill: {
      id: 'skill_star_blessing',
      name: '星雨祝福',
      description: '闭关修炼时修为获取增加10%',
      effect: { type: 'cultivation_bonus', value: 10 }
    }
  },
  consort_yuehua: {
    id: 'consort_yuehua',
    name: '月华',
    title: '月宫仙娥',
    description: '冷若冰霜的月宫仙娥，精通星辰凝聚之术',
    personality: '冷傲',
    baseAffectionGain: 3,
    specialSkill: {
      id: 'skill_moon_guidance',
      name: '月华照耀',
      description: '引星盘凝聚速度增加15%',
      effect: { type: 'star_gathering_speed', value: 15 }
    }
  },
  consort_xuanji: {
    id: 'consort_xuanji',
    name: '璇玑',
    title: '天枢星君',
    description: '高傲矜持的天枢星君，能够庇护星辰免受干扰',
    personality: '高傲',
    baseAffectionGain: 4,
    specialSkill: {
      id: 'skill_xuanji_protection',
      name: '璇玑庇护',
      description: '引星盘事件触发概率降低20%',
      effect: { type: 'event_resistance', value: 20 }
    }
  },
  consort_ziwei: {
    id: 'consort_ziwei',
    name: '紫薇',
    title: '帝星圣女',
    description: '端庄高贵的帝星圣女，能够化解修炼失败的冲击',
    personality: '端庄',
    baseAffectionGain: 4,
    specialSkill: {
      id: 'skill_ziwei_protection',
      name: '紫薇护体',
      description: '闭关失败时惩罚降低25%',
      effect: { type: 'failure_reduction', value: 25 }
    }
  },
  consort_tianxuan: {
    id: 'consort_tianxuan',
    name: '天璇',
    title: '玄女',
    description: '神秘莫测的玄女，精通天机推演',
    personality: '神秘',
    baseAffectionGain: 3,
    specialSkill: {
      id: 'skill_tianxuan_divination',
      name: '天璇妙算',
      description: '每周获得1次免费改命机会',
      effect: { type: 'free_change_fate', value: 1 }
    }
  }
}

// 好感度等级
export interface AffectionLevel {
  level: number
  name: string
  minAffection: number
  bonus: number // 修炼加成百分比
}

export const AFFECTION_LEVELS: AffectionLevel[] = [
  { level: 0, name: '陌生', minAffection: 0, bonus: 0 },
  { level: 1, name: '熟识', minAffection: 20, bonus: 5 },
  { level: 2, name: '亲近', minAffection: 40, bonus: 10 },
  { level: 3, name: '亲密', minAffection: 60, bonus: 15 },
  { level: 4, name: '心意相通', minAffection: 80, bonus: 20 },
  { level: 5, name: '灵犀相连', minAffection: 100, bonus: 30 }
]

// 侍妾系统配置
export const CONSORT_CONFIG = {
  greetingCooldownHours: 24, // 问安冷却24小时
  greetingAffectionGain: 5, // 问安增加好感度
  giftCostBase: 100, // 赠予基础灵石消耗
  giftAffectionGain: 3, // 赠予增加好感度
  spiritFeedbackCost: 500, // 灵力反哺消耗灵石
  spiritFeedbackBonus: 30, // 灵力反哺修炼加成%
  spiritFeedbackDurationMs: 3600000, // 灵力反哺持续1小时
  divinationCost: 200, // 卜算消耗灵石
  maxAffection: 100, // 好感度上限
  // 被动效果（红袖添香）
  passiveRedSleeveBonus: 10 // 红袖添香 +10%闭关产出
}

// 获取好感度等级
export function getAffectionLevel(affection: number): AffectionLevel {
  for (let i = AFFECTION_LEVELS.length - 1; i >= 0; i--) {
    if (affection >= AFFECTION_LEVELS[i]!.minAffection) {
      return AFFECTION_LEVELS[i]!
    }
  }
  return AFFECTION_LEVELS[0]!
}

// 获取随机侍妾模板ID
export function getRandomConsortTemplateId(): string {
  const templates = Object.keys(CONSORT_TEMPLATES)
  const index = Math.floor(Math.random() * templates.length)
  return templates[index]!
}

// ==================== 引星盘系统（观星台）====================

// 星辰类型
export interface StarType {
  id: string
  name: string
  description: string
  durationHours: number
  yieldItemId: string
  yieldMin: number
  yieldMax: number
  eventChance: number // 事件触发概率
}

export const STAR_TYPES: Record<string, StarType> = {
  star_essence: {
    id: 'star_essence',
    name: '星辰精华',
    description: '凝聚星辰之力形成的基础精华',
    durationHours: 4,
    yieldItemId: 'item_star_essence',
    yieldMin: 2,
    yieldMax: 4,
    eventChance: 0.1
  },
  star_liquid: {
    id: 'star_liquid',
    name: '星河灵液',
    description: '由星河凝聚而成的珍贵灵液',
    durationHours: 8,
    yieldItemId: 'item_star_liquid',
    yieldMin: 1,
    yieldMax: 2,
    eventChance: 0.15
  },
  star_core: {
    id: 'star_core',
    name: '星核碎片',
    description: '远古星辰陨落后的核心碎片，极为珍贵',
    durationHours: 24,
    yieldItemId: 'item_star_core',
    yieldMin: 1,
    yieldMax: 1,
    eventChance: 0.2
  },
  thunder_star: {
    id: 'thunder_star',
    name: '天雷星',
    description: '蕴含雷霆之力的星辰，传说雷鹏栖息于此。凝聚其精华时有极小概率获得雷鹏遗落的羽毛。',
    durationHours: 12,
    yieldItemId: 'item_thunder_essence',
    yieldMin: 1,
    yieldMax: 3,
    eventChance: 0.15
  }
}

// 天雷星特殊掉落配置
export const THUNDER_STAR_DROP_CONFIG = {
  itemId: 'thunder_peng_feather',
  chance: 0.05, // 5%概率
  minRealm: 4 // 元婴期以上
}

// 引星盘事件类型
export type StarDiskEventType = 'none' | 'dim' | 'chaos'

// 引星盘事件
export interface StarDiskEvent {
  id: StarDiskEventType
  name: string
  description: string
  effect: 'reduce_yield' | 'extend_time'
  penalty: number // 惩罚程度
}

export const STAR_DISK_EVENTS: Record<StarDiskEventType, StarDiskEvent> = {
  none: {
    id: 'none',
    name: '无',
    description: '一切正常',
    effect: 'reduce_yield',
    penalty: 0
  },
  dim: {
    id: 'dim',
    name: '星光黯淡',
    description: '星光逐渐黯淡，产出将会减少',
    effect: 'reduce_yield',
    penalty: 0.5 // 产出减少50%
  },
  chaos: {
    id: 'chaos',
    name: '元磁紊乱',
    description: '元磁场紊乱，凝聚时间将延长',
    effect: 'extend_time',
    penalty: 0.3 // 时间延长30%
  }
}

// 引星盘状态
export type StarDiskStatus = 'idle' | 'gathering' | 'ready' | 'event'

// 引星盘扩展配置
export const STAR_DISK_EXPANSION = {
  baseCost: 500, // 基础贡献消耗
  costMultiplier: 2.0, // 每个递增倍率
  maxDisks: 6, // 最大引星盘数量
  initialDisks: 3, // 初始引星盘数量
  consortBonus: 0.15 // 侍妾派遣产出加成15%
}

// 计算扩展引星盘成本
export function calculateDiskExpansionCost(currentDisks: number): number {
  if (currentDisks >= STAR_DISK_EXPANSION.maxDisks) {
    return -1 // 已达上限
  }
  const expansions = currentDisks - STAR_DISK_EXPANSION.initialDisks
  return Math.floor(STAR_DISK_EXPANSION.baseCost * Math.pow(STAR_DISK_EXPANSION.costMultiplier, expansions))
}

// ==================== 周天星斗大阵 ====================

export const STAR_ARRAY_CONFIG = {
  cooldownHours: 12, // 冷却12小时
  durationHours: 3, // 持续3小时
  maxParticipants: 10, // 最大参与人数
  initiatorBonus: {
    successRate: 98, // 闭关成功率提升到98%
    yieldBonus: 50 // 产出加成50%
  },
  participantBonus: {
    successRate: 80, // 助阵者成功率提升到80%
    yieldBonus: 30 // 助阵者产出加成30%
  },
  minRealm: 2 // 最低筑基期可用
}

// 大阵状态
export type StarArrayStatus = 'active' | 'completed' | 'expired'

// 检查大阵冷却
export function checkArrayCooldown(lastArrayTime: number | null): { canUse: boolean; remainingMs: number } {
  if (!lastArrayTime) return { canUse: true, remainingMs: 0 }

  const cooldownMs = STAR_ARRAY_CONFIG.cooldownHours * 60 * 60 * 1000
  const elapsed = Date.now() - lastArrayTime
  const remaining = cooldownMs - elapsed

  return {
    canUse: remaining <= 0,
    remainingMs: Math.max(0, remaining)
  }
}

// ==================== 星衍天机（观星）====================

// 观星结果类型
export type StargazeResultType = 'great_fortune' | 'fortune' | 'neutral' | 'misfortune' | 'great_misfortune'

// 观星结果
export interface StargazeResult {
  type: StargazeResultType
  name: string
  description: string
  bonus?: {
    cultivation?: number // 修炼加成%
    dropRate?: number // 掉落率加成%
  }
  penalty?: {
    cultivation?: number // 修炼减益%
    eventChance?: number // 事件概率增加%
  }
}

export const STARGAZE_RESULTS: Record<StargazeResultType, StargazeResult> = {
  great_fortune: {
    type: 'great_fortune',
    name: '大吉',
    description: '紫气东来，诸事皆顺',
    bonus: { cultivation: 25, dropRate: 10 }
  },
  fortune: {
    type: 'fortune',
    name: '吉',
    description: '今日修炼顺遂',
    bonus: { cultivation: 10 }
  },
  neutral: {
    type: 'neutral',
    name: '平',
    description: '平平无奇'
  },
  misfortune: {
    type: 'misfortune',
    name: '凶',
    description: '诸事不宜，宜静心修炼',
    penalty: { cultivation: -10 }
  },
  great_misfortune: {
    type: 'great_misfortune',
    name: '大凶',
    description: '灾星临门，谨慎行事',
    penalty: { cultivation: -20, eventChance: 20 }
  }
}

// 观星系统配置
export const STARGAZE_CONFIG = {
  cooldownHours: 24, // 每日一次
  changeFateCost: 1000, // 改换星移消耗灵石
  changeFateCooldownHours: 72, // 改命冷却72小时
  // 观星结果概率分布
  resultProbabilities: {
    great_fortune: 0.05, // 5%
    fortune: 0.25, // 25%
    neutral: 0.4, // 40%
    misfortune: 0.25, // 25%
    great_misfortune: 0.05 // 5%
  }
}

// 随机生成观星结果
export function generateStargazeResult(): StargazeResultType {
  const rand = Math.random()
  let cumulative = 0

  const probs = STARGAZE_CONFIG.resultProbabilities
  const order: StargazeResultType[] = ['great_fortune', 'fortune', 'neutral', 'misfortune', 'great_misfortune']

  for (const type of order) {
    cumulative += probs[type]
    if (rand < cumulative) {
      return type
    }
  }

  return 'neutral'
}

// 检查观星冷却
export function checkStargazeCooldown(lastStargazeTime: number | null): { canUse: boolean; remainingMs: number } {
  if (!lastStargazeTime) return { canUse: true, remainingMs: 0 }

  const cooldownMs = STARGAZE_CONFIG.cooldownHours * 60 * 60 * 1000
  const elapsed = Date.now() - lastStargazeTime
  const remaining = cooldownMs - elapsed

  return {
    canUse: remaining <= 0,
    remainingMs: Math.max(0, remaining)
  }
}

// 检查改命冷却
export function checkChangeFateCooldown(lastChangeFateTime: number | null): { canUse: boolean; remainingMs: number } {
  if (!lastChangeFateTime) return { canUse: true, remainingMs: 0 }

  const cooldownMs = STARGAZE_CONFIG.changeFateCooldownHours * 60 * 60 * 1000
  const elapsed = Date.now() - lastChangeFateTime
  const remaining = cooldownMs - elapsed

  return {
    canUse: remaining <= 0,
    remainingMs: Math.max(0, remaining)
  }
}

// ==================== 辅助函数 ====================

// 格式化剩余时间
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '可用'

  const hours = Math.floor(ms / (60 * 60 * 1000))
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }
  return `${minutes}分钟`
}

// 星宫宗门ID
export const STAR_PALACE_SECT_ID = 'xinggong'

// 检查是否是星宫弟子
export function isStarPalaceMember(sectId: string | null): boolean {
  return sectId === STAR_PALACE_SECT_ID
}
