// 宗门系统常量

// 宗门职位
export type SectRank = 'outer' | 'inner' | 'core' | 'elder' | 'master'

export interface SectRankInfo {
  id: SectRank
  name: string
  level: number
  salaryMultiplier: number // 俸禄倍率
  contributionRequired: number // 晋升所需贡献
  realmRequired: number // 晋升所需境界tier
}

export const SECT_RANKS: SectRankInfo[] = [
  { id: 'outer', name: '外门弟子', level: 1, salaryMultiplier: 1.0, contributionRequired: 0, realmRequired: 1 },
  { id: 'inner', name: '内门弟子', level: 2, salaryMultiplier: 1.5, contributionRequired: 1000, realmRequired: 2 },
  { id: 'core', name: '核心弟子', level: 3, salaryMultiplier: 2.5, contributionRequired: 5000, realmRequired: 3 },
  { id: 'elder', name: '长老', level: 4, salaryMultiplier: 5.0, contributionRequired: 20000, realmRequired: 4 },
  { id: 'master', name: '掌门', level: 5, salaryMultiplier: 10.0, contributionRequired: 100000, realmRequired: 6 }
]

// 宗门特性类型
export type SectFeatureType =
  | 'alchemy_boost' // 炼丹加成
  | 'cultivation_boost' // 修炼加成
  | 'combat_boost' // 战斗加成
  | 'spirit_sense' // 神识系统
  | 'dual_cultivation' // 双修系统
  | 'salary' // 俸禄系统
  | 'beast_taming' // 灵兽系统
  | 'dark_arts' // 魔功系统
  | 'herb_garden' // 药园系统
  | 'star_array' // 星阵系统

export interface SectFeature {
  type: SectFeatureType
  name: string
  description: string
  value?: number // 加成数值
}

export interface SectRequirement {
  minRealm?: number // 最低境界tier
  maxRealm?: number // 最高境界
  spiritRootTypes?: string[] // 要求的灵根类型
  attribute?: string // 特殊属性要求
  attributeValue?: number
}

export interface Sect {
  id: string
  name: string
  shortName: string // 简称
  description: string
  lore: string // 宗门背景故事
  alignment: 'righteous' | 'neutral' | 'demonic' // 正道/中立/魔道
  color: string // 主题色
  icon: string // 图标名
  location: string // 所在地
  features: SectFeature[]
  requirements: SectRequirement
  baseSalary: number // 基础俸禄（灵石/天）
  specialSkills: string[] // 专属功法ID
  dailyBonus?: {
    type: string
    description: string
  }
}

export const SECTS: Record<string, Sect> = {
  huangfeng: {
    id: 'huangfeng',
    name: '黄枫谷',
    shortName: '黄枫',
    description: '炼丹师的摇篮，以丹道传承闻名修仙界。',
    lore: '黄枫谷坐落于灵药丰富的黄枫山脉，历代先祖皆为丹道大能。谷中遍植灵药，终年云雾缭绕，是修习丹道的绝佳圣地。',
    alignment: 'righteous',
    color: '#8B7355',
    icon: 'Leaf',
    location: '黄枫山脉',
    features: [
      { type: 'alchemy_boost', name: '药园加持', description: '炼丹成功率+15%，产量+20%', value: 0.15 },
      { type: 'cultivation_boost', name: '低调修行', description: '闭关失败惩罚降低30%', value: 0.3 },
      { type: 'herb_garden', name: '小药园', description: '可开辟个人药园种植灵药', value: 1 }
    ],
    requirements: { minRealm: 1 },
    baseSalary: 50,
    specialSkills: ['huangfeng_alchemy', 'herb_cultivation'],
    dailyBonus: { type: 'herb', description: '每日可领取灵药种子' }
  },

  taiyi: {
    id: 'taiyi',
    name: '太一门',
    shortName: '太一',
    description: '天机推演者，以神识法门独步天下。',
    lore: '太一门传承自上古天机道人，擅长推演天机、窥探命运。门中弟子皆修神识，能以念力攻敌，更能预知祸福。',
    alignment: 'righteous',
    color: '#4A90D9',
    icon: 'Eye',
    location: '天机峰',
    features: [
      { type: 'spirit_sense', name: '神识修炼', description: '可修炼独有的神识属性', value: 1 },
      { type: 'cultivation_boost', name: '每日引道', description: '每日可获得强大临时增益', value: 0.2 },
      { type: 'combat_boost', name: '神识冲击', description: '战斗中可施展神识攻击扰乱敌方', value: 0.1 }
    ],
    requirements: { minRealm: 1, spiritRootTypes: ['heavenly', 'variant', 'true'] },
    baseSalary: 60,
    specialSkills: ['spirit_sense_attack', 'divination'],
    dailyBonus: { type: 'guidance', description: '每日引道：随机获得一项临时属性加成' }
  },

  hehuan: {
    id: 'hehuan',
    name: '合欢宗',
    shortName: '合欢',
    description: '速成者的捷径，以双修秘法闻名。',
    lore: '合欢宗修行阴阳和合之道，双修可使修为突飞猛进。宗门弟子多为容貌出众之辈，行走江湖颇受瞩目。',
    alignment: 'neutral',
    color: '#FF69B4',
    icon: 'Heart',
    location: '合欢谷',
    features: [
      { type: 'dual_cultivation', name: '闭关双修', description: '与人同修可获得双倍修为', value: 2.0 },
      { type: 'dual_cultivation', name: '缔结同参', description: '可与他人建立双修契约', value: 1 },
      { type: 'dual_cultivation', name: '种下心印', description: '可在他人心中留下印记', value: 1 }
    ],
    requirements: { minRealm: 1 },
    baseSalary: 40,
    specialSkills: ['dual_cultivation_art', 'charm_technique'],
    dailyBonus: { type: 'charm', description: '魅力光环：与他人互动获得额外好感' }
  },

  xinggong: {
    id: 'xinggong',
    name: '星宫',
    shortName: '星宫',
    description: '统治者的权柄，富甲一方的庞然大物。',
    lore: '星宫号称修仙界第一大势力，坐拥无数产业，弟子待遇丰厚。宫中更有道心侍妾制度，可培养专属侍从。',
    alignment: 'neutral',
    color: '#FFD700',
    icon: 'Star',
    location: '星辰殿',
    features: [
      { type: 'salary', name: '丰厚俸禄', description: '每日灵石俸禄翻倍', value: 2.0 },
      { type: 'star_array', name: '道心侍妾', description: '可培养专属侍妾提供加成', value: 1 },
      { type: 'star_array', name: '周天星斗大阵', description: '团队战斗时可发动星阵', value: 1 }
    ],
    requirements: { minRealm: 2 },
    baseSalary: 100,
    specialSkills: ['star_art', 'wealth_technique'],
    dailyBonus: { type: 'salary', description: '领取丰厚的每日俸禄' }
  },

  wanling: {
    id: 'wanling',
    name: '万灵宗',
    shortName: '万灵',
    description: '御兽者的天堂，与灵兽为伴。',
    lore: '万灵宗弟子皆擅驭兽之术，入门即赐灵兽一只。宗门豢养无数珍稀灵兽，更有秘法可与灵兽心意相通。',
    alignment: 'righteous',
    color: '#228B22',
    icon: 'Rabbit',
    location: '万兽山',
    features: [
      { type: 'beast_taming', name: '初始灵兽', description: '入门即送一只灵兽', value: 1 },
      { type: 'beast_taming', name: '灵兽系统', description: '可捕捉、培养、进化灵兽', value: 1 },
      { type: 'beast_taming', name: '灵兽偷菜', description: '派遣灵兽前往他人药园', value: 1 }
    ],
    requirements: { minRealm: 1 },
    baseSalary: 45,
    specialSkills: ['beast_taming', 'beast_fusion'],
    dailyBonus: { type: 'beast_food', description: '每日领取灵兽口粮' }
  },

  heisha: {
    id: 'heisha',
    name: '黑煞教',
    shortName: '黑煞',
    description: '魔道枭雄的巢穴，以煞气淬体闻名。',
    lore: '黑煞教乃魔道至凶之地，教中弟子修炼煞气，以杀伐为修行。更有夺舍神通，可奴役他人神魂为己用。',
    alignment: 'demonic',
    color: '#8B0000',
    icon: 'Skull',
    location: '黑煞渊',
    features: [
      { type: 'dark_arts', name: '夺舍神通', description: '可奴役他人神魂化为傀儡', value: 1 },
      { type: 'dark_arts', name: '煞气淬体', description: '击杀他人可获得煞气提升战力', value: 0.05 },
      { type: 'combat_boost', name: '嗜血本能', description: '生命值越低，攻击力越高', value: 0.3 }
    ],
    requirements: { minRealm: 1 },
    baseSalary: 30,
    specialSkills: ['soul_seize', 'blood_art'],
    dailyBonus: { type: 'kill_mission', description: '每日击杀任务，完成可获丰厚奖励' }
  },

  qingyun: {
    id: 'qingyun',
    name: '青云门',
    shortName: '青云',
    description: '剑道至尊，以剑法独步天下。',
    lore: '青云门以剑入道，门中弟子人人习剑。掌门所持诛仙剑乃上古神器，剑气纵横三万里。',
    alignment: 'righteous',
    color: '#87CEEB',
    icon: 'Sword',
    location: '青云山',
    features: [
      { type: 'combat_boost', name: '剑道传承', description: '剑类功法威力+25%', value: 0.25 },
      { type: 'combat_boost', name: '剑心通明', description: '暴击率+10%', value: 0.1 },
      { type: 'cultivation_boost', name: '御剑飞行', description: '移动速度+50%', value: 0.5 }
    ],
    requirements: { minRealm: 1 },
    baseSalary: 55,
    specialSkills: ['sword_art', 'flying_sword'],
    dailyBonus: { type: 'sword_intent', description: '每日悟剑：随机提升剑法熟练度' }
  },

  tianyin: {
    id: 'tianyin',
    name: '天音寺',
    shortName: '天音',
    description: '佛门圣地，以慈悲为怀。',
    lore: '天音寺乃佛门正宗，寺中僧侣以普度众生为己任。佛法精深，可净化心魔，更有金刚不坏之身。',
    alignment: 'righteous',
    color: '#DAA520',
    icon: 'Sun',
    location: '须弥山',
    features: [
      { type: 'cultivation_boost', name: '佛法护身', description: '闭关入魔概率-50%', value: 0.5 },
      { type: 'combat_boost', name: '金刚不坏', description: '防御力+20%', value: 0.2 },
      { type: 'cultivation_boost', name: '禅定', description: '修炼速度+10%', value: 0.1 }
    ],
    requirements: { minRealm: 1 },
    baseSalary: 40,
    specialSkills: ['buddhist_art', 'purification'],
    dailyBonus: { type: 'meditation', description: '每日禅修：清除负面状态' }
  }
}

// 获取宗门列表
export const getSectList = (): Sect[] => {
  return Object.values(SECTS)
}

// 根据阵营筛选宗门
export const getSectsByAlignment = (alignment: Sect['alignment']): Sect[] => {
  return Object.values(SECTS).filter(sect => sect.alignment === alignment)
}

// 检查是否满足入门条件
export const checkSectRequirements = (sect: Sect, realmTier: number, spiritRootType: string): { canJoin: boolean; reason?: string } => {
  const req = sect.requirements

  if (req.minRealm && realmTier < req.minRealm) {
    return { canJoin: false, reason: `需要达到${getRealmName(req.minRealm)}才可拜入` }
  }

  if (req.maxRealm && realmTier > req.maxRealm) {
    return { canJoin: false, reason: `境界过高，无法拜入` }
  }

  if (req.spiritRootTypes && !req.spiritRootTypes.includes(spiritRootType)) {
    return { canJoin: false, reason: `灵根资质不符合要求` }
  }

  return { canJoin: true }
}

// 境界名称映射（简化版）
const getRealmName = (tier: number): string => {
  const names: Record<number, string> = {
    1: '炼气期',
    2: '筑基期',
    3: '结丹期',
    4: '元婴期',
    5: '化神期',
    6: '炼虚期',
    7: '合体期',
    8: '大乘期',
    9: '渡劫期'
  }
  return names[tier] || '未知境界'
}

// 叛门惩罚配置
export const SECT_LEAVE_PENALTY = {
  cooldownHours: 4, // 叛门冷却时间（小时）
  contributionLoss: 1.0, // 贡献清空比例
  specialPenalties: {
    xinggong: '遣散所有星宫侍妾',
    wanling: '没收所有灵兽',
    taiyi: '废除神识修为',
    hehuan: '斩断所有情缘契约'
  } as Record<string, string>
}

// 获取职位信息
export const getSectRankInfo = (rank: SectRank): SectRankInfo | undefined => {
  return SECT_RANKS.find(r => r.id === rank)
}

// 获取下一职位
export const getNextRank = (currentRank: SectRank): SectRankInfo | null => {
  const currentIndex = SECT_RANKS.findIndex(r => r.id === currentRank)
  if (currentIndex < 0 || currentIndex >= SECT_RANKS.length - 1) {
    return null
  }
  return SECT_RANKS[currentIndex + 1] || null
}

// ==================== 宗门宝库系统 ====================

// 宝库物品类型
export type TreasuryItemType = 'pill' | 'material' | 'skill' | 'equipment' | 'special'

// 宝库物品品质
export type TreasuryItemQuality = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

// 宝库物品接口
export interface TreasuryItem {
  id: string
  name: string
  type: TreasuryItemType
  quality: TreasuryItemQuality
  description: string
  effect?: string // 使用效果描述
  contributionCost: number // 贡献点消耗
  rankRequired: SectRank // 职位要求
  realmRequired?: number // 境界要求
  limitPerDay?: number // 每日限购数量
  limitTotal?: number // 总限购数量
  stock?: number // 库存（-1表示无限）
}

// 通用宝库物品（所有宗门都有）
export const COMMON_TREASURY_ITEMS: TreasuryItem[] = [
  {
    id: 'qi_gathering_pill',
    name: '聚气丹',
    type: 'pill',
    quality: 'common',
    description: '炼气期常用辅助丹药',
    effect: '服用后立即获得100点修为',
    contributionCost: 50,
    rankRequired: 'outer',
    limitPerDay: 5,
    stock: -1
  },
  {
    id: 'spirit_recovery_pill',
    name: '回灵丹',
    type: 'pill',
    quality: 'common',
    description: '恢复灵力的基础丹药',
    effect: '立即恢复50%灵力',
    contributionCost: 30,
    rankRequired: 'outer',
    limitPerDay: 10,
    stock: -1
  },
  {
    id: 'foundation_pill',
    name: '筑基丹',
    type: 'pill',
    quality: 'uncommon',
    description: '突破筑基期的必备丹药',
    effect: '筑基突破成功率+20%',
    contributionCost: 500,
    rankRequired: 'inner',
    realmRequired: 1,
    limitTotal: 3,
    stock: -1
  },
  {
    id: 'golden_core_pill',
    name: '结丹丹',
    type: 'pill',
    quality: 'rare',
    description: '凝结金丹的珍贵丹药',
    effect: '结丹突破成功率+15%',
    contributionCost: 2000,
    rankRequired: 'core',
    realmRequired: 2,
    limitTotal: 2,
    stock: -1
  },
  {
    id: 'detox_pill',
    name: '清毒丹',
    type: 'pill',
    quality: 'common',
    description: '清除丹毒的解毒丹药',
    effect: '清除50%丹毒积累',
    contributionCost: 100,
    rankRequired: 'outer',
    limitPerDay: 3,
    stock: -1
  },
  {
    id: 'spirit_stone_pouch',
    name: '灵石袋',
    type: 'material',
    quality: 'common',
    description: '装有一定数量灵石的袋子',
    effect: '获得100灵石',
    contributionCost: 80,
    rankRequired: 'outer',
    limitPerDay: 5,
    stock: -1
  },
  {
    id: 'exp_scroll',
    name: '心得卷轴',
    type: 'material',
    quality: 'uncommon',
    description: '前辈修炼心得',
    effect: '获得500点修为',
    contributionCost: 200,
    rankRequired: 'inner',
    limitPerDay: 2,
    stock: -1
  }
]

// 宗门专属宝库物品
export const SECT_TREASURY_ITEMS: Record<string, TreasuryItem[]> = {
  huangfeng: [
    {
      id: 'huangfeng_alchemy_manual',
      name: '黄枫丹方',
      type: 'skill',
      quality: 'rare',
      description: '黄枫谷秘传的炼丹心法',
      effect: '永久提升炼丹成功率5%',
      contributionCost: 3000,
      rankRequired: 'core',
      limitTotal: 1,
      stock: -1
    },
    {
      id: 'spirit_herb_seed',
      name: '灵草种子',
      type: 'material',
      quality: 'uncommon',
      description: '可种植于药园的灵草种子',
      effect: '获得随机灵草种子一枚',
      contributionCost: 150,
      rankRequired: 'outer',
      limitPerDay: 3,
      stock: -1
    }
  ],
  taiyi: [
    {
      id: 'spirit_sense_pill',
      name: '神识丹',
      type: 'pill',
      quality: 'rare',
      description: '强化神识的珍贵丹药',
      effect: '永久提升神识+10',
      contributionCost: 2500,
      rankRequired: 'core',
      limitTotal: 5,
      stock: -1
    },
    {
      id: 'divination_scroll',
      name: '占卜卷轴',
      type: 'special',
      quality: 'uncommon',
      description: '可预测下次突破结果',
      effect: '使用后可查看下次突破的成功率',
      contributionCost: 300,
      rankRequired: 'inner',
      limitPerDay: 1,
      stock: -1
    }
  ],
  hehuan: [
    {
      id: 'charm_pill',
      name: '媚心丹',
      type: 'pill',
      quality: 'uncommon',
      description: '提升魅力的特殊丹药',
      effect: '魅力+20，持续24小时',
      contributionCost: 200,
      rankRequired: 'outer',
      limitPerDay: 2,
      stock: -1
    },
    {
      id: 'dual_cultivation_manual',
      name: '双修秘法',
      type: 'skill',
      quality: 'epic',
      description: '合欢宗不传之秘',
      effect: '解锁高级双修功能',
      contributionCost: 5000,
      rankRequired: 'elder',
      limitTotal: 1,
      stock: -1
    }
  ],
  xinggong: [
    {
      id: 'wealth_talisman',
      name: '招财符',
      type: 'special',
      quality: 'uncommon',
      description: '星宫特制的招财符箓',
      effect: '24小时内灵石获取+50%',
      contributionCost: 400,
      rankRequired: 'inner',
      limitPerDay: 1,
      stock: -1
    },
    {
      id: 'star_essence',
      name: '星辰精华',
      type: 'material',
      quality: 'epic',
      description: '凝聚星辰之力的精华',
      effect: '用于强化星阵或升级装备',
      contributionCost: 3000,
      rankRequired: 'core',
      limitPerDay: 1,
      stock: -1
    }
  ],
  wanling: [
    {
      id: 'beast_food',
      name: '灵兽粮',
      type: 'material',
      quality: 'common',
      description: '灵兽喜爱的食物',
      effect: '灵兽经验+100',
      contributionCost: 50,
      rankRequired: 'outer',
      limitPerDay: 10,
      stock: -1
    },
    {
      id: 'beast_evolution_pill',
      name: '进化丹',
      type: 'pill',
      quality: 'epic',
      description: '可使灵兽进化的珍贵丹药',
      effect: '灵兽突破进化',
      contributionCost: 5000,
      rankRequired: 'elder',
      limitTotal: 3,
      stock: -1
    }
  ],
  heisha: [
    {
      id: 'blood_pill',
      name: '血煞丹',
      type: 'pill',
      quality: 'rare',
      description: '以血炼制的魔道丹药',
      effect: '攻击力+30%，持续1小时，有副作用',
      contributionCost: 800,
      rankRequired: 'inner',
      limitPerDay: 2,
      stock: -1
    },
    {
      id: 'soul_seal',
      name: '魂印符',
      type: 'special',
      quality: 'epic',
      description: '封印他人神魂的邪术符箓',
      effect: '可用于夺舍神通',
      contributionCost: 4000,
      rankRequired: 'elder',
      limitTotal: 1,
      stock: -1
    }
  ],
  qingyun: [
    {
      id: 'sword_intent_stone',
      name: '剑意石',
      type: 'material',
      quality: 'rare',
      description: '蕴含剑意的灵石',
      effect: '剑法熟练度+500',
      contributionCost: 1500,
      rankRequired: 'core',
      limitPerDay: 1,
      stock: -1
    },
    {
      id: 'flying_sword_fragment',
      name: '飞剑碎片',
      type: 'material',
      quality: 'epic',
      description: '可用于铸造飞剑的材料',
      effect: '收集10个可兑换低阶飞剑',
      contributionCost: 2000,
      rankRequired: 'core',
      limitPerDay: 1,
      stock: -1
    }
  ],
  tianyin: [
    {
      id: 'buddha_bead',
      name: '佛珠',
      type: 'equipment',
      quality: 'rare',
      description: '高僧开光的念珠',
      effect: '防御+50，抵抗心魔',
      contributionCost: 2500,
      rankRequired: 'core',
      limitTotal: 1,
      stock: -1
    },
    {
      id: 'purification_talisman',
      name: '净化符',
      type: 'special',
      quality: 'uncommon',
      description: '可净化负面状态的符箓',
      effect: '清除所有负面状态',
      contributionCost: 300,
      rankRequired: 'inner',
      limitPerDay: 2,
      stock: -1
    }
  ]
}

// 获取宗门宝库物品（通用+专属）
export const getSectTreasuryItems = (sectId: string): TreasuryItem[] => {
  const sectItems = SECT_TREASURY_ITEMS[sectId] || []
  return [...COMMON_TREASURY_ITEMS, ...sectItems]
}

// 检查是否可以购买
export const canPurchaseTreasuryItem = (
  item: TreasuryItem,
  playerRank: SectRank,
  playerRealmTier: number,
  playerContribution: number
): { canBuy: boolean; reason?: string } => {
  // 检查职位
  const rankLevel = SECT_RANKS.find(r => r.id === playerRank)?.level || 0
  const requiredLevel = SECT_RANKS.find(r => r.id === item.rankRequired)?.level || 0
  if (rankLevel < requiredLevel) {
    return { canBuy: false, reason: `需要${getSectRankInfo(item.rankRequired)?.name || '更高职位'}` }
  }

  // 检查境界
  if (item.realmRequired && playerRealmTier < item.realmRequired) {
    return { canBuy: false, reason: '境界不足' }
  }

  // 检查贡献
  if (playerContribution < item.contributionCost) {
    return { canBuy: false, reason: `贡献不足，需要${item.contributionCost}` }
  }

  // 检查库存
  if (item.stock === 0) {
    return { canBuy: false, reason: '库存不足' }
  }

  return { canBuy: true }
}

// 获取物品品质颜色
export const getQualityColor = (quality: TreasuryItemQuality): string => {
  const colors: Record<TreasuryItemQuality, string> = {
    common: '#9d9d9d',
    uncommon: '#1eff00',
    rare: '#0070dd',
    epic: '#a335ee',
    legendary: '#ff8000'
  }
  return colors[quality]
}

// 获取物品品质名称
export const getQualityName = (quality: TreasuryItemQuality): string => {
  const names: Record<TreasuryItemQuality, string> = {
    common: '普通',
    uncommon: '优秀',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说'
  }
  return names[quality]
}

// 获取物品类型名称
export const getItemTypeName = (type: TreasuryItemType): string => {
  const names: Record<TreasuryItemType, string> = {
    pill: '丹药',
    material: '材料',
    skill: '功法',
    equipment: '装备',
    special: '特殊'
  }
  return names[type]
}

// ==================== 宗门悬赏系统 ====================

// 悬赏任务类型
export type BountyType = 'daily' | 'weekly' | 'special'

// 悬赏任务难度
export type BountyDifficulty = 'easy' | 'normal' | 'hard' | 'expert'

// 悬赏任务接口
export interface SectBounty {
  id: string
  name: string
  type: BountyType
  difficulty: BountyDifficulty
  description: string
  requirement: {
    type: 'cultivation' | 'kill' | 'gather' | 'alchemy' | 'explore' | 'donate'
    target?: string
    amount: number
  }
  rewards: {
    contribution: number
    spiritStones?: number
    experience?: number
    items?: { id: string; name: string; quantity: number }[]
  }
  rankRequired: SectRank
  realmRequired?: number
  refreshTime?: number
}

// 难度颜色
export const getBountyDifficultyColor = (difficulty: BountyDifficulty): string => {
  const colors: Record<BountyDifficulty, string> = {
    easy: '#52c41a',
    normal: '#1890ff',
    hard: '#faad14',
    expert: '#f5222d'
  }
  return colors[difficulty]
}

// 难度名称
export const getBountyDifficultyName = (difficulty: BountyDifficulty): string => {
  const names: Record<BountyDifficulty, string> = {
    easy: '简单',
    normal: '普通',
    hard: '困难',
    expert: '专家'
  }
  return names[difficulty]
}

// 类型名称
export const getBountyTypeName = (type: BountyType): string => {
  const names: Record<BountyType, string> = {
    daily: '每日',
    weekly: '每周',
    special: '特殊'
  }
  return names[type]
}

// 通用每日悬赏
export const COMMON_DAILY_BOUNTIES: SectBounty[] = [
  {
    id: 'daily_cultivation_1',
    name: '日常修炼',
    type: 'daily',
    difficulty: 'easy',
    description: '完成一次闭关修炼',
    requirement: { type: 'cultivation', amount: 1 },
    rewards: { contribution: 20, spiritStones: 10 },
    rankRequired: 'outer'
  },
  {
    id: 'daily_cultivation_3',
    name: '勤修苦练',
    type: 'daily',
    difficulty: 'normal',
    description: '完成三次闭关修炼',
    requirement: { type: 'cultivation', amount: 3 },
    rewards: { contribution: 50, spiritStones: 30 },
    rankRequired: 'outer'
  },
  {
    id: 'daily_donate_100',
    name: '乐善好施',
    type: 'daily',
    difficulty: 'easy',
    description: '向宗门捐献100灵石',
    requirement: { type: 'donate', amount: 100 },
    rewards: { contribution: 15, experience: 50 },
    rankRequired: 'outer'
  },
  {
    id: 'daily_gather_herbs',
    name: '采集灵草',
    type: 'daily',
    difficulty: 'normal',
    description: '采集5株灵草',
    requirement: { type: 'gather', target: 'herb', amount: 5 },
    rewards: { contribution: 30, spiritStones: 20 },
    rankRequired: 'outer'
  }
]

// 通用每周悬赏
export const COMMON_WEEKLY_BOUNTIES: SectBounty[] = [
  {
    id: 'weekly_cultivation_10',
    name: '周修任务',
    type: 'weekly',
    difficulty: 'normal',
    description: '本周完成10次闭关修炼',
    requirement: { type: 'cultivation', amount: 10 },
    rewards: { contribution: 200, spiritStones: 100, experience: 200 },
    rankRequired: 'outer'
  },
  {
    id: 'weekly_donate_1000',
    name: '慷慨解囊',
    type: 'weekly',
    difficulty: 'hard',
    description: '本周向宗门捐献1000灵石',
    requirement: { type: 'donate', amount: 1000 },
    rewards: { contribution: 150, experience: 500 },
    rankRequired: 'inner'
  },
  {
    id: 'weekly_explore',
    name: '外出历练',
    type: 'weekly',
    difficulty: 'normal',
    description: '完成5次秘境探索',
    requirement: { type: 'explore', amount: 5 },
    rewards: { contribution: 180, spiritStones: 80 },
    rankRequired: 'outer'
  }
]

// 宗门专属悬赏
export const SECT_BOUNTIES: Record<string, SectBounty[]> = {
  huangfeng: [
    {
      id: 'huangfeng_alchemy_3',
      name: '炼丹修行',
      type: 'daily',
      difficulty: 'normal',
      description: '成功炼制3炉丹药',
      requirement: { type: 'alchemy', amount: 3 },
      rewards: { contribution: 60, spiritStones: 40 },
      rankRequired: 'outer'
    },
    {
      id: 'huangfeng_gather_rare',
      name: '珍稀灵草',
      type: 'weekly',
      difficulty: 'hard',
      description: '采集3株稀有灵草',
      requirement: { type: 'gather', target: 'rare_herb', amount: 3 },
      rewards: { contribution: 250, items: [{ id: 'alchemy_boost', name: '炼丹增幅符', quantity: 1 }] },
      rankRequired: 'inner'
    }
  ],
  taiyi: [
    {
      id: 'taiyi_divination',
      name: '天机推演',
      type: 'daily',
      difficulty: 'normal',
      description: '完成一次天机推演',
      requirement: { type: 'explore', target: 'divination', amount: 1 },
      rewards: { contribution: 50, experience: 100 },
      rankRequired: 'outer'
    }
  ],
  hehuan: [
    {
      id: 'hehuan_dual_cultivation',
      name: '双修精进',
      type: 'daily',
      difficulty: 'normal',
      description: '完成一次双修',
      requirement: { type: 'cultivation', target: 'dual', amount: 1 },
      rewards: { contribution: 70, experience: 150 },
      rankRequired: 'outer'
    }
  ],
  xinggong: [
    {
      id: 'xinggong_wealth',
      name: '财源广进',
      type: 'daily',
      difficulty: 'easy',
      description: '获取500灵石',
      requirement: { type: 'gather', target: 'spirit_stones', amount: 500 },
      rewards: { contribution: 30, spiritStones: 50 },
      rankRequired: 'outer'
    }
  ],
  wanling: [
    {
      id: 'wanling_beast_train',
      name: '灵兽培育',
      type: 'daily',
      difficulty: 'normal',
      description: '喂养灵兽3次',
      requirement: { type: 'gather', target: 'beast_feed', amount: 3 },
      rewards: { contribution: 45, items: [{ id: 'beast_food', name: '灵兽粮', quantity: 2 }] },
      rankRequired: 'outer'
    }
  ],
  heisha: [
    {
      id: 'heisha_kill',
      name: '杀伐修心',
      type: 'daily',
      difficulty: 'hard',
      description: '击败3名敌人',
      requirement: { type: 'kill', amount: 3 },
      rewards: { contribution: 80, spiritStones: 60 },
      rankRequired: 'outer'
    }
  ],
  qingyun: [
    {
      id: 'qingyun_sword',
      name: '剑道精修',
      type: 'daily',
      difficulty: 'normal',
      description: '修炼剑法3次',
      requirement: { type: 'cultivation', target: 'sword', amount: 3 },
      rewards: { contribution: 55, experience: 80 },
      rankRequired: 'outer'
    }
  ],
  tianyin: [
    {
      id: 'tianyin_meditation',
      name: '禅修静心',
      type: 'daily',
      difficulty: 'easy',
      description: '完成一次深度闭关',
      requirement: { type: 'cultivation', target: 'deep', amount: 1 },
      rewards: { contribution: 40, experience: 60 },
      rankRequired: 'outer'
    }
  ]
}

// 获取宗门可用悬赏列表
export const getSectBounties = (sectId: string): SectBounty[] => {
  const sectBounties = SECT_BOUNTIES[sectId] || []
  return [...COMMON_DAILY_BOUNTIES, ...COMMON_WEEKLY_BOUNTIES, ...sectBounties]
}

// 检查是否可以接受悬赏
export const canAcceptBounty = (
  bounty: SectBounty,
  playerRank: SectRank,
  playerRealmTier: number
): { canAccept: boolean; reason?: string } => {
  // 检查职位
  const rankLevel = SECT_RANKS.find(r => r.id === playerRank)?.level || 0
  const requiredLevel = SECT_RANKS.find(r => r.id === bounty.rankRequired)?.level || 0
  if (rankLevel < requiredLevel) {
    return { canAccept: false, reason: `需要${getSectRankInfo(bounty.rankRequired)?.name || '更高职位'}` }
  }

  // 检查境界
  if (bounty.realmRequired && playerRealmTier < bounty.realmRequired) {
    return { canAccept: false, reason: '境界不足' }
  }

  return { canAccept: true }
}
