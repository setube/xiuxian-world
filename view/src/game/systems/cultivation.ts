// 闭关修炼系统
import type { SpiritRoot, RootType } from '../constants/spiritRoots'

// ==================== 修炼结果类型 ====================
export type CultivationResult = 'critical_success' | 'success' | 'failure' | 'critical_failure'

export interface CultivationOutcome {
  type: CultivationResult
  label: string
  description: string
  expMultiplier: number // 经验倍率（负数表示损失）
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
// 普通闭关冷却：10~15分钟
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
  expBonus: number // 额外修为加成
  itemReward?: string // 物品奖励ID
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  weight: number // 权重
}

export const CULTIVATION_ADVENTURES: Adventure[] = [
  // 普通奇遇 (权重较高)
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
  { type: 'inheritance', name: '道藏真经', description: '获得一部完整的上古真经传承！', expBonus: 200, rarity: 'legendary', weight: 1 }
]

// 奇遇触发概率（基础概率，道心等级会影响）
export const ADVENTURE_BASE_CHANCE = 0.08 // 8%基础触发率

// ==================== 丹毒系统 ====================
export interface PoisonStack {
  pillType: string // 丹药类型
  stacks: number // 叠加层数
  lastUseTime: number // 最后使用时间
}

export const POISON_CONFIG = {
  maxStacks: 5, // 最大叠加层数
  decayTime: 24 * 60 * 60 * 1000, // 24小时完全消解
  decayPerHour: 1 / 24, // 每小时消解量
  cultivationPenaltyPerStack: 0.05, // 每层丹毒减少5%闭关收益
  craftingPenaltyPerStack: 0.08 // 每层丹毒减少8%炼制成功率
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

// ==================== 工具函数 ====================

// 获取道心等级
export const getDaoHeartLevel = (activityPoints: number): DaoHeartLevel => {
  for (let i = DAO_HEART_LEVELS.length - 1; i >= 0; i--) {
    const level = DAO_HEART_LEVELS[i]
    if (level && activityPoints >= level.minActivity) {
      return level
    }
  }
  return DAO_HEART_LEVELS[0]!
}

// 生成随机冷却时间
export const generateCooldown = (): number => {
  return Math.floor(CULTIVATION_COOLDOWN_MIN + Math.random() * (CULTIVATION_COOLDOWN_MAX - CULTIVATION_COOLDOWN_MIN))
}

// 计算修炼成功率
export interface CultivationRates {
  successRate: number
  criticalSuccessRate: number
  criticalFailureRate: number
  failureRate: number
}

export const calculateCultivationRates = (spiritRoot: SpiritRoot, activityPoints: number, poisonStacks: number = 0): CultivationRates => {
  const rootConfig = ROOT_TYPE_CULTIVATION_CONFIG[spiritRoot.rootType]
  const daoHeart = getDaoHeartLevel(activityPoints)

  let successRate = rootConfig.baseSuccessRate + daoHeart.successRateBonus
  let criticalSuccessRate = rootConfig.criticalSuccessRate + daoHeart.criticalSuccessBonus
  let criticalFailureRate = Math.max(0, rootConfig.criticalFailureRate - daoHeart.criticalFailureReduce)

  // 丹毒影响（增加失败率）
  if (poisonStacks > 0) {
    const poisonPenalty = poisonStacks * 0.02 // 每层丹毒增加2%失败率
    successRate -= poisonPenalty
    criticalFailureRate += poisonPenalty * 0.5
  }

  // 确保概率在合理范围内
  successRate = Math.min(0.95, Math.max(0.3, successRate))
  criticalSuccessRate = Math.min(0.3, Math.max(0.01, criticalSuccessRate))
  criticalFailureRate = Math.min(0.25, Math.max(0.01, criticalFailureRate))

  const failureRate = 1 - successRate

  return { successRate, criticalSuccessRate, criticalFailureRate, failureRate }
}

// 触发奇遇
export const rollAdventure = (daoHeartLevel: number): Adventure | null => {
  // 道心等级增加奇遇触发率
  const bonusChance = (daoHeartLevel - 1) * 0.02 // 每级增加2%
  const finalChance = ADVENTURE_BASE_CHANCE + bonusChance

  if (Math.random() > finalChance) {
    return null
  }

  // 加权随机选择奇遇
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

// 执行修炼
// 突破结果
export interface BreakthroughResult {
  newRealmName?: string
  message: string
  breakthroughCount?: number // 连续突破次数
}

export interface CultivationExecuteResult {
  outcome: CultivationOutcome
  baseExp: number
  finalExp: number
  daoHeart: DaoHeartLevel
  rates: CultivationRates
  message: string
  adventure: Adventure | null
  cooldown: number // 下次冷却时间（毫秒）
  breakthrough?: BreakthroughResult // 突破信息（如果发生了突破）
}

export const executeCultivation = (
  spiritRoot: SpiritRoot,
  activityPoints: number,
  realmTier: number = 1,
  poisonStacks: number = 0
): CultivationExecuteResult => {
  const rootConfig = ROOT_TYPE_CULTIVATION_CONFIG[spiritRoot.rootType]
  const daoHeart = getDaoHeartLevel(activityPoints)
  const rates = calculateCultivationRates(spiritRoot, activityPoints, poisonStacks)

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

  // 触发奇遇（只有成功时才可能触发）
  let adventure: Adventure | null = null
  let adventureBonus = 0
  if (result === 'success' || result === 'critical_success') {
    adventure = rollAdventure(daoHeart.level)
    if (adventure) {
      adventureBonus = adventure.expBonus
    }
  }

  const finalExp = Math.floor(baseExp * expMultiplier) + adventureBonus

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
  let message = messageList[Math.floor(Math.random() * messageList.length)]!

  // 附加奇遇信息
  if (adventure) {
    message += `\n\n【奇遇】${adventure.name}：${adventure.description}`
  }

  // 生成随机冷却时间
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
export const checkCooldown = (
  lastCultivationTime: number | null,
  cooldownDuration: number
): {
  canCultivate: boolean
  remainingTime: number
  remainingTimeDisplay: string
} => {
  if (!lastCultivationTime) {
    return { canCultivate: true, remainingTime: 0, remainingTimeDisplay: '' }
  }

  const now = Date.now()
  const elapsed = now - lastCultivationTime
  const remaining = cooldownDuration - elapsed

  if (remaining <= 0) {
    return { canCultivate: true, remainingTime: 0, remainingTimeDisplay: '' }
  }

  const hours = Math.floor(remaining / 3600000)
  const minutes = Math.floor((remaining % 3600000) / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)

  const display = hours > 0 ? `${hours}小时${minutes}分${seconds}秒` : minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`

  return { canCultivate: false, remainingTime: remaining, remainingTimeDisplay: display }
}

// ==================== 深度闭关（神游太虚）====================
export interface DeepCultivationSession {
  startTime: number
  endTime: number
  expectedSessions: number // 预计进行的闭关次数
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
  duration: number // 实际持续时间
  wasEarlyExit: boolean
  breakthrough?: BreakthroughResult // 突破信息（如果发生了突破）
}

export const calculateDeepCultivation = (
  spiritRoot: SpiritRoot,
  activityPoints: number,
  realmTier: number,
  actualDuration: number, // 实际闭关时长（毫秒）
  wasEarlyExit: boolean
): DeepCultivationResult => {
  // 计算进行了多少次闭关（平均12.5分钟一次）
  const avgCooldown = (CULTIVATION_COOLDOWN_MIN + CULTIVATION_COOLDOWN_MAX) / 2
  const totalSessions = Math.floor(actualDuration / avgCooldown)

  let successCount = 0
  let failureCount = 0
  let criticalSuccessCount = 0
  let criticalFailureCount = 0
  let totalExp = 0
  const adventures: Adventure[] = []

  // 模拟每次闭关
  for (let i = 0; i < totalSessions; i++) {
    const result = executeCultivation(spiritRoot, activityPoints, realmTier)

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

  // 提前出关惩罚
  if (wasEarlyExit) {
    totalExp = Math.floor(totalExp * DEEP_CULTIVATION_EARLY_EXIT_PENALTY)
  }

  return {
    totalSessions,
    successCount,
    failureCount,
    criticalSuccessCount,
    criticalFailureCount,
    totalExp,
    adventures,
    duration: actualDuration,
    wasEarlyExit
  }
}

// ==================== 和平模式 ====================
export interface PeaceModeState {
  isEnabled: boolean
  enabledAt: number | null
}

// 只有炼气期（tier 1）可以开启和平模式
export const canEnablePeaceMode = (realmTier: number): boolean => {
  return realmTier === 1
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

// 活跃度衰减（每日衰减）
export const ACTIVITY_DECAY_RATE = 0.1 // 每日衰减10%

export const calculateDailyActivityDecay = (currentActivity: number): number => {
  return Math.floor(currentActivity * (1 - ACTIVITY_DECAY_RATE))
}

// ==================== 被动修炼 ====================
export const PASSIVE_CULTIVATION = {
  expPerMinute: 1, // 每分钟获得1点经验
  maxOfflineMinutes: 480 // 最多累计8小时
}
