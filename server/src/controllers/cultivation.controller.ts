import { Request, Response, NextFunction } from 'express'
import { cultivationService } from '../services/cultivation.service'
import { playerService } from '../services/player.service'
import { R, ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'

export class CultivationController {
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

  // 获取修炼状态
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.CULTIVATION_NO_CHARACTER, '未创建角色')
      }

      const status = await cultivationService.getCultivationStatus(characterId)
      R.success(res, status)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  // 开始闭关修炼
  async startCultivation(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.CULTIVATION_NO_CHARACTER, '未创建角色')
      }

      const result = await cultivationService.startCultivation(characterId)
      // 获取最新状态一起返回
      const status = await cultivationService.getCultivationStatus(characterId)
      R.success(
        res,
        {
          result,
          ...status
        },
        '闭关修炼完成'
      )
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('冷却')) {
          return next(ApiError.business(ERROR_CODES.CULTIVATION_COOLDOWN, error.message))
        }
      }
      next(error)
    }
  }

  // 开始深度闭关
  async startDeepCultivation(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.CULTIVATION_NO_CHARACTER, '未创建角色')
      }

      await cultivationService.startDeepCultivation(characterId)
      // 获取最新状态一起返回
      const status = await cultivationService.getCultivationStatus(characterId)
      R.success(res, status, '开始神游太虚')
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('已在深度闭关')) {
          return next(ApiError.business(ERROR_CODES.CULTIVATION_ALREADY_IN_PROGRESS, error.message))
        }
      }
      next(error)
    }
  }

  // 结束深度闭关
  async finishDeepCultivation(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.CULTIVATION_NO_CHARACTER, '未创建角色')
      }

      const { forceExit } = req.body
      const result = await cultivationService.finishDeepCultivation(characterId, forceExit === true)
      // 获取最新状态一起返回
      const status = await cultivationService.getCultivationStatus(characterId)
      R.success(
        res,
        {
          result,
          ...status
        },
        '神游太虚结束'
      )
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('未在深度闭关')) {
          return next(ApiError.business(ERROR_CODES.CULTIVATION_DEEP_NOT_ACTIVE, error.message))
        }
        if (error.message.includes('未满足')) {
          return next(ApiError.business(ERROR_CODES.CULTIVATION_DEEP_NOT_FINISHED, error.message))
        }
      }
      next(error)
    }
  }

  // 切换和平模式
  async togglePeaceMode(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.CULTIVATION_NO_CHARACTER, '未创建角色')
      }

      const peaceMode = await cultivationService.togglePeaceMode(characterId)
      R.success(res, { peaceMode }, peaceMode ? '已开启和平模式' : '已关闭和平模式')
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  // 清除丹毒（使用清灵丹）
  async clearPoison(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.CULTIVATION_NO_CHARACTER, '未创建角色')
      }

      // TODO: 检查是否有清灵丹并扣除

      await cultivationService.clearAllPoison(characterId)
      R.success(res, { cleared: true }, '丹毒已清除')
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  // 处理上线（结算被动修炼）
  async handleOnline(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.CULTIVATION_NO_CHARACTER, '未创建角色')
      }

      const passiveExp = await cultivationService.handleOnline(characterId)
      // 获取最新状态一起返回
      const status = await cultivationService.getCultivationStatus(characterId)
      R.success(
        res,
        {
          passiveExp,
          ...status
        },
        passiveExp > 0 ? `离线收益：${passiveExp} 经验` : '欢迎回来'
      )
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }
}

export const cultivationController = new CultivationController()
