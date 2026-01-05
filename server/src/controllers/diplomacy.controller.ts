/**
 * 宗门外交控制器
 */
import { Request, Response, NextFunction } from 'express'
import { diplomacyService } from '../services/diplomacy.service'
import { sectMasterService } from '../services/sectMaster.service'
import { playerService } from '../services/player.service'
import { R, ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'

class DiplomacyController {
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
   * 获取外交状态
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const status = await diplomacyService.getDiplomacyStatus(characterId)
      R.success(res, status)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 获取掌门信息
   */
  async getMaster(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const masterInfo = await sectMasterService.getMasterByCharacter(characterId)
      R.success(res, masterInfo)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 获取所有宗门掌门列表
   */
  async getAllMasters(req: Request, res: Response, next: NextFunction) {
    try {
      const masters = await sectMasterService.getAllMasters()
      R.success(res, masters)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 设置友好关系
   */
  async setFriendly(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { targetSectId } = req.body
      if (!targetSectId) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请选择目标宗门')
      }

      const result = await diplomacyService.setFriendly(characterId, targetSectId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 设置敌对关系
   */
  async setHostile(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { targetSectId } = req.body
      if (!targetSectId) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请选择目标宗门')
      }

      const result = await diplomacyService.setHostile(characterId, targetSectId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 发起结盟请求
   */
  async proposeAlliance(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { targetSectId } = req.body
      if (!targetSectId) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请选择目标宗门')
      }

      const result = await diplomacyService.proposeAlliance(characterId, targetSectId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 接受结盟请求
   */
  async acceptAlliance(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { fromSectId } = req.body
      if (!fromSectId) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请选择发起宗门')
      }

      const result = await diplomacyService.acceptAlliance(characterId, fromSectId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 解除关系（设为中立）
   */
  async cancelRelation(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { targetSectId } = req.body
      if (!targetSectId) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请选择目标宗门')
      }

      const result = await diplomacyService.cancelRelation(characterId, targetSectId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 获取天下大势（公开查询）
   */
  async getWorldSituation(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await diplomacyService.getWorldSituation()
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }
}

export const diplomacyController = new DiplomacyController()
