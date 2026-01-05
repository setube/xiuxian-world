import { Request, Response, NextFunction } from 'express'
import { herbGardenService } from '../services/herbGarden.service'
import { playerService } from '../services/player.service'
import { R, ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'

export class HerbGardenController {
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

  // 获取药园状态
  async getGarden(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await herbGardenService.getGarden(characterId)
      R.success(res, result)
    } catch (error: unknown) {
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

  // 播种
  async plant(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { plotIndex, seedId } = req.body
      if (plotIndex === undefined || plotIndex === null) {
        throw ApiError.validation({ plotIndex: '请指定灵田编号' })
      }
      if (!seedId) {
        throw ApiError.validation({ seedId: '请指定种子' })
      }

      const result = await herbGardenService.plant(characterId, plotIndex, seedId)
      R.success(res, result)
    } catch (error: unknown) {
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

  // 采收
  async harvest(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { plotIndex } = req.body
      if (plotIndex === undefined || plotIndex === null) {
        throw ApiError.validation({ plotIndex: '请指定灵田编号' })
      }

      const result = await herbGardenService.harvest(characterId, plotIndex)
      R.success(res, result)
    } catch (error: unknown) {
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

  // 处理事件
  async handleEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { plotIndex, action } = req.body
      if (plotIndex === undefined || plotIndex === null) {
        throw ApiError.validation({ plotIndex: '请指定灵田编号' })
      }
      if (!action || !['weed', 'pesticide', 'water'].includes(action)) {
        throw ApiError.validation({ action: '无效的处理方式' })
      }

      const result = await herbGardenService.handleEvent(characterId, plotIndex, action)
      R.success(res, result)
    } catch (error: unknown) {
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

  // 扩建药园
  async expand(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await herbGardenService.expandGarden(characterId)
      R.success(res, result)
    } catch (error: unknown) {
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

  // 晋升丹道长老
  async becomeElder(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await herbGardenService.becomeAlchemyElder(characterId)
      R.success(res, result)
    } catch (error: unknown) {
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

  // 开始洞天寻宝
  async startExplore(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { plotIndex } = req.body
      if (plotIndex === undefined || plotIndex === null) {
        throw ApiError.validation({ plotIndex: '请指定灵田编号' })
      }

      const result = await herbGardenService.startExplore(characterId, plotIndex)
      R.success(res, result)
    } catch (error: unknown) {
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

  // 战斗行动
  async combat(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { action } = req.body
      if (!action || !['attack', 'flee'].includes(action)) {
        throw ApiError.validation({ action: '无效的战斗行动' })
      }

      const result = await herbGardenService.combat(characterId, action)
      R.success(res, result)
    } catch (error: unknown) {
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

  // 获取探索状态
  async getExploreStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await herbGardenService.getExploreStatus(characterId)
      R.success(res, result)
    } catch (error: unknown) {
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

  // 获取可用种子列表
  async getSeeds(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await herbGardenService.getAvailableSeeds(characterId)
      R.success(res, result)
    } catch (error: unknown) {
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
}

export const herbGardenController = new HerbGardenController()
