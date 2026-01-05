/**
 * 合欢宗秘法 · 情缘三境
 * 双修系统配置
 */

// 宗门ID
export const HEHUAN_SECT_ID = 'hehuan'

// ==================== 第一层：凡尘缘 (闭关双修) ====================

export const BASIC_DUAL_CULTIVATION = {
  // 最低境界要求：炼气四层 (tier=1, subTier=4)
  minRealmTier: 1,
  minRealmSubTier: 4,

  // 冷却时间：4小时
  cooldownMs: 4 * 60 * 60 * 1000,

  // 基础修为收益（双方各自获得）
  baseExpGain: 200,

  // 合欢宗弟子额外加成
  hehuanBonus: 0.1, // +10%

  // 顿悟概率
  enlightenmentChance: 0.05, // 5%

  // 顿悟修为倍率
  enlightenmentMultiplier: 3,

  // 邀请有效时间：30分钟
  inviteExpiresMs: 30 * 60 * 1000,

  // 双修持续时间：10分钟
  sessionDurationMs: 10 * 60 * 1000
}

// ==================== 第二层：同参道 (缔结同参 & 双修温养) ====================

export const SOUL_BOND = {
  // 最低境界要求：筑基初期 (tier=2, subTier=1)
  minRealmTier: 2,
  minRealmSubTier: 1,

  // 契约持续时间：7天
  bondDurationMs: 7 * 24 * 60 * 60 * 1000,

  // 邀请有效时间：24小时
  inviteExpiresMs: 24 * 60 * 60 * 1000,

  // 缔结同参冷却（在上一个契约到期后）：3天
  rebondCooldownMs: 3 * 24 * 60 * 60 * 1000
}

export const NOURISH_CULTIVATION = {
  // 冷却时间：2小时（比普通双修更短）
  cooldownMs: 2 * 60 * 60 * 1000,

  // 基础修为收益
  baseExpGain: 350,

  // 同参加成（双方都是同参时）
  bondBonus: 0.5, // +50%

  // 合欢宗弟子额外加成
  hehuanBonus: 0.2, // +20%

  // 顿悟概率（大幅提升）
  enlightenmentChance: 0.15, // 15%

  // 顿悟修为倍率
  enlightenmentMultiplier: 4,

  // 每次温养获得的宗门贡献
  contributionGain: 10,

  // 双修持续时间：5分钟
  sessionDurationMs: 5 * 60 * 1000
}

// ==================== 第三层：魔染道 (种下心印 & 双修采补) ====================

export const SOUL_IMPRINT = {
  // 最低境界要求：金丹初期 (tier=3, subTier=1)
  minRealmTier: 3,
  minRealmSubTier: 1,

  // 种下心印冷却：24小时
  cooldownMs: 24 * 60 * 60 * 1000,

  // 最大同时拥有的炉鼎数量
  maxSlaves: 3,

  // 奴役持续时间：3天
  enslaveDurationMs: 3 * 24 * 60 * 60 * 1000,

  // 心神之战基础成功率（根据境界差距调整）
  baseSoulBattleSuccessRate: 0.6, // 60%

  // 每高一个小境界增加的成功率
  successRatePerSubTier: 0.08, // +8%

  // 每低一个小境界减少的成功率
  failureRatePerSubTier: 0.1, // -10%

  // 心神之战失败惩罚：扣除修为
  failurePenaltyExp: 300,

  // 失败时目标获得的修为（攻击者损失的一半）
  failureTargetGain: 150
}

export const HARVEST_CULTIVATION = {
  // 冷却时间：1小时
  cooldownMs: 60 * 60 * 1000,

  // 从炉鼎采补获得的修为（炉鼎损失相同数量）
  harvestExpBase: 500,

  // 炉鼎境界每高一层的额外收益
  bonusPerRealmTier: 100,

  // 合欢宗弟子额外加成
  hehuanBonus: 0.3, // +30%

  // 炉鼎每次被采补的debuff：修炼效率降低
  victimDebuffMultiplier: 0.1, // 每次-10%修炼效率，可叠加

  // 最大debuff叠加次数
  maxDebuffStacks: 5
}

// ==================== 挣脱心印 ====================

export const ESCAPE_SOUL_IMPRINT = {
  // 挣脱冷却：12小时
  cooldownMs: 12 * 60 * 60 * 1000,

  // 基础挣脱成功率
  baseEscapeRate: 0.2, // 20%

  // 每次被采补增加的挣脱成功率
  escapeRatePerHarvest: 0.05, // +5%

  // 每次挣脱失败增加的下次成功率
  escapeRatePerAttempt: 0.1, // +10%

  // 挣脱失败的惩罚：立即被采补一次
  failurePenalty: true
}

// ==================== 境界检查辅助函数 ====================

/**
 * 检查是否满足境界要求
 */
export function meetsRealmRequirement(
  characterTier: number,
  characterSubTier: number,
  requiredTier: number,
  requiredSubTier: number
): boolean {
  if (characterTier > requiredTier) return true
  if (characterTier < requiredTier) return false
  return characterSubTier >= requiredSubTier
}

/**
 * 计算两个角色的境界差距（以小境界计算）
 * 正数表示角色1更高，负数表示角色2更高
 */
export function calculateRealmDifference(char1Tier: number, char1SubTier: number, char2Tier: number, char2SubTier: number): number {
  const char1Total = (char1Tier - 1) * 4 + char1SubTier
  const char2Total = (char2Tier - 1) * 4 + char2SubTier
  return char1Total - char2Total
}

/**
 * 计算心神之战成功率
 */
export function calculateSoulBattleSuccessRate(
  attackerTier: number,
  attackerSubTier: number,
  targetTier: number,
  targetSubTier: number
): number {
  const realmDiff = calculateRealmDifference(attackerTier, attackerSubTier, targetTier, targetSubTier)

  let successRate = SOUL_IMPRINT.baseSoulBattleSuccessRate

  if (realmDiff > 0) {
    // 攻击者境界更高
    successRate += realmDiff * SOUL_IMPRINT.successRatePerSubTier
  } else if (realmDiff < 0) {
    // 攻击者境界更低
    successRate += realmDiff * SOUL_IMPRINT.failureRatePerSubTier
  }

  // 限制在0.1-0.95之间
  return Math.max(0.1, Math.min(0.95, successRate))
}

/**
 * 计算挣脱成功率
 */
export function calculateEscapeSuccessRate(harvestCount: number, escapeAttempts: number): number {
  let rate = ESCAPE_SOUL_IMPRINT.baseEscapeRate
  rate += harvestCount * ESCAPE_SOUL_IMPRINT.escapeRatePerHarvest
  rate += escapeAttempts * ESCAPE_SOUL_IMPRINT.escapeRatePerAttempt

  return Math.min(0.9, rate) // 最高90%
}

// ==================== 双修结果类型 ====================

export interface DualCultivationResult {
  success: boolean
  message: string
  initiatorExpGain?: number
  partnerExpGain?: number
  hadEnlightenment?: boolean
  contributionGain?: number
}

export interface SoulBattleResult {
  success: boolean
  attackerWon: boolean
  message: string
  battleLog: string[]
  enslavementSuccess?: boolean
}

export interface EscapeResult {
  success: boolean
  escaped: boolean
  message: string
  harvestPenalty?: boolean
  expLost?: number
}
