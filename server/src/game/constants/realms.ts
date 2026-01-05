// 境界常量定义
export const REALM_TIERS = [
  { tier: 1, name: '炼气期', subTiers: ['初期', '中期', '后期', '圆满'] },
  { tier: 2, name: '筑基期', subTiers: ['初期', '中期', '后期', '圆满'] },
  { tier: 3, name: '结丹期', subTiers: ['初期', '中期', '后期', '圆满'] },
  { tier: 4, name: '元婴期', subTiers: ['初期', '中期', '后期', '圆满'] },
  { tier: 5, name: '化神期', subTiers: ['初期', '中期', '后期', '圆满'] },
  { tier: 6, name: '炼虚期', subTiers: ['初期', '中期', '后期', '圆满'] },
  { tier: 7, name: '合体期', subTiers: ['初期', '中期', '后期', '圆满'] },
  { tier: 8, name: '大乘期', subTiers: ['初期', '中期', '后期', '圆满'] },
  { tier: 9, name: '渡劫期', subTiers: ['初期', '中期', '后期', '圆满'] }
] as const

// 境界配置
export interface RealmConfig {
  tier: number
  subTier: number
  name: string
  requiredExperience: number
  breakthroughDifficulty: number
  hpBonus: number
  mpBonus: number
  attackBonus: number
  defenseBonus: number
}

// 生成所有境界配置
export function generateRealmConfigs(): RealmConfig[] {
  const configs: RealmConfig[] = []

  for (const tier of REALM_TIERS) {
    for (let subTier = 1; subTier <= 4; subTier++) {
      const tierMultiplier = Math.pow(3, tier.tier - 1)
      const subTierMultiplier = Math.pow(1.5, subTier - 1)

      configs.push({
        tier: tier.tier,
        subTier,
        name: `${tier.name}${tier.subTiers[subTier - 1]}`,
        requiredExperience: Math.floor(100 * tierMultiplier * subTierMultiplier),
        breakthroughDifficulty: Math.min(95, 10 + tier.tier * 8 + subTier * 2),
        hpBonus: (tier.tier - 1) * 100 + (subTier - 1) * 25,
        mpBonus: (tier.tier - 1) * 50 + (subTier - 1) * 12,
        attackBonus: (tier.tier - 1) * 20 + (subTier - 1) * 5,
        defenseBonus: (tier.tier - 1) * 15 + (subTier - 1) * 3
      })
    }
  }

  return configs
}

// 获取下一个境界
export function getNextRealm(currentTier: number, currentSubTier: number): { tier: number; subTier: number } | null {
  if (currentSubTier < 4) {
    return { tier: currentTier, subTier: currentSubTier + 1 }
  }
  if (currentTier < 9) {
    return { tier: currentTier + 1, subTier: 1 }
  }
  return null // 已达最高境界
}

// 获取境界显示名称
export function getRealmDisplayName(tier: number, subTier: number): string {
  const tierConfig = REALM_TIERS.find(t => t.tier === tier)
  if (!tierConfig) return '未知境界'
  return `${tierConfig.name}${tierConfig.subTiers[subTier - 1]}`
}
