import { io, Socket } from 'socket.io-client'
import { useWorldEventStore } from '@/stores/worldEvent'
import { useTribulationStore } from '@/stores/tribulation'
import { useDiplomacyStore } from '@/stores/diplomacy'
import { usePlayerStore } from '@/stores/player'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

let socket: Socket | null = null

/**
 * 初始化 Socket 连接
 */
export function initSocket() {
  const token = localStorage.getItem('accessToken')
  if (!token) {
    console.warn('Socket: 未找到认证令牌，无法连接')
    return
  }

  if (socket?.connected) {
    console.log('Socket: 已连接')
    return
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  })

  socket.on('connect', () => {
    console.log('Socket: 连接成功')
    // 通知服务器玩家上线
    socket?.emit('player:online')
  })

  socket.on('disconnect', reason => {
    console.log('Socket: 断开连接', reason)
  })

  socket.on('connect_error', error => {
    console.error('Socket: 连接错误', error.message)
  })

  // 监听世界事件
  socket.on('world:event', (data: { event: any; message: string }) => {
    console.log('收到世界事件:', data)
    const worldEventStore = useWorldEventStore()
    worldEventStore.handleWorldEvent(data)
  })

  // 监听渡劫结果广播
  socket.on('tribulation:result', (data: { characterName: string; type: string; success: boolean; newRealm?: string }) => {
    console.log('收到渡劫结果:', data)
    const tribulationStore = useTribulationStore()
    tribulationStore.handleTribulationBroadcast(data)
  })

  // 监听南宫婉触发（个人）
  socket.on('nangong-wan:trigger', (data: { message: string; duration: number; endTime: number }) => {
    console.log('南宫婉奇遇触发:', data)
    const tribulationStore = useTribulationStore()
    tribulationStore.handleNangongWanTrigger(data)
  })

  // 监听南宫婉结束（个人）
  socket.on('nangong-wan:end', (data: { returnedExp: number; message: string }) => {
    console.log('南宫婉奇遇结束:', data)
    const tribulationStore = useTribulationStore()
    tribulationStore.handleNangongWanEnd(data)
  })

  // 监听修炼被动收益
  socket.on('cultivation:passive', (data: { exp: number }) => {
    console.log('被动修炼收益:', data.exp)
  })

  // 监听结盟请求（掌门专用）
  socket.on('diplomacy:alliance_request', (data: { fromSectId: string; fromSectName: string; expiresAt: number }) => {
    console.log('收到结盟请求:', data)
    const diplomacyStore = useDiplomacyStore()
    diplomacyStore.handleAllianceRequest(data)
  })

  // 监听全服公告（包括外交事件、神魂陨落事件）
  socket.on('world:announcement', (data: { category: string; type: string; message: string; sectIds?: string[]; timestamp: number }) => {
    console.log('收到全服公告:', data)
    // 如果是外交公告，通知diplomacy store
    if (data.category === 'diplomacy') {
      const diplomacyStore = useDiplomacyStore()
      diplomacyStore.handleDiplomacyAnnouncement(data)
    }
    // 神魂陨落相关公告（soul_turbulent, soul_collapse, soul_collapse_protected）
    if (data.category === 'soul_collapse') {
      const worldEventStore = useWorldEventStore()
      worldEventStore.handleWorldEvent({ event: data, message: data.message })
    }
  })

  // ==================== 神魂陨落系统事件 ====================

  // 神魂动荡触发（个人）
  socket.on('soul:turbulent', (data: { winnerId: string; winnerName: string; expiresAt: number; message: string }) => {
    console.log('神魂动荡触发:', data)
    const playerStore = usePlayerStore()
    playerStore.updateSoulStatus({
      turbulent: {
        isActive: true,
        expiresAt: data.expiresAt,
        powerReduction: 0.3
      }
    })
    // 通知世界事件显示
    const worldEventStore = useWorldEventStore()
    worldEventStore.handleWorldEvent({
      event: { type: 'soul_turbulent', category: 'personal' },
      message: data.message
    })
  })

  // 神魂陨落触发（败者）
  socket.on(
    'soul:collapse',
    (data: {
      winnerId: string
      winnerName: string
      oldRealm: string
      newRealm: string
      droppedMaterials: { itemId: string; itemName: string; count: number }[]
      droppedEquipment: { itemId: string; itemName: string } | null
      shatteredExpiresAt: number
      message: string
    }) => {
      console.log('神魂陨落:', data)
      const playerStore = usePlayerStore()
      playerStore.updateSoulStatus({
        turbulent: { isActive: false, expiresAt: null, powerReduction: 0 },
        shattered: {
          isActive: true,
          expiresAt: data.shatteredExpiresAt,
          cultivationPenalty: 0.5
        }
      })
      // 刷新角色数据（境界、修为、背包可能变化）
      playerStore.fetchStats()
      // 显示消息
      const worldEventStore = useWorldEventStore()
      worldEventStore.handleWorldEvent({
        event: { type: 'soul_collapse', category: 'personal' },
        message: data.message
      })
    }
  )

  // 神魂陨落胜利（胜者）
  socket.on(
    'soul:collapse:victory',
    (data: {
      loserId: string
      loserName: string
      expGained: number
      droppedMaterials: { itemId: string; itemName: string; count: number }[]
      droppedEquipment: { itemId: string; itemName: string } | null
      message: string
    }) => {
      console.log('神魂陨落胜利:', data)
      const playerStore = usePlayerStore()
      // 刷新角色数据（修为、背包变化）
      playerStore.fetchStats()
      playerStore.fetchSoulStatus()
      // 显示消息
      const worldEventStore = useWorldEventStore()
      worldEventStore.handleWorldEvent({
        event: { type: 'soul_collapse_victory', category: 'personal' },
        message: data.message
      })
    }
  )

  // 护道丹保护（个人）
  socket.on('soul:protected', (data: { shatteredExpiresAt: number; message: string }) => {
    console.log('护道丹保护:', data)
    const playerStore = usePlayerStore()
    playerStore.updateSoulStatus({
      turbulent: { isActive: false, expiresAt: null, powerReduction: 0 },
      shattered: {
        isActive: true,
        expiresAt: data.shatteredExpiresAt,
        cultivationPenalty: 0.5
      }
    })
    // 显示消息
    const worldEventStore = useWorldEventStore()
    worldEventStore.handleWorldEvent({
      event: { type: 'soul_protected', category: 'personal' },
      message: data.message
    })
  })

  // 掌门急报（弟子危险）
  socket.on(
    'sect:disciple_alert',
    (data: {
      type: 'soul_turbulent' | 'soul_collapse'
      discipleId: string
      discipleName: string
      sectName: string
      message: string
      timestamp: number
    }) => {
      console.log('掌门急报:', data)
      // 显示消息
      const worldEventStore = useWorldEventStore()
      worldEventStore.handleWorldEvent({
        event: { type: 'disciple_alert', category: 'sect', alertType: data.type },
        message: data.message
      })
    }
  )
}

/**
 * 断开 Socket 连接
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
    console.log('Socket: 已主动断开')
  }
}

/**
 * 获取 Socket 实例
 */
export function getSocket(): Socket | null {
  return socket
}

/**
 * 发送消息
 */
export function emitSocket(event: string, data?: unknown) {
  if (socket?.connected) {
    socket.emit(event, data)
  } else {
    console.warn('Socket: 未连接，无法发送消息')
  }
}
