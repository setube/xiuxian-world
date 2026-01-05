import { Request, Response, NextFunction } from 'express'
import { sectService } from '../services/sect.service'
import { playerService } from '../services/player.service'
import { R, ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'

export class SectController {
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

  // 获取宗门状态
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const status = await sectService.getSectStatus(characterId)
      R.success(res, status)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  // 加入宗门
  async join(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { sectId } = req.body
      if (!sectId) {
        throw ApiError.validation({ sectId: '请选择宗门' }, '请选择宗门')
      }

      const result = await sectService.joinSect(characterId, sectId)
      R.success(res, result, '成功拜入宗门')
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('已有宗门')) {
          return next(ApiError.business(ERROR_CODES.SECT_ALREADY_MEMBER, error.message))
        }
        if (error.message.includes('不满足') || error.message.includes('要求')) {
          return next(ApiError.business(ERROR_CODES.SECT_REQUIREMENTS_NOT_MET, error.message))
        }
        if (error.message.includes('冷却')) {
          return next(ApiError.business(ERROR_CODES.SECT_LEAVE_COOLDOWN, error.message))
        }
      }
      next(error)
    }
  }

  // 叛门
  async leave(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await sectService.leaveSect(characterId)
      R.success(res, result, '已叛出宗门')
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('没有加入')) {
          return next(ApiError.business(ERROR_CODES.SECT_NOT_MEMBER, error.message))
        }
      }
      next(error)
    }
  }

  // 领取俸禄
  async claimSalary(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await sectService.claimSalary(characterId)
      R.success(res, result, `领取俸禄 ${result.amount} 灵石`)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('已领取')) {
          return next(ApiError.business(ERROR_CODES.SECT_SALARY_ALREADY_CLAIMED, error.message))
        }
        if (error.message.includes('没有加入')) {
          return next(ApiError.business(ERROR_CODES.SECT_NOT_MEMBER, error.message))
        }
      }
      next(error)
    }
  }

  // 晋升
  async promote(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await sectService.promote(characterId)
      R.success(res, result, `晋升为${result.newRankName}`)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('不满足') || error.message.includes('贡献不足')) {
          return next(ApiError.business(ERROR_CODES.SECT_PROMOTE_REQUIREMENTS_NOT_MET, error.message))
        }
      }
      next(error)
    }
  }

  // 获取宗门成员列表（分页）
  async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      // 获取当前角色的宗门
      const status = await sectService.getSectStatus(characterId)
      if (!status.hasSect || !status.sect) {
        throw ApiError.business(ERROR_CODES.SECT_NOT_MEMBER, '你还没有加入任何宗门')
      }

      // 获取分页参数
      const page = parseInt(req.query.page as string) || 1
      const pageSize = parseInt(req.query.pageSize as string) || 10

      const members = await sectService.getSectMembers(status.sect.id, page, pageSize)
      const total = await sectService.getSectMemberCount(status.sect.id)

      R.success(res, { members, total, page, pageSize })
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  // 宗门点卯
  async checkIn(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await sectService.checkIn(characterId)
      R.success(res, result, '点卯成功')
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('已点卯')) {
          return next(ApiError.business(ERROR_CODES.SECT_CHECKIN_ALREADY_DONE, error.message))
        }
      }
      next(error)
    }
  }

  // 宗门传功
  async teach(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await sectService.teach(characterId)
      R.success(res, result, '传功成功')
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('次数') || error.message.includes('已用完')) {
          return next(ApiError.business(ERROR_CODES.SECT_TEACH_LIMIT_REACHED, error.message))
        }
      }
      next(error)
    }
  }

  // 获取宝库物品
  async getTreasuryItems(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await sectService.getTreasuryItems(characterId)
      R.success(res, result)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  // 购买宝库物品
  async purchaseTreasuryItem(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { itemId, quantity } = req.body
      if (!itemId) {
        throw ApiError.validation({ itemId: '请选择物品' }, '请选择物品')
      }

      const result = await sectService.purchaseTreasuryItem(characterId, itemId, quantity || 1)
      R.success(res, result, '购买成功')
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('贡献不足')) {
          return next(ApiError.business(ERROR_CODES.SECT_CONTRIBUTION_NOT_ENOUGH, error.message))
        }
        if (error.message.includes('物品不存在')) {
          return next(ApiError.business(ERROR_CODES.SECT_ITEM_NOT_FOUND, error.message))
        }
      }
      next(error)
    }
  }

  // 捐献灵石
  async donate(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { amount } = req.body
      if (!amount || typeof amount !== 'number' || amount < 10) {
        throw ApiError.business(ERROR_CODES.SECT_DONATE_INVALID_AMOUNT, '捐献数量无效，最少10灵石')
      }

      const result = await sectService.donate(characterId, amount)
      R.success(res, result, '捐献成功')
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('灵石不足')) {
          return next(ApiError.business(ERROR_CODES.PLAYER_NOT_ENOUGH_SPIRIT_STONES, error.message))
        }
      }
      next(error)
    }
  }

  // 获取悬赏列表
  async getBounties(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await sectService.getBounties(characterId)
      R.success(res, result)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  // 接受悬赏
  async acceptBounty(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { bountyId } = req.body
      if (!bountyId) {
        throw ApiError.validation({ bountyId: '请选择悬赏' }, '请选择悬赏')
      }

      const result = await sectService.acceptBounty(characterId, bountyId)
      R.success(res, result, result.message || '接取悬赏成功')
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('已接受') || error.message.includes('进行中')) {
          return next(ApiError.business(ERROR_CODES.SECT_BOUNTY_ALREADY_ACCEPTED, error.message))
        }
        if (error.message.includes('不存在')) {
          return next(ApiError.business(ERROR_CODES.SECT_BOUNTY_NOT_FOUND, error.message))
        }
      }
      next(error)
    }
  }

  // 提交悬赏
  async submitBounty(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { bountyId } = req.body
      if (!bountyId) {
        throw ApiError.validation({ bountyId: '请选择悬赏' }, '请选择悬赏')
      }

      const result = await sectService.submitBounty(characterId, bountyId)
      R.success(res, result, result.message || '悬赏完成')
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('未接受') || error.message.includes('未进行')) {
          return next(ApiError.business(ERROR_CODES.SECT_BOUNTY_NOT_ACTIVE, error.message))
        }
      }
      next(error)
    }
  }

  // 放弃悬赏
  async abandonBounty(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { bountyId } = req.body
      if (!bountyId) {
        throw ApiError.validation({ bountyId: '请选择悬赏' }, '请选择悬赏')
      }

      const result = await sectService.abandonBounty(characterId, bountyId)
      R.success(res, result, result.message || '已放弃悬赏')
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }
}

export const sectController = new SectController()
