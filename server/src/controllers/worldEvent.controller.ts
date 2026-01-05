import { Request, Response, NextFunction } from 'express'
import { worldEventService } from '../services/worldEvent.service'
import { playerService } from '../services/player.service'
import { R } from '../utils/response'
import { ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'

/**
 * 世界事件控制器
 * 处理天道法则相关的请求
 */
class WorldEventController {
  /**
   * 获取近期世界事件
   * GET /api/world-events/recent
   * Query: { limit?: number }
   */
  async getRecentEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)
      const events = await worldEventService.getRecentEvents(limit)

      R.success(
        res,
        {
          events: events.map((e) => ({
            id: e.id,
            type: e.type,
            effectType: e.effectType,
            targetCharacterName: e.targetCharacterName,
            description: e.description,
            value: e.value,
            itemName: e.itemName,
            triggeredAt: Number(e.triggeredAt),
          })),
        },
        '获取世界事件成功'
      )
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取我的当前buff/debuff
   * GET /api/world-events/my-buffs
   */
  async getMyBuffs(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const buffs = await worldEventService.getCharacterBuffs(characterId)

      R.success(
        res,
        {
          buffs: buffs.map((b) => ({
            type: b.type,
            effectType: b.effectType,
            value: b.value,
            expiresAt: b.expiresAt,
            remainingTime: Math.max(0, b.expiresAt - Date.now()),
          })),
        },
        '获取buff成功'
      )
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取我的世界事件历史
   * GET /api/world-events/my-history
   * Query: { limit?: number }
   */
  async getMyEventHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)
      const events = await worldEventService.getCharacterEvents(characterId, limit)

      R.success(
        res,
        {
          events: events.map((e) => ({
            id: e.id,
            type: e.type,
            effectType: e.effectType,
            description: e.description,
            value: e.value,
            itemName: e.itemName,
            triggeredAt: Number(e.triggeredAt),
          })),
        },
        '获取事件历史成功'
      )
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取修炼效率加成
   * GET /api/world-events/cultivation-multiplier
   */
  async getCultivationMultiplier(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const multiplier = await worldEventService.getCultivationMultiplier(characterId)

      R.success(
        res,
        {
          multiplier,
          bonus: Math.round((multiplier - 1) * 100),
        },
        '获取修炼加成成功'
      )
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取角色ID
   */
  private async getCharacterId(req: Request): Promise<string | null> {
    if (req.user?.characterId) {
      return req.user.characterId
    }
    if (req.user?.userId) {
      const character = await playerService.getCharacterByUserId(req.user.userId)
      return character?.id || null
    }
    return null
  }
}

export const worldEventController = new WorldEventController()
