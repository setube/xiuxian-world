// 配方系统常量
import type { ItemQuality } from './items'

// 炼制类型
export type RecipeType = 'alchemy' | 'crafting' // 炼丹 | 炼器

// 配方材料
export interface RecipeMaterial {
  itemId: string
  quantity: number
}

// 配方接口
export interface Recipe {
  id: string
  name: string
  type: RecipeType
  quality: ItemQuality
  description: string

  // 炼制产出
  outputItemId: string
  outputQuantity: number // 基础产量
  outputQuantityBonus?: number // 额外产量（随机0~N）

  // 炼制材料
  materials: RecipeMaterial[]

  // 炼制条件
  requirements: {
    minRealm?: number // 最低境界
    sectId?: string // 限定宗门
  }

  // 炼制参数
  successRate: number // 基础成功率 (0-100)
  timeCost: number // 耗时（秒）- 预留
  spiritStoneCost?: number // 灵石消耗

  // 失败惩罚
  failureMaterialLoss?: number // 失败时材料损失比例 (0-100)，默认50
}

// 配方类型配置
export const RECIPE_TYPE_CONFIG: Record<RecipeType, { name: string; icon: string }> = {
  alchemy: { name: '炼丹', icon: 'Flame' },
  crafting: { name: '炼器', icon: 'Sword' }
}

// 配方库
export const RECIPES: Record<string, Recipe> = {
  // ========== 炼丹配方 ==========
  recipe_qi_gathering_pill: {
    id: 'recipe_qi_gathering_pill',
    name: '聚气丹',
    type: 'alchemy',
    quality: 'common',
    description: '炼气期常用丹药，可获得少量修为。',
    outputItemId: 'qi_gathering_pill',
    outputQuantity: 3,
    outputQuantityBonus: 2,
    materials: [{ itemId: 'spirit_herb_common', quantity: 5 }],
    requirements: { minRealm: 1 },
    successRate: 80,
    timeCost: 60,
    failureMaterialLoss: 50
  },

  recipe_spirit_recovery_pill: {
    id: 'recipe_spirit_recovery_pill',
    name: '回灵丹',
    type: 'alchemy',
    quality: 'common',
    description: '恢复灵力的基础丹药。',
    outputItemId: 'spirit_recovery_pill',
    outputQuantity: 5,
    outputQuantityBonus: 3,
    materials: [{ itemId: 'spirit_herb_common', quantity: 3 }],
    requirements: { minRealm: 1 },
    successRate: 85,
    timeCost: 30,
    failureMaterialLoss: 50
  },

  recipe_hp_pill: {
    id: 'recipe_hp_pill',
    name: '疗伤丹',
    type: 'alchemy',
    quality: 'common',
    description: '恢复生命的基础丹药。',
    outputItemId: 'hp_pill',
    outputQuantity: 4,
    outputQuantityBonus: 2,
    materials: [{ itemId: 'spirit_herb_common', quantity: 4 }],
    requirements: { minRealm: 1 },
    successRate: 85,
    timeCost: 45,
    failureMaterialLoss: 50
  },

  recipe_detox_pill: {
    id: 'recipe_detox_pill',
    name: '清毒丹',
    type: 'alchemy',
    quality: 'common',
    description: '清除丹毒的解毒丹药。',
    outputItemId: 'detox_pill',
    outputQuantity: 2,
    outputQuantityBonus: 1,
    materials: [
      { itemId: 'spirit_herb_common', quantity: 3 },
      { itemId: 'spirit_herb_uncommon', quantity: 1 }
    ],
    requirements: { minRealm: 1 },
    successRate: 70,
    timeCost: 90,
    failureMaterialLoss: 50
  },

  recipe_foundation_pill: {
    id: 'recipe_foundation_pill',
    name: '筑基丹',
    type: 'alchemy',
    quality: 'uncommon',
    description: '突破筑基期的珍贵丹药。',
    outputItemId: 'foundation_pill',
    outputQuantity: 1,
    outputQuantityBonus: 1,
    materials: [
      { itemId: 'spirit_herb_uncommon', quantity: 10 },
      { itemId: 'spirit_herb_common', quantity: 20 }
    ],
    requirements: { minRealm: 1 },
    successRate: 50,
    timeCost: 300,
    spiritStoneCost: 50,
    failureMaterialLoss: 70
  },

  // ========== 黑煞教·丹魔之咒配方 ==========

  // 丹魔心萃（黑煞教专属）
  danmo_xinlian: {
    id: 'danmo_xinlian',
    name: '丹魔心萃',
    type: 'alchemy',
    quality: 'epic',
    description: '黑煞教魔道毒丹，蕴含歹毒咒力，可对目标施展【丹魔之咒】。',
    outputItemId: 'danmo_xinlian',
    outputQuantity: 1,
    outputQuantityBonus: 1,
    materials: [
      { itemId: 'yin_soul_silk', quantity: 3 },
      { itemId: 'blood_coagulating_grass', quantity: 5 }
    ],
    requirements: { minRealm: 3, sectId: 'heisha' },
    successRate: 45,
    timeCost: 180,
    spiritStoneCost: 100,
    failureMaterialLoss: 60
  },

  // ========== 黄枫谷·解咒丹药配方 ==========

  // 九转解厄丹（黄枫谷专属）
  jiuzhuan_jie_dan: {
    id: 'jiuzhuan_jie_dan',
    name: '九转解厄丹',
    type: 'alchemy',
    quality: 'legendary',
    description: '黄枫谷丹道长老研制的解毒圣药，可解除丹魔之咒。',
    outputItemId: 'jiuzhuan_jie_dan',
    outputQuantity: 1,
    outputQuantityBonus: 0,
    materials: [
      { itemId: 'spirit_herb_rare', quantity: 5 },
      { itemId: 'spirit_herb_uncommon', quantity: 10 }
    ],
    requirements: { minRealm: 4, sectId: 'huangfeng' },
    successRate: 35,
    timeCost: 300,
    spiritStoneCost: 200,
    failureMaterialLoss: 50
  },

  // ========== 七焰扇炼器配方 ==========

  // 三焰扇（地品火系法宝）
  three_flame_fan: {
    id: 'three_flame_fan',
    name: '三焰扇',
    type: 'crafting',
    quality: 'epic',
    description: '古法炼制的火系法宝仿品，战力+11,800。需集齐赤炼金骨与三种神禽羽翎方可炼制。火灵根可获得成功率加成。',
    outputItemId: 'three_flame_fan',
    outputQuantity: 1,
    outputQuantityBonus: 0,
    materials: [
      { itemId: 'scarlet_refined_bone', quantity: 1 }, // 赤炼金骨（扇骨）- 鬼赌坊·六道轮回盘
      { itemId: 'fire_phoenix_feather', quantity: 1 }, // 火凤之翎 - 万灵宗·万兽渊
      { itemId: 'fire_crane_feather', quantity: 1 }, // 火鹤之羽 - 元婴宗·问道
      { itemId: 'three_legged_crow_feather', quantity: 1 } // 三足乌翎 - 昆吾山副本
    ],
    requirements: { minRealm: 3 },
    successRate: 10,
    timeCost: 600,
    spiritStoneCost: 5000,
    failureMaterialLoss: 100
  },

  // 七焰扇（天品火系至宝）
  seven_flame_fan: {
    id: 'seven_flame_fan',
    name: '七焰扇',
    type: 'crafting',
    quality: 'legendary',
    description:
      '上古火系至宝，战力+35,000。需以三焰扇为基材，另需四种神禽羽翎与鸿蒙紫气。火灵根共鸣可额外增加50%伤害。炼制失败会损失三焰扇。',
    outputItemId: 'seven_flame_fan',
    outputQuantity: 1,
    outputQuantityBonus: 0,
    materials: [
      { itemId: 'three_flame_fan', quantity: 1 }, // 三焰扇（基材）
      { itemId: 'ice_phoenix_feather', quantity: 1 }, // 冰凤之翎 - 虚天殿副本
      { itemId: 'thunder_peng_feather', quantity: 1 }, // 雷鹏之羽 - 星宫·天雷星
      { itemId: 'green_luan_feather', quantity: 1 }, // 青鸾长翎 - 昆吾山·朱果奇遇
      { itemId: 'kunpeng_feather', quantity: 1 }, // 鲲鹏之羽 - 深度闭关
      { itemId: 'primordial_purple_qi', quantity: 1 } // 鸿蒙紫气 - 全服活动/拍卖行
    ],
    requirements: { minRealm: 4 },
    successRate: 5,
    timeCost: 1200,
    spiritStoneCost: 50000,
    failureMaterialLoss: 100
  }
}

// ========== 工具函数 ==========

/**
 * 获取配方
 */
export function getRecipe(recipeId: string): Recipe | undefined {
  return RECIPES[recipeId]
}

/**
 * 获取所有配方
 */
export function getAllRecipes(): Recipe[] {
  return Object.values(RECIPES)
}

/**
 * 按类型获取配方
 */
export function getRecipesByType(type: RecipeType): Recipe[] {
  return Object.values(RECIPES).filter(r => r.type === type)
}

/**
 * 检查是否满足炼制条件
 */
export function checkRecipeRequirements(recipe: Recipe, realmTier: number, sectId?: string | null): { canCraft: boolean; reason?: string } {
  if (recipe.requirements.minRealm && realmTier < recipe.requirements.minRealm) {
    return { canCraft: false, reason: '境界不足' }
  }

  if (recipe.requirements.sectId && recipe.requirements.sectId !== sectId) {
    return { canCraft: false, reason: '非本宗门配方' }
  }

  return { canCraft: true }
}

/**
 * 计算实际成功率（可扩展加成）
 */
export function calculateCraftSuccessRate(baseRate: number, bonuses?: { alchemyBoost?: number; sectBoost?: number }): number {
  let rate = baseRate

  // 炼丹加成（如黄枫谷）
  if (bonuses?.alchemyBoost) {
    rate += bonuses.alchemyBoost
  }

  // 宗门加成
  if (bonuses?.sectBoost) {
    rate += bonuses.sectBoost
  }

  return Math.min(Math.max(rate, 0), 100)
}

/**
 * 计算产出数量
 */
export function calculateOutputQuantity(recipe: Recipe): number {
  const bonus = recipe.outputQuantityBonus ? Math.floor(Math.random() * (recipe.outputQuantityBonus + 1)) : 0
  return recipe.outputQuantity + bonus
}

/**
 * 获取配方类型名称
 */
export function getRecipeTypeName(type: RecipeType): string {
  return RECIPE_TYPE_CONFIG[type]?.name || '未知'
}
