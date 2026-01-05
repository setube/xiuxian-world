import { Request, Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'
import { formationService } from '../services/formation.service'
import { playerService } from '../services/player.service'
import { R } from '../utils/response'
import { ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'
import { FORMATIONS, FORMATION_TIER_NAMES } from '../game/constants/formations'

/**
 * 阵法控制器
 * 处理洞府防护阵法相关的请求
 */
class FormationController {
  /**
   * 获取阵法状态
   * GET /api/formation/status
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const status = await formationService.getStatus(characterId)
      R.success(res, status, '获取阵法状态成功')
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取所有可学习的阵法
   * GET /api/formation/available
   */
  async getAvailable(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const status = await formationService.getStatus(characterId)
      R.success(res, status.availableFormations, '获取可学习阵法成功')
    } catch (error) {
      next(error)
    }
  }

  /**
   * 学习阵法
   * POST /api/formation/learn
   * Body: { formationId: string }
   */
  async learn(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return R.validationError(res, errors.array())
      }

      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { formationId } = req.body
      const result = await formationService.learnFormation(characterId, formationId)
      R.success(res, result, result.message)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('已学习')) {
          return next(ApiError.business(ERROR_CODES.BATTLE_FORMATION_ALREADY_ACTIVE, error.message))
        }
        if (error.message.includes('需要达到')) {
          return next(ApiError.business(ERROR_CODES.BATTLE_FORMATION_REQUIREMENTS, error.message))
        }
        if (error.message.includes('灵石不足')) {
          return next(ApiError.business(ERROR_CODES.BATTLE_NOT_ENOUGH_RESOURCES, error.message))
        }
        if (error.message.includes('不存在')) {
          return next(ApiError.business(ERROR_CODES.BATTLE_FORMATION_NOT_LEARNED, error.message))
        }
      }
      next(error)
    }
  }

  /**
   * 激活阵法
   * POST /api/formation/activate
   * Body: { formationId: string }
   */
  async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return R.validationError(res, errors.array())
      }

      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { formationId } = req.body
      const result = await formationService.activateFormation(characterId, formationId)
      R.success(res, result, result.message)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('尚未学习')) {
          return next(ApiError.business(ERROR_CODES.BATTLE_FORMATION_NOT_LEARNED, error.message))
        }
        if (error.message.includes('已激活')) {
          return next(ApiError.business(ERROR_CODES.BATTLE_FORMATION_ALREADY_ACTIVE, error.message))
        }
        if (error.message.includes('灵石不足') || error.message.includes('修为不足')) {
          return next(ApiError.business(ERROR_CODES.BATTLE_NOT_ENOUGH_RESOURCES, error.message))
        }
      }
      next(error)
    }
  }

  /**
   * 撤销阵法
   * POST /api/formation/deactivate
   */
  async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await formationService.deactivateFormation(characterId)
      R.success(res, result, result.message)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('没有激活')) {
          return next(ApiError.business(ERROR_CODES.BATTLE_FORMATION_EXPIRED, error.message))
        }
      }
      next(error)
    }
  }

  /**
   * 获取所有阵法模板
   * GET /api/formation/templates
   */
  async getAllFormations(req: Request, res: Response, next: NextFunction) {
    try {
      const templates = FORMATIONS.map(f => ({
        id: f.id,
        name: f.name,
        description: f.description,
        tier: f.tier,
        tierName: FORMATION_TIER_NAMES[f.tier],
        effects: f.effects,
        learnCost: f.learnCost,
        activationCost: f.activationCost,
        duration: f.duration,
        requiredRealmTier: f.requiredRealmTier
      }))
      R.success(res, templates, '获取阵法模板成功')
    } catch (error) {
      next(error)
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
}

export const formationController = new FormationController()
