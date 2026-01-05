/**
 * 虚天殿·降魔 副本控制器
 */
import { Request, Response, NextFunction } from 'express'
import { dungeonService } from '../services/dungeon.service'
import { PathChoice } from '../models/DungeonRoom'
import { R, ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'

/**
 * 获取玩家副本状态
 */
export async function getPlayerStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const characterId = req.characterId
    if (!characterId) {
      throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未选择角色')
    }

    const status = await dungeonService.getPlayerStatus(characterId)
    R.success(res, status)
  } catch (error) {
    next(error)
  }
}

/**
 * 获取房间列表
 */
export async function getRoomList(req: Request, res: Response, next: NextFunction) {
  try {
    const rooms = await dungeonService.getRoomList()
    R.success(res, { rooms })
  } catch (error) {
    next(error)
  }
}

/**
 * 获取房间详情
 */
export async function getRoomDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params

    if (!id) {
      throw ApiError.validation({ id: '缺少房间ID' })
    }

    const room = await dungeonService.getRoomDetail(id)
    if (!room) {
      throw ApiError.notFound('房间不存在', ERROR_CODES.DUNGEON_ROOM_NOT_FOUND)
    }

    R.success(res, room)
  } catch (error) {
    next(error)
  }
}

/**
 * 创建房间
 */
export async function createRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const characterId = req.characterId
    if (!characterId) {
      throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未选择角色')
    }

    const { dungeonType } = req.body

    const result = await dungeonService.createRoom(characterId, dungeonType)
    if (!result.success) {
      throw ApiError.business(ERROR_CODES.DUNGEON_ALREADY_IN_ROOM, result.message || '创建失败')
    }

    R.success(res, { roomId: result.roomId }, result.message)
  } catch (error) {
    next(error)
  }
}

/**
 * 加入房间
 */
export async function joinRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const characterId = req.characterId
    if (!characterId) {
      throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未选择角色')
    }

    const { id } = req.params

    if (!id) {
      throw ApiError.validation({ id: '缺少房间ID' })
    }

    const result = await dungeonService.joinRoom(characterId, id)
    if (!result.success) {
      throw ApiError.business(ERROR_CODES.DUNGEON_ROOM_FULL, result.message || '加入失败')
    }

    R.success(res, null, result.message)
  } catch (error) {
    next(error)
  }
}

/**
 * 离开房间
 */
export async function leaveRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const characterId = req.characterId
    if (!characterId) {
      throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未选择角色')
    }

    const result = await dungeonService.leaveRoom(characterId)
    if (!result.success) {
      throw ApiError.business(ERROR_CODES.DUNGEON_NOT_IN_ROOM, result.message || '离开失败')
    }

    R.success(res, null, result.message)
  } catch (error) {
    next(error)
  }
}

/**
 * 踢出成员
 */
export async function kickMember(req: Request, res: Response, next: NextFunction) {
  try {
    const characterId = req.characterId
    if (!characterId) {
      throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未选择角色')
    }

    // 支持 targetId 或 characterId 作为参数名
    const targetId = req.body.targetId || req.body.characterId

    if (!targetId) {
      throw ApiError.validation({ targetId: '缺少目标玩家ID' })
    }

    const result = await dungeonService.kickMember(characterId, targetId)
    if (!result.success) {
      throw ApiError.business(ERROR_CODES.DUNGEON_NOT_LEADER, result.message || '踢出失败')
    }

    R.success(res, null, result.message)
  } catch (error) {
    next(error)
  }
}

/**
 * 解散房间
 */
export async function disbandRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const characterId = req.characterId
    if (!characterId) {
      throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未选择角色')
    }

    const result = await dungeonService.disbandRoom(characterId)
    if (!result.success) {
      throw ApiError.business(ERROR_CODES.DUNGEON_NOT_LEADER, result.message || '解散失败')
    }

    R.success(res, null, result.message)
  } catch (error) {
    next(error)
  }
}

/**
 * 开始副本
 */
export async function startDungeon(req: Request, res: Response, next: NextFunction) {
  try {
    const characterId = req.characterId
    if (!characterId) {
      throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未选择角色')
    }

    const result = await dungeonService.startDungeon(characterId)
    if (!result.success) {
      throw ApiError.business(ERROR_CODES.DUNGEON_NOT_ENOUGH_PLAYERS, result.message || '开始失败')
    }

    R.success(res, null, result.message)
  } catch (error) {
    next(error)
  }
}

/**
 * 选择道路（第二关）
 */
export async function selectPath(req: Request, res: Response, next: NextFunction) {
  try {
    const characterId = req.characterId
    if (!characterId) {
      throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未选择角色')
    }

    const { path } = req.body

    if (!path || !['ice', 'fire'].includes(path)) {
      throw ApiError.business(ERROR_CODES.DUNGEON_INVALID_PATH, '无效的道路选择，请选择 ice 或 fire')
    }

    const result = await dungeonService.selectPath(characterId, path as PathChoice)
    if (!result.success) {
      throw ApiError.business(ERROR_CODES.DUNGEON_PATH_ALREADY_SELECTED, result.message || '选择失败')
    }

    R.success(res, null, result.message)
  } catch (error) {
    next(error)
  }
}

/**
 * 挑战当前关卡 / 推进下一关
 */
export async function challengeStage(req: Request, res: Response, next: NextFunction) {
  try {
    const characterId = req.characterId
    if (!characterId) {
      throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未选择角色')
    }

    const result = await dungeonService.challengeStage(characterId)
    R.success(res, result)
  } catch (error) {
    next(error)
  }
}

/**
 * 获取副本历史
 */
export async function getHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const characterId = req.characterId
    if (!characterId) {
      throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未选择角色')
    }

    const limit = parseInt(req.query.limit as string) || 10

    const records = await dungeonService.getHistory(characterId, limit)
    R.success(res, { records })
  } catch (error) {
    next(error)
  }
}
