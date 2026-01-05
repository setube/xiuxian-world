import { Request, Response, NextFunction } from 'express'
import { caveDwellingService } from '../services/caveDwelling.service'
import { playerService } from '../services/player.service'
import { R, ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'

export class CaveDwellingController {
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

  // ==================== 洞府管理 ====================

  // 检查是否可以开辟洞府
  async canOpenCave(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await caveDwellingService.canOpenCave(characterId)
      R.success(res, result)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  // 开辟洞府
  async openCave(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const cave = await caveDwellingService.openCave(characterId)
      R.success(res, { caveId: cave.id }, '成功开辟洞府！灵脉汇聚，福地初成。')
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('已经拥有')) {
          return next(ApiError.business(ERROR_CODES.CAVE_ALREADY_OPENED, error.message))
        }
        if (error.message.includes('境界')) {
          return next(ApiError.business(ERROR_CODES.CAVE_REALM_NOT_MET, error.message))
        }
        if (error.message.includes('不足')) {
          return next(ApiError.business(ERROR_CODES.CAVE_RESOURCES_NOT_ENOUGH, error.message))
        }
      }
      next(error)
    }
  }

  // 获取洞府信息
  async getCaveInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const info = await caveDwellingService.getCaveInfo(characterId)
      R.success(res, info)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  // ==================== 灵脉系统 ====================

  // 收取灵气
  async harvestSpiritEnergy(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await caveDwellingService.harvestSpiritEnergy(characterId)
      R.success(res, result, `收取了 ${result.harvested} 点灵气`)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('没有开辟')) {
          return next(ApiError.business(ERROR_CODES.CAVE_NOT_OPENED, error.message))
        }
        if (error.message.includes('暂无')) {
          return next(ApiError.business(ERROR_CODES.CAVE_NO_PENDING_ENERGY, error.message))
        }
      }
      next(error)
    }
  }

  // 升级灵脉
  async upgradeSpiritVein(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await caveDwellingService.upgradeSpiritVein(characterId)
      R.success(res, result, `灵脉升级成功！当前等级：${result.newLevel}`)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('没有开辟')) {
          return next(ApiError.business(ERROR_CODES.CAVE_NOT_OPENED, error.message))
        }
        if (error.message.includes('满级')) {
          return next(ApiError.business(ERROR_CODES.CAVE_SPIRIT_VEIN_MAX, error.message))
        }
        if (error.message.includes('不足')) {
          return next(ApiError.business(ERROR_CODES.CAVE_RESOURCES_NOT_ENOUGH, error.message))
        }
      }
      next(error)
    }
  }

  // ==================== 静室系统 ====================

  // 转化灵气为修为
  async convertSpiritToExp(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await caveDwellingService.convertSpiritToExp(characterId)
      R.success(res, result, `消耗 ${result.converted} 灵气，获得 ${result.expGained} 修为`)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('没有开辟')) {
          return next(ApiError.business(ERROR_CODES.CAVE_NOT_OPENED, error.message))
        }
        if (error.message.includes('灵气不足')) {
          return next(ApiError.business(ERROR_CODES.CAVE_NO_PENDING_EXP, error.message))
        }
        if (error.message.includes('冷却')) {
          return next(ApiError.business(ERROR_CODES.CAVE_NO_PENDING_EXP, error.message))
        }
      }
      next(error)
    }
  }

  // 升级静室
  async upgradeMeditationChamber(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await caveDwellingService.upgradeMeditationChamber(characterId)
      R.success(res, result, `静室升级成功！当前等级：${result.newLevel}`)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('没有开辟')) {
          return next(ApiError.business(ERROR_CODES.CAVE_NOT_OPENED, error.message))
        }
        if (error.message.includes('满级')) {
          return next(ApiError.business(ERROR_CODES.CAVE_MEDITATION_MAX, error.message))
        }
        if (error.message.includes('不足')) {
          return next(ApiError.business(ERROR_CODES.CAVE_RESOURCES_NOT_ENOUGH, error.message))
        }
      }
      next(error)
    }
  }

  // ==================== 万宝阁 ====================

  // 获取万宝阁
  async getTreasureDisplay(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await caveDwellingService.getTreasureDisplay(characterId)
      R.success(res, { treasureDisplay: result })
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('没有开辟')) {
          return next(ApiError.business(ERROR_CODES.CAVE_NOT_OPENED, error.message))
        }
      }
      next(error)
    }
  }

  // 上架物品
  async displayTreasure(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { inventoryItemId, slot } = req.body
      if (!inventoryItemId) {
        throw ApiError.validation({ inventoryItemId: '物品ID不能为空' })
      }
      if (slot === undefined || slot === null) {
        throw ApiError.validation({ slot: '展台槽位不能为空' })
      }

      const result = await caveDwellingService.displayTreasure(characterId, inventoryItemId, slot)
      R.success(res, result, `已将 ${result.itemName} 陈列于万宝阁`)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('没有开辟')) {
          return next(ApiError.business(ERROR_CODES.CAVE_NOT_OPENED, error.message))
        }
        if (error.message.includes('槽位')) {
          return next(ApiError.business(ERROR_CODES.CAVE_TREASURE_SLOT_INVALID, error.message))
        }
        if (error.message.includes('已在展示')) {
          return next(ApiError.business(ERROR_CODES.CAVE_TREASURE_ALREADY_DISPLAYED, error.message))
        }
        if (error.message.includes('不存在')) {
          return next(ApiError.business(ERROR_CODES.ITEM_NOT_FOUND, error.message))
        }
      }
      next(error)
    }
  }

  // 下架物品
  async removeTreasure(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { slot } = req.body
      if (slot === undefined || slot === null) {
        throw ApiError.validation({ slot: '展台槽位不能为空' })
      }

      const result = await caveDwellingService.removeTreasure(characterId, slot)
      R.success(res, result, result.itemName ? `已将 ${result.itemName} 收回储物袋` : '操作成功')
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('没有开辟')) {
          return next(ApiError.business(ERROR_CODES.CAVE_NOT_OPENED, error.message))
        }
        if (error.message.includes('没有物品')) {
          return next(ApiError.business(ERROR_CODES.CAVE_TREASURE_SLOT_EMPTY, error.message))
        }
      }
      next(error)
    }
  }

  // ==================== 景观系统 ====================

  // 获取景观列表
  async getSceneryGallery(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await caveDwellingService.getSceneryGallery(characterId)
      R.success(res, result)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('没有开辟')) {
          return next(ApiError.business(ERROR_CODES.CAVE_NOT_OPENED, error.message))
        }
      }
      next(error)
    }
  }

  // 布置/取消布置景观
  async displayScenery(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { sceneryId } = req.body
      if (!sceneryId) {
        throw ApiError.validation({ sceneryId: '景观ID不能为空' })
      }

      await caveDwellingService.displayScenery(characterId, sceneryId)
      R.success(res, { success: true }, '景观布置已更新')
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('没有开辟')) {
          return next(ApiError.business(ERROR_CODES.CAVE_NOT_OPENED, error.message))
        }
        if (error.message.includes('未解锁')) {
          return next(ApiError.business(ERROR_CODES.CAVE_SCENERY_NOT_UNLOCKED, error.message))
        }
      }
      next(error)
    }
  }

  // ==================== 访客系统 ====================

  // 获取当前访客
  async getCurrentVisitor(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await caveDwellingService.getCurrentVisitor(characterId)
      R.success(res, result)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('没有开辟')) {
          return next(ApiError.business(ERROR_CODES.CAVE_NOT_OPENED, error.message))
        }
      }
      next(error)
    }
  }

  // 接待访客
  async receiveVisitor(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await caveDwellingService.receiveVisitor(characterId)
      R.success(res, result, result.description)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('没有开辟')) {
          return next(ApiError.business(ERROR_CODES.CAVE_NOT_OPENED, error.message))
        }
        if (error.message.includes('没有访客')) {
          return next(ApiError.business(ERROR_CODES.CAVE_NO_VISITOR, error.message))
        }
      }
      next(error)
    }
  }

  // 驱逐访客
  async expelVisitor(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await caveDwellingService.expelVisitor(characterId)
      R.success(res, result, result.description)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('没有开辟')) {
          return next(ApiError.business(ERROR_CODES.CAVE_NOT_OPENED, error.message))
        }
        if (error.message.includes('没有访客')) {
          return next(ApiError.business(ERROR_CODES.CAVE_NO_VISITOR, error.message))
        }
      }
      next(error)
    }
  }

  // 获取访客记录
  async getVisitorLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
      const result = await caveDwellingService.getVisitorLogs(characterId, page)
      R.success(res, result)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  // ==================== 社交系统 ====================

  // 拜访他人洞府
  async visitOtherCave(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const targetName = req.query.targetName as string
      if (!targetName) {
        throw ApiError.validation({ targetName: '目标名称不能为空' })
      }

      const result = await caveDwellingService.visitOtherCave(characterId, targetName)
      R.success(res, result)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('找不到')) {
          return next(ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, error.message))
        }
        if (error.message.includes('自己')) {
          return next(ApiError.business(ERROR_CODES.CAVE_VISIT_SELF, error.message))
        }
        if (error.message.includes('尚未开辟')) {
          return next(ApiError.business(ERROR_CODES.CAVE_TARGET_NO_CAVE, error.message))
        }
      }
      next(error)
    }
  }

  // 留言
  async leaveMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { targetName, content } = req.body
      if (!targetName) {
        throw ApiError.validation({ targetName: '目标名称不能为空' })
      }
      if (!content) {
        throw ApiError.validation({ content: '留言内容不能为空' })
      }

      await caveDwellingService.leaveMessage(characterId, targetName, content)
      R.success(res, { success: true }, '留言成功')
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('找不到')) {
          return next(ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, error.message))
        }
        if (error.message.includes('自己')) {
          return next(ApiError.business(ERROR_CODES.CAVE_VISIT_SELF, error.message))
        }
        if (error.message.includes('尚未开辟')) {
          return next(ApiError.business(ERROR_CODES.CAVE_TARGET_NO_CAVE, error.message))
        }
        if (error.message.includes('为空')) {
          return next(ApiError.business(ERROR_CODES.CAVE_MESSAGE_EMPTY, error.message))
        }
        if (error.message.includes('超过')) {
          return next(ApiError.business(ERROR_CODES.CAVE_MESSAGE_TOO_LONG, error.message))
        }
      }
      next(error)
    }
  }

  // 获取留言列表
  async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
      const result = await caveDwellingService.getMessages(characterId, page)
      R.success(res, result)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  // 标记留言已读
  async markMessageRead(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { messageId } = req.body
      if (!messageId) {
        throw ApiError.validation({ messageId: '留言ID不能为空' })
      }

      await caveDwellingService.markMessageRead(characterId, messageId)
      R.success(res, { success: true })
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('不存在')) {
          return next(ApiError.business(ERROR_CODES.CAVE_MESSAGE_NOT_FOUND, error.message))
        }
      }
      next(error)
    }
  }
}

export const caveDwellingController = new CaveDwellingController()
