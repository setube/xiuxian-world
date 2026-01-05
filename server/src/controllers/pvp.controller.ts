/**
 * PvP战斗控制器 - 简易异步1v1战斗系统
 */
import { Request, Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'
import { pvpService } from '../services/pvp.service'
import { playerService } from '../services/player.service'
import { soulCollapseService } from '../services/soulCollapse.service'
import { R, ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'

class PvpController {
  // 辅助方法：获取角色ID
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
   * 获取PvP状态
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const status = await pvpService.getStatus(characterId)
      R.success(res, status)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 获取可挑战目标列表
   */
  async getTargets(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const limit = parseInt(req.query.limit as string) || 20
      const targets = await pvpService.getTargets(characterId, limit)
      R.success(res, targets)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 发起挑战
   */
  async challenge(req: Request, res: Response, next: NextFunction) {
    try {
      // 验证请求参数
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
      if (!targetId) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请选择挑战目标')
      }

      const result = await pvpService.challenge(characterId, targetId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 获取战斗历史
   */
  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const limit = parseInt(req.query.limit as string) || 20
      const history = await pvpService.getHistory(characterId, limit)
      R.success(res, history)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  // ==================== 神魂陨落系统 ====================

  /**
   * 获取神魂状态（神魂动荡、道心破碎、杀戮值、仇敌列表）
   */
  async getSoulStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const status = await soulCollapseService.getSoulStatus(characterId)
      R.success(res, status)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 获取仇敌列表
   */
  async getEnemies(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const enemies = await soulCollapseService.getEnemies(characterId)
      R.success(res, enemies)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 获取杀戮值
   */
  async getKillCount(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const killCount = await soulCollapseService.getKillCount(characterId)
      R.success(res, { killCount })
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }
}

export const pvpController = new PvpController()
