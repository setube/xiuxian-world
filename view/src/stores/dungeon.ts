import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dungeonApi } from '@/api'

// ========== 类型定义 ==========

// 副本职业
export type DungeonRole = 'pj' | 'ys' | 'ly' | 'zs' | 'yr'

// 职业信息
export const DUNGEON_ROLES: Record<DungeonRole, { name: string; description: string; color: string }> = {
  pj: { name: '破军', description: 'DPS核心，金系雷系神通攻伐无双', color: '#faad14' },
  ys: { name: '御山', description: '坦克，土系功法御敌护友', color: '#d48806' },
  ly: { name: '灵医', description: '治疗，木水系灵根可调动生机', color: '#52c41a' },
  zs: { name: '咒师', description: 'DPS/Debuff，火系功法焚天灭敌', color: '#f5222d' },
  yr: { name: '影刃', description: '控制/DPS，风冰系神通迅捷难挡', color: '#13c2c2' }
}

// 灵根到职业的映射
export const SPIRIT_ROOT_TO_ROLE: Record<string, DungeonRole> = {
  metal_pure: 'pj',
  thunder: 'pj',
  metal_water: 'pj',
  earth_pure: 'ys',
  earth_metal: 'ys',
  fire_earth: 'ys',
  wood_pure: 'ly',
  water_pure: 'ly',
  water_wood: 'ly',
  fire_pure: 'zs',
  wood_fire: 'zs',
  wind: 'yr',
  ice: 'yr',
  metal_water_wood: 'pj',
  wood_fire_earth: 'zs',
  water_fire_metal: 'pj',
  four_elements: 'zs',
  five_elements: 'zs',
  mortal_root: 'zs'
}

// 房间状态
export type RoomStatus = 'waiting' | 'in_progress' | 'completed' | 'failed' | 'disbanded'

// 团队成员
export interface DungeonMember {
  characterId: string
  name: string
  role: DungeonRole
  power: number
  spiritRoot: string
  realmId: number
  realmName?: string
}

// 关卡结果
export interface StageResult {
  stage: number
  stageName: string
  success: boolean
  events: string[]
  bonuses: string[]
  timestamp: number
}

// 副本房间
export interface DungeonRoom {
  id: string
  leaderId: string
  leaderName: string
  dungeonType: string
  dungeonName: string
  status: RoomStatus
  currentStage: number
  members: DungeonMember[]
  selectedPath?: 'ice' | 'fire'
  stageResults: StageResult[]
  rewards?: DungeonRewards
  createdAt: string
  startedAt?: string
  completedAt?: string
}

// 副本奖励
export interface DungeonRewards {
  exp: number
  sectContribution: number
  xutianDingFragment: boolean // 是否获得虚天鼎残片
  items: { itemId: string; name: string; quantity: number }[]
}

// 副本历史记录
export interface DungeonHistoryRecord {
  id: string
  dungeonType: string
  dungeonName: string
  result: 'success' | 'failed'
  failedAtStage?: number
  rewards?: DungeonRewards
  clearedAt: string
}

// 玩家副本状态
export interface DungeonStatus {
  inRoom: boolean
  currentRoomId?: string
  xutianMapCount: number
  xutianDingFragments: number
  hasFirstClearThisWeek: boolean
}

// ========== Store ==========

export const useDungeonStore = defineStore('dungeon', () => {
  // 状态
  const rooms = ref<DungeonRoom[]>([])
  const currentRoom = ref<DungeonRoom | null>(null)
  const status = ref<DungeonStatus | null>(null)
  const history = ref<DungeonHistoryRecord[]>([])
  const loading = ref(false)
  const actionLoading = ref(false)

  // 计算属性
  const isInRoom = computed(() => status.value?.inRoom ?? false)
  const canCreateRoom = computed(() => {
    if (!status.value) return false
    return !status.value.inRoom && status.value.xutianMapCount > 0
  })
  const isLeader = computed(() => {
    if (!currentRoom.value || !status.value?.currentRoomId) return false
    const playerId = localStorage.getItem('characterId')
    return currentRoom.value.leaderId === playerId
  })
  const memberCount = computed(() => currentRoom.value?.members?.length ?? 0)
  const isRoomFull = computed(() => memberCount.value >= 5)
  const canStart = computed(() => {
    if (!currentRoom.value || !isLeader.value) return false
    return currentRoom.value.status === 'waiting' && isRoomFull.value
  })
  const isInProgress = computed(() => currentRoom.value?.status === 'in_progress')
  const isCompleted = computed(() => currentRoom.value?.status === 'completed' || currentRoom.value?.status === 'failed')

  // ==================== 获取数据 ====================

  // 获取房间列表
  const fetchRooms = async () => {
    try {
      const { data } = await dungeonApi.getRooms()
      rooms.value = data.rooms || []
      return data
    } catch {
      rooms.value = []
      return null
    }
  }

  // 获取玩家副本状态
  const fetchStatus = async () => {
    loading.value = true
    try {
      const { data } = await dungeonApi.getStatus()
      status.value = data
      return data
    } finally {
      loading.value = false
    }
  }

  // 获取房间详情
  const fetchRoomDetail = async (roomId: string) => {
    try {
      const { data } = await dungeonApi.getRoomDetail(roomId)
      currentRoom.value = data
      return data
    } catch {
      currentRoom.value = null
      return null
    }
  }

  // 获取副本历史
  const fetchHistory = async (limit?: number) => {
    try {
      const { data } = await dungeonApi.getHistory(limit)
      history.value = data.records || []
      return data
    } catch {
      history.value = []
      return null
    }
  }

  // ==================== 房间管理 ====================

  // 创建房间
  const createRoom = async (dungeonType: string = 'xutian_demon') => {
    actionLoading.value = true
    try {
      const { data } = await dungeonApi.createRoom(dungeonType)
      await Promise.all([fetchStatus(), fetchRooms()])
      if (data.roomId) {
        await fetchRoomDetail(data.roomId)
      }
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // 加入房间
  const joinRoom = async (roomId: string) => {
    actionLoading.value = true
    try {
      const { data } = await dungeonApi.joinRoom(roomId)
      await Promise.all([fetchStatus(), fetchRooms()])
      await fetchRoomDetail(roomId)
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // 离开房间
  const leaveRoom = async () => {
    if (!currentRoom.value) return
    actionLoading.value = true
    try {
      const { data } = await dungeonApi.leaveRoom(currentRoom.value.id)
      currentRoom.value = null
      await Promise.all([fetchStatus(), fetchRooms()])
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // 踢出成员
  const kickMember = async (characterId: string) => {
    if (!currentRoom.value) return
    actionLoading.value = true
    try {
      const { data } = await dungeonApi.kickMember(currentRoom.value.id, characterId)
      await fetchRoomDetail(currentRoom.value.id)
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // 解散房间
  const disbandRoom = async () => {
    if (!currentRoom.value) return
    actionLoading.value = true
    try {
      const { data } = await dungeonApi.disbandRoom(currentRoom.value.id)
      currentRoom.value = null
      await Promise.all([fetchStatus(), fetchRooms()])
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // ==================== 副本流程 ====================

  // 开始副本
  const startDungeon = async () => {
    if (!currentRoom.value) return
    actionLoading.value = true
    try {
      const { data } = await dungeonApi.startDungeon(currentRoom.value.id)
      await fetchRoomDetail(currentRoom.value.id)
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // 选择道路
  const selectPath = async (path: 'ice' | 'fire') => {
    if (!currentRoom.value) return
    actionLoading.value = true
    try {
      const { data } = await dungeonApi.selectPath(currentRoom.value.id, path)
      await fetchRoomDetail(currentRoom.value.id)
      return data
    } finally {
      actionLoading.value = false
    }
  }

  // 推进下一关
  const nextStage = async () => {
    if (!currentRoom.value) return
    actionLoading.value = true
    try {
      const { data } = await dungeonApi.nextStage(currentRoom.value.id)
      await fetchRoomDetail(currentRoom.value.id)
      // 如果副本结束，刷新状态和历史
      if (data.dungeonEnded) {
        await Promise.all([fetchStatus(), fetchHistory()])
      }
      return { stageResult: data }
    } finally {
      actionLoading.value = false
    }
  }

  // ==================== 辅助方法 ====================

  // 初始化
  const initialize = async () => {
    await fetchStatus()
    if (status.value?.currentRoomId) {
      await fetchRoomDetail(status.value.currentRoomId)
    }
    await fetchRooms()
  }

  // 清空状态
  const clear = () => {
    rooms.value = []
    currentRoom.value = null
    status.value = null
    history.value = []
  }

  // 获取职业信息
  const getRoleInfo = (role: DungeonRole) => {
    return DUNGEON_ROLES[role] || { name: '未知', description: '', color: '#888' }
  }

  // 根据灵根获取职业
  const getRoleFromSpiritRoot = (spiritRootId: string): DungeonRole => {
    return SPIRIT_ROOT_TO_ROLE[spiritRootId] || 'zs'
  }

  return {
    // 状态
    rooms,
    currentRoom,
    status,
    history,
    loading,
    actionLoading,

    // 计算属性
    isInRoom,
    canCreateRoom,
    isLeader,
    memberCount,
    isRoomFull,
    canStart,
    isInProgress,
    isCompleted,

    // 方法
    fetchRooms,
    fetchStatus,
    fetchRoomDetail,
    fetchHistory,
    createRoom,
    joinRoom,
    leaveRoom,
    kickMember,
    disbandRoom,
    startDungeon,
    selectPath,
    nextStage,
    initialize,
    clear,
    getRoleInfo,
    getRoleFromSpiritRoot
  }
})
