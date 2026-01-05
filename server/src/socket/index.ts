import { Server, Socket } from 'socket.io'
import { verifyToken } from '../utils/jwt'
import { cultivationService } from '../services/cultivation.service'

// 全局io实例（用于在其他地方推送消息）
let ioInstance: Server | null = null

export function getIO(): Server | null {
  return ioInstance
}

export function initializeSocket(io: Server) {
  ioInstance = io
  // 认证中间件
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) {
      return next(new Error('未提供认证令牌'))
    }

    try {
      const payload = verifyToken(token)
      socket.data.userId = payload.userId
      socket.data.characterId = payload.characterId
      next()
    } catch {
      next(new Error('认证失败'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const { userId, characterId } = socket.data
    console.log(`用户连接: ${userId}, 角色: ${characterId}`)

    // 加入个人房间
    if (characterId) {
      socket.join(`player:${characterId}`)
    }

    // 加入世界频道
    socket.join('world')

    // 聊天消息
    socket.on('chat:send', (data: { channel: string; content: string }) => {
      io.to(data.channel).emit('chat:message', {
        characterId,
        content: data.content,
        timestamp: new Date().toISOString()
      })
    })

    // 修炼相关事件
    socket.on('cultivation:start', async () => {
      if (!characterId) return
      try {
        const result = await cultivationService.startCultivation(characterId)
        socket.emit('cultivation:result', result)
      } catch (error) {
        socket.emit('cultivation:error', { message: (error as Error).message })
      }
    })

    socket.on('cultivation:deep:start', async () => {
      if (!characterId) return
      try {
        const result = await cultivationService.startDeepCultivation(characterId)
        socket.emit('cultivation:deep:started', result)
      } catch (error) {
        socket.emit('cultivation:error', { message: (error as Error).message })
      }
    })

    socket.on('cultivation:deep:finish', async (data: { forceExit?: boolean }) => {
      if (!characterId) return
      try {
        const result = await cultivationService.finishDeepCultivation(characterId, data?.forceExit)
        socket.emit('cultivation:deep:result', result)
      } catch (error) {
        socket.emit('cultivation:error', { message: (error as Error).message })
      }
    })

    socket.on('cultivation:status', async () => {
      if (!characterId) return
      try {
        const status = await cultivationService.getCultivationStatus(characterId)
        socket.emit('cultivation:status:update', status)
      } catch (error) {
        socket.emit('cultivation:error', { message: (error as Error).message })
      }
    })

    // 处理上线（被动修炼结算）
    socket.on('player:online', async () => {
      if (!characterId) return
      try {
        const passiveExp = await cultivationService.handleOnline(characterId)
        if (passiveExp > 0) {
          socket.emit('cultivation:passive', { exp: passiveExp })
        }
      } catch (error) {
        console.error('处理上线失败:', error)
      }
    })

    // 断开连接
    socket.on('disconnect', () => {
      console.log(`用户断开: ${userId}`)
    })
  })

  return io
}

// 向特定玩家推送消息
export function emitToPlayer(io: Server, characterId: string, event: string, data: unknown) {
  io.to(`player:${characterId}`).emit(event, data)
}

// 广播世界消息
export function broadcastToWorld(io: Server, event: string, data: unknown) {
  io.to('world').emit(event, data)
}

// ==================== 外交系统消息推送 ====================

// 发送结盟请求通知给目标掌门
export function emitAllianceRequest(
  targetMasterCharacterId: string,
  data: { fromSectId: string; fromSectName: string; expiresAt: number }
) {
  const io = getIO()
  if (!io) return
  io.to(`player:${targetMasterCharacterId}`).emit('diplomacy:alliance_request', data)
}

// 全服公告（外交事件：结盟成功、宣战等）
export function emitDiplomacyAnnouncement(data: {
  type: 'alliance_formed' | 'war_declared' | 'alliance_broken' | 'master_changed'
  message: string
  sectIds?: string[]
  timestamp: number
}) {
  const io = getIO()
  if (!io) return
  io.to('world').emit('world:announcement', {
    category: 'diplomacy',
    ...data
  })
}

// 通知掌门更换
export function emitMasterChanged(data: {
  sectId: string
  sectName: string
  previousMasterId: string | null
  previousMasterName: string | null
  newMasterId: string | null
  newMasterName: string | null
}) {
  const io = getIO()
  if (!io) return

  // 全服公告
  if (data.newMasterName) {
    io.to('world').emit('world:announcement', {
      category: 'diplomacy',
      type: 'master_changed',
      message: `【天机变】${data.sectName}掌门更替，${data.newMasterName}继任掌门之位！`,
      sectIds: [data.sectId],
      timestamp: Date.now()
    })
  }
}

// ==================== 神魂陨落系统消息推送 ====================

// 神魂动荡触发 - 通知个人 + 全服公告
export function emitSoulTurbulent(data: { loserId: string; loserName: string; winnerId: string; winnerName: string; expiresAt: number }) {
  const io = getIO()
  if (!io) return

  // 通知败者本人
  io.to(`player:${data.loserId}`).emit('soul:turbulent', {
    winnerId: data.winnerId,
    winnerName: data.winnerName,
    expiresAt: data.expiresAt,
    message: `你被 ${data.winnerName} 击败，神魂动荡！10分钟内战力-30%，若再次落败将触发神魂陨落！`
  })

  // 全服公告
  io.to('world').emit('world:announcement', {
    category: 'soul_collapse',
    type: 'soul_turbulent',
    message: `【神魂动荡】${data.loserName} 被 ${data.winnerName} 击败，神魂动荡，命悬一线！`,
    timestamp: Date.now()
  })
}

// 神魂陨落触发 - 通知个人 + 全服公告
export function emitSoulCollapse(data: {
  loserId: string
  loserName: string
  winnerId: string
  winnerName: string
  oldRealm: string
  newRealm: string
  droppedMaterials: { itemId: string; itemName: string; count: number }[]
  droppedEquipment: { itemId: string; itemName: string } | null
  expGained: number
  shatteredExpiresAt: number
}) {
  const io = getIO()
  if (!io) return

  // 通知败者本人
  io.to(`player:${data.loserId}`).emit('soul:collapse', {
    winnerId: data.winnerId,
    winnerName: data.winnerName,
    oldRealm: data.oldRealm,
    newRealm: data.newRealm,
    droppedMaterials: data.droppedMaterials,
    droppedEquipment: data.droppedEquipment,
    shatteredExpiresAt: data.shatteredExpiresAt,
    message: `神魂陨落！境界由 ${data.oldRealm} 跌落至 ${data.newRealm}，修为清零，道心破碎24小时！`
  })

  // 通知胜者
  io.to(`player:${data.winnerId}`).emit('soul:collapse:victory', {
    loserId: data.loserId,
    loserName: data.loserName,
    expGained: data.expGained,
    droppedMaterials: data.droppedMaterials,
    droppedEquipment: data.droppedEquipment,
    message: `${data.loserName} 神魂陨落！你获得了修为奖励和掉落物品。`
  })

  // 全服公告
  io.to('world').emit('world:announcement', {
    category: 'soul_collapse',
    type: 'soul_collapse',
    message: `【神魂陨落】${data.loserName} 再次落败于 ${data.winnerName}，神魂陨落！境界由 ${data.oldRealm} 跌落至 ${data.newRealm}！`,
    timestamp: Date.now()
  })
}

// 护道丹保护 - 通知个人 + 全服公告
export function emitSoulCollapseProtected(data: { loserId: string; loserName: string; shatteredExpiresAt: number }) {
  const io = getIO()
  if (!io) return

  // 通知本人
  io.to(`player:${data.loserId}`).emit('soul:protected', {
    shatteredExpiresAt: data.shatteredExpiresAt,
    message: '护道丹自动消耗，保住了境界与修为！但仍进入道心破碎状态24小时。'
  })

  // 全服公告
  io.to('world').emit('world:announcement', {
    category: 'soul_collapse',
    type: 'soul_collapse_protected',
    message: `【护道丹】${data.loserName} 神魂陨落之际，护道丹自动消耗，保住了境界与修为！`,
    timestamp: Date.now()
  })
}

// 掌门急报 - 弟子危险通知
export function emitMasterAlert(data: {
  masterId: string
  discipleId: string
  discipleName: string
  alertType: 'soul_turbulent' | 'soul_collapse'
  sectName: string
}) {
  const io = getIO()
  if (!io) return

  const message =
    data.alertType === 'soul_turbulent'
      ? `【急报】本门弟子 ${data.discipleName} 神魂动荡，处境危险！`
      : `【急报】本门弟子 ${data.discipleName} 神魂陨落，境界跌落！`

  io.to(`player:${data.masterId}`).emit('sect:disciple_alert', {
    type: data.alertType,
    discipleId: data.discipleId,
    discipleName: data.discipleName,
    sectName: data.sectName,
    message,
    timestamp: Date.now()
  })
}
