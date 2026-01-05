/**
 * 万灵宗灵兽养成控制器
 */
import { Request, Response, NextFunction } from 'express'
import { wanlingService } from '../services/wanling.service'
import { playerService } from '../services/player.service'
import { R, ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'

class WanlingController {
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
   * 获取万灵宗状态
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const status = await wanlingService.getStatus(characterId)
      R.success(res, status)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 寻觅灵兽
   */
  async searchBeast(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await wanlingService.searchBeast(characterId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 获取灵兽列表
   */
  async getBeasts(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const beasts = await wanlingService.getBeasts(characterId)
      R.success(res, beasts)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 喂养灵兽
   */
  async feedBeast(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { beastId, foodId } = req.body
      if (!beastId || !foodId) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '参数不完整')
      }

      const result = await wanlingService.feedBeast(characterId, beastId, foodId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 出战灵兽
   */
  async deployBeast(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { beastId } = req.body
      if (!beastId) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请选择灵兽')
      }

      const beast = await wanlingService.deployBeast(characterId, beastId)
      R.success(res, beast)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 收回灵兽
   */
  async recallBeast(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { beastId } = req.body
      if (!beastId) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请选择灵兽')
      }

      const beast = await wanlingService.recallBeast(characterId, beastId)
      R.success(res, beast)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 灵兽休息
   */
  async restBeast(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { beastId } = req.body
      if (!beastId) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请选择灵兽')
      }

      const beast = await wanlingService.restBeast(characterId, beastId)
      R.success(res, beast)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 灵兽改名
   */
  async renameBeast(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { beastId, newName } = req.body
      if (!beastId || !newName) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '参数不完整')
      }

      const beast = await wanlingService.renameBeast(characterId, beastId, newName)
      R.success(res, beast)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 放生灵兽
   */
  async releaseBeast(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { beastId } = req.body
      if (!beastId) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请选择灵兽')
      }

      const result = await wanlingService.releaseBeast(characterId, beastId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 获取偷菜目标
   */
  async getRaidTargets(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const targets = await wanlingService.getRaidTargets(characterId)
      R.success(res, targets)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 灵兽偷菜
   */
  async raidGarden(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { targetId } = req.body
      if (!targetId) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请选择目标')
      }

      const result = await wanlingService.raidGarden(characterId, targetId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 进化灵兽
   */
  async evolveBeast(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { beastId } = req.body
      if (!beastId) {
        throw ApiError.business(ERROR_CODES.VALIDATION_ERROR, '请选择灵兽')
      }

      const result = await wanlingService.evolveBeast(characterId, beastId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 获取偷菜记录
   */
  async getRaidHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const history = await wanlingService.getRaidHistory(characterId)
      R.success(res, history)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 万兽渊探渊（火凤之翎掉落）
   */
  async exploreAbyss(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await wanlingService.exploreAbyss(characterId)
      R.success(res, result)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }
}

export const wanlingController = new WanlingController()
