import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { playerApi, pvpApi } from '@/api'
import { SPIRIT_ROOTS, ROOT_TYPE_CONFIG } from '@/game/constants/spiritRoots'

interface Realm {
  id: number
  name: string
  tier: number
  subTier: number
}

interface SectInfo {
  id: string
  name: string
  rank: string
  rankName: string
  contribution: number
}

interface Character {
  id: string
  name: string
  daoName: string
  spiritRootId: string
  level: number
  experience: number
  spiritStones: number
  realm: Realm | null
  realmProgress: number
  sect?: SectInfo | null
}

interface Stats {
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  attack: number
  defense: number
  speed: number
  luck: number
}

interface CultivationState {
  isCultivating: boolean
  startedAt: string | null
  currentSkillId: string | null
}

// ========== 神魂陨落系统 ==========
interface Enemy {
  oderId: string
  killerName: string
  killedAt: number
  killCount: number
}

interface SoulStatus {
  // 神魂动荡
  turbulent: {
    isActive: boolean
    expiresAt: number | null
    powerReduction: number
  }
  // 道心破碎
  shattered: {
    isActive: boolean
    expiresAt: number | null
    cultivationPenalty: number
  }
  // 杀戮值
  killCount: number
  // 仇敌列表
  enemies: Enemy[]
}

export const usePlayerStore = defineStore('player', () => {
  const character = ref<Character | null>(null)
  const stats = ref<Stats | null>(null)
  const cultivation = ref<CultivationState | null>(null)
  const loading = ref(false)

  // 神魂状态
  const soulStatus = ref<SoulStatus | null>(null)

  const displayName = computed(() => character.value?.name || '无名修士')
  const realmDisplay = computed(() => character.value?.realm?.name || '凡人')

  // 获取当前灵根信息
  const spiritRoot = computed(() => {
    const rootId = character.value?.spiritRootId
    return rootId ? SPIRIT_ROOTS[rootId] : null
  })

  // 灵根类型显示
  const rootTypeDisplay = computed(() => {
    if (!spiritRoot.value) return '无'
    return ROOT_TYPE_CONFIG[spiritRoot.value.rootType]?.label || '未知'
  })

  // 战力计算（包含灵根加成）
  const combatPower = computed(() => {
    if (!stats.value) return 0
    // 基础战力
    const basePower = Math.floor(stats.value.attack * 2 + stats.value.defense * 1.5 + stats.value.maxHp * 0.1 + stats.value.maxMp * 0.05)
    // 灵根战力加成
    const rootBonus = spiritRoot.value?.combatPowerBonus || 0
    return Math.floor(basePower * (1 + rootBonus / 100))
  })

  // 基础战力（不含灵根加成，用于显示）
  const baseCombatPower = computed(() => {
    if (!stats.value) return 0
    return Math.floor(stats.value.attack * 2 + stats.value.defense * 1.5 + stats.value.maxHp * 0.1 + stats.value.maxMp * 0.05)
  })

  const fetchProfile = async () => {
    loading.value = true
    try {
      const { data } = await playerApi.getProfile()
      character.value = data.character
      // 保存到localStorage供路由守卫和本地加载使用
      if (data.character?.id) {
        localStorage.setItem('characterId', data.character.id)
      }
      if (data.character?.daoName || data.character?.name) {
        localStorage.setItem('daoName', data.character.daoName || data.character.name)
      }
      if (data.character?.spiritRootId) {
        localStorage.setItem('spiritRootId', data.character.spiritRootId)
      }
    } finally {
      loading.value = false
    }
  }

  const fetchStats = async () => {
    loading.value = true
    try {
      const { data } = await playerApi.getStats()
      character.value = {
        id: data.id || localStorage.getItem('characterId') || '',
        name: data.name || character.value?.name || '',
        daoName: data.name || character.value?.daoName || '',
        spiritRootId: data.spiritRootId || character.value?.spiritRootId || '',
        level: data.level,
        experience: data.experience,
        spiritStones: data.spiritStones,
        realm: data.realm,
        realmProgress: data.realmProgress,
        sect: data.sect || null
      }
      stats.value = data.stats
      cultivation.value = data.cultivation
      // 同步到localStorage
      if (data.name) {
        localStorage.setItem('daoName', data.name)
      }
    } finally {
      loading.value = false
    }
  }

  const createCharacter = async (name: string, spiritRootId?: string) => {
    const { data } = await playerApi.createCharacter({ name, spiritRootId })
    localStorage.setItem('characterId', data.character.id)
    // 保存daoName和spiritRootId供路由守卫和本地加载使用
    localStorage.setItem('daoName', data.character.daoName || data.character.name)
    if (data.character.spiritRootId) {
      localStorage.setItem('spiritRootId', data.character.spiritRootId)
    }
    character.value = {
      id: data.character.id,
      name: data.character.name,
      daoName: data.character.daoName || data.character.name,
      spiritRootId: data.character.spiritRootId || '',
      level: data.character.level || 1,
      experience: data.character.experience || 0,
      spiritStones: data.character.spiritStones || 0,
      realm: data.character.realm || null,
      realmProgress: data.character.realmProgress || 0
    }
    return data
  }

  // 设置角色名（灵根检测前）
  const setCharacterName = async (name: string) => {
    await playerApi.setName(name)
  }

  // 灵根检测并创建角色
  const detectSpiritRoot = async () => {
    const { data } = await playerApi.detectSpiritRoot()
    localStorage.setItem('characterId', data.character.id)
    localStorage.setItem('daoName', data.character.daoName || data.character.name)
    if (data.character.spiritRootId) {
      localStorage.setItem('spiritRootId', data.character.spiritRootId)
    }
    character.value = {
      id: data.character.id,
      name: data.character.name,
      daoName: data.character.daoName || data.character.name,
      spiritRootId: data.character.spiritRootId || '',
      level: data.character.level || 1,
      experience: data.character.experience || 0,
      spiritStones: data.character.spiritStones || 0,
      realm: data.character.realm || null,
      realmProgress: data.character.realmProgress || 0
    }
    return data
  }

  // 检查是否已有角色
  const hasCharacter = () => {
    return !!localStorage.getItem('spiritRootId')
  }

  const updateFromSocket = (data: Partial<Character>) => {
    if (character.value) {
      Object.assign(character.value, data)
    }
  }

  const clear = () => {
    character.value = null
    stats.value = null
    cultivation.value = null
  }

  // 清除角色（角色死亡时调用）
  const clearCharacter = () => {
    character.value = null
    stats.value = null
    cultivation.value = null
    soulStatus.value = null
    localStorage.removeItem('characterId')
    localStorage.removeItem('spiritRootId')
    localStorage.removeItem('daoName')
  }

  // ========== 神魂陨落系统 ==========

  // 获取神魂状态
  const fetchSoulStatus = async () => {
    try {
      const { data } = await pvpApi.getSoulStatus()
      soulStatus.value = data
    } catch {
      // 忽略错误，状态可能在未创建角色时不可用
    }
  }

  // 是否处于神魂动荡状态
  const isSoulTurbulent = computed(() => {
    if (!soulStatus.value?.turbulent) return false
    const { isActive, expiresAt } = soulStatus.value.turbulent
    return isActive && expiresAt && expiresAt > Date.now()
  })

  // 是否处于道心破碎状态
  const isSoulShattered = computed(() => {
    if (!soulStatus.value?.shattered) return false
    const { isActive, expiresAt } = soulStatus.value.shattered
    return isActive && expiresAt && expiresAt > Date.now()
  })

  // 检查某人是否是仇敌
  const isEnemy = (characterId: string) => {
    if (!soulStatus.value?.enemies) return false
    return soulStatus.value.enemies.some(e => e.oderId === characterId)
  }

  // 更新神魂状态（Socket事件触发）
  const updateSoulStatus = (data: Partial<SoulStatus>) => {
    if (soulStatus.value) {
      Object.assign(soulStatus.value, data)
    } else {
      soulStatus.value = data as SoulStatus
    }
  }

  return {
    character,
    stats,
    cultivation,
    loading,
    displayName,
    realmDisplay,
    spiritRoot,
    rootTypeDisplay,
    combatPower,
    baseCombatPower,
    fetchProfile,
    fetchStats,
    createCharacter,
    setCharacterName,
    detectSpiritRoot,
    hasCharacter,
    updateFromSocket,
    clear,
    clearCharacter,
    // 神魂陨落系统
    soulStatus,
    fetchSoulStatus,
    isSoulTurbulent,
    isSoulShattered,
    isEnemy,
    updateSoulStatus
  }
})
