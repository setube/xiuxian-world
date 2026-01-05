import { Request, Response, NextFunction } from 'express'
import { rankingService, RankingType } from '../services/ranking.service'
import { playerService } from '../services/player.service'
import { R } from '../utils/response'
import { ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'

/**
 * 排行榜控制器
 * 处理排行榜相关的请求
 */
class RankingController {
  /**
   * 获取修为榜
   * GET /api/ranking/cultivation
   * Query: { limit?: number, offset?: number }
   */
  async getCultivationRanking(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
      const offset = parseInt(req.query.offset as string) || 0

      const ranking = await rankingService.getCultivationRanking(limit, offset)
      R.success(res, ranking, '获取修为榜成功')
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取恶人榜
   * GET /api/ranking/evil
   * Query: { limit?: number, offset?: number }
   */
  async getEvilRanking(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
      const offset = parseInt(req.query.offset as string) || 0

      const ranking = await rankingService.getEvilRanking(limit, offset)
      R.success(res, ranking, '获取恶人榜成功')
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取战力榜
   * GET /api/ranking/power
   * Query: { limit?: number, offset?: number }
   */
  async getPowerRanking(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
      const offset = parseInt(req.query.offset as string) || 0

      const ranking = await rankingService.getPowerRanking(limit, offset)
      R.success(res, ranking, '获取战力榜成功')
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取PvP击杀榜
   * GET /api/ranking/pvp-kills
   * Query: { limit?: number, offset?: number }
   */
  async getPvpKillsRanking(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
      const offset = parseInt(req.query.offset as string) || 0

      const ranking = await rankingService.getPvpKillsRanking(limit, offset)
      R.success(res, ranking, '获取击杀榜成功')
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取掠夺榜
   * GET /api/ranking/loot
   * Query: { limit?: number, offset?: number }
   */
  async getLootRanking(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
      const offset = parseInt(req.query.offset as string) || 0

      const ranking = await rankingService.getLootRanking(limit, offset)
      R.success(res, ranking, '获取掠夺榜成功')
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取我的排名
   * GET /api/ranking/my-rank
   * Query: { type: RankingType }
   */
  async getMyRank(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const type = (req.query.type as RankingType) || 'cultivation'
      const validTypes: RankingType[] = ['cultivation', 'evil', 'power', 'pvpKills', 'loot']
      if (!validTypes.includes(type)) {
        throw ApiError.validation({ type: '无效的排行榜类型' })
      }

      const rank = await rankingService.getPlayerRank(characterId, type)
      R.success(res, rank, '获取我的排名成功')
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取所有排行榜类型的我的排名
   * GET /api/ranking/my-ranks
   */
  async getAllMyRanks(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const types: RankingType[] = ['cultivation', 'evil', 'power', 'pvpKills', 'loot']
      const ranks = await Promise.all(types.map(type => rankingService.getPlayerRank(characterId, type)))

      const result = {
        cultivation: ranks[0],
        evil: ranks[1],
        power: ranks[2],
        pvpKills: ranks[3],
        loot: ranks[4]
      }

      R.success(res, result, '获取我的所有排名成功')
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

export const rankingController = new RankingController()
