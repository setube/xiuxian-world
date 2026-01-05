import { Request, Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'
import { woodenDummyService } from '../services/woodenDummy.service'
import { playerService } from '../services/player.service'
import { R } from '../utils/response'
import { ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'

/**
 * 木人阁控制器
 * 处理木人傀儡切磋相关的请求
 */
class WoodenDummyController {
  /**
   * 获取木人阁状态
   * GET /api/dummy/status
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const status = await woodenDummyService.getStatus(characterId)
      R.success(res, status, '获取木人阁状态成功')
    } catch (error) {
      next(error)
    }
  }

  /**
   * 挑战木人傀儡
   * POST /api/dummy/challenge
   * Body: { realmTier: number, subTier?: number }
   */
  async challenge(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return R.validationError(res, errors.array())
      }

      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { realmTier, subTier = 2 } = req.body

      const result = await woodenDummyService.challengeDummy(characterId, realmTier, subTier)
      R.success(res, result, result.message)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('冷却')) {
          return next(ApiError.business(ERROR_CODES.BATTLE_DUMMY_COOLDOWN, error.message))
        }
        if (error.message.includes('境界')) {
          return next(ApiError.business(ERROR_CODES.BATTLE_DUMMY_REALM_TOO_HIGH, error.message))
        }
        if (error.message.includes('灵石')) {
          return next(ApiError.business(ERROR_CODES.BATTLE_NOT_ENOUGH_RESOURCES, error.message))
        }
      }
      next(error)
    }
  }

  /**
   * 获取战斗历史
   * GET /api/dummy/history
   * Query: { limit?: number }
   */
  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
      const history = await woodenDummyService.getHistory(characterId, limit)

      R.success(res, history, '获取战斗历史成功')
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

export const woodenDummyController = new WoodenDummyController()
