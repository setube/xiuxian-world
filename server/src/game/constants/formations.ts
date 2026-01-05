/**
 * 洞府防护阵法配置
 * 阵法可在被攻击时提供减伤、反伤、闪避、反击等效果
 */

export interface FormationEffects {
  damageReduction: number    // 减伤百分比 (0-100)
  reflectDamage: number      // 反伤百分比 (0-100)
  dodgeChance: number        // 闪避几率 (0-100)
  counterAttack: number      // 反击几率 (0-100)
}

export interface FormationTemplate {
  id: string
  name: string
  description: string
  tier: number               // 阵法等级 1-5

  // 学习条件
  requiredRealmTier: number  // 需要境界大阶
  learnCost: {
    spiritStones: number     // 学习消耗灵石
  }

  // 激活消耗
  activationCost: {
    spiritStones: number     // 激活消耗灵石
    cultivation: number      // 激活消耗修为值
  }

  // 效果
  effects: FormationEffects

  // 持续时间（小时）
  duration: number
}

/**
 * 阵法配置列表
 * 按等级从低到高排列
 */
export const FORMATIONS: FormationTemplate[] = [
  // === 一阶阵法 (炼气期可学) ===
  {
    id: 'basic_defense',
    name: '聚灵护体阵',
    description: '凝聚天地灵气形成护盾，可减少10%所受伤害',
    tier: 1,
    requiredRealmTier: 1,
    learnCost: { spiritStones: 100 },
    activationCost: { spiritStones: 50, cultivation: 100 },
    effects: {
      damageReduction: 10,
      reflectDamage: 0,
      dodgeChance: 0,
      counterAttack: 0
    },
    duration: 4
  },
  {
    id: 'qi_shield',
    name: '御气成盾阵',
    description: '以真气化盾，减少8%伤害，并有5%几率闪避攻击',
    tier: 1,
    requiredRealmTier: 1,
    learnCost: { spiritStones: 150 },
    activationCost: { spiritStones: 60, cultivation: 120 },
    effects: {
      damageReduction: 8,
      reflectDamage: 0,
      dodgeChance: 5,
      counterAttack: 0
    },
    duration: 4
  },

  // === 二阶阵法 (筑基期可学) ===
  {
    id: 'thorns_array',
    name: '荆棘反刺阵',
    description: '以灵力化为荆棘，受到攻击时反弹15%伤害',
    tier: 2,
    requiredRealmTier: 2,
    learnCost: { spiritStones: 500 },
    activationCost: { spiritStones: 200, cultivation: 500 },
    effects: {
      damageReduction: 5,
      reflectDamage: 15,
      dodgeChance: 0,
      counterAttack: 0
    },
    duration: 4
  },
  {
    id: 'mist_formation',
    name: '迷雾遁形阵',
    description: '布下迷雾，增加20%闪避几率',
    tier: 2,
    requiredRealmTier: 2,
    learnCost: { spiritStones: 500 },
    activationCost: { spiritStones: 200, cultivation: 500 },
    effects: {
      damageReduction: 0,
      reflectDamage: 0,
      dodgeChance: 20,
      counterAttack: 0
    },
    duration: 4
  },
  {
    id: 'iron_wall',
    name: '铁壁金刚阵',
    description: '金刚不坏之阵，减少18%伤害',
    tier: 2,
    requiredRealmTier: 2,
    learnCost: { spiritStones: 600 },
    activationCost: { spiritStones: 250, cultivation: 600 },
    effects: {
      damageReduction: 18,
      reflectDamage: 0,
      dodgeChance: 0,
      counterAttack: 0
    },
    duration: 5
  },

  // === 三阶阵法 (结丹期可学) ===
  {
    id: 'counter_formation',
    name: '太极反击阵',
    description: '借力打力，30%几率发动反击',
    tier: 3,
    requiredRealmTier: 3,
    learnCost: { spiritStones: 2000 },
    activationCost: { spiritStones: 500, cultivation: 1000 },
    effects: {
      damageReduction: 5,
      reflectDamage: 0,
      dodgeChance: 0,
      counterAttack: 30
    },
    duration: 6
  },
  {
    id: 'mirror_reflection',
    name: '玄镜反噬阵',
    description: '以镜面法则反弹伤害，反弹25%伤害给攻击者',
    tier: 3,
    requiredRealmTier: 3,
    learnCost: { spiritStones: 2500 },
    activationCost: { spiritStones: 600, cultivation: 1200 },
    effects: {
      damageReduction: 0,
      reflectDamage: 25,
      dodgeChance: 5,
      counterAttack: 0
    },
    duration: 6
  },
  {
    id: 'phantom_array',
    name: '幻影分身阵',
    description: '分身迷惑敌人，35%闪避几率，10%反击几率',
    tier: 3,
    requiredRealmTier: 3,
    learnCost: { spiritStones: 3000 },
    activationCost: { spiritStones: 700, cultivation: 1500 },
    effects: {
      damageReduction: 0,
      reflectDamage: 0,
      dodgeChance: 35,
      counterAttack: 10
    },
    duration: 6
  },

  // === 四阶阵法 (元婴期可学) ===
  {
    id: 'mountain_barrier',
    name: '万仞山河阵',
    description: '以山河之力护体，顶级防御阵法',
    tier: 4,
    requiredRealmTier: 4,
    learnCost: { spiritStones: 10000 },
    activationCost: { spiritStones: 2000, cultivation: 5000 },
    effects: {
      damageReduction: 25,
      reflectDamage: 5,
      dodgeChance: 5,
      counterAttack: 0
    },
    duration: 8
  },
  {
    id: 'void_barrier',
    name: '虚空屏障阵',
    description: '沟通虚空之力，攻击有40%几率被虚空吞噬',
    tier: 4,
    requiredRealmTier: 4,
    learnCost: { spiritStones: 12000 },
    activationCost: { spiritStones: 2500, cultivation: 6000 },
    effects: {
      damageReduction: 10,
      reflectDamage: 0,
      dodgeChance: 40,
      counterAttack: 0
    },
    duration: 8
  },
  {
    id: 'thunder_counter',
    name: '雷霆反击阵',
    description: '以雷霆之力反击，40%反击几率，反击伤害提升',
    tier: 4,
    requiredRealmTier: 4,
    learnCost: { spiritStones: 15000 },
    activationCost: { spiritStones: 3000, cultivation: 7000 },
    effects: {
      damageReduction: 5,
      reflectDamage: 10,
      dodgeChance: 0,
      counterAttack: 40
    },
    duration: 8
  },

  // === 五阶阵法 (化神期可学) ===
  {
    id: 'heavenly_defense',
    name: '天罡护法大阵',
    description: '传说级阵法，全方位防护，综合效果卓越',
    tier: 5,
    requiredRealmTier: 5,
    learnCost: { spiritStones: 50000 },
    activationCost: { spiritStones: 10000, cultivation: 20000 },
    effects: {
      damageReduction: 20,
      reflectDamage: 15,
      dodgeChance: 15,
      counterAttack: 15
    },
    duration: 12
  },
  {
    id: 'universe_barrier',
    name: '乾坤万象阵',
    description: '乾坤颠倒，万象归一，最强防御阵法',
    tier: 5,
    requiredRealmTier: 5,
    learnCost: { spiritStones: 80000 },
    activationCost: { spiritStones: 15000, cultivation: 30000 },
    effects: {
      damageReduction: 30,
      reflectDamage: 10,
      dodgeChance: 10,
      counterAttack: 10
    },
    duration: 12
  },
  {
    id: 'immortal_aegis',
    name: '不灭金身阵',
    description: '模拟仙人金身，极致防御',
    tier: 5,
    requiredRealmTier: 5,
    learnCost: { spiritStones: 100000 },
    activationCost: { spiritStones: 20000, cultivation: 50000 },
    effects: {
      damageReduction: 40,
      reflectDamage: 5,
      dodgeChance: 5,
      counterAttack: 5
    },
    duration: 12
  }
]

/**
 * 根据ID获取阵法配置
 */
export function getFormationById(id: string): FormationTemplate | undefined {
  return FORMATIONS.find(f => f.id === id)
}

/**
 * 获取指定等级的所有阵法
 */
export function getFormationsByTier(tier: number): FormationTemplate[] {
  return FORMATIONS.filter(f => f.tier === tier)
}

/**
 * 获取角色可学习的阵法（根据境界）
 */
export function getLearnableFormations(realmTier: number): FormationTemplate[] {
  return FORMATIONS.filter(f => f.requiredRealmTier <= realmTier)
}

/**
 * 阵法等级名称
 */
export const FORMATION_TIER_NAMES: Record<number, string> = {
  1: '一阶',
  2: '二阶',
  3: '三阶',
  4: '四阶',
  5: '五阶'
}

/**
 * 木人傀儡配置
 * 根据境界生成标准战斗属性
 */
export interface WoodenDummyConfig {
  realmTier: number
  subTier: number
  name: string
  baseHp: number
  baseAttack: number
  baseDefense: number
  baseSpeed: number
}

/**
 * 生成木人傀儡属性
 * @param realmTier 大境界 1-9
 * @param subTier 小境界 1-4
 */
export function generateDummyStats(realmTier: number, subTier: number = 2): WoodenDummyConfig {
  // 基础属性计算公式
  const tierMultiplier = Math.pow(1.8, realmTier - 1)
  const subTierMultiplier = 1 + (subTier - 1) * 0.15

  const baseHp = Math.floor(100 * tierMultiplier * subTierMultiplier)
  const baseAttack = Math.floor(15 * tierMultiplier * subTierMultiplier)
  const baseDefense = Math.floor(10 * tierMultiplier * subTierMultiplier)
  const baseSpeed = Math.floor(10 + realmTier * 2 + subTier)

  const tierNames = ['炼气', '筑基', '结丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫']
  const subTierNames = ['初期', '中期', '后期', '圆满']

  return {
    realmTier,
    subTier,
    name: `${tierNames[realmTier - 1]}${subTierNames[subTier - 1]}木人`,
    baseHp,
    baseAttack,
    baseDefense,
    baseSpeed
  }
}

/**
 * 木人阁切磋消耗
 * @param realmTier 挑战的木人境界
 */
export function getDummyChallengeCost(realmTier: number): number {
  return realmTier * 10
}

/**
 * 木人阁冷却时间（毫秒）
 */
export const WOODEN_DUMMY_COOLDOWN = 2 * 60 * 1000 // 2分钟
