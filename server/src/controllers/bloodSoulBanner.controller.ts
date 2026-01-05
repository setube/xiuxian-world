/**
 * 血魂幡系统控制器 - 黑煞教本命魔宝
 */
import { Request, Response, NextFunction } from 'express'
import { bloodSoulBannerService } from '../services/bloodSoulBanner.service'
import { playerService } from '../services/player.service'
import { R, ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'

class BloodSoulBannerController {
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

  // ==================== 血魂幡管理 ====================

  /**
   * 获取血魂幡状态
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const status = await bloodSoulBannerService.getBannerStatus(characterId)
      R.success(res, status)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 升级血魂幡
   */
  async upgradeBanner(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await bloodSoulBannerService.upgradeBanner(characterId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  // ==================== 煞气池 ====================

  /**
   * 获取煞气池状态
   */
  async getShaPoolStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const status = await bloodSoulBannerService.getShaPoolStatus(characterId)
      R.success(res, status)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 每日献祭
   */
  async dailySacrifice(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await bloodSoulBannerService.dailySacrifice(characterId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 化功为煞
   */
  async convertCultivation(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { amount } = req.body
      if (!amount || amount <= 0) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请输入有效的修为数量')
      }

      const result = await bloodSoulBannerService.convertCultivation(characterId, amount)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  // ==================== 魂魄储备 ====================

  /**
   * 获取魂魄储备
   */
  async getSoulStorage(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const storage = await bloodSoulBannerService.getSoulStorage(characterId)
      R.success(res, storage)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  // ==================== 炼化槽 ====================

  /**
   * 获取炼化槽列表
   */
  async getRefinementSlots(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const slots = await bloodSoulBannerService.getRefinementSlots(characterId)
      R.success(res, slots)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 囚禁魂魄（开始炼化）
   */
  async startRefinement(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { slotIndex, soulType } = req.body
      if (slotIndex === undefined || slotIndex < 0) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请选择槽位')
      }
      if (!soulType) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请选择魂魄类型')
      }

      const result = await bloodSoulBannerService.startRefinement(characterId, slotIndex, soulType)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 安抚幡灵（维护槽位）
   */
  async maintainSlot(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { slotIndex } = req.body
      if (slotIndex === undefined || slotIndex < 0) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请选择槽位')
      }

      const result = await bloodSoulBannerService.maintainSlot(characterId, slotIndex)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 收取精华（收取炼化产物）
   */
  async collectRefinement(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { slotIndex } = req.body
      if (slotIndex === undefined || slotIndex < 0) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请选择槽位')
      }

      const result = await bloodSoulBannerService.collectRefinement(characterId, slotIndex)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  // ==================== PvE系统 ====================

  /**
   * 获取血洗山林状态
   */
  async getBloodForestStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const status = await bloodSoulBannerService.getBloodForestStatus(characterId)
      R.success(res, status)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 血洗山林
   */
  async raidBloodForest(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await bloodSoulBannerService.raidBloodForest(characterId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 获取召唤魔影状态
   */
  async getShadowSummonStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const status = await bloodSoulBannerService.getShadowSummonStatus(characterId)
      R.success(res, status)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 召唤魔影
   */
  async summonShadow(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await bloodSoulBannerService.summonShadow(characterId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }
}

export const bloodSoulBannerController = new BloodSoulBannerController()
