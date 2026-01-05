/**
 * 神魂陨落系统常量配置
 * 高风险PvP死亡机制
 */

// ========== 神魂动荡配置 ==========
export const SOUL_TURBULENT_CONFIG = {
  // 触发几率
  sameRealmChance: 0.2, // 同阶击败: 20%几率
  higherRealmChance: 0.5, // 被高阶击败: 50%几率

  // 持续时间
  durationMs: 10 * 60 * 1000, // 10分钟

  // 战力减成
  powerReduction: 0.3 // 战力-30%
}

// ========== 神魂陨落配置 ==========
export const SOUL_COLLAPSE_CONFIG = {
  // 境界跌落
  tierDrop: 1, // 大境界-1
  minTier: 1, // 最低大境界（炼气）
  minSubTier: 1, // 最低小境界（初期）

  // 物品掉落
  materialDropRate: 0.5, // 每种材料50%掉落（向下取整）
  equipmentDropCount: 1, // 随机掉落1件未绑定装备

  // 胜者奖励
  winnerExpMultiplier: 0.1, // 获得败者原境界升级所需修为的10%

  // 道心破碎
  shatteredDurationMs: 24 * 60 * 60 * 1000, // 24小时
  shatteredCultivationPenalty: 0.5 // 闭关收益-50%
}

// ========== 仇敌系统配置 ==========
export const ENEMY_CONFIG = {
  combatBonus: 0.05, // 对仇敌战斗+5%战力
  maxEnemies: 50 // 最多记录50个仇敌
}

// ========== 护道丹配置 ==========
export const SOUL_PROTECTION_PILL_CONFIG = {
  itemId: 'soul_protection_pill',
  // 护道丹保护范围（免除以下惩罚）
  protects: {
    realmDrop: true, // 免除境界跌落
    experienceClear: true, // 免除修为清零
    materialDrop: true, // 免除材料掉落
    equipmentDrop: true // 免除装备掉落
  },
  // 护道丹不保护（仍然生效）
  doesNotProtect: {
    soulShattered: true // 仍会进入道心破碎状态
  }
}

// ========== 公告消息模板 ==========
export const SOUL_COLLAPSE_MESSAGES = {
  // 神魂动荡触发公告
  turbulentAnnouncement: (loserName: string, winnerName: string) => `【神魂动荡】${loserName} 被 ${winnerName} 击败，神魂动荡，命悬一线！`,

  // 神魂陨落公告
  collapseAnnouncement: (loserName: string, winnerName: string, oldTier: string, newTier: string) =>
    `【神魂陨落】${loserName} 再次落败于 ${winnerName}，神魂陨落！境界由 ${oldTier} 跌落至 ${newTier}！`,

  // 护道丹保护公告
  protectedAnnouncement: (loserName: string) => `【护道丹】${loserName} 神魂陨落之际，护道丹自动消耗，保住了境界与修为！`,

  // 掌门急报 - 神魂动荡
  masterAlertTurbulent: (discipleName: string) => `【急报】本门弟子 ${discipleName} 神魂动荡，处境危险！`,

  // 掌门急报 - 神魂陨落
  masterAlertCollapse: (discipleName: string) => `【急报】本门弟子 ${discipleName} 神魂陨落，境界跌落！`
}

// ========== 境界名称映射（用于公告）==========
export const REALM_TIER_NAMES: Record<number, string> = {
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

export const REALM_SUBTIER_NAMES: Record<number, string> = {
  1: '初期',
  2: '中期',
  3: '后期',
  4: '圆满'
}

// 获取完整境界名称
export function getFullRealmName(tier: number, subTier: number): string {
  const tierName = REALM_TIER_NAMES[tier] || '未知境界'
  const subTierName = REALM_SUBTIER_NAMES[subTier] || ''
  return `${tierName}${subTierName}`
}
