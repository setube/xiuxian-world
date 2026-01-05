/**
 * 黑煞教魔道禁术控制器 - 夺舍魔功、魔染红尘、煞气淬体、丹魔之咒
 */
import { Request, Response, NextFunction } from 'express'
import { heishaService } from '../services/heisha.service'
import { curseService } from '../services/curse.service'
import { playerService } from '../services/player.service'
import { R, ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'

class HeishaController {
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
   * 获取魔道禁术系统完整状态
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const status = await heishaService.getStatus(characterId)
      R.success(res, status)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 检查是否被奴役
   */
  async checkEnslaved(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await heishaService.checkEnslaved(characterId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  // ==================== 傀儡系统 ====================

  /**
   * 获取傀儡列表
   */
  async getPuppets(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const puppets = await heishaService.getPuppets(characterId)
      R.success(res, puppets)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 发动夺舍
   */
  async soulSeize(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { targetId } = req.body
      if (!targetId) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请选择目标')
      }

      const result = await heishaService.soulSeize(characterId, targetId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 释放傀儡
   */
  async releasePuppet(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { puppetId } = req.body
      if (!puppetId) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请选择傀儡')
      }

      await heishaService.releasePuppet(characterId, puppetId)
      R.success(res, { message: '傀儡已释放' })
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  // ==================== 侍妾窃取系统 ====================

  /**
   * 获取窃取的侍妾
   */
  async getStolenConsort(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const stolenConsort = await heishaService.getStolenConsort(characterId)
      R.success(res, stolenConsort)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 窃取侍妾
   */
  async stealConsort(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { targetId } = req.body
      if (!targetId) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请选择目标')
      }

      const result = await heishaService.stealConsort(characterId, targetId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 魔音灌脑
   */
  async brainwash(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await heishaService.brainwash(characterId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 强索元阴
   */
  async extract(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await heishaService.extract(characterId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  // ==================== 丹魔之咒系统 ====================

  /**
   * 获取咒印状态（自身被诅咒状态 + 施咒记录）
   */
  async getCurseStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const [curseStatus, casterRecords] = await Promise.all([
        curseService.getCurseStatus(characterId),
        curseService.getCasterCurseRecords(characterId)
      ])

      R.success(res, {
        cursed: curseStatus,
        castRecords: casterRecords
      })
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 施放丹魔之咒
   */
  async castCurse(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { targetId } = req.body
      if (!targetId) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请选择目标')
      }

      const result = await curseService.castCurse(characterId, targetId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 收割诅咒积累的修为
   */
  async harvestCurse(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { targetId } = req.body
      if (!targetId) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请选择目标')
      }

      const result = await curseService.harvestCurse(characterId, targetId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 使用解咒丹解除自身诅咒
   */
  async removeCurse(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await curseService.removeCurse(characterId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }
}

export const heishaController = new HeishaController()
