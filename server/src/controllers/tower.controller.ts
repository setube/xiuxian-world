/**
 * 试炼古塔控制器
 */
import { Request, Response, NextFunction } from 'express'
import { towerService } from '../services/tower.service'
import { playerService } from '../services/player.service'
import { R, ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'

class TowerController {
  /**
   * 获取古塔状态
   * GET /api/tower/status
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const status = await towerService.getStatus(characterId)
      R.success(res, status, '获取古塔状态成功')
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 进入古塔（从第一层开始）
   * POST /api/tower/enter
   */
  async enterTower(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await towerService.enterTower(characterId)
      R.success(res, result, result.message)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 继续闯塔
   * POST /api/tower/continue
   */
  async continueTower(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await towerService.continueTower(characterId)
      R.success(res, result, result.message)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 退出古塔
   * POST /api/tower/exit
   */
  async exitTower(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await towerService.exitTower(characterId)
      R.success(res, result, result.message)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 重置古塔
   * POST /api/tower/reset
   */
  async resetTower(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await towerService.resetTower(characterId)
      R.success(res, result, result.message)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 获取琉璃塔榜
   * GET /api/tower/ranking
   */
  async getRanking(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 100)
      const offset = Number(req.query.offset) || 0

      const result = await towerService.getRanking(limit, offset)
      // 前端期望直接返回数组
      R.success(res, result.rankings, '获取排行榜成功')
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 获取全服首杀记录
   * GET /api/tower/server-firsts
   */
  async getServerFirsts(req: Request, res: Response, next: NextFunction) {
    try {
      const firsts = await towerService.getServerFirsts()
      R.success(res, firsts, '获取全服首杀记录成功')
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

  /**
   * 处理服务层错误
   */
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
}

export const towerController = new TowerController()
