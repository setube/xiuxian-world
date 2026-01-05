import { Request, Response, NextFunction } from 'express'
import { tribulationService } from '../services/tribulation.service'
import { cultivationService } from '../services/cultivation.service'
import { playerService } from '../services/player.service'
import { R } from '../utils/response'
import { ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'

/**
 * 渡劫控制器
 * 处理渡劫相关的请求
 */
class TribulationController {
  /**
   * 获取渡劫状态
   * GET /api/tribulation/status
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const status = await tribulationService.getTribulationStatus(characterId)
      R.success(res, status, '获取渡劫状态成功')
    } catch (error) {
      next(error)
    }
  }

  /**
   * 尝试筑基之劫
   * POST /api/tribulation/foundation
   */
  async attemptFoundation(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await tribulationService.attemptFoundationTribulation(characterId)
      R.success(res, result, result.message)
    } catch (error) {
      next(error)
    }
  }

  /**
   * 尝试结丹之劫
   * POST /api/tribulation/core-formation
   */
  async attemptCoreFormation(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await tribulationService.attemptCoreFormationTribulation(characterId)

      if (result.characterDied) {
        // 角色已死亡，返回特殊响应
        R.success(res, result, result.message)
      } else {
        R.success(res, result, result.message)
      }
    } catch (error) {
      next(error)
    }
  }

  /**
   * 尝试元婴之劫
   * POST /api/tribulation/nascent-soul
   */
  async attemptNascentSoul(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await tribulationService.attemptNascentSoulTribulation(characterId)

      if (result.characterDied) {
        // 角色已死亡，返回特殊响应
        R.success(res, result, result.message)
      } else {
        R.success(res, result, result.message)
      }
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取渡劫记录
   * GET /api/tribulation/records
   * Query: { limit?: number }
   */
  async getRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        throw ApiError.business(ERROR_CODES.AUTH_TOKEN_INVALID, '未登录')
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)
      const records = await tribulationService.getRecords({ userId, limit })

      R.success(
        res,
        {
          records: records.map((r) => ({
            id: r.id,
            characterName: r.characterName,
            tribulationType: r.tribulationType,
            success: r.success,
            originalRealmName: r.originalRealmName,
            rolledBack: r.rolledBack,
            attemptedAt: Number(r.attemptedAt),
          })),
        },
        '获取渡劫记录成功'
      )
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取南宫婉奇遇状态
   * GET /api/tribulation/nangong-wan/status
   */
  async getNangongWanStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const status = await cultivationService.getNangongWanStatus(characterId)
      R.success(res, status, '获取南宫婉奇遇状态成功')
    } catch (error) {
      next(error)
    }
  }

  /**
   * 管理员天机回溯
   * POST /api/tribulation/admin/rollback/:recordId
   */
  async adminRollback(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        throw ApiError.business(ERROR_CODES.AUTH_TOKEN_INVALID, '未登录')
      }

      const { recordId } = req.params
      if (!recordId) {
        throw ApiError.validation({ recordId: '记录ID不能为空' })
      }

      const result = await tribulationService.rollbackTribulation(recordId, userId)
      R.success(res, result, result.message)
    } catch (error) {
      next(error)
    }
  }

  /**
   * 管理员获取可回溯的失败记录
   * GET /api/tribulation/admin/failed-records
   * Query: { limit?: number }
   */
  async adminGetFailedRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)
      const records = await tribulationService.getFailedRecordsForRollback(limit)

      R.success(
        res,
        {
          records: records.map((r) => ({
            id: r.id,
            characterName: r.characterName,
            userId: r.userId,
            tribulationType: r.tribulationType,
            originalRealmName: r.originalRealmName,
            attemptedAt: Number(r.attemptedAt),
            canRollback: true,
          })),
        },
        '获取失败记录成功'
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

export const tribulationController = new TribulationController()
