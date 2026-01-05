// 物品系统常量

// 物品类型
export type ItemType =
  | 'consumable' // 消耗品（丹药等）
  | 'material' // 材料
  | 'recipe' // 配方（丹方/图纸）
  | 'equipment' // 装备（法宝等）
  | 'special' // 特殊物品
  | 'seed' // 种子（药园系统）

// 物品品质
export type ItemQuality = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

// 物品使用效果类型
export type ItemEffectType =
  | 'restore_hp' // 恢复生命
  | 'restore_mp' // 恢复灵力
  | 'add_experience' // 增加修为
  | 'add_spirit_stones' // 增加灵石
  | 'clear_poison' // 清除丹毒
  | 'breakthrough_boost' // 突破加成
  | 'learn_recipe' // 学习配方
  | 'expand_inventory' // 扩展背包
  | 'buff' // 增益效果
  | 'remove_curse' // 解除咒印
  | 'none' // 无直接效果

// 物品使用效果
export interface ItemEffect {
  type: ItemEffectType
  value: number
  duration?: number // 持续时间（毫秒），仅buff类型
  description: string // 效果描述
}

// 物品使用条件
export interface ItemUseCondition {
  minRealm?: number // 最低境界
  maxRealm?: number // 最高境界
}

// 物品模板接口
export interface ItemTemplate {
  id: string
  name: string
  type: ItemType
  quality: ItemQuality
  description: string
  icon?: string // 图标名

  // 堆叠相关
  stackable: boolean // 是否可堆叠
  maxStack: number // 最大堆叠数量

  // 使用相关
  usable: boolean // 是否可直接使用
  useEffect?: ItemEffect // 使用效果
  useCondition?: ItemUseCondition

  // 配方相关（仅type为recipe时）
  recipeId?: string // 对应的配方ID

  // 交易相关
  tradeable: boolean // 是否可赠送/交易
  sellPrice?: number // 售卖价格（灵石）

  // 获取途径描述
  obtainMethod?: string
}

// 品质配置
export const ITEM_QUALITY_CONFIG: Record<ItemQuality, { name: string; color: string }> = {
  common: { name: '凡品', color: '#9d9d9d' },
  uncommon: { name: '灵品', color: '#1eff00' },
  rare: { name: '玄品', color: '#0070dd' },
  epic: { name: '地品', color: '#a335ee' },
  legendary: { name: '天品', color: '#ff8000' }
}

// 物品类型配置
export const ITEM_TYPE_CONFIG: Record<ItemType, { name: string; icon: string }> = {
  consumable: { name: '消耗品', icon: 'Pill' },
  material: { name: '材料', icon: 'Box' },
  recipe: { name: '配方', icon: 'BookOpen' },
  equipment: { name: '装备', icon: 'Sword' },
  special: { name: '特殊', icon: 'Star' },
  seed: { name: '种子', icon: 'Sprout' }
}

// 物品模板库
export const ITEMS: Record<string, ItemTemplate> = {
  // ========== 消耗品 - 丹药 ==========
  qi_gathering_pill: {
    id: 'qi_gathering_pill',
    name: '聚气丹',
    type: 'consumable',
    quality: 'common',
    description: '炼气期常用辅助丹药，服用后可获得少量修为。',
    icon: 'Pill',
    stackable: true,
    maxStack: 99,
    usable: true,
    useEffect: { type: 'add_experience', value: 100, description: '获得100点修为' },
    useCondition: { maxRealm: 2 },
    tradeable: true,
    sellPrice: 5,
    obtainMethod: '宗门宝库兑换、炼丹'
  },

  spirit_recovery_pill: {
    id: 'spirit_recovery_pill',
    name: '回灵丹',
    type: 'consumable',
    quality: 'common',
    description: '恢复灵力的基础丹药，修炼者必备。',
    icon: 'Pill',
    stackable: true,
    maxStack: 99,
    usable: true,
    useEffect: { type: 'restore_mp', value: 50, description: '恢复50%灵力' },
    tradeable: true,
    sellPrice: 3,
    obtainMethod: '宗门宝库兑换、炼丹'
  },

  foundation_pill: {
    id: 'foundation_pill',
    name: '筑基丹',
    type: 'consumable',
    quality: 'uncommon',
    description: '突破筑基期的珍贵丹药，可大幅提升突破成功率。',
    icon: 'Sparkles',
    stackable: true,
    maxStack: 10,
    usable: true,
    useEffect: { type: 'breakthrough_boost', value: 20, description: '筑基突破成功率+20%' },
    useCondition: { minRealm: 1, maxRealm: 1 },
    tradeable: true,
    sellPrice: 50,
    obtainMethod: '宗门宝库兑换、炼丹'
  },

  core_formation_pill: {
    id: 'core_formation_pill',
    name: '结丹丹',
    type: 'consumable',
    quality: 'rare',
    description: '结丹期突破必备丹药，极为珍贵。',
    icon: 'Sparkles',
    stackable: true,
    maxStack: 10,
    usable: true,
    useEffect: { type: 'breakthrough_boost', value: 15, description: '结丹突破成功率+15%' },
    useCondition: { minRealm: 2, maxRealm: 2 },
    tradeable: true,
    sellPrice: 200,
    obtainMethod: '宗门宝库兑换、炼丹'
  },

  detox_pill: {
    id: 'detox_pill',
    name: '清毒丹',
    type: 'consumable',
    quality: 'common',
    description: '可清除体内丹毒的解毒丹药。',
    icon: 'Droplet',
    stackable: true,
    maxStack: 99,
    usable: true,
    useEffect: { type: 'clear_poison', value: 50, description: '清除50%丹毒' },
    tradeable: true,
    sellPrice: 10,
    obtainMethod: '宗门宝库兑换、炼丹'
  },

  hp_pill: {
    id: 'hp_pill',
    name: '疗伤丹',
    type: 'consumable',
    quality: 'common',
    description: '恢复生命的基础丹药。',
    icon: 'Heart',
    stackable: true,
    maxStack: 99,
    usable: true,
    useEffect: { type: 'restore_hp', value: 30, description: '恢复30%生命' },
    tradeable: true,
    sellPrice: 5,
    obtainMethod: '宗门宝库兑换、炼丹'
  },

  experience_scroll: {
    id: 'experience_scroll',
    name: '心得卷轴',
    type: 'consumable',
    quality: 'uncommon',
    description: '前辈高人留下的修炼心得，阅读后可获得大量修为。',
    icon: 'Scroll',
    stackable: true,
    maxStack: 99,
    usable: true,
    useEffect: { type: 'add_experience', value: 500, description: '获得500点修为' },
    tradeable: true,
    sellPrice: 50,
    obtainMethod: '宗门宝库兑换、秘境探索'
  },

  spirit_stone_bag: {
    id: 'spirit_stone_bag',
    name: '灵石袋',
    type: 'consumable',
    quality: 'common',
    description: '装有灵石的小袋子，打开后可获得灵石。',
    icon: 'Gem',
    stackable: true,
    maxStack: 99,
    usable: true,
    useEffect: { type: 'add_spirit_stones', value: 100, description: '获得100灵石' },
    tradeable: true,
    sellPrice: 80,
    obtainMethod: '宗门宝库兑换、任务奖励'
  },

  // ========== 材料 ==========
  spirit_herb_common: {
    id: 'spirit_herb_common',
    name: '凡品灵草',
    type: 'material',
    quality: 'common',
    description: '常见的炼丹材料，可用于炼制低阶丹药。',
    icon: 'Leaf',
    stackable: true,
    maxStack: 999,
    usable: false,
    tradeable: true,
    sellPrice: 1,
    obtainMethod: '采集、宗门药园'
  },

  spirit_herb_uncommon: {
    id: 'spirit_herb_uncommon',
    name: '灵品灵草',
    type: 'material',
    quality: 'uncommon',
    description: '较为稀有的炼丹材料，可用于炼制中阶丹药。',
    icon: 'Leaf',
    stackable: true,
    maxStack: 999,
    usable: false,
    tradeable: true,
    sellPrice: 5,
    obtainMethod: '采集、宗门药园'
  },

  spirit_herb_rare: {
    id: 'spirit_herb_rare',
    name: '玄品灵草',
    type: 'material',
    quality: 'rare',
    description: '珍稀的炼丹材料，可用于炼制高阶丹药。',
    icon: 'Leaf',
    stackable: true,
    maxStack: 999,
    usable: false,
    tradeable: true,
    sellPrice: 20,
    obtainMethod: '秘境探索、高级药园'
  },

  spirit_ore_common: {
    id: 'spirit_ore_common',
    name: '凡品灵矿',
    type: 'material',
    quality: 'common',
    description: '常见的炼器材料，可用于炼制低阶法宝。',
    icon: 'Mountain',
    stackable: true,
    maxStack: 999,
    usable: false,
    tradeable: true,
    sellPrice: 2,
    obtainMethod: '挖矿、任务奖励'
  },

  spirit_ore_uncommon: {
    id: 'spirit_ore_uncommon',
    name: '灵品灵矿',
    type: 'material',
    quality: 'uncommon',
    description: '较为稀有的炼器材料。',
    icon: 'Mountain',
    stackable: true,
    maxStack: 999,
    usable: false,
    tradeable: true,
    sellPrice: 10,
    obtainMethod: '挖矿、秘境探索'
  },

  // ========== 配方 ==========
  recipe_qi_gathering_pill: {
    id: 'recipe_qi_gathering_pill',
    name: '聚气丹丹方',
    type: 'recipe',
    quality: 'common',
    description: '记载聚气丹炼制方法的丹方，使用后永久掌握。',
    icon: 'BookOpen',
    stackable: false,
    maxStack: 1,
    usable: true,
    useEffect: { type: 'learn_recipe', value: 1, description: '学习聚气丹配方' },
    recipeId: 'recipe_qi_gathering_pill',
    tradeable: true,
    sellPrice: 20,
    obtainMethod: '宗门宝库、秘境探索'
  },

  recipe_spirit_recovery_pill: {
    id: 'recipe_spirit_recovery_pill',
    name: '回灵丹丹方',
    type: 'recipe',
    quality: 'common',
    description: '记载回灵丹炼制方法的丹方，使用后永久掌握。',
    icon: 'BookOpen',
    stackable: false,
    maxStack: 1,
    usable: true,
    useEffect: { type: 'learn_recipe', value: 1, description: '学习回灵丹配方' },
    recipeId: 'recipe_spirit_recovery_pill',
    tradeable: true,
    sellPrice: 20,
    obtainMethod: '宗门宝库、秘境探索'
  },

  recipe_detox_pill: {
    id: 'recipe_detox_pill',
    name: '清毒丹丹方',
    type: 'recipe',
    quality: 'common',
    description: '记载清毒丹炼制方法的丹方，使用后永久掌握。',
    icon: 'BookOpen',
    stackable: false,
    maxStack: 1,
    usable: true,
    useEffect: { type: 'learn_recipe', value: 1, description: '学习清毒丹配方' },
    recipeId: 'recipe_detox_pill',
    tradeable: true,
    sellPrice: 30,
    obtainMethod: '宗门宝库、秘境探索'
  },

  recipe_foundation_pill: {
    id: 'recipe_foundation_pill',
    name: '筑基丹丹方',
    type: 'recipe',
    quality: 'uncommon',
    description: '记载筑基丹炼制方法的珍贵丹方，使用后永久掌握。',
    icon: 'BookOpen',
    stackable: false,
    maxStack: 1,
    usable: true,
    useEffect: { type: 'learn_recipe', value: 1, description: '学习筑基丹配方' },
    recipeId: 'recipe_foundation_pill',
    tradeable: true,
    sellPrice: 100,
    obtainMethod: '宗门宝库（内门）、秘境探索'
  },

  recipe_hp_pill: {
    id: 'recipe_hp_pill',
    name: '疗伤丹丹方',
    type: 'recipe',
    quality: 'common',
    description: '记载疗伤丹炼制方法的丹方，使用后永久掌握。',
    icon: 'BookOpen',
    stackable: false,
    maxStack: 1,
    usable: true,
    useEffect: { type: 'learn_recipe', value: 1, description: '学习疗伤丹配方' },
    recipeId: 'recipe_hp_pill',
    tradeable: true,
    sellPrice: 20,
    obtainMethod: '宗门宝库、秘境探索'
  },

  // ========== 特殊物品 ==========
  inventory_expansion_10: {
    id: 'inventory_expansion_10',
    name: '乾坤袋（小）',
    type: 'special',
    quality: 'uncommon',
    description: '蕴含空间之力的储物袋，使用后永久扩展储物袋10格。',
    icon: 'Package',
    stackable: false,
    maxStack: 1,
    usable: true,
    useEffect: { type: 'expand_inventory', value: 10, description: '储物袋容量+10' },
    tradeable: true,
    sellPrice: 100,
    obtainMethod: '宗门宝库、活动奖励'
  },

  inventory_expansion_30: {
    id: 'inventory_expansion_30',
    name: '乾坤袋（中）',
    type: 'special',
    quality: 'rare',
    description: '蕴含更强空间之力的储物袋，使用后永久扩展储物袋30格。',
    icon: 'Package',
    stackable: false,
    maxStack: 1,
    usable: true,
    useEffect: { type: 'expand_inventory', value: 30, description: '储物袋容量+30' },
    tradeable: true,
    sellPrice: 250,
    obtainMethod: '宗门宝库（核心）、活动奖励'
  },

  inventory_expansion_50: {
    id: 'inventory_expansion_50',
    name: '乾坤袋（大）',
    type: 'special',
    quality: 'epic',
    description: '传说级的空间法宝，使用后永久扩展储物袋50格。',
    icon: 'Package',
    stackable: false,
    maxStack: 1,
    usable: true,
    useEffect: { type: 'expand_inventory', value: 50, description: '储物袋容量+50' },
    tradeable: true,
    sellPrice: 500,
    obtainMethod: '稀有掉落、高级活动奖励'
  },

  // ========== 种子（药园系统） ==========
  seed_common_herb: {
    id: 'seed_common_herb',
    name: '凡品灵草种子',
    type: 'seed',
    quality: 'common',
    description: '最常见的灵草种子，生长迅速，4小时即可收获。',
    icon: 'Sprout',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: true,
    sellPrice: 5,
    obtainMethod: '宗门宝库、药园采收掉落'
  },

  seed_spirit_herb: {
    id: 'seed_spirit_herb',
    name: '灵品灵草种子',
    type: 'seed',
    quality: 'uncommon',
    description: '品质较高的灵草种子，需8小时培育。',
    icon: 'Sprout',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: true,
    sellPrice: 15,
    obtainMethod: '宗门宝库、药园采收掉落、秘境探索'
  },

  seed_rare_herb: {
    id: 'seed_rare_herb',
    name: '玄品灵草种子',
    type: 'seed',
    quality: 'rare',
    description: '珍稀的灵草种子，成熟需要24小时。',
    icon: 'Sprout',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: true,
    sellPrice: 50,
    obtainMethod: '宗门宝库、秘境探索'
  },

  seed_golden_herb: {
    id: 'seed_golden_herb',
    name: '金叶仙草种子',
    type: 'seed',
    quality: 'epic',
    description: '传说中的仙草种子，只有丹道长老的专属灵田才能培育，需48小时成熟。',
    icon: 'Sprout',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: false,
    sellPrice: 200,
    obtainMethod: '宗门宝库（长老限定）、洞天寻宝'
  },

  seed_mystic_flower: {
    id: 'seed_mystic_flower',
    name: '玄灵花种子',
    type: 'seed',
    quality: 'rare',
    description: '蕴含神秘灵气的花卉种子，16小时成熟。',
    icon: 'Sprout',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: true,
    sellPrice: 40,
    obtainMethod: '秘境探索、洞天寻宝'
  },

  // ========== 新增材料（药园产出和秘境掉落） ==========
  golden_spirit_herb: {
    id: 'golden_spirit_herb',
    name: '金叶仙草',
    type: 'material',
    quality: 'epic',
    description: '极为珍贵的仙草，炼制高阶丹药的必备材料。',
    icon: 'Leaf',
    stackable: true,
    maxStack: 999,
    usable: false,
    tradeable: true,
    sellPrice: 100,
    obtainMethod: '长老灵田种植'
  },

  mystic_flower: {
    id: 'mystic_flower',
    name: '玄灵花',
    type: 'material',
    quality: 'rare',
    description: '蕴含神秘灵气的花卉，可用于特殊丹药。',
    icon: 'Flower',
    stackable: true,
    maxStack: 999,
    usable: false,
    tradeable: true,
    sellPrice: 30,
    obtainMethod: '药园种植、秘境采集'
  },

  monster_core_common: {
    id: 'monster_core_common',
    name: '凡品妖核',
    type: 'material',
    quality: 'common',
    description: '低阶妖兽的核心，蕴含微弱妖力。',
    icon: 'Circle',
    stackable: true,
    maxStack: 999,
    usable: false,
    tradeable: true,
    sellPrice: 10,
    obtainMethod: '洞天寻宝、击杀妖兽'
  },

  monster_core_uncommon: {
    id: 'monster_core_uncommon',
    name: '灵品妖核',
    type: 'material',
    quality: 'uncommon',
    description: '中阶妖兽的核心，妖力较为充沛。',
    icon: 'Circle',
    stackable: true,
    maxStack: 999,
    usable: false,
    tradeable: true,
    sellPrice: 30,
    obtainMethod: '洞天寻宝、击杀妖兽'
  },

  monster_core_rare: {
    id: 'monster_core_rare',
    name: '玄品妖核',
    type: 'material',
    quality: 'rare',
    description: '高阶妖兽的核心，妖力澎湃。',
    icon: 'Circle',
    stackable: true,
    maxStack: 999,
    usable: false,
    tradeable: true,
    sellPrice: 80,
    obtainMethod: '洞天寻宝、击杀强力妖兽'
  },

  poison_sac: {
    id: 'poison_sac',
    name: '毒囊',
    type: 'material',
    quality: 'uncommon',
    description: '从毒花精身上获取的毒囊，可用于炼制毒系丹药。',
    icon: 'Droplet',
    stackable: true,
    maxStack: 999,
    usable: false,
    tradeable: true,
    sellPrice: 25,
    obtainMethod: '洞天寻宝'
  },

  ancient_bark: {
    id: 'ancient_bark',
    name: '古木树皮',
    type: 'material',
    quality: 'rare',
    description: '千年古木的树皮，蕴含浓郁木系灵气。',
    icon: 'TreeDeciduous',
    stackable: true,
    maxStack: 999,
    usable: false,
    tradeable: true,
    sellPrice: 50,
    obtainMethod: '洞天寻宝'
  },

  butterfly_wing: {
    id: 'butterfly_wing',
    name: '灵蝶之翼',
    type: 'material',
    quality: 'uncommon',
    description: '美丽的灵蝶翅膀，可用于炼制轻身丹药。',
    icon: 'Feather',
    stackable: true,
    maxStack: 999,
    usable: false,
    tradeable: true,
    sellPrice: 20,
    obtainMethod: '洞天寻宝'
  },

  // ========== 落云宗专属材料 ==========

  // 妖丹系列（用于献祭灵眼之树）
  demon_pill_tier1: {
    id: 'demon_pill_tier1',
    name: '一阶妖丹',
    type: 'material',
    quality: 'common',
    description: '低阶妖兽的妖丹，蕴含微弱妖力。可献祭给灵眼之树。',
    icon: 'Circle',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: true,
    sellPrice: 10,
    obtainMethod: '击杀低阶妖兽、秘境探索'
  },

  demon_pill_tier2: {
    id: 'demon_pill_tier2',
    name: '二阶妖丹',
    type: 'material',
    quality: 'uncommon',
    description: '中阶妖兽的妖丹，妖力充沛。可献祭给灵眼之树或用于炼丹。',
    icon: 'Circle',
    stackable: true,
    maxStack: 50,
    usable: false,
    tradeable: true,
    sellPrice: 30,
    obtainMethod: '元神出窍、击杀中阶妖兽、秘境探索'
  },

  demon_pill_tier3: {
    id: 'demon_pill_tier3',
    name: '三阶妖丹',
    type: 'material',
    quality: 'rare',
    description: '高阶妖兽的妖丹，妖力浓郁。可献祭给灵眼之树或用于炼丹。',
    icon: 'Circle',
    stackable: true,
    maxStack: 30,
    usable: false,
    tradeable: true,
    sellPrice: 80,
    obtainMethod: '元神出窍、击杀高阶妖兽、秘境探索'
  },

  demon_pill_tier4: {
    id: 'demon_pill_tier4',
    name: '四阶妖丹',
    type: 'material',
    quality: 'epic',
    description: '妖王级妖丹，妖力磅礴。献祭给灵眼之树可大幅提升成熟度。',
    icon: 'Circle',
    stackable: true,
    maxStack: 20,
    usable: false,
    tradeable: true,
    sellPrice: 200,
    obtainMethod: '击杀妖王、稀有秘境掉落'
  },

  demon_pill_tier5: {
    id: 'demon_pill_tier5',
    name: '五阶妖丹',
    type: 'material',
    quality: 'legendary',
    description: '大妖级妖丹，妖力惊天。献祭给灵眼之树效果极佳。',
    icon: 'Circle',
    stackable: true,
    maxStack: 10,
    usable: false,
    tradeable: true,
    sellPrice: 500,
    obtainMethod: '击杀大妖、极稀有掉落'
  },

  // 灵眼之树产出
  lingyan_branch: {
    id: 'lingyan_branch',
    name: '灵眼枝',
    type: 'material',
    quality: 'rare',
    description: '灵眼之树的枝条，蕴含无尽生机。可用于炼制特殊丹药。',
    icon: 'TreeDeciduous',
    stackable: true,
    maxStack: 50,
    usable: false,
    tradeable: true,
    sellPrice: 100,
    obtainMethod: '灵眼之树收获奖励'
  },

  lingyan_liquid: {
    id: 'lingyan_liquid',
    name: '灵眼之液',
    type: 'consumable',
    quality: 'legendary',
    description: '灵眼之树分泌的神秘液体，极为珍贵。可升级灵根（终身一次）或催熟灵草。',
    icon: 'Droplet',
    stackable: true,
    maxStack: 10,
    usable: true,
    useEffect: { type: 'buff', value: 1, description: '选择效果：升级灵根或催熟灵草' },
    tradeable: false,
    sellPrice: 0,
    obtainMethod: '灵眼之树收获排名奖励（前10名）'
  },

  // 落云宗宝库专属
  spirit_tree_fertilizer: {
    id: 'spirit_tree_fertilizer',
    name: '灵木肥料',
    type: 'consumable',
    quality: 'uncommon',
    description: '专为灵眼之树调配的肥料，使用后为灵树增加少量成熟度。',
    icon: 'Package',
    stackable: true,
    maxStack: 99,
    usable: true,
    useEffect: { type: 'none', value: 0, description: '为灵眼之树增加0.1%成熟度' },
    tradeable: false,
    sellPrice: 0,
    obtainMethod: '落云宗宝库兑换'
  },

  // ========== 元婴宗专属材料 ==========

  // 金灵根产出
  xuantie_ore: {
    id: 'xuantie_ore',
    name: '玄铁矿',
    type: 'material',
    quality: 'rare',
    description: '蕴含金属灵气的矿石，元神出窍时金灵根者可寻得。',
    icon: 'Mountain',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: true,
    sellPrice: 50,
    obtainMethod: '元神出窍（金灵根）'
  },

  essence_gold: {
    id: 'essence_gold',
    name: '精金碎片',
    type: 'material',
    quality: 'epic',
    description: '天地精金之碎片，极为珍贵的炼器材料。',
    icon: 'Gem',
    stackable: true,
    maxStack: 50,
    usable: false,
    tradeable: true,
    sellPrice: 150,
    obtainMethod: '元神出窍（金灵根）'
  },

  // 木灵根产出
  millennium_herb: {
    id: 'millennium_herb',
    name: '千年灵药',
    type: 'material',
    quality: 'rare',
    description: '生长千年的珍稀灵药，蕴含浓郁木系灵气。',
    icon: 'Leaf',
    stackable: true,
    maxStack: 50,
    usable: false,
    tradeable: true,
    sellPrice: 60,
    obtainMethod: '元神出窍（木灵根）'
  },

  ancient_wood: {
    id: 'ancient_wood',
    name: '古木精华',
    type: 'material',
    quality: 'epic',
    description: '远古神木的精华，炼丹炼器皆可使用。',
    icon: 'TreeDeciduous',
    stackable: true,
    maxStack: 30,
    usable: false,
    tradeable: true,
    sellPrice: 180,
    obtainMethod: '元神出窍（木灵根）'
  },

  // 水灵根产出
  cold_ice_marrow: {
    id: 'cold_ice_marrow',
    name: '寒冰髓',
    type: 'material',
    quality: 'rare',
    description: '万年寒冰中凝结的髓质，冰寒彻骨。',
    icon: 'Snowflake',
    stackable: true,
    maxStack: 50,
    usable: false,
    tradeable: true,
    sellPrice: 55,
    obtainMethod: '元神出窍（水灵根）'
  },

  water_spirit_pearl: {
    id: 'water_spirit_pearl',
    name: '水灵珠',
    type: 'material',
    quality: 'epic',
    description: '水系灵力凝聚的珠子，蕴含无尽水灵之力。',
    icon: 'Droplet',
    stackable: true,
    maxStack: 20,
    usable: false,
    tradeable: true,
    sellPrice: 200,
    obtainMethod: '元神出窍（水灵根）'
  },

  // 火灵根产出
  fire_spirit_core: {
    id: 'fire_spirit_core',
    name: '火灵核',
    type: 'material',
    quality: 'rare',
    description: '火焰精灵遗留的核心，炽热无比。',
    icon: 'Flame',
    stackable: true,
    maxStack: 50,
    usable: false,
    tradeable: true,
    sellPrice: 55,
    obtainMethod: '元神出窍（火灵根）'
  },

  scarlet_flame_stone: {
    id: 'scarlet_flame_stone',
    name: '赤炎石',
    type: 'material',
    quality: 'epic',
    description: '地心火焰凝结的石头，温度极高。',
    icon: 'Flame',
    stackable: true,
    maxStack: 30,
    usable: false,
    tradeable: true,
    sellPrice: 170,
    obtainMethod: '元神出窍（火灵根）'
  },

  // 土灵根产出
  spirit_soil: {
    id: 'spirit_soil',
    name: '灵土块',
    type: 'material',
    quality: 'uncommon',
    description: '蕴含大地灵气的土块，可用于药园扩建。',
    icon: 'Mountain',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: true,
    sellPrice: 25,
    obtainMethod: '元神出窍（土灵根）'
  },

  earth_core_crystal: {
    id: 'earth_core_crystal',
    name: '地心玄晶',
    type: 'material',
    quality: 'epic',
    description: '地心深处的玄晶，蕴含浓郁土系灵气。',
    icon: 'Gem',
    stackable: true,
    maxStack: 20,
    usable: false,
    tradeable: true,
    sellPrice: 190,
    obtainMethod: '元神出窍（土灵根）'
  },

  // 问道寻真材料产出
  spirit_stone_medium: {
    id: 'spirit_stone_medium',
    name: '中品灵石',
    type: 'material',
    quality: 'uncommon',
    description: '品质较高的灵石，蕴含充沛灵气。',
    icon: 'Gem',
    stackable: true,
    maxStack: 999,
    usable: false,
    tradeable: true,
    sellPrice: 10,
    obtainMethod: '问道寻真、秘境探索'
  },

  essence_pill: {
    id: 'essence_pill',
    name: '精元丹',
    type: 'consumable',
    quality: 'rare',
    description: '凝练精元的丹药，服用后可恢复精气神。',
    icon: 'Pill',
    stackable: true,
    maxStack: 50,
    usable: true,
    useEffect: { type: 'restore_hp', value: 50, description: '恢复50%生命和灵力' },
    tradeable: true,
    sellPrice: 80,
    obtainMethod: '问道寻真、炼丹'
  },

  soul_crystal: {
    id: 'soul_crystal',
    name: '魂晶',
    type: 'material',
    quality: 'rare',
    description: '蕴含魂力的晶体，可用于提升元婴等级。',
    icon: 'Gem',
    stackable: true,
    maxStack: 50,
    usable: false,
    tradeable: true,
    sellPrice: 100,
    obtainMethod: '问道寻真、秘境探索'
  },

  // 青元剑诀残篇
  green_sword_fragment_upper: {
    id: 'green_sword_fragment_upper',
    name: '青元剑诀·上篇',
    type: 'special',
    quality: 'legendary',
    description: '记载青元剑诀精义的残篇，阐述剑道本源。需集齐三篇方可领悟。',
    icon: 'Scroll',
    stackable: false,
    maxStack: 1,
    usable: false,
    tradeable: false,
    sellPrice: 0,
    obtainMethod: '问道寻真（5%概率）'
  },

  green_sword_fragment_middle: {
    id: 'green_sword_fragment_middle',
    name: '青元剑诀·中篇',
    type: 'special',
    quality: 'legendary',
    description: '记载青元剑诀剑意心法的残篇，修炼剑气根基。需集齐三篇方可领悟。',
    icon: 'Scroll',
    stackable: false,
    maxStack: 1,
    usable: false,
    tradeable: false,
    sellPrice: 0,
    obtainMethod: '问道寻真（5%概率）'
  },

  green_sword_fragment_lower: {
    id: 'green_sword_fragment_lower',
    name: '青元剑诀·下篇',
    type: 'special',
    quality: 'legendary',
    description: '记载青元剑诀奥义的残篇，领悟无上剑道。需集齐三篇方可领悟。',
    icon: 'Scroll',
    stackable: false,
    maxStack: 1,
    usable: false,
    tradeable: false,
    sellPrice: 0,
    obtainMethod: '问道寻真（5%概率）'
  },

  // ========== 元神出窍产出（新版）==========

  // 养魂木
  soul_nurture_wood: {
    id: 'soul_nurture_wood',
    name: '养魂木',
    type: 'material',
    quality: 'rare',
    description: '天地灵木精华凝结而成，可滋养元婴，提升元婴经验。',
    icon: 'TreeDeciduous',
    stackable: true,
    maxStack: 50,
    usable: true,
    useEffect: { type: 'buff', value: 50, description: '使用后为元婴增加50点经验' },
    tradeable: true,
    sellPrice: 60,
    obtainMethod: '元神出窍'
  },

  // 木灵根额外产出
  rare_herb_seed: {
    id: 'rare_herb_seed',
    name: '稀有灵草种子',
    type: 'seed',
    quality: 'rare',
    description: '珍稀灵草的种子，可在药园中种植培育。',
    icon: 'Sprout',
    stackable: true,
    maxStack: 20,
    usable: false,
    tradeable: true,
    sellPrice: 50,
    obtainMethod: '元神出窍（木灵根）'
  },

  // 水灵根额外产出
  cold_soul_marrow: {
    id: 'cold_soul_marrow',
    name: '寒魂髓',
    type: 'material',
    quality: 'epic',
    description: '万年寒冰深处凝结的魂髓，冰寒彻骨，可强化水系功法。',
    icon: 'Snowflake',
    stackable: true,
    maxStack: 30,
    usable: false,
    tradeable: true,
    sellPrice: 120,
    obtainMethod: '元神出窍（水灵根）'
  },

  spirit_essence: {
    id: 'spirit_essence',
    name: '灵魂精华',
    type: 'material',
    quality: 'epic',
    description: '凝聚了天地灵气的精华，极为珍贵，可用于炼制高阶丹药或强化法宝。',
    icon: 'Sparkles',
    stackable: true,
    maxStack: 20,
    usable: false,
    tradeable: true,
    sellPrice: 150,
    obtainMethod: '风希追猎、秘境探索'
  },

  // 火灵根额外产出
  fire_essence_crystal: {
    id: 'fire_essence_crystal',
    name: '火精晶',
    type: 'material',
    quality: 'epic',
    description: '火焰精华凝结的晶体，温度极高，可强化火系功法。',
    icon: 'Flame',
    stackable: true,
    maxStack: 30,
    usable: false,
    tradeable: true,
    sellPrice: 120,
    obtainMethod: '元神出窍（火灵根）'
  },

  // 土灵根额外产出
  earth_spirit_stone: {
    id: 'earth_spirit_stone',
    name: '地灵石',
    type: 'material',
    quality: 'uncommon',
    description: '蕴含大地灵气的灵石，可用于阵法布置或炼器。',
    icon: 'Mountain',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: true,
    sellPrice: 25,
    obtainMethod: '元神出窍（土灵根）'
  },

  // ========== 稀有丹方 ==========

  recipe_soul_pill: {
    id: 'recipe_soul_pill',
    name: '凝魂丹丹方',
    type: 'recipe',
    quality: 'epic',
    description: '记载凝魂丹炼制方法的丹方，凝魂丹可大幅提升元婴经验。',
    icon: 'BookOpen',
    stackable: false,
    maxStack: 1,
    usable: true,
    useEffect: { type: 'learn_recipe', value: 1, description: '学习凝魂丹炼制配方' },
    recipeId: 'soul_pill',
    tradeable: false,
    sellPrice: 0,
    obtainMethod: '元神出窍（5%概率）'
  },

  recipe_nascent_pill: {
    id: 'recipe_nascent_pill',
    name: '元婴丹丹方',
    type: 'recipe',
    quality: 'legendary',
    description: '记载元婴丹炼制方法的丹方，元婴丹可助修士凝聚元婴。',
    icon: 'BookOpen',
    stackable: false,
    maxStack: 1,
    usable: true,
    useEffect: { type: 'learn_recipe', value: 1, description: '学习元婴丹炼制配方' },
    recipeId: 'nascent_pill',
    tradeable: false,
    sellPrice: 0,
    obtainMethod: '元神出窍（5%概率）'
  },

  recipe_spirit_pill: {
    id: 'recipe_spirit_pill',
    name: '聚灵丹丹方',
    type: 'recipe',
    quality: 'rare',
    description: '记载聚灵丹炼制方法的丹方，聚灵丹可快速恢复灵力。',
    icon: 'BookOpen',
    stackable: false,
    maxStack: 1,
    usable: true,
    useEffect: { type: 'learn_recipe', value: 1, description: '学习聚灵丹炼制配方' },
    recipeId: 'spirit_pill',
    tradeable: false,
    sellPrice: 0,
    obtainMethod: '元神出窍（5%概率）'
  },

  // ========== 渡劫至宝 ==========

  // 筑基之劫
  foundation_establishment_pill: {
    id: 'foundation_establishment_pill',
    name: '筑基丹',
    type: 'consumable',
    quality: 'rare',
    description: '突破筑基期的必备丹药，承载着炼气修士的希望。服用后可助修士安然渡过筑基天劫。',
    icon: 'Pill',
    stackable: true,
    maxStack: 10,
    usable: false, // 不可直接使用，突破时自动消耗
    tradeable: true,
    sellPrice: 500,
    obtainMethod: '宗门宝库兑换、炼丹、秘境探索、世界事件奖励'
  },

  // 结丹三宝
  heavenly_fire_liquid: {
    id: 'heavenly_fire_liquid',
    name: '天火液',
    type: 'material',
    quality: 'epic',
    description: '取自地心火脉的珍稀液体，蕴含天地至阳之力，结丹三宝之一。',
    icon: 'Flame',
    stackable: true,
    maxStack: 5,
    usable: false,
    tradeable: true,
    sellPrice: 2000,
    obtainMethod: '秘境深处、试炼古塔高层、Boss掉落'
  },

  soul_condensing_pill: {
    id: 'soul_condensing_pill',
    name: '凝魂丹',
    type: 'consumable',
    quality: 'epic',
    description: '凝练魂魄的绝品丹药，可使金丹圆满无暇，结丹三宝之一。',
    icon: 'Pill',
    stackable: true,
    maxStack: 5,
    usable: false,
    tradeable: true,
    sellPrice: 2500,
    obtainMethod: '炼丹大师炼制、宗门宝库（核心弟子）'
  },

  triple_revolving_pill: {
    id: 'triple_revolving_pill',
    name: '三转重元丹',
    type: 'consumable',
    quality: 'epic',
    description: '经过三次精炼的重元丹，可稳固结丹修士的道基，结丹三宝之一。',
    icon: 'Pill',
    stackable: true,
    maxStack: 5,
    usable: false,
    tradeable: true,
    sellPrice: 3000,
    obtainMethod: '试炼古塔高层奖励、稀有Boss掉落'
  },

  // 元婴三宝
  soul_nurturing_wood: {
    id: 'soul_nurturing_wood',
    name: '养魂木',
    type: 'material',
    quality: 'epic',
    description: '蕴含天地灵气的神木，可滋养元婴，凝婴必备材料。',
    icon: 'TreeDeciduous',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: true,
    sellPrice: 200,
    obtainMethod: '元神出窍、高阶秘境、宗门悬赏'
  },

  nine_bend_spirit_ginseng_pill: {
    id: 'nine_bend_spirit_ginseng_pill',
    name: '九曲灵参丹',
    type: 'consumable',
    quality: 'legendary',
    description: '以万年九曲灵参为主料炼制的绝世灵丹，可助修士凝聚元婴本源，元婴三宝之一。',
    icon: 'Pill',
    stackable: true,
    maxStack: 3,
    usable: false,
    tradeable: true,
    sellPrice: 10000,
    obtainMethod: '世界Boss首杀、跨服秘境、天道祥瑞'
  },

  azure_luan_sky_shield: {
    id: 'azure_luan_sky_shield',
    name: '青鸾天盾',
    type: 'equipment',
    quality: 'legendary',
    description: '传说中的防御法宝，以青鸾真羽炼制而成，可助修士安然渡过元婴天劫，元婴三宝之一。',
    icon: 'Shield',
    stackable: false,
    maxStack: 1,
    usable: false,
    tradeable: true,
    sellPrice: 50000,
    obtainMethod: '世界Boss首杀、传说任务奖励、天机阁兑换'
  },

  // ========== 传说法宝 ==========

  wind_thunder_wings: {
    id: 'wind_thunder_wings',
    name: '风雷翅',
    type: 'equipment',
    quality: 'legendary',
    description: '乱星海九级妖修风希斩杀雷鹏所得的绝世法宝，蕴含风雷之力，催动时可达天下极速。炼化后有可能被风希的神识感知，招来追猎。',
    icon: 'Zap',
    stackable: false,
    maxStack: 1,
    usable: true,
    tradeable: true,
    sellPrice: 100000,
    obtainMethod: '乱星海秘境、世界Boss首杀、天道祥瑞'
  },

  // ========== 虚天殿·降魔 副本物品 ==========

  xutian_map_fragment: {
    id: 'xutian_map_fragment',
    name: '虚天残图',
    type: 'special',
    quality: 'epic',
    description:
      '残破的古图，记载着通往上古秘境虚天殿的路径。据说韩立等修士正是凭借此图进入虚天殿，与蛮胡子道人一战。消耗后可开启虚天殿·降魔副本。',
    icon: 'Map',
    stackable: true,
    maxStack: 10,
    usable: false, // 不可直接使用，创建副本时自动消耗
    tradeable: true,
    sellPrice: 5000,
    obtainMethod: '闭关修炼奇遇（0.05%概率）'
  },

  xutian_ding_fragment: {
    id: 'xutian_ding_fragment',
    name: '虚天鼎残片',
    type: 'material',
    quality: 'epic',
    description: '虚天鼎的碎片，蕴含上古炼丹神器的一丝气息。收集100个可重铸虚天鼎。',
    icon: 'PuzzlePiece',
    stackable: true,
    maxStack: 999,
    usable: false,
    tradeable: false,
    sellPrice: 0,
    obtainMethod: '虚天殿·降魔副本（通关随机获得）'
  },

  xutian_ding: {
    id: 'xutian_ding',
    name: '虚天鼎',
    type: 'equipment',
    quality: 'legendary',
    description: '上古炼丹神器，传说中蛮胡子道人的至宝。装备后炼丹成功率+20%，丹药品质提升一档的概率+10%。',
    icon: 'Cauldron',
    stackable: false,
    maxStack: 1,
    usable: false,
    tradeable: true,
    sellPrice: 500000,
    obtainMethod: '虚天殿·降魔副本（0.5%掉落）、100个虚天鼎残片合成'
  },

  huanglin_armor_blueprint: {
    id: 'huanglin_armor_blueprint',
    name: '皇鳞甲图纸',
    type: 'recipe',
    quality: 'legendary',
    description: '记载皇鳞甲炼制方法的古图纸，皇鳞甲乃上古防御至宝。使用后可永久学习皇鳞甲配方。',
    icon: 'BookOpen',
    stackable: false,
    maxStack: 1,
    usable: true,
    useEffect: { type: 'learn_recipe', value: 1, description: '学习皇鳞甲炼制配方' },
    recipeId: 'huanglin_armor',
    tradeable: true,
    sellPrice: 100000,
    obtainMethod: '虚天殿·降魔副本（2%掉落）'
  },

  manhuzi_storage_bag: {
    id: 'manhuzi_storage_bag',
    name: '蛮胡子储物袋',
    type: 'consumable',
    quality: 'epic',
    description: '从蛮胡子残魂处获得的储物袋，内含各类珍宝。使用后随机获得灵石、修为或珍稀材料。',
    icon: 'Package',
    stackable: true,
    maxStack: 10,
    usable: true,
    useEffect: { type: 'none', value: 0, description: '随机获得灵石(1000-5000)、修为(500-2000)或珍稀材料' },
    tradeable: true,
    sellPrice: 2000,
    obtainMethod: '虚天殿·降魔副本（5%掉落）'
  },

  // ========== 黑煞教·丹魔之咒系统 ==========

  // 咒术材料
  yin_soul_silk: {
    id: 'yin_soul_silk',
    name: '阴魂丝',
    type: 'material',
    quality: 'rare',
    description: '凝结了怨魂之力的丝线，阴寒刺骨。黑煞教炼制魔药的重要材料。',
    icon: 'Wind',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: true,
    sellPrice: 80,
    obtainMethod: '秘境探索、击杀阴魂系妖兽'
  },

  blood_coagulating_grass: {
    id: 'blood_coagulating_grass',
    name: '凝血草',
    type: 'material',
    quality: 'uncommon',
    description: '生长于血池边缘的诡异药草，可凝结生灵精血。',
    icon: 'Leaf',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: true,
    sellPrice: 30,
    obtainMethod: '药园种植、秘境采集'
  },

  // 丹魔心萃丹方（配方）
  danmo_xinlian_recipe: {
    id: 'danmo_xinlian_recipe',
    name: '丹魔心萃丹方',
    type: 'recipe',
    quality: 'epic',
    description: '黑煞教压箱底的魔道丹方，记载着炼制【丹魔心萃】的秘法。学会后可自行炼制。',
    icon: 'BookOpen',
    stackable: false,
    maxStack: 1,
    usable: true,
    useEffect: { type: 'learn_recipe', value: 1, description: '学习【丹魔心萃】丹方' },
    recipeId: 'danmo_xinlian',
    tradeable: false,
    sellPrice: 0,
    obtainMethod: '黑煞教宗门宝库兑换'
  },

  // 丹魔心萃（咒术消耗品）
  danmo_xinlian: {
    id: 'danmo_xinlian',
    name: '丹魔心萃',
    type: 'consumable',
    quality: 'epic',
    description: '黑煞教的魔道毒丹，外表如普通丹药，实则蕴含歹毒咒力。可对目标施展【丹魔之咒】。',
    icon: 'Pill',
    stackable: true,
    maxStack: 10,
    usable: false, // 不能直接使用，需要通过咒术系统
    tradeable: false,
    sellPrice: 0,
    obtainMethod: '黑煞教弟子炼制'
  },

  // 九转解厄丹（解咒丹药）
  jiuzhuan_jie_dan: {
    id: 'jiuzhuan_jie_dan',
    name: '九转解厄丹',
    type: 'consumable',
    quality: 'legendary',
    description: '黄枫谷丹道长老潜心研制的解毒圣药，可解除世间一切毒素与咒印。此方天地，唯有此丹能解【丹魔之咒】。',
    icon: 'Pill',
    stackable: true,
    maxStack: 5,
    usable: true,
    useEffect: { type: 'remove_curse', value: 1, description: '解除身上的【丹魔侵蚀】咒印' },
    tradeable: true,
    sellPrice: 5000,
    obtainMethod: '黄枫谷丹道长老炼制、万宝楼购买'
  },

  // ========== 神魂陨落系统 ==========

  // 护道丹（神魂陨落免死道具）
  soul_protection_pill: {
    id: 'soul_protection_pill',
    name: '护道丹',
    type: 'consumable',
    quality: 'legendary',
    description:
      '蕴含护道之力的绝世灵丹，可在神魂陨落之际自动消耗，保护修士免受境界跌落、修为清零、物品掉落的惨痛后果。但仍会陷入道心破碎状态。',
    icon: 'Shield',
    stackable: true,
    maxStack: 10,
    usable: false, // 不可直接使用，神魂陨落时自动消耗
    useEffect: { type: 'none', value: 0, description: '神魂陨落时自动消耗，免除境界/修为/物品惩罚' },
    tradeable: true,
    sellPrice: 5000,
    obtainMethod: '宗门宝库兑换（10000贡献）'
  },

  // ========== 血魂幡系统 ==========

  // 魂魄类型（特殊材料，不可交易，存储在soulStorage）
  grievance_soul: {
    id: 'grievance_soul',
    name: '怨魂',
    type: 'material',
    quality: 'uncommon',
    description: '死于非命之人的怨念凝结而成，散发着幽冷的气息。可用于血魂幡炼化。',
    icon: 'Ghost',
    stackable: true,
    maxStack: 999,
    usable: false,
    tradeable: false,
    sellPrice: 0,
    obtainMethod: 'PvP胜利20%几率获得'
  },

  cultivator_remnant: {
    id: 'cultivator_remnant',
    name: '修士残魂',
    type: 'material',
    quality: 'rare',
    description: '修炼者陨落后残留的魂魄碎片，蕴含灵力，比普通怨魂更为精纯。',
    icon: 'Ghost',
    stackable: true,
    maxStack: 999,
    usable: false,
    tradeable: false,
    sellPrice: 0,
    obtainMethod: 'PvP胜利10%几率获得'
  },

  beast_spirit: {
    id: 'beast_spirit',
    name: '妖兽精魄',
    type: 'material',
    quality: 'rare',
    description: '妖兽精血凝聚的魂魄，凶戾之气浓郁，是炼制高级妖丹的上佳材料。',
    icon: 'Ghost',
    stackable: true,
    maxStack: 999,
    usable: false,
    tradeable: false,
    sellPrice: 0,
    obtainMethod: '血洗山林PvE'
  },

  fierce_soul: {
    id: 'fierce_soul',
    name: '凶兽戾魄',
    type: 'material',
    quality: 'epic',
    description: '上古凶兽的戾魄，蕴含毁天灭地之力，极为稀有。',
    icon: 'Skull',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: false,
    sellPrice: 0,
    obtainMethod: '召唤魔影Boss'
  },

  // 法则碎片·暗（血魂幡炼化凶兽戾魄稀有产出）
  law_fragment_dark: {
    id: 'law_fragment_dark',
    name: '法则碎片·暗',
    type: 'material',
    quality: 'legendary',
    description: '蕴含暗之法则的碎片，极为稀有的炼器材料，可用于炼制顶级魔宝。',
    icon: 'Sparkles',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: true,
    sellPrice: 1000,
    obtainMethod: '血魂幡炼化凶兽戾魄（稀有产出）'
  },

  // ========== 七焰扇系统材料 ==========

  // 扇骨材料
  scarlet_refined_bone: {
    id: 'scarlet_refined_bone',
    name: '赤炼金骨',
    type: 'material',
    quality: 'epic',
    description: '以天火淬炼千年的金属骨架，是炼制上品火系法宝的核心扇骨材料。散发灼热气息，普通人难以触碰。',
    icon: 'Bone',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: true,
    sellPrice: 2000,
    obtainMethod: '鬼赌坊·六道轮回盘（四等奖/五等奖概率获得）'
  },

  // 三焰材料
  fire_phoenix_feather: {
    id: 'fire_phoenix_feather',
    name: '火凤之翎',
    type: 'material',
    quality: 'epic',
    description: '火凤涅槃重生时遗落的羽翎，蕴含纯净的火凤真火。据说每一根羽翎都记载着火凤的一次涅槃。',
    icon: 'Feather',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: true,
    sellPrice: 3000,
    obtainMethod: '万灵宗·万兽渊探渊（战胜50000+战力妖兽触发【气运爆发】掉落）'
  },

  fire_crane_feather: {
    id: 'fire_crane_feather',
    name: '火鹤之羽',
    type: 'material',
    quality: 'epic',
    description: '火鹤展翅时脱落的赤红羽毛，温度极高却不灼伤修士。元婴宗弟子时常能在宗门秘境中拾得。',
    icon: 'Feather',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: true,
    sellPrice: 3000,
    obtainMethod: '元婴宗·问道（元婴宗专属产出）'
  },

  three_legged_crow_feather: {
    id: 'three_legged_crow_feather',
    name: '三足乌翎',
    type: 'material',
    quality: 'epic',
    description: '传说中栖息于太阳之中的三足金乌遗落的羽翎，金光璀璨，蕴含太阳真火精华。',
    icon: 'Feather',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: true,
    sellPrice: 3000,
    obtainMethod: '昆吾山副本·闯塔/组队副本（随机奇遇事件）'
  },

  // 七焰材料
  ice_phoenix_feather: {
    id: 'ice_phoenix_feather',
    name: '冰凤之翎',
    type: 'material',
    quality: 'legendary',
    description: '冰凤之翎，与火凤相生相克。冰火交融方能炼出真正的七焰。触之极寒，却能在七焰扇中化为最炽热的一焰。',
    icon: 'Feather',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: true,
    sellPrice: 8000,
    obtainMethod: '虚天殿副本通关（战利品箱极低概率开出）'
  },

  thunder_peng_feather: {
    id: 'thunder_peng_feather',
    name: '雷鹏之羽',
    type: 'material',
    quality: 'legendary',
    description: '雷鹏振翅穿梭雷云时脱落的紫金羽毛，电芒缭绕，蕴含雷霆之威。与火焰融合后可催生雷火。',
    icon: 'Feather',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: true,
    sellPrice: 8000,
    obtainMethod: '星宫·牵引星辰（在天雷星上收集精华时概率获得）'
  },

  green_luan_feather: {
    id: 'green_luan_feather',
    name: '青鸾长翎',
    type: 'material',
    quality: 'legendary',
    description: '青鸾啼鸣时抖落的翠绿长羽，风华绝代。蕴含木火相生之理，是七焰扇中调和诸火的关键。',
    icon: 'Feather',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: true,
    sellPrice: 8000,
    obtainMethod: '昆吾山副本·朱果奇遇（选择强行摘取并战胜守护兽掉落）'
  },

  kunpeng_feather: {
    id: 'kunpeng_feather',
    name: '鲲鹏之羽',
    type: 'material',
    quality: 'legendary',
    description: '上古神兽鲲鹏蜕变时遗落的羽毛，可化鲲可化鹏。水火既济，阴阳调和，是炼制顶级法宝的至上材料。',
    icon: 'Feather',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: true,
    sellPrice: 10000,
    obtainMethod: '深度闭关8小时（神游太虚触发【鲲鹏掠过】奇遇）'
  },

  primordial_purple_qi: {
    id: 'primordial_purple_qi',
    name: '鸿蒙紫气',
    type: 'material',
    quality: 'legendary',
    description: '天地初开时的一缕鸿蒙之气，紫光氤氲，蕴含造化之力。传说集齐七种神羽后，唯有此气方能将其融为一体。',
    icon: 'Cloud',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeable: true,
    sellPrice: 50000,
    obtainMethod: '全服活动/拍卖行/管理员投放（可遇不可求）'
  },

  // ========== 七焰扇装备 ==========

  // 三焰扇（地品装备）
  three_flame_fan: {
    id: 'three_flame_fan',
    name: '三焰扇',
    type: 'equipment',
    quality: 'epic',
    description: '古法炼制的火系法宝仿品，虽非真品，亦蕴含不俗火焰之力。扇面绘有三道火焰纹路，挥动时烈焰腾空。战力+11,800。',
    icon: 'Flame',
    stackable: false,
    maxStack: 1,
    usable: true,
    tradeable: true,
    sellPrice: 10000,
    obtainMethod: '炼器炼制（需三焰扇图纸）'
  },

  // 七焰扇（天品装备）
  seven_flame_fan: {
    id: 'seven_flame_fan',
    name: '七焰扇',
    type: 'equipment',
    quality: 'legendary',
    description:
      '上古火系至宝，七种异火凝聚而成，威力惊天。扇面七焰交织，每一焰皆有毁天灭地之能。火灵根修士持之，可发挥其全部威能。战力+35,000，火灵根共鸣+50%伤害。',
    icon: 'Flame',
    stackable: false,
    maxStack: 1,
    usable: true,
    tradeable: true,
    sellPrice: 100000,
    obtainMethod: '炼器炼制（需七焰扇图纸、三焰扇作为基材）'
  },

  // 三焰扇图纸
  recipe_three_flame_fan: {
    id: 'recipe_three_flame_fan',
    name: '三焰扇图纸',
    type: 'recipe',
    quality: 'epic',
    description: '记载三焰扇炼制方法的古老图纸，需结丹期以上修为方可尝试炼制。使用后永久掌握三焰扇炼制配方。',
    icon: 'BookOpen',
    stackable: false,
    maxStack: 1,
    usable: true,
    useEffect: { type: 'learn_recipe', value: 1, description: '学习三焰扇炼制配方' },
    recipeId: 'three_flame_fan',
    tradeable: true,
    sellPrice: 5000,
    obtainMethod: '南陇侯交易（.交换 功法，极低概率刷出，需筑基期以上偶遇）'
  },

  // 七焰扇图纸
  recipe_seven_flame_fan: {
    id: 'recipe_seven_flame_fan',
    name: '七焰扇图纸',
    type: 'recipe',
    quality: 'legendary',
    description: '记载上古至宝七焰扇炼制方法的残破图纸，需元婴期以上修为方可尝试炼制。使用后永久掌握七焰扇炼制配方。',
    icon: 'BookOpen',
    stackable: false,
    maxStack: 1,
    usable: true,
    useEffect: { type: 'learn_recipe', value: 1, description: '学习七焰扇炼制配方' },
    recipeId: 'seven_flame_fan',
    tradeable: true,
    sellPrice: 50000,
    obtainMethod: '探寻裂缝（化神期 .探寻裂缝，击败时空异兽后概率掉落）'
  }
}

// ========== 工具函数 ==========

/**
 * 获取物品模板
 */
export function getItemTemplate(itemId: string): ItemTemplate | undefined {
  return ITEMS[itemId]
}

/**
 * 获取品质颜色
 */
export function getItemQualityColor(quality: ItemQuality): string {
  return ITEM_QUALITY_CONFIG[quality]?.color || '#9d9d9d'
}

/**
 * 获取品质名称
 */
export function getItemQualityName(quality: ItemQuality): string {
  return ITEM_QUALITY_CONFIG[quality]?.name || '未知'
}

/**
 * 获取类型名称
 */
export function getItemTypeName(type: ItemType): string {
  return ITEM_TYPE_CONFIG[type]?.name || '未知'
}

/**
 * 检查物品是否可使用
 */
export function canUseItem(template: ItemTemplate, realmTier: number): { canUse: boolean; reason?: string } {
  if (!template.usable) {
    return { canUse: false, reason: '该物品不可使用' }
  }

  if (template.useCondition) {
    if (template.useCondition.minRealm !== undefined && realmTier < template.useCondition.minRealm) {
      return { canUse: false, reason: '境界不足' }
    }
    if (template.useCondition.maxRealm !== undefined && realmTier > template.useCondition.maxRealm) {
      return { canUse: false, reason: '境界过高，该物品对你已无效果' }
    }
  }

  return { canUse: true }
}

/**
 * 获取所有物品ID列表
 */
export function getAllItemIds(): string[] {
  return Object.keys(ITEMS)
}

/**
 * 按类型获取物品列表
 */
export function getItemsByType(type: ItemType): ItemTemplate[] {
  return Object.values(ITEMS).filter(item => item.type === type)
}

/**
 * 按品质获取物品列表
 */
export function getItemsByQuality(quality: ItemQuality): ItemTemplate[] {
  return Object.values(ITEMS).filter(item => item.quality === quality)
}
