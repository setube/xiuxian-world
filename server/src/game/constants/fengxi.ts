/**
 * 风雷翅系统配置
 *
 * 【乱星海秘宝 · 风雷翅】
 * 乱星海九级妖修风希斩杀雷鹏所得的绝世法宝，蕴含风雷之力。
 * 炼化后可装备，获得三大神通。
 */

// ========== 装备基础配置 ==========

/**
 * 风雷翅装备状态
 */
export interface WindThunderWingsStatus {
  refined: boolean // 是否已炼化
  equipped: boolean // 是否已装备
  lockedUntil: number | null // 神通反锁结束时间
  lockReasons: string[] // 当前锁定原因列表
}

// ========== (一) 天行神速 · 修炼效率神通 (被动) ==========

/**
 * 冷却时间缩减配置
 */
export const COOLDOWN_REDUCTION = {
  // 寻觅灵兽 -30%
  beastSearch: {
    id: 'beast_search',
    name: '寻觅灵兽',
    reduction: 0.30,
    description: '寻觅灵兽的冷却时间缩短30%（6小时→4.2小时）',
  },
  // 红尘寻缘/入梦 -30%
  dualCultivation: {
    id: 'dual_cultivation',
    name: '红尘寻缘',
    reduction: 0.30,
    description: '红尘寻缘/入梦的冷却时间缩短30%',
  },
  // 问道 -30%
  seekTruth: {
    id: 'seek_truth',
    name: '问道',
    reduction: 0.30,
    description: '问道的冷却时间缩短30%',
  },
  // 探寻裂缝 -25%
  riftExplore: {
    id: 'rift_explore',
    name: '探寻裂缝',
    reduction: 0.25,
    description: '探寻裂缝的冷却时间缩短25%（12小时→9小时）',
  },
}

/**
 * 生产效率提升配置
 */
export const EFFICIENCY_BOOST = {
  // 药园灵草成熟时间 -10%
  herbGarden: {
    id: 'herb_garden',
    name: '小药园',
    reduction: 0.10,
    description: '所有灵草的成熟时间缩短10%',
  },
  // 观星台凝聚时间 -10%
  starPlatform: {
    id: 'star_platform',
    name: '观星台',
    reduction: 0.10,
    description: '所有星辰精华的凝聚时间缩短10%',
  },
}

// ========== (二) 雷光遁影 · 斗法神通 (被动) ==========

/**
 * 斗法被动效果配置
 */
export const COMBAT_PASSIVES = {
  // 九天挪移：对大境界修士逃脱率+40%
  heavenlyEscape: {
    id: 'heavenly_escape',
    name: '九天挪移',
    escapeBonus: 0.40, // 40%额外逃脱率
    condition: 'higher_realm', // 对方境界更高时触发
    description: '在斗法中，当遭遇大境界高于你的修士攻击时，基础逃脱成功率额外+40%',
  },
  // 雷遁之速：每回合20%闪避
  thunderDodge: {
    id: 'thunder_dodge',
    name: '雷遁之速',
    dodgeChance: 0.20, // 20%闪避率
    description: '在对决中，每回合有20%几率完全闪避对手攻击',
  },
  // 风雷之先：同境界30%先手+15%战力
  windThunderFirst: {
    id: 'wind_thunder_first',
    name: '风雷之先',
    triggerChance: 0.30, // 30%触发率
    combatBonus: 0.15, // 15%战力加成
    condition: 'same_realm', // 同境界时触发
    description: '在斗法中，与同境界对手战斗时，有30%几率抢占先机，战力获得15%额外加成',
  },
}

// ========== (三) 风雷降世 · 战略神通 (主动) ==========

/**
 * 主动技能统一配置
 */
export const ACTIVE_SKILL_CONFIG = {
  cultivationCost: 2500, // 固定消耗2500修为
  cooldown: 6 * 60 * 60 * 1000, // 6小时冷却
}

/**
 * 第一式：奇袭夺宝 - 无相劫掠
 */
export const SKILL_PLUNDER = {
  id: 'plunder',
  name: '无相劫掠',
  command: '奇袭 夺宝',
  type: 'plunder' as const,
  symbolicDamage: 10000, // 象征性伤害
  baseLootRate: 0.40, // 基础40%夺宝率
  lootRateBonusPerThousand: 0.05, // 每1000未扣伤害+5%
  maxLootRate: 0.90, // 最高90%
  condition: 'lower_or_equal_power', // 只能对战力≤自己的目标
  description: '对目标造成10,000点象征性伤害，并进行高成功率夺宝判定。只能对战力低于或等于你的目标施展。',
}

/**
 * 第二式：奇袭破阵 - 寂灭神雷
 */
export const SKILL_FORMATION_BREAK = {
  id: 'formation_break',
  name: '寂灭神雷',
  command: '奇袭 破阵',
  type: 'formation_break' as const,
  formationBreakChance: 0.75, // 75%破阵率
  cultivationDamage: 5000, // 最高5000修为伤害
  description: '有75%几率直接摧毁目标当前激活的护山大阵，无论成功与否都会造成最高5000点修为伤害。',
}

/**
 * 第三式：奇袭瞬杀 - 血色惊雷
 */
export const SKILL_BLOOD_THUNDER = {
  id: 'blood_thunder',
  name: '血色惊雷',
  command: '奇袭 瞬杀',
  type: 'blood_thunder' as const,
  selfCostPercent: 0.10, // 消耗自身10%总修为
  damageMultiplier: 5, // 造成(损失修为*5)伤害
  canLoot: false, // 永远无法触发夺宝
  selfDamage: true, // 自身根基受损
  ignoresPowerGap: true, // 无视战力差距
  description: '将自身10%总修为化为血色雷光，对目标造成(损失修为×5)的巨额伤害。无视双方战力差距，但永远无法触发夺宝，且自身根基受损。',
}

// ========== 神通反锁配置 ==========

/**
 * 神通反锁机制
 * 使用带有冷却缩减的神通后，风雷翅被锁定直到该神通冷却结束
 */
export const SKILL_LOCK_CONFIG = {
  enabled: true,
  description: '当施展享受冷却缩减的神通后，风雷翅将被神通的因果之力暂时锁定，无法卸下。必须等到该神通的缩减后冷却时间结束，方可卸下。',
}

// ========== 工具函数 ==========

/**
 * 计算冷却缩减后的时间
 */
export function calculateReducedCooldown(originalCooldown: number, reductionRate: number): number {
  return Math.floor(originalCooldown * (1 - reductionRate))
}

/**
 * 计算无相劫掠的夺宝率
 * @param symbolicDamage 造成的象征性伤害
 * @param actualDamage 实际扣除的伤害（可能因修为不足而减少）
 */
export function calculatePlunderLootRate(symbolicDamage: number, actualDamage: number): number {
  const undeductedDamage = symbolicDamage - actualDamage
  const bonusRate = Math.floor(undeductedDamage / 1000) * SKILL_PLUNDER.lootRateBonusPerThousand
  const totalRate = SKILL_PLUNDER.baseLootRate + bonusRate
  return Math.min(totalRate, SKILL_PLUNDER.maxLootRate)
}

/**
 * 计算血色惊雷的伤害
 * @param totalCultivation 总修为
 */
export function calculateBloodThunderDamage(totalCultivation: number): {
  selfCost: number
  damage: number
} {
  const selfCost = Math.floor(totalCultivation * SKILL_BLOOD_THUNDER.selfCostPercent)
  const damage = selfCost * SKILL_BLOOD_THUNDER.damageMultiplier
  return { selfCost, damage }
}

/**
 * 判断是否触发风雷之先
 */
export function rollWindThunderFirst(): boolean {
  return Math.random() < COMBAT_PASSIVES.windThunderFirst.triggerChance
}

/**
 * 判断是否触发雷遁闪避
 */
export function rollThunderDodge(): boolean {
  return Math.random() < COMBAT_PASSIVES.thunderDodge.dodgeChance
}

/**
 * 判断是否破阵成功
 */
export function rollFormationBreak(): boolean {
  return Math.random() < SKILL_FORMATION_BREAK.formationBreakChance
}

// ========== 神通描述 ==========

export const SKILL_DESCRIPTIONS = {
  tianxingShensu: {
    name: '天行神速',
    type: '修炼效率神通（被动）',
    description: '此法则让你在各项日常修炼中如有神助，大幅缩短等待时间。',
    effects: [
      COOLDOWN_REDUCTION.beastSearch.description,
      COOLDOWN_REDUCTION.dualCultivation.description,
      COOLDOWN_REDUCTION.seekTruth.description,
      COOLDOWN_REDUCTION.riftExplore.description,
      EFFICIENCY_BOOST.herbGarden.description,
      EFFICIENCY_BOOST.starPlatform.description,
    ],
    restriction: SKILL_LOCK_CONFIG.description,
  },
  leiguangDunying: {
    name: '雷光遁影',
    type: '斗法神通（被动）',
    description: '此法则赋予你在战斗中无与伦比的机动性与保命能力。',
    effects: [
      COMBAT_PASSIVES.heavenlyEscape.description,
      COMBAT_PASSIVES.thunderDodge.description,
      COMBAT_PASSIVES.windThunderFirst.description,
    ],
  },
  fengleiJiangshi: {
    name: '风雷降世',
    type: '战略神通（主动）',
    description: '三种充满战术抉择的雷符，让你在不同情境下都能找到最优解。',
    cost: `固定消耗 ${ACTIVE_SKILL_CONFIG.cultivationCost} 点修为`,
    cooldown: '6小时',
    skills: [
      {
        name: SKILL_PLUNDER.name,
        command: SKILL_PLUNDER.command,
        description: SKILL_PLUNDER.description,
        positioning: '虐菜、收割、稳定夺取资源',
      },
      {
        name: SKILL_FORMATION_BREAK.name,
        command: SKILL_FORMATION_BREAK.command,
        description: SKILL_FORMATION_BREAK.description,
        positioning: '攻坚、破防，克制护山大阵',
      },
      {
        name: SKILL_BLOOD_THUNDER.name,
        command: SKILL_BLOOD_THUNDER.command,
        description: SKILL_BLOOD_THUNDER.description,
        positioning: '以弱搏强，逆天改命',
      },
    ],
  },
}
