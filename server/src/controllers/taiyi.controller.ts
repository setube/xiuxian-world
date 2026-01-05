/**
 * 太一门专属系统控制器 - 神识与引道
 */
import { Request, Response, NextFunction } from 'express'
import { taiyiService } from '../services/taiyi.service'
import { playerService } from '../services/player.service'
import { R, ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'
import { ElementType } from '../game/constants/taiyi'

export class TaiyiController {
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

  /**
   * 获取太一门系统状态
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const status = await taiyiService.getStatus(characterId)
      R.success(res, status)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  /**
   * 获取元素列表
   */
  async getElements(_req: Request, res: Response, next: NextFunction) {
    try {
      const elements = taiyiService.getElementList()
      R.success(res, elements)
    } catch (error) {
      next(error)
    }
  }

  /**
   * 使用引道
   */
  async useGuidance(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { element } = req.body
      if (!element) {
        throw ApiError.validation({ element: '请选择元素' }, '请选择一种元素')
      }

      // 验证元素类型
      const validElements: ElementType[] = ['metal', 'wood', 'water', 'fire', 'earth']
      if (!validElements.includes(element)) {
        throw ApiError.business(ERROR_CODES.TAIYI_INVALID_ELEMENT, '无效的元素类型')
      }

      const result = await taiyiService.useGuidance(characterId, element as ElementType)
      R.success(res, result, result.message)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      // 处理服务层抛出的业务错误
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const err = error as { code: number; message: string }
        return next(ApiError.business(err.code, err.message))
      }
      next(error)
    }
  }

  /**
   * 使用神识冲击
   */
  async useConsciousnessStrike(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { targetCharacterId } = req.body
      if (!targetCharacterId) {
        throw ApiError.validation({ targetCharacterId: '请选择目标' }, '请选择目标角色')
      }

      const result = await taiyiService.useConsciousnessStrike(characterId, targetCharacterId)
      R.success(res, result, result.message)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      // 处理服务层抛出的业务错误
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const err = error as { code: number; message: string }
        return next(ApiError.business(err.code, err.message))
      }
      next(error)
    }
  }
}

export const taiyiController = new TaiyiController()
