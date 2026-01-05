import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { herbGardenApi } from '@/api'
import type { PlotStatus, GardenEventType, HerbSeed } from '@/game/constants/herbGarden'

// 地块信息
export interface PlotInfo {
  plotIndex: number
  plotType: 'normal' | 'elder'
  status: PlotStatus
  seedId: string | null
  seedName: string | null
  plantedAt: number | null
  matureAt: number | null
  growthProgress: number
  remainingTime: string
  eventType: GardenEventType
  eventName: string | null
  eventAction: string | null
  isLocked: boolean
}

// 药园状态
export interface GardenStatus {
  plots: PlotInfo[]
  unlockedNormalPlots: number
  maxNormalPlots: number
  isAlchemyElder: boolean
  canExpand: boolean
  expansionCost: number
  canBecomeElder: { can: boolean; reason?: string }
}

// 种子（带拥有数量）
export interface SeedWithOwned extends HerbSeed {
  owned: number
}

// 探索状态
export interface ExploreStatus {
  inCombat: boolean
  combat?: {
    monster: { name: string; currentHp: number; maxHp: number }
    playerHp: number
    round: number
  }
  remainingToday: number
}

// 战斗结果
export interface CombatResult {
  success: boolean
  action: 'attack' | 'flee'
  message: string
  combatEnded: boolean
  victory?: boolean
  playerHp: number
  monsterHp: number
  playerDamage?: number
  monsterDamage?: number
  round: number
  rewards?: {
    spiritStones: number
    items: { itemId: string; itemName: string; quantity: number }[]
  }
}

export const useHerbGardenStore = defineStore('herbGarden', () => {
  // 状态
  const garden = ref<GardenStatus | null>(null)
  const seeds = ref<SeedWithOwned[]>([])
  const exploreStatus = ref<ExploreStatus | null>(null)
  const loading = ref(false)
  const actionLoading = ref(false)

  // 计算属性
  const plots = computed(() => garden.value?.plots || [])
  const normalPlots = computed(() => plots.value.filter(p => p.plotType === 'normal'))
  const elderPlots = computed(() => plots.value.filter(p => p.plotType === 'elder'))
  const unlockedPlots = computed(() => plots.value.filter(p => !p.isLocked))
  const emptyPlots = computed(() => unlockedPlots.value.filter(p => p.status === 'empty'))
  const maturePlots = computed(() => unlockedPlots.value.filter(p => p.status === 'mature'))
  const plotsWithEvents = computed(() => unlockedPlots.value.filter(p => p.eventType !== 'none'))

  const isAlchemyElder = computed(() => garden.value?.isAlchemyElder || false)
  const canExpand = computed(() => garden.value?.canExpand || false)
  const expansionCost = computed(() => garden.value?.expansionCost || 0)

  const inCombat = computed(() => exploreStatus.value?.inCombat || false)
  const remainingExploreToday = computed(() => exploreStatus.value?.remainingToday || 0)

  // ==================== 获取数据 ====================

  // 获取药园状态
  const fetchGarden = async () => {
    loading.value = true
    try {
      const { data } = await herbGardenApi.getGarden()
      garden.value = data
      return data
    } finally {
      loading.value = false
    }
  }

  // 获取可用种子
  const fetchSeeds = async () => {
    try {
      const { data } = await herbGardenApi.getSeeds()
      seeds.value = data.seeds || []
      return data.seeds
    } catch {
      return []
    }
  }

  // 获取探索状态
  const fetchExploreStatus = async () => {
    try {
      const { data } = await herbGardenApi.getExploreStatus()
      exploreStatus.value = data
      return data
    } catch {
      return null
    }
  }

  // ==================== 种植操作 ====================

  // 播种
  const plant = async (plotIndex: number, seedId: string) => {
    actionLoading.value = true
    try {
      const { data } = await herbGardenApi.plant(plotIndex, seedId)
      // 刷新数据
      await Promise.all([fetchGarden(), fetchSeeds()])
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // 采收
  const harvest = async (plotIndex: number) => {
    actionLoading.value = true
    try {
      const { data } = await herbGardenApi.harvest(plotIndex)
      // 刷新药园
      await fetchGarden()
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // 处理事件
  const handleEvent = async (plotIndex: number, action: 'weed' | 'pesticide' | 'water') => {
    actionLoading.value = true
    try {
      const { data } = await herbGardenApi.handleEvent(plotIndex, action)
      // 刷新药园
      await fetchGarden()
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // ==================== 扩展操作 ====================

  // 扩建药园
  const expandGarden = async () => {
    actionLoading.value = true
    try {
      const { data } = await herbGardenApi.expand()
      await fetchGarden()
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // 晋升丹道长老
  const becomeElder = async () => {
    actionLoading.value = true
    try {
      const { data } = await herbGardenApi.becomeElder()
      await fetchGarden()
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // ==================== 洞天寻宝 ====================

  // 开始探索
  const startExplore = async (plotIndex: number) => {
    actionLoading.value = true
    try {
      const { data } = await herbGardenApi.startExplore(plotIndex)
      // 如果进入战斗，更新状态
      if (data.combat?.inCombat) {
        exploreStatus.value = {
          inCombat: true,
          combat: {
            monster: {
              name: data.combat.monster.name,
              currentHp: data.combat.monsterHp,
              maxHp: data.combat.monster.hp
            },
            playerHp: data.combat.playerHp,
            round: data.combat.round
          },
          remainingToday: (exploreStatus.value?.remainingToday || 3) - 1
        }
      } else {
        await fetchExploreStatus()
      }
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // 战斗行动
  const combat = async (action: 'attack' | 'flee'): Promise<CombatResult> => {
    actionLoading.value = true
    try {
      const { data } = await herbGardenApi.combat(action)

      // 更新探索状态
      if (data.combatEnded) {
        exploreStatus.value = {
          inCombat: false,
          remainingToday: exploreStatus.value?.remainingToday || 0
        }
      } else if (exploreStatus.value?.combat) {
        exploreStatus.value.combat = {
          ...exploreStatus.value.combat,
          monster: {
            ...exploreStatus.value.combat.monster,
            currentHp: data.monsterHp
          },
          playerHp: data.playerHp,
          round: data.round
        }
      }

      return data
    } finally {
      actionLoading.value = false
    }
  }

  // ==================== 辅助方法 ====================

  // 获取地块
  const getPlot = (plotIndex: number): PlotInfo | undefined => {
    return plots.value.find(p => p.plotIndex === plotIndex)
  }

  // 清空状态
  const clear = () => {
    garden.value = null
    seeds.value = []
    exploreStatus.value = null
  }

  return {
    // 状态
    garden,
    seeds,
    exploreStatus,
    loading,
    actionLoading,

    // 计算属性
    plots,
    normalPlots,
    elderPlots,
    unlockedPlots,
    emptyPlots,
    maturePlots,
    plotsWithEvents,
    isAlchemyElder,
    canExpand,
    expansionCost,
    inCombat,
    remainingExploreToday,

    // 方法
    fetchGarden,
    fetchSeeds,
    fetchExploreStatus,
    plant,
    harvest,
    handleEvent,
    expandGarden,
    becomeElder,
    startExplore,
    combat,
    getPlot,
    clear
  }
})
