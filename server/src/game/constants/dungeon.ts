/**
 * 虚天殿·降魔 - 5人团队副本配置
 * 基于《凡人修仙传》韩立等修士组队进入虚天殿的情节
 */

// ========== 副本基础配置 ==========

export const DUNGEON_CONFIG = {
  // 虚天殿·降魔
  xutian_demon: {
    id: 'xutian_demon',
    name: '虚天殿·降魔',
    description: '传说中的上古秘境虚天殿，蛮胡子道人盘踞于此，需要五人组队才能挑战',
    minPlayers: 5,
    maxPlayers: 5,
    minRealmId: 5, // 金丹初期
    entryItemId: 'xutian_map_fragment', // 入场消耗：虚天残图
    entryItemCount: 1,
    stages: 3, // 三关
    roomTimeout: 30 * 60 * 1000, // 房间30分钟超时
    stageTimeout: 10 * 60 * 1000 // 每关10分钟超时
  }
}

export type DungeonId = keyof typeof DUNGEON_CONFIG

// ========== 职业定义 ==========

export type DungeonRole = 'pj' | 'ys' | 'ly' | 'zs' | 'yr' // 破军/御山/灵医/咒师/影刃

export interface RoleConfig {
  id: DungeonRole
  name: string
  description: string
  primaryAttribute: 'attack' | 'defense' | 'support' | 'control'
}

export const DUNGEON_ROLES: Record<DungeonRole, RoleConfig> = {
  pj: {
    id: 'pj',
    name: '破军',
    description: 'DPS核心，金系雷系神通攻伐无双',
    primaryAttribute: 'attack'
  },
  ys: {
    id: 'ys',
    name: '御山',
    description: '坦克，土系功法御敌护友',
    primaryAttribute: 'defense'
  },
  ly: {
    id: 'ly',
    name: '灵医',
    description: '治疗，木水系灵根可调动生机',
    primaryAttribute: 'support'
  },
  zs: {
    id: 'zs',
    name: '咒师',
    description: 'DPS/Debuff，火系功法焚天灭敌',
    primaryAttribute: 'attack'
  },
  yr: {
    id: 'yr',
    name: '影刃',
    description: '控制/DPS，风冰系神通迅捷难挡',
    primaryAttribute: 'control'
  }
}

// ========== 灵根到职业映射 ==========

export const SPIRIT_ROOT_TO_ROLE: Record<string, DungeonRole> = {
  // 破军 - 金系/雷系
  metal_pure: 'pj',
  thunder: 'pj',
  metal_water: 'pj', // 含金真灵根也归入破军

  // 御山 - 土系
  earth_pure: 'ys',
  earth_metal: 'ys', // 土金真灵根
  fire_earth: 'ys', // 火土真灵根（含土）

  // 灵医 - 木系/水系
  wood_pure: 'ly',
  water_pure: 'ly',
  water_wood: 'ly', // 水木真灵根

  // 咒师 - 火系
  fire_pure: 'zs',
  wood_fire: 'zs', // 木火真灵根（火为主）

  // 影刃 - 风系/冰系
  wind: 'yr',
  ice: 'yr',

  // 混合灵根根据主属性分配
  metal_water_wood: 'pj', // 含金优先破军
  wood_fire_earth: 'zs', // 含火优先咒师
  water_fire_metal: 'pj', // 含金优先破军
  four_elements: 'zs', // 四灵根归入咒师
  five_elements: 'zs', // 五行混元根归入咒师

  // 凡人/无灵根 - 默认咒师
  mortal_root: 'zs'
}

/**
 * 根据灵根获取职业
 */
export function getRoleFromSpiritRoot(spiritRootId: string): DungeonRole {
  return SPIRIT_ROOT_TO_ROLE[spiritRootId] || 'zs'
}

// ========== 关卡配置 ==========

export interface StageConfig {
  id: number
  name: string
  description: string
  baseSuccessRate: number // 基础成功率
  bonuses: StageBonusConfig[]
  penalties: StagePenaltyConfig[]
}

export interface StageBonusConfig {
  condition: string // 条件描述
  check: (team: TeamComposition) => boolean // 检查函数
  bonus: number // 加成百分比
  description: string // 触发描述
}

export interface StagePenaltyConfig {
  condition: string
  check: (team: TeamComposition) => boolean
  penalty: number // 惩罚百分比（负值）
  description: string
}

export interface TeamComposition {
  members: {
    characterId: string
    name: string
    role: DungeonRole
    power: number
    spiritRoot: string
    realmId: number
  }[]
  totalPower: number
  selectedPath?: 'ice' | 'fire'
}

// 第一关：灵渊之地
const STAGE_1: StageConfig = {
  id: 1,
  name: '灵渊之地',
  description: '进入虚天殿的第一层，浓郁的魔气扑面而来。需要坦克在前开路，抵挡魔气侵蚀。',
  baseSuccessRate: 50,
  bonuses: [
    {
      condition: '有御山职业',
      check: team => team.members.some(m => m.role === 'ys'),
      bonus: 30,
      description: '御山弟子以深厚土系功法护住众人，魔气被阻隔在外'
    },
    {
      condition: '有灵医职业',
      check: team => team.members.some(m => m.role === 'ly'),
      bonus: 10,
      description: '灵医及时施展治愈术，减轻了魔气侵蚀'
    },
    {
      condition: '团队战力达标',
      check: team => team.totalPower >= 50000,
      bonus: 10,
      description: '强大的灵力压制住了周围的魔气'
    }
  ],
  penalties: [
    {
      condition: '无御山职业',
      check: team => !team.members.some(m => m.role === 'ys'),
      penalty: -40,
      description: '没有坦克开路，魔气直接侵蚀众人'
    }
  ]
}

// 第二关：冰火之路
const STAGE_2: StageConfig = {
  id: 2,
  name: '冰火之路',
  description: '虚天殿的第二层分为冰火两条道路，队长需要选择一条前进。',
  baseSuccessRate: 60,
  bonuses: [
    {
      condition: '冰系灵根走冰道',
      check: team => team.selectedPath === 'ice' && team.members.some(m => ['ice', 'water_pure'].includes(m.spiritRoot)),
      bonus: 15,
      description: '冰灵根弟子与寒冰之道共鸣，引领众人安然通过'
    },
    {
      condition: '火系灵根走火道',
      check: team =>
        team.selectedPath === 'fire' && team.members.some(m => ['fire_pure', 'wood_fire', 'fire_earth'].includes(m.spiritRoot)),
      bonus: 15,
      description: '火灵根弟子驾驭烈焰，开辟出安全通道'
    },
    {
      condition: '有灵医职业',
      check: team => team.members.some(m => m.role === 'ly'),
      bonus: 10,
      description: '灵医持续治疗，抵消环境伤害'
    },
    {
      condition: '有御山职业',
      check: team => team.members.some(m => m.role === 'ys'),
      bonus: 10,
      description: '御山以土系护盾抵挡环境侵蚀'
    }
  ],
  penalties: [
    {
      condition: '冰道无冰系灵根',
      check: team => team.selectedPath === 'ice' && !team.members.some(m => ['ice', 'water_pure'].includes(m.spiritRoot)),
      penalty: -20,
      description: '没有冰系灵根引导，寒冰不断侵蚀众人'
    },
    {
      condition: '火道无火系灵根',
      check: team =>
        team.selectedPath === 'fire' && !team.members.some(m => ['fire_pure', 'wood_fire', 'fire_earth'].includes(m.spiritRoot)),
      penalty: -20,
      description: '没有火系灵根压制，烈焰灼烧众人'
    }
  ]
}

// 第三关：决战蛮胡子
const STAGE_3: StageConfig = {
  id: 3,
  name: '决战蛮胡子',
  description: '虚天殿深处，上古大能蛮胡子道人的残魂盘踞于此。他精通托天魔功、噬魂魔光、搜魂术三大魔功，需要团队配合才能击败。',
  baseSuccessRate: 40,
  bonuses: [
    {
      condition: '御山嘲讽托天魔功',
      check: team => team.members.some(m => m.role === 'ys'),
      bonus: 25,
      description: '御山及时嘲讽，挡下了托天魔功的致命一击'
    },
    {
      condition: '灵医治愈噬魂魔光',
      check: team => team.members.some(m => m.role === 'ly'),
      bonus: 25,
      description: '灵医释放大范围治愈术，抵消了噬魂魔光的伤害'
    },
    {
      condition: '影刃打断搜魂术',
      check: team => team.members.some(m => m.role === 'yr'),
      bonus: 25,
      description: '影刃在关键时刻打断了蛮胡子的搜魂术'
    },
    {
      condition: '破军/咒师输出',
      check: team => team.members.filter(m => m.role === 'pj' || m.role === 'zs').length >= 2,
      bonus: 15,
      description: '强大的输出火力压制住了蛮胡子的魔功'
    },
    {
      condition: '团队战力压制',
      check: team => team.totalPower >= 80000,
      bonus: 10,
      description: '众人合力，灵力如洪流般涌向蛮胡子'
    }
  ],
  penalties: [
    {
      condition: '无御山无法抗住托天魔功',
      check: team => !team.members.some(m => m.role === 'ys'),
      penalty: -30,
      description: '没有坦克抵挡，托天魔功直接击中输出'
    },
    {
      condition: '无灵医无法治愈噬魂伤害',
      check: team => !team.members.some(m => m.role === 'ly'),
      penalty: -25,
      description: '缺少治疗，噬魂魔光的伤害无法恢复'
    },
    {
      condition: '无影刃无法打断搜魂术',
      check: team => !team.members.some(m => m.role === 'yr'),
      penalty: -20,
      description: '无人打断搜魂术，众人陷入混乱'
    }
  ]
}

export const DUNGEON_STAGES: Record<number, StageConfig> = {
  1: STAGE_1,
  2: STAGE_2,
  3: STAGE_3
}

/**
 * 计算关卡成功率
 */
export function calculateStageSuccessRate(
  stage: StageConfig,
  team: TeamComposition
): {
  finalRate: number
  bonusDetails: { description: string; value: number }[]
  penaltyDetails: { description: string; value: number }[]
} {
  let rate = stage.baseSuccessRate
  const bonusDetails: { description: string; value: number }[] = []
  const penaltyDetails: { description: string; value: number }[] = []

  // 计算加成
  for (const bonus of stage.bonuses) {
    if (bonus.check(team)) {
      rate += bonus.bonus
      bonusDetails.push({ description: bonus.description, value: bonus.bonus })
    }
  }

  // 计算惩罚
  for (const penalty of stage.penalties) {
    if (penalty.check(team)) {
      rate += penalty.penalty
      penaltyDetails.push({ description: penalty.description, value: penalty.penalty })
    }
  }

  return {
    finalRate: Math.max(5, Math.min(95, rate)), // 限制在5%-95%之间
    bonusDetails,
    penaltyDetails
  }
}

/**
 * 模拟关卡战斗
 */
export function simulateStage(
  stage: StageConfig,
  team: TeamComposition
): {
  success: boolean
  rate: number
  bonuses: string[]
  penalties: string[]
  events: string[]
} {
  const { finalRate, bonusDetails, penaltyDetails } = calculateStageSuccessRate(stage, team)
  const roll = Math.random() * 100
  const success = roll < finalRate

  const events: string[] = []
  events.push(`【${stage.name}】开始挑战...`)
  events.push(stage.description)

  for (const bonus of bonusDetails) {
    events.push(`[+${bonus.value}%] ${bonus.description}`)
  }

  for (const penalty of penaltyDetails) {
    events.push(`[${penalty.value}%] ${penalty.description}`)
  }

  events.push(`最终成功率: ${finalRate}%`)

  if (success) {
    events.push(`挑战成功！众人顺利通过${stage.name}。`)
  } else {
    events.push(`挑战失败...队伍被迫撤退。`)
  }

  return {
    success,
    rate: finalRate,
    bonuses: bonusDetails.map(b => b.description),
    penalties: penaltyDetails.map(p => p.description),
    events
  }
}

// ========== 奖励配置 ==========

export const DUNGEON_REWARDS = {
  xutian_demon: {
    // 基础奖励（每人）
    baseRewards: {
      cultivation: 5000, // 基础修为
      cultivationPerStage: 2000, // 每通关一关额外修为
      sectContribution: 100, // 基础宗门贡献
      contributionPerStage: 50 // 每关额外贡献
    },

    // 虚天鼎残片（随机分配给1人）
    xutianFragment: {
      count: 1, // 每次副本产出1个
      description: '虚天鼎残片，收集100个可合成虚天鼎'
    },

    // 稀有掉落
    rareDrops: [
      { itemId: 'xutian_ding', name: '虚天鼎', chance: 0.005, description: '上古炼丹神器' },
      { itemId: 'ice_phoenix_feather', name: '冰凤之翎', chance: 0.01, description: '冰凤之翎，七焰扇炼制材料' },
      { itemId: 'huanglin_armor_blueprint', name: '皇鳞甲图纸', chance: 0.02, description: '上古防具配方' },
      { itemId: 'manhuzi_storage_bag', name: '蛮胡子储物袋', chance: 0.05, description: '开启获得随机奖励' },
      { itemId: 'soul_crystal', name: '魂晶', chance: 0.2, description: '蕴含灵魂之力的结晶' },
      { itemId: 'spirit_essence', name: '灵魂精华', chance: 0.3, description: '蕴含天地灵气的精华' }
    ],

    // 首通奖励（每周）
    firstClearRewards: {
      spiritStones: 5000,
      cultivation: 10000,
      xutianFragments: 3
    }
  }
}

/**
 * 计算副本奖励
 */
export function calculateRewards(
  clearedStages: number,
  isFirstClear: boolean
): {
  cultivation: number
  sectContribution: number
  spiritStones: number
  xutianFragments: number
} {
  const config = DUNGEON_REWARDS.xutian_demon

  let cultivation = config.baseRewards.cultivation + config.baseRewards.cultivationPerStage * clearedStages
  let sectContribution = config.baseRewards.sectContribution + config.baseRewards.contributionPerStage * clearedStages
  let spiritStones = 0
  let xutianFragments = 0

  // 只有通关才能获得虚天鼎残片（随机分配）
  if (clearedStages === 3) {
    xutianFragments = 1
  }

  // 首通奖励
  if (isFirstClear && clearedStages === 3) {
    spiritStones += config.firstClearRewards.spiritStones
    cultivation += config.firstClearRewards.cultivation
    xutianFragments += config.firstClearRewards.xutianFragments
  }

  return {
    cultivation,
    sectContribution,
    spiritStones,
    xutianFragments
  }
}

/**
 * 检查稀有掉落
 */
export function rollRareDrops(): { itemId: string; name: string }[] {
  const drops: { itemId: string; name: string }[] = []
  const config = DUNGEON_REWARDS.xutian_demon

  for (const drop of config.rareDrops) {
    if (Math.random() < drop.chance) {
      drops.push({ itemId: drop.itemId, name: drop.name })
    }
  }

  return drops
}

// ========== 推荐配置 ==========

export const RECOMMENDED_TEAM = {
  description: '推荐配置: 1御山 + 1灵医 + 1影刃 + 2破军/咒师',
  roles: {
    ys: { min: 1, max: 1, required: true },
    ly: { min: 1, max: 1, required: true },
    yr: { min: 1, max: 2, required: false },
    pj: { min: 0, max: 3, required: false },
    zs: { min: 0, max: 3, required: false }
  }
}

/**
 * 检查团队配置
 */
export function checkTeamComposition(team: TeamComposition): {
  isValid: boolean
  hasAllRequired: boolean
  warnings: string[]
} {
  const roleCounts: Record<DungeonRole, number> = {
    pj: 0,
    ys: 0,
    ly: 0,
    zs: 0,
    yr: 0
  }

  for (const member of team.members) {
    roleCounts[member.role]++
  }

  const warnings: string[] = []

  // 检查必需职业
  if (roleCounts.ys === 0) {
    warnings.push('缺少御山（坦克），第一关和第三关将大幅降低成功率')
  }
  if (roleCounts.ly === 0) {
    warnings.push('缺少灵医（治疗），第二关和第三关将降低成功率')
  }
  if (roleCounts.yr === 0) {
    warnings.push('缺少影刃（控制），第三关无法打断搜魂术')
  }
  if (roleCounts.pj + roleCounts.zs < 2) {
    warnings.push('DPS不足（破军/咒师），可能无法击败Boss')
  }

  return {
    isValid: team.members.length === 5,
    hasAllRequired: roleCounts.ys >= 1 && roleCounts.ly >= 1,
    warnings
  }
}

// ========== 工具函数 ==========

/**
 * 获取当前周数（用于首通判断）
 */
export function getCurrentWeek(): string {
  const now = new Date()
  const year = now.getFullYear()
  const firstDay = new Date(year, 0, 1)
  const pastDays = (now.getTime() - firstDay.getTime()) / 86400000
  const weekNumber = Math.ceil((pastDays + firstDay.getDay() + 1) / 7)
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`
}
