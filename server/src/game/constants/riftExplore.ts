/**
 * 虚空裂缝探索系统配置
 * 探索神秘的虚空裂缝，获取珍稀资源
 */

// ========== 基础配置 ==========
export const RIFT_EXPLORE_CONFIG = {
  baseCooldownMs: 12 * 60 * 60 * 1000, // 12小时基础冷却
  minRealmId: 3, // 最低要求：筑基后期
  spiritStoneCost: 100 // 每次探索消耗灵石
}

// ========== 探索结果类型 ==========
export type RiftExploreResultType =
  | 'treasure' // 发现宝藏
  | 'spirit_stone' // 灵石矿脉
  | 'cultivation' // 悟道机缘
  | 'danger' // 遭遇危险
  | 'nothing' // 一无所获
  | 'rare_item' // 稀有物品

// ========== 探索结果配置 ==========
export const RIFT_EXPLORE_RESULTS: Record<
  RiftExploreResultType,
  {
    name: string
    description: string
    weight: number // 权重，用于随机
    rewards: {
      spiritStones?: { min: number; max: number }
      cultivation?: { min: number; max: number }
      items?: { itemId: string; name: string; chance: number }[]
      damage?: { min: number; max: number } // 危险时受到的伤害（修为损失）
    }
  }
> = {
  treasure: {
    name: '发现宝藏',
    description: '在裂缝深处发现了一处隐秘宝藏！',
    weight: 15,
    rewards: {
      spiritStones: { min: 500, max: 1500 },
      items: [
        { itemId: 'rift_crystal', name: '裂缝结晶', chance: 0.3 },
        { itemId: 'void_essence', name: '虚空精华', chance: 0.1 }
      ]
    }
  },
  spirit_stone: {
    name: '灵石矿脉',
    description: '意外发现了一处小型灵石矿脉！',
    weight: 25,
    rewards: {
      spiritStones: { min: 300, max: 800 }
    }
  },
  cultivation: {
    name: '悟道机缘',
    description: '在虚空裂缝中感悟到了一丝大道真意！',
    weight: 20,
    rewards: {
      cultivation: { min: 100, max: 500 }
    }
  },
  danger: {
    name: '遭遇危险',
    description: '裂缝中涌出的虚空之力侵蚀了你的修为...',
    weight: 15,
    rewards: {
      damage: { min: 50, max: 200 }
    }
  },
  nothing: {
    name: '一无所获',
    description: '这次探索没有任何发现，裂缝似乎已经枯竭。',
    weight: 20,
    rewards: {}
  },
  rare_item: {
    name: '奇遇',
    description: '在裂缝最深处，你发现了一件神秘之物！',
    weight: 5,
    rewards: {
      items: [
        { itemId: 'void_fragment', name: '虚空碎片', chance: 0.5 },
        { itemId: 'ancient_scroll', name: '上古卷轴', chance: 0.3 },
        { itemId: 'mysterious_egg', name: '神秘蛋', chance: 0.2 }
      ]
    }
  }
}

// ========== 境界加成 ==========
export const REALM_BONUS: Record<number, number> = {
  3: 1.0, // 筑基后期 - 基础
  4: 1.1, // 筑基圆满
  5: 1.2, // 金丹初期
  6: 1.3, // 金丹中期
  7: 1.4, // 金丹后期
  8: 1.5, // 金丹圆满
  9: 1.6, // 元婴初期
  10: 1.7, // 元婴中期
  11: 1.8, // 元婴后期
  12: 1.9 // 元婴圆满
  // 更高境界继续增加...
}

// ========== 辅助函数 ==========

/**
 * 根据权重随机选择探索结果
 */
export function rollExploreResult(): RiftExploreResultType {
  const results = Object.entries(RIFT_EXPLORE_RESULTS)
  const totalWeight = results.reduce((sum, [, config]) => sum + config.weight, 0)

  let random = Math.random() * totalWeight
  for (const [type, config] of results) {
    random -= config.weight
    if (random <= 0) {
      return type as RiftExploreResultType
    }
  }

  return 'nothing' // 默认
}

/**
 * 计算随机数值（带境界加成）
 */
export function calculateRewardValue(min: number, max: number, realmBonus: number): number {
  const base = Math.floor(Math.random() * (max - min + 1)) + min
  return Math.floor(base * realmBonus)
}

/**
 * 检查物品是否掉落
 */
export function checkItemDrop(chance: number): boolean {
  return Math.random() < chance
}

/**
 * 格式化剩余时间
 */
export function formatRemainingTime(ms: number): string {
  if (ms <= 0) return '可探索'

  const hours = Math.floor(ms / (60 * 60 * 1000))
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }
  return `${minutes}分钟`
}
