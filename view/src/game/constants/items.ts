// 物品系统常量

// 物品类型
export type ItemType =
  | 'consumable'   // 消耗品（丹药等）
  | 'material'     // 材料
  | 'recipe'       // 配方（丹方/图纸）
  | 'equipment'    // 装备（法宝等）
  | 'special'      // 特殊物品
  | 'seed'         // 种子（药园系统）

// 物品品质
export type ItemQuality = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

// 物品使用效果类型
export type ItemEffectType =
  | 'restore_hp'           // 恢复生命
  | 'restore_mp'           // 恢复灵力
  | 'add_experience'       // 增加修为
  | 'add_spirit_stones'    // 增加灵石
  | 'clear_poison'         // 清除丹毒
  | 'breakthrough_boost'   // 突破加成
  | 'learn_recipe'         // 学习配方
  | 'expand_inventory'     // 扩展背包
  | 'buff'                 // 增益效果
  | 'none'                 // 无直接效果

// 物品使用效果
export interface ItemEffect {
  type: ItemEffectType
  value: number
  duration?: number    // 持续时间（毫秒），仅buff类型
  description: string  // 效果描述
}

// 物品使用条件
export interface ItemUseCondition {
  minRealm?: number  // 最低境界
  maxRealm?: number  // 最高境界
}

// 物品模板接口
export interface ItemTemplate {
  id: string
  name: string
  type: ItemType
  quality: ItemQuality
  description: string
  icon?: string        // 图标名

  // 堆叠相关
  stackable: boolean   // 是否可堆叠
  maxStack: number     // 最大堆叠数量

  // 使用相关
  usable: boolean      // 是否可直接使用
  useEffect?: ItemEffect // 使用效果
  useCondition?: ItemUseCondition

  // 配方相关（仅type为recipe时）
  recipeId?: string    // 对应的配方ID

  // 交易相关
  tradeable: boolean   // 是否可赠送/交易
  sellPrice?: number   // 售卖价格（灵石）

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
    icon: 'Coins',
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
