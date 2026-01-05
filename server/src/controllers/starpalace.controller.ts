/**
 * 星宫宗门专属系统控制器 - 道心侍妾、周天星斗大阵、星衍天机、牵星引灵之术
 */
import { Request, Response, NextFunction } from 'express'
import { starPalaceService } from '../services/starpalace.service'
import { playerService } from '../services/player.service'
import { R, ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'
import { STAR_TYPES } from '../game/constants/starpalace'

export class StarPalaceController {
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
   * 获取星宫系统完整状态
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const status = await starPalaceService.getStatus(characterId)
      R.success(res, status)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  // ==================== 侍妾系统 ====================

  /**
   * 获取侍妾状态
   */
  async getConsort(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const consort = await starPalaceService.getConsortStatus(characterId)
      R.success(res, consort)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 每日问安
   */
  async greetConsort(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await starPalaceService.greetConsort(characterId)
      R.success(res, result, result.message)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 赠予侍妾
   */
  async giftConsort(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { amount } = req.body
      if (!amount || amount < 1) {
        throw ApiError.validation({ amount: '请输入有效数量' }, '请输入赠予数量')
      }

      const result = await starPalaceService.giftConsort(characterId, amount)
      R.success(res, result, `赠予成功，好感度+${result.affectionGained}`)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 灵力反哺
   */
  async spiritFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await starPalaceService.spiritFeedback(characterId)
      R.success(res, result, `灵力反哺成功，修炼加成${result.bonus}%`)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 派遣侍妾
   */
  async assignConsort(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { diskIndex } = req.body
      if (diskIndex === undefined || diskIndex < 0) {
        throw ApiError.validation({ diskIndex: '请选择引星盘' }, '请选择引星盘')
      }

      await starPalaceService.assignConsortToDisk(characterId, diskIndex)
      R.success(res, { success: true }, '侍妾派遣成功')
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 召回侍妾
   */
  async recallConsort(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      await starPalaceService.recallConsort(characterId)
      R.success(res, { success: true }, '侍妾已召回')
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  // ==================== 观星台系统 ====================

  /**
   * 获取观星台状态
   */
  async getObservatory(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const observatory = await starPalaceService.getObservatoryStatus(characterId)
      R.success(res, observatory)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 开始凝聚星辰
   */
  async startGathering(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { diskIndex, starType } = req.body
      if (diskIndex === undefined || diskIndex < 0) {
        throw ApiError.validation({ diskIndex: '请选择引星盘' }, '请选择引星盘')
      }
      if (!starType || !STAR_TYPES[starType]) {
        throw ApiError.validation({ starType: '请选择星辰类型' }, '请选择星辰类型')
      }

      const result = await starPalaceService.startGathering(characterId, diskIndex, starType)
      R.success(res, result, '开始凝聚星辰')
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 收集产出
   */
  async collectDisk(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { diskIndex } = req.body
      if (diskIndex === undefined || diskIndex < 0) {
        throw ApiError.validation({ diskIndex: '请选择引星盘' }, '请选择引星盘')
      }

      const result = await starPalaceService.collectDisk(characterId, diskIndex)
      R.success(res, result, `收获${result.quantity}个物品`)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 处理引星盘事件
   */
  async handleDiskEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { diskIndex } = req.body
      if (diskIndex === undefined || diskIndex < 0) {
        throw ApiError.validation({ diskIndex: '请选择引星盘' }, '请选择引星盘')
      }

      const result = await starPalaceService.handleDiskEvent(characterId, diskIndex)
      R.success(res, result, '星辰已安抚')
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 扩展引星盘
   */
  async expandDisks(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await starPalaceService.expandDisks(characterId)
      R.success(res, result, `成功解锁第${result.newCount}个引星盘`)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  // ==================== 周天星斗大阵 ====================

  /**
   * 获取大阵状态
   */
  async getArrayStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const status = await starPalaceService.getArrayStatus(characterId)
      R.success(res, status)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 发起大阵
   */
  async initiateArray(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await starPalaceService.initiateArray(characterId)
      R.success(res, result, '周天星斗大阵已启动！')
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 加入大阵
   */
  async joinArray(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { arrayId } = req.body
      if (!arrayId) {
        throw ApiError.validation({ arrayId: '请选择大阵' }, '请选择要加入的大阵')
      }

      const result = await starPalaceService.joinArray(characterId, arrayId)
      R.success(res, result, '成功加入大阵！')
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  // ==================== 星衍天机 ====================

  /**
   * 获取观星状态
   */
  async getStargazeStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const status = await starPalaceService.getStargazeStatus(characterId)
      R.success(res, status)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 进行观星
   */
  async stargaze(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await starPalaceService.stargaze(characterId)
      R.success(res, result, `观星结果：${result.result.name} - ${result.result.description}`)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }

  /**
   * 改换星移
   */
  async changeFate(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await starPalaceService.changeFate(characterId)
      R.success(res, result, `命运已改变：${result.oldResult} → ${result.newResult.name}`)
    } catch (error) {
      this.handleServiceError(error, next)
    }
  }
}

export const starPalaceController = new StarPalaceController()
