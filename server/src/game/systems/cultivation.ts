// 闭关修炼系统
import { SPIRIT_ROOTS, type SpiritRoot, type RootType } from '../constants/spiritRoots'

// ==================== 修炼结果类型 ====================
export type CultivationResult = 'critical_success' | 'success' | 'failure' | 'critical_failure'

export interface CultivationOutcome {
  type: CultivationResult
  label: string
  description: string
  expMultiplier: number
  color: string
}

export const CULTIVATION_OUTCOMES: Record<CultivationResult, CultivationOutcome> = {
  critical_success: {
    type: 'critical_success',
    label: '大彻大悟',
    description: '灵台空明，道心通透，修为大进！',
    expMultiplier: 2.0,
    color: '#f0e6c8'
  },
  success: {
    type: 'success',
    label: '修炼成功',
    description: '心神宁静，吐纳顺畅，修为精进。',
    expMultiplier: 1.0,
    color: '#7cb88a'
  },
  failure: {
    type: 'failure',
    label: '修炼失败',
    description: '心神恍惚，灵气散逸，修为略损。',
    expMultiplier: -0.2,
    color: '#9ca3af'
  },
  critical_failure: {
    type: 'critical_failure',
    label: '走火入魔',
    description: '心魔入侵，经脉受损，修为暴跌！',
    expMultiplier: -0.5,
    color: '#c96a5a'
  }
}

// ==================== 灵根类型影响 ====================
export const ROOT_TYPE_CULTIVATION_CONFIG: Record<
  RootType,
  {
    baseSuccessRate: number
    criticalSuccessRate: number
    criticalFailureRate: number
    baseExpGain: number
  }
> = {
  heavenly: {
    baseSuccessRate: 0.85,
    criticalSuccessRate: 0.15,
    criticalFailureRate: 0.02,
    baseExpGain: 100
  },
  variant: {
    baseSuccessRate: 0.8,
    criticalSuccessRate: 0.12,
    criticalFailureRate: 0.03,
    baseExpGain: 120
  },
  true: {
    baseSuccessRate: 0.75,
    criticalSuccessRate: 0.1,
    criticalFailureRate: 0.05,
    baseExpGain: 80
  },
  pseudo: {
    baseSuccessRate: 0.65,
    criticalSuccessRate: 0.05,
    criticalFailureRate: 0.08,
    baseExpGain: 50
  },
  waste: {
    baseSuccessRate: 0.5,
    criticalSuccessRate: 0.02,
    criticalFailureRate: 0.15,
    baseExpGain: 20
  }
}

// ==================== 道心等级 ====================
export interface DaoHeartLevel {
  level: number
  name: string
  minActivity: number
  successRateBonus: number
  criticalSuccessBonus: number
  criticalFailureReduce: number
  color: string
}

export const DAO_HEART_LEVELS: DaoHeartLevel[] = [
  {
    level: 1,
    name: '心猿意马',
    minActivity: 0,
    successRateBonus: -0.1,
    criticalSuccessBonus: -0.05,
    criticalFailureReduce: -0.05,
    color: '#6b6560'
  },
  {
    level: 2,
    name: '心神不定',
    minActivity: 10,
    successRateBonus: -0.05,
    criticalSuccessBonus: 0,
    criticalFailureReduce: 0,
    color: '#9ca3af'
  },
  { level: 3, name: '心平气和', minActivity: 30, successRateBonus: 0, criticalSuccessBonus: 0, criticalFailureReduce: 0, color: '#7cb88a' },
  {
    level: 4,
    name: '心如止水',
    minActivity: 60,
    successRateBonus: 0.05,
    criticalSuccessBonus: 0.03,
    criticalFailureReduce: 0.02,
    color: '#6b9fc9'
  },
  {
    level: 5,
    name: '心若琉璃',
    minActivity: 100,
    successRateBonus: 0.1,
    criticalSuccessBonus: 0.05,
    criticalFailureReduce: 0.03,
    color: '#9c7ab8'
  },
  {
    level: 6,
    name: '道心通明',
    minActivity: 200,
    successRateBonus: 0.15,
    criticalSuccessBonus: 0.08,
    criticalFailureReduce: 0.05,
    color: '#f0e6c8'
  }
]

// ==================== 冷却时间配置 ====================
export const CULTIVATION_COOLDOWN_MIN = 10 * 60 * 1000 // 10分钟
export const CULTIVATION_COOLDOWN_MAX = 15 * 60 * 1000 // 15分钟

// 深度闭关（神游太虚）
export const DEEP_CULTIVATION_DURATION = 8 * 60 * 60 * 1000 // 8小时
export const DEEP_CULTIVATION_COOLDOWN = 22 * 60 * 60 * 1000 // 22小时冷却
export const DEEP_CULTIVATION_EARLY_EXIT_PENALTY = 0.5 // 提前出关只获得50%收益

// ==================== 奇遇系统 ====================
export type AdventureType = 'treasure' | 'insight' | 'encounter' | 'inheritance' | 'danger'

export interface Adventure {
  type: AdventureType
  name: string
  description: string
  expBonus: number
  itemReward?: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  weight: number
}

export const CULTIVATION_ADVENTURES: Adventure[] = [
  // 普通奇遇
  {
    type: 'treasure',
    name: '灵石矿脉',
    description: '修炼中感应到一处灵石矿脉的气息，获得少量灵石。',
    expBonus: 0,
    rarity: 'common',
    weight: 30
  },
  { type: 'insight', name: '小有所悟', description: '灵光一闪，对功法有了些许新的理解。', expBonus: 20, rarity: 'common', weight: 25 },
  {
    type: 'encounter',
    name: '灵兽来访',
    description: '一只灵兽被你的气息吸引，短暂停留后离去。',
    expBonus: 10,
    rarity: 'common',
    weight: 20
  },

  // 稀有奇遇
  { type: 'insight', name: '顿悟天机', description: '偶然间触碰到一丝天道法则，修为大进！', expBonus: 50, rarity: 'rare', weight: 10 },
  { type: 'treasure', name: '古人遗宝', description: '感应到一件前辈遗留的法宝气息。', expBonus: 30, rarity: 'rare', weight: 8 },

  // 史诗奇遇
  { type: 'inheritance', name: '传承残篇', description: '脑海中浮现出一段上古传承的残篇。', expBonus: 80, rarity: 'epic', weight: 4 },
  { type: 'encounter', name: '仙人指路', description: '恍惚间似有仙人传音，指点迷津。', expBonus: 100, rarity: 'epic', weight: 2 },

  // 传说奇遇
  { type: 'inheritance', name: '道藏真经', description: '获得一部完整的上古真经传承！', expBonus: 200, rarity: 'legendary', weight: 1 },

  // 特殊奇遇 - 虚天残图
  {
    type: 'treasure',
    name: '虚天残图现世',
    description: '修炼中，一缕古老的气息突然笼罩全身。睁眼时，一张残破的古图浮现在面前，图上记载着通往上古秘境虚天殿的路径...',
    expBonus: 100,
    itemReward: 'xutian_map_fragment',
    rarity: 'legendary',
    weight: 0.5 // 约0.04%概率
  }
]

export const ADVENTURE_BASE_CHANCE = 0.08 // 8%基础触发率

// ==================== 神游太虚奇遇系统 ====================
// 仅在完成完整8小时深度闭关时触发

export interface DeepCultivationEncounter {
  id: string
  name: string
  description: string
  itemReward: string
  chance: number // 触发概率（0-1）
  minRealm?: number // 最低境界要求
}

export const DEEP_CULTIVATION_ENCOUNTERS: DeepCultivationEncounter[] = [
  {
    id: 'kunpeng_passing',
    name: '鲲鹏掠过',
    description: '神游太虚之际，忽见天际一道庞大身影掠过。那是上古神兽鲲鹏！一根璀璨羽毛飘然落下，蕴含着水火既济、阴阳调和之理...',
    itemReward: 'kunpeng_feather',
    chance: 0.08, // 8%触发概率
    minRealm: 4 // 元婴期以上
  }
]

/**
 * 深度闭关奇遇判定
 * @param realmTier 境界等级
 * @param wasEarlyExit 是否提前退出
 * @returns 触发的奇遇，如果没有触发则返回null
 */
export function rollDeepCultivationEncounter(realmTier: number, wasEarlyExit: boolean): DeepCultivationEncounter | null {
  // 提前退出不触发奇遇
  if (wasEarlyExit) return null

  // 筛选符合境界要求的奇遇
  const eligibleEncounters = DEEP_CULTIVATION_ENCOUNTERS.filter(e => !e.minRealm || realmTier >= e.minRealm)

  // 依次判定每个奇遇
  for (const encounter of eligibleEncounters) {
    if (Math.random() < encounter.chance) {
      return encounter
    }
  }

  return null
}

// ==================== 丹毒系统 ====================
export interface PoisonStack {
  pillType: string
  stacks: number
  lastUseTime: number
}

export const POISON_CONFIG = {
  maxStacks: 5,
  decayTime: 24 * 60 * 60 * 1000, // 24小时
  decayPerHour: 1 / 24,
  cultivationPenaltyPerStack: 0.05,
  craftingPenaltyPerStack: 0.08
}

// ==================== 境界经验倍率 ====================
export const REALM_EXP_MULTIPLIER: Record<number, number> = {
  1: 1.0, // 炼气期
  2: 1.5, // 筑基期
  3: 2.0, // 结丹期
  4: 3.0, // 元婴期
  5: 4.5, // 化神期
  6: 6.0, // 炼虚期
  7: 8.0, // 合体期
  8: 10.0, // 大乘期
  9: 15.0 // 渡劫期
}

// ==================== 活跃度系统 ====================
export interface ActivitySource {
  id: string
  name: string
  points: number
  description: string
  dailyLimit: number
}

export const ACTIVITY_SOURCES: ActivitySource[] = [
  { id: 'login', name: '每日登录', points: 10, description: '每日首次登录', dailyLimit: 1 },
  { id: 'cultivation', name: '闭关修炼', points: 5, description: '完成一次闭关修炼', dailyLimit: 10 },
  { id: 'explore', name: '探索秘境', points: 8, description: '探索一处秘境', dailyLimit: 5 },
  { id: 'pvp', name: '切磋论道', points: 10, description: '与其他修士切磋', dailyLimit: 3 },
  { id: 'alchemy', name: '炼丹制器', points: 5, description: '炼制一枚丹药或法器', dailyLimit: 10 },
  { id: 'quest', name: '完成任务', points: 15, description: '完成一个任务', dailyLimit: 5 },
  { id: 'deep_cultivation', name: '神游太虚', points: 30, description: '完成一次深度闭关', dailyLimit: 1 }
]

export const ACTIVITY_DECAY_RATE = 0.1

// ==================== 被动修炼 ====================
export const PASSIVE_CULTIVATION = {
  expPerMinute: 1,
  maxOfflineMinutes: 480 // 8小时
}

// ==================== 工具函数 ====================

// 获取道心等级
export function getDaoHeartLevel(activityPoints: number): DaoHeartLevel {
  for (let i = DAO_HEART_LEVELS.length - 1; i >= 0; i--) {
    if (activityPoints >= DAO_HEART_LEVELS[i].minActivity) {
      return DAO_HEART_LEVELS[i]
    }
  }
  return DAO_HEART_LEVELS[0]
}

// 生成随机冷却时间
export function generateCooldown(): number {
  return Math.floor(CULTIVATION_COOLDOWN_MIN + Math.random() * (CULTIVATION_COOLDOWN_MAX - CULTIVATION_COOLDOWN_MIN))
}

// 计算修炼成功率
export interface CultivationRates {
  successRate: number
  criticalSuccessRate: number
  criticalFailureRate: number
  failureRate: number
}

// 太一门效果参数
export interface TaiyiEffects {
  consciousnessBonus?: number // 道心通明：神识带来的成功率加成（百分比）
  debuffEffect?: number // 神识冲击减益：失败率增加（百分比）
  waterBuffActive?: boolean // 润水之息：修为获取+45%
  earthBuffActive?: boolean // 厚土之息：失败惩罚-95%
}

export function calculateCultivationRates(
  spiritRoot: SpiritRoot,
  activityPoints: number,
  poisonStacks: number = 0,
  taiyiEffects?: TaiyiEffects
): CultivationRates {
  const rootConfig = ROOT_TYPE_CULTIVATION_CONFIG[spiritRoot.rootType]
  const daoHeart = getDaoHeartLevel(activityPoints)

  let successRate = rootConfig.baseSuccessRate + daoHeart.successRateBonus
  let criticalSuccessRate = rootConfig.criticalSuccessRate + daoHeart.criticalSuccessBonus
  let criticalFailureRate = Math.max(0, rootConfig.criticalFailureRate - daoHeart.criticalFailureReduce)

  // 丹毒影响
  if (poisonStacks > 0) {
    const poisonPenalty = poisonStacks * 0.02
    successRate -= poisonPenalty
    criticalFailureRate += poisonPenalty * 0.5
  }

  // 太一门：道心通明 - 神识带来的成功率加成
  if (taiyiEffects?.consciousnessBonus && taiyiEffects.consciousnessBonus > 0) {
    successRate += taiyiEffects.consciousnessBonus / 100 // 转换百分比为小数
  }

  // 太一门：神识冲击减益 - 失败率增加
  if (taiyiEffects?.debuffEffect && taiyiEffects.debuffEffect > 0) {
    successRate -= taiyiEffects.debuffEffect / 100 // 减少成功率即增加失败率
    criticalFailureRate += taiyiEffects.debuffEffect / 200 // 走火入魔率也小幅增加
  }

  // 确保概率在合理范围内
  successRate = Math.min(0.95, Math.max(0.3, successRate))
  criticalSuccessRate = Math.min(0.3, Math.max(0.01, criticalSuccessRate))
  criticalFailureRate = Math.min(0.25, Math.max(0.01, criticalFailureRate))

  const failureRate = 1 - successRate

  return { successRate, criticalSuccessRate, criticalFailureRate, failureRate }
}

// 触发奇遇
export function rollAdventure(daoHeartLevel: number): Adventure | null {
  const bonusChance = (daoHeartLevel - 1) * 0.02
  const finalChance = ADVENTURE_BASE_CHANCE + bonusChance

  if (Math.random() > finalChance) {
    return null
  }

  const totalWeight = CULTIVATION_ADVENTURES.reduce((sum, a) => sum + a.weight, 0)
  let roll = Math.random() * totalWeight

  for (const adventure of CULTIVATION_ADVENTURES) {
    roll -= adventure.weight
    if (roll <= 0) {
      return adventure
    }
  }

  return null
}

// 突破结果
export interface BreakthroughResult {
  newRealmName?: string
  message: string
}

// 执行修炼
export interface CultivationExecuteResult {
  outcome: CultivationOutcome
  baseExp: number
  finalExp: number
  daoHeart: DaoHeartLevel
  rates: CultivationRates
  message: string
  adventure: Adventure | null
  cooldown: number
  breakthrough?: BreakthroughResult
}

export function executeCultivation(
  spiritRoot: SpiritRoot,
  activityPoints: number,
  realmTier: number = 1,
  poisonStacks: number = 0,
  taiyiEffects?: TaiyiEffects
): CultivationExecuteResult {
  const rootConfig = ROOT_TYPE_CULTIVATION_CONFIG[spiritRoot.rootType]
  const daoHeart = getDaoHeartLevel(activityPoints)
  const rates = calculateCultivationRates(spiritRoot, activityPoints, poisonStacks, taiyiEffects)

  // 境界经验倍率
  const realmMultiplier = REALM_EXP_MULTIPLIER[realmTier] || 1.0
  const baseExp = Math.floor(rootConfig.baseExpGain * realmMultiplier)

  // 随机决定结果
  const roll = Math.random()
  let result: CultivationResult

  if (roll < rates.criticalFailureRate) {
    result = 'critical_failure'
  } else if (roll < rates.criticalFailureRate + rates.criticalSuccessRate * rates.successRate) {
    result = 'critical_success'
  } else if (roll < rates.successRate) {
    result = 'success'
  } else {
    result = 'failure'
  }

  const outcome = CULTIVATION_OUTCOMES[result]

  // 丹毒影响收益
  let expMultiplier = outcome.expMultiplier
  if (poisonStacks > 0 && expMultiplier > 0) {
    expMultiplier *= 1 - poisonStacks * POISON_CONFIG.cultivationPenaltyPerStack
  }

  // 太一门：厚土之息 - 失败惩罚降低95%
  if (taiyiEffects?.earthBuffActive && expMultiplier < 0) {
    expMultiplier *= 0.05 // 只承受5%的惩罚
  }

  // 触发奇遇
  let adventure: Adventure | null = null
  let adventureBonus = 0
  if (result === 'success' || result === 'critical_success') {
    adventure = rollAdventure(daoHeart.level)
    if (adventure) {
      adventureBonus = adventure.expBonus
    }
  }

  // 太一门：润水之息 - 修为获取增加45%
  let waterBuffBonus = 0
  if (taiyiEffects?.waterBuffActive && expMultiplier > 0) {
    waterBuffBonus = Math.floor(baseExp * expMultiplier * 0.45)
  }

  const finalExp = Math.floor(baseExp * expMultiplier) + adventureBonus + waterBuffBonus

  // 生成描述性消息
  const messages: Record<CultivationResult, string[]> = {
    critical_success: [
      '天人合一，道韵流转，你感受到了天地至理的一丝脉络。',
      '灵台空明，顿悟天机，修为境界隐隐有突破之象。',
      '心神与天地同频，灵气如潮水般涌入经脉，收获颇丰。'
    ],
    success: ['呼吸吐纳，灵气入体，修为稳步提升。', '心神沉静，感悟天地，此次修炼颇有所得。', '五气朝元，周天运转，又是一次圆满的修行。'],
    failure: ['心神恍惚，灵气涣散，此次修炼收效甚微。', '心魔浮动，无法入定，只得草草收场。', '天时不利，灵气浑浊，修炼未能尽功。'],
    critical_failure: [
      '心魔入侵！经脉逆行，口吐鲜血，修为大损！',
      '走火入魔！真气乱窜，差点伤及根基！',
      '入魔之兆！幸亏及时收手，否则后果不堪设想！'
    ]
  }

  const messageList = messages[result]
  let message = messageList[Math.floor(Math.random() * messageList.length)]

  if (adventure) {
    message += `\n\n【奇遇】${adventure.name}：${adventure.description}`
  }

  const cooldown = generateCooldown()

  return {
    outcome,
    baseExp,
    finalExp,
    daoHeart,
    rates,
    message,
    adventure,
    cooldown
  }
}

// 检查冷却时间
export function checkCooldown(
  lastCultivationTime: number | null,
  cooldownDuration: number
): {
  canCultivate: boolean
  remainingTime: number
  remainingTimeDisplay: string
} {
  if (!lastCultivationTime) {
    return { canCultivate: true, remainingTime: 0, remainingTimeDisplay: '' }
  }

  const now = Date.now()
  const elapsed = now - lastCultivationTime
  const remaining = cooldownDuration - elapsed

  if (remaining <= 0) {
    return { canCultivate: true, remainingTime: 0, remainingTimeDisplay: '' }
  }

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  const display = minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`

  return { canCultivate: false, remainingTime: remaining, remainingTimeDisplay: display }
}

// 深度闭关计算
export interface DeepCultivationSession {
  startTime: number
  endTime: number
  expectedSessions: number
  isActive: boolean
}

export interface DeepCultivationResult {
  totalSessions: number
  successCount: number
  failureCount: number
  criticalSuccessCount: number
  criticalFailureCount: number
  totalExp: number
  adventures: Adventure[]
  specialEncounter?: DeepCultivationEncounter // 神游太虚特殊奇遇
  duration: number
  wasEarlyExit: boolean
  breakthrough?: BreakthroughResult
}

export function calculateDeepCultivation(
  spiritRoot: SpiritRoot,
  activityPoints: number,
  realmTier: number,
  actualDuration: number,
  wasEarlyExit: boolean,
  taiyiEffects?: TaiyiEffects
): DeepCultivationResult {
  const avgCooldown = (CULTIVATION_COOLDOWN_MIN + CULTIVATION_COOLDOWN_MAX) / 2
  const totalSessions = Math.floor(actualDuration / avgCooldown)

  let successCount = 0
  let failureCount = 0
  let criticalSuccessCount = 0
  let criticalFailureCount = 0
  let totalExp = 0
  const adventures: Adventure[] = []

  for (let i = 0; i < totalSessions; i++) {
    const result = executeCultivation(spiritRoot, activityPoints, realmTier, 0, taiyiEffects)

    switch (result.outcome.type) {
      case 'critical_success':
        criticalSuccessCount++
        break
      case 'success':
        successCount++
        break
      case 'failure':
        failureCount++
        break
      case 'critical_failure':
        criticalFailureCount++
        break
    }

    totalExp += result.finalExp

    if (result.adventure) {
      adventures.push(result.adventure)
    }
  }

  if (wasEarlyExit) {
    totalExp = Math.floor(totalExp * DEEP_CULTIVATION_EARLY_EXIT_PENALTY)
  }

  // 神游太虚特殊奇遇判定（仅完整8小时闭关触发）
  const specialEncounter = rollDeepCultivationEncounter(realmTier, wasEarlyExit)

  return {
    totalSessions,
    successCount,
    failureCount,
    criticalSuccessCount,
    criticalFailureCount,
    totalExp,
    adventures,
    specialEncounter: specialEncounter || undefined,
    duration: actualDuration,
    wasEarlyExit
  }
}

// 和平模式检查
export function canEnablePeaceMode(realmTier: number): boolean {
  return realmTier === 1
}

// 活跃度衰减
export function calculateDailyActivityDecay(currentActivity: number): number {
  return Math.floor(currentActivity * (1 - ACTIVITY_DECAY_RATE))
}

// 丹毒清理
export function cleanupPoisonStacks(stacks: PoisonStack[]): PoisonStack[] {
  const now = Date.now()
  return stacks.filter(p => {
    const elapsed = now - p.lastUseTime
    if (elapsed >= POISON_CONFIG.decayTime) {
      return false
    }
    const hoursElapsed = elapsed / 3600000
    const decayedStacks = Math.floor(hoursElapsed * POISON_CONFIG.decayPerHour * POISON_CONFIG.maxStacks)
    p.stacks = Math.max(0, p.stacks - decayedStacks)
    return p.stacks > 0
  })
}

// 被动修炼收益
export function calculatePassiveCultivation(lastOnlineTime: number): number {
  const now = Date.now()
  const elapsed = now - lastOnlineTime
  const minutes = Math.min(Math.floor(elapsed / 60000), PASSIVE_CULTIVATION.maxOfflineMinutes)
  return minutes * PASSIVE_CULTIVATION.expPerMinute
}
