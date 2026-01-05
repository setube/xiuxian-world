import { Request, Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'
import { lootService } from '../services/loot.service'
import { playerService } from '../services/player.service'
import { R } from '../utils/response'
import { ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'

/**
 * 夺宝控制器
 */
class LootController {
  // 辅助方法：处理服务层错误
  private handleServiceError(error: unknown, next: NextFunction) {
    if (error instanceof ApiError) {
      return next(error)
    }
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const err = error as { code: number; message: string }
      return next(ApiError.business(err.code, err.message))
    }
    next(error)
  }

  /**
   * 获取夺宝状态
   * GET /api/loot/status
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const status = await lootService.getStatus(characterId)
      R.success(res, status, '获取夺宝状态成功')
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 获取可掠夺目标
   * GET /api/loot/targets
   */
  async getTargets(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const limit = parseInt(req.query.limit as string) || 20
      const targets = await lootService.getTargets(characterId, limit)
      R.success(res, targets, '获取掠夺目标成功')
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 执行夺宝
   * POST /api/loot/attack
   */
  async attack(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        throw ApiError.validation(
          errors.array().reduce(
            (acc, err) => {
              if ('path' in err) {
                acc[err.path] = err.msg
              }
              return acc
            },
            {} as Record<string, string>
          )
        )
      }

      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { targetId } = req.body
      const result = await lootService.loot(characterId, targetId)
      R.success(res, result, result.message)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 获取我的掠夺统计
   * GET /api/loot/stats
   */
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const stats = await lootService.getMyLootStats(characterId)
      R.success(res, stats, '获取掠夺统计成功')
    } catch (error) {
      this.handleServiceError(error, next)
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

export const lootController = new LootController()
