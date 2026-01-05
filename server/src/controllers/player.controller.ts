import { Request, Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'
import { playerService } from '../services/player.service'
import { R, ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'

export class PlayerController {
  async createCharacter(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return R.validationError(res, errors.array())
      }

      if (!req.user) {
        throw ApiError.unauthorized()
      }

      const { name, spiritRootId } = req.body
      const character = await playerService.createCharacter({
        name,
        userId: req.user.userId,
        spiritRootId
      })

      R.created(
        res,
        {
          character: {
            id: character.id,
            name: character.name,
            daoName: character.name,
            spiritRootId: character.spiritRootId,
            level: character.level,
            experience: character.experience,
            spiritStones: character.spiritStones,
            realm: character.realm
              ? {
                  id: character.realm.id,
                  name: character.realm.name,
                  tier: character.realm.tier,
                  subTier: character.realm.subTier
                }
              : null,
            realmProgress: character.realmProgress
          }
        },
        '创建成功'
      )
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('已存在') || error.message.includes('已被使用')) {
          return next(ApiError.business(ERROR_CODES.PLAYER_CHARACTER_EXISTS, error.message))
        }
        if (error.message.includes('名字') || error.message.includes('名称')) {
          return next(ApiError.business(ERROR_CODES.PLAYER_INVALID_NAME, error.message))
        }
      }
      next(error)
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw ApiError.unauthorized()
      }

      const character = await playerService.getCharacterByUserId(req.user.userId)
      if (!character) {
        throw ApiError.notFound('角色不存在', ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND)
      }

      R.success(res, {
        character: {
          id: character.id,
          name: character.name,
          daoName: character.name,
          spiritRootId: character.spiritRootId,
          level: character.level,
          experience: character.experience,
          spiritStones: character.spiritStones,
          realm: character.realm
            ? {
                id: character.realm.id,
                name: character.realm.name,
                tier: character.realm.tier,
                subTier: character.realm.subTier
              }
            : null,
          realmProgress: character.realmProgress
        }
      })
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw ApiError.unauthorized()
      }

      // 优先使用 token 中的 characterId，否则通过 userId 查找
      let characterId = req.user.characterId
      if (!characterId) {
        const character = await playerService.getCharacterByUserId(req.user.userId)
        if (!character) {
          throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '请先创建角色')
        }
        characterId = character.id
      }

      const stats = await playerService.getCharacterStats(characterId)
      R.success(res, stats)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  async getPlayer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const character = await playerService.getCharacter(id)

      if (!character) {
        throw ApiError.notFound('玩家不存在', ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND)
      }

      // 返回公开信息
      R.success(res, {
        id: character.id,
        name: character.name,
        level: character.level,
        realm: character.realm
          ? {
              name: character.realm.name,
              tier: character.realm.tier,
              subTier: character.realm.subTier
            }
          : null
      })
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  // 设置待确认的角色名
  async setName(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return R.validationError(res, errors.array())
      }

      if (!req.user) {
        throw ApiError.unauthorized()
      }

      const { name } = req.body
      await playerService.setPendingName(req.user.userId, name)

      R.success(res, { name }, '角色名设置成功')
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('已存在') || error.message.includes('已被使用')) {
          return next(ApiError.business(ERROR_CODES.PLAYER_CHARACTER_EXISTS, error.message))
        }
        if (error.message.includes('名字') || error.message.includes('名称') || error.message.includes('角色名')) {
          return next(ApiError.business(ERROR_CODES.PLAYER_INVALID_NAME, error.message))
        }
      }
      next(error)
    }
  }

  // 灵根检测并创建角色
  async detectSpiritRoot(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw ApiError.unauthorized()
      }

      const result = await playerService.detectSpiritRootAndCreateCharacter(req.user.userId)

      R.created(
        res,
        {
          character: {
            id: result.character.id,
            name: result.character.name,
            daoName: result.character.name,
            spiritRootId: result.character.spiritRootId,
            level: result.character.level,
            experience: result.character.experience,
            spiritStones: result.character.spiritStones,
            realm: result.character.realm
              ? {
                  id: result.character.realm.id,
                  name: result.character.realm.name,
                  tier: result.character.realm.tier,
                  subTier: result.character.realm.subTier
                }
              : null,
            realmProgress: result.character.realmProgress
          },
          spiritRoot: result.spiritRoot
        },
        '灵根检测完成'
      )
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('已存在') || error.message.includes('已被使用')) {
          return next(ApiError.business(ERROR_CODES.PLAYER_CHARACTER_EXISTS, error.message))
        }
        if (error.message.includes('请先设置')) {
          return next(ApiError.business(ERROR_CODES.PLAYER_INVALID_NAME, error.message))
        }
      }
      next(error)
    }
  }
}

export const playerController = new PlayerController()
