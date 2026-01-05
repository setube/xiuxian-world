import { Request, Response, NextFunction } from 'express'
import { inventoryService } from '../services/inventory.service'
import { playerService } from '../services/player.service'
import { R, ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'
import { getItemTemplate, type ItemType } from '../game/constants/items'
import { getRecipe, RECIPES } from '../game/constants/recipes'

export class InventoryController {
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

  // 获取背包物品列表
  async getInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { type, sort, page, pageSize } = req.query

      const result = await inventoryService.getInventory(characterId, {
        type: (type as ItemType | 'all') || 'all',
        sort: (sort as 'time' | 'quality' | 'name' | 'type') || 'time',
        page: page ? parseInt(page as string, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : 50
      })

      R.success(res, result)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  // 获取背包容量
  async getCapacity(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const capacity = await inventoryService.getCapacity(characterId)
      R.success(res, capacity)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  // 使用物品
  async useItem(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { inventoryItemId } = req.params
      const { quantity = 1 } = req.body

      if (!inventoryItemId) {
        throw ApiError.validation({ inventoryItemId: '物品ID不能为空' })
      }

      const result = await inventoryService.useItem(characterId, inventoryItemId, quantity)
      R.success(res, result, result.message || '使用成功')
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('不存在')) {
          return next(ApiError.business(ERROR_CODES.ITEM_NOT_FOUND, error.message))
        }
        if (error.message.includes('数量不足')) {
          return next(ApiError.business(ERROR_CODES.ITEM_NOT_ENOUGH, error.message))
        }
        if (error.message.includes('不可使用') || error.message.includes('境界')) {
          return next(ApiError.business(ERROR_CODES.ITEM_USE_CONDITION_NOT_MET, error.message))
        }
        if (error.message.includes('已满')) {
          return next(ApiError.business(ERROR_CODES.INVENTORY_FULL, error.message))
        }
      }
      next(error)
    }
  }

  // 丢弃物品
  async discardItem(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { inventoryItemId } = req.params
      const { quantity = 1 } = req.body

      if (!inventoryItemId) {
        throw ApiError.validation({ inventoryItemId: '物品ID不能为空' })
      }

      const result = await inventoryService.discardItem(characterId, inventoryItemId, quantity)
      R.success(res, result, `丢弃了 ${result.discarded} 个物品`)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('不存在')) {
          return next(ApiError.business(ERROR_CODES.ITEM_NOT_FOUND, error.message))
        }
        if (error.message.includes('数量不足')) {
          return next(ApiError.business(ERROR_CODES.ITEM_NOT_ENOUGH, error.message))
        }
      }
      next(error)
    }
  }

  // 获取单个物品详情
  async getItemDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { inventoryItemId } = req.params

      const item = await inventoryService.getItem(characterId, inventoryItemId)
      if (!item) {
        throw ApiError.business(ERROR_CODES.ITEM_NOT_FOUND, '物品不存在')
      }

      R.success(res, item)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  // ==================== 配方系统 ====================

  // 获取已学习的配方列表
  async getLearnedRecipes(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const result = await inventoryService.getLearnedRecipes(characterId)

      // 添加所有配方列表（用于显示未学习的）
      const allRecipes = Object.values(RECIPES).map(recipe => ({
        ...recipe,
        learned: result.learnedIds.includes(recipe.id)
      }))

      R.success(res, {
        learnedRecipes: result.recipes,
        learnedIds: result.learnedIds,
        allRecipes
      })
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  // 学习配方
  async learnRecipe(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { inventoryItemId } = req.body

      if (!inventoryItemId) {
        throw ApiError.validation({ inventoryItemId: '物品ID不能为空' })
      }

      const result = await inventoryService.learnRecipe(characterId, inventoryItemId)
      R.success(res, result, `成功学会 ${result.recipeName}`)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('不存在')) {
          return next(ApiError.business(ERROR_CODES.ITEM_NOT_FOUND, error.message))
        }
        if (error.message.includes('不是配方')) {
          return next(ApiError.business(ERROR_CODES.ITEM_NOT_USABLE, error.message))
        }
        if (error.message.includes('已经学会')) {
          return next(ApiError.business(ERROR_CODES.RECIPE_ALREADY_LEARNED, error.message))
        }
      }
      next(error)
    }
  }

  // 炼制物品
  async craft(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { recipeId, times = 1 } = req.body

      if (!recipeId) {
        throw ApiError.validation({ recipeId: '配方ID不能为空' })
      }

      const result = await inventoryService.craft(characterId, recipeId, times)
      R.success(res, result, result.message)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('未学习')) {
          return next(ApiError.business(ERROR_CODES.RECIPE_NOT_LEARNED, error.message))
        }
        if (error.message.includes('不存在')) {
          return next(ApiError.business(ERROR_CODES.ITEM_NOT_FOUND, error.message))
        }
        if (error.message.includes('数量不足') || error.message.includes('材料不足')) {
          return next(ApiError.business(ERROR_CODES.RECIPE_MATERIALS_NOT_ENOUGH, error.message))
        }
        if (error.message.includes('灵石不足')) {
          return next(ApiError.business(ERROR_CODES.PLAYER_NOT_ENOUGH_SPIRIT_STONES, error.message))
        }
        if (error.message.includes('不满足')) {
          return next(ApiError.business(ERROR_CODES.RECIPE_REQUIREMENTS_NOT_MET, error.message))
        }
      }
      next(error)
    }
  }

  // 检查是否可以炼制
  async canCraft(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { recipeId } = req.params
      const times = req.query.times ? parseInt(req.query.times as string, 10) : 1

      const result = await inventoryService.canCraft(characterId, recipeId, times)
      R.success(res, result)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  // ==================== 赠送系统 ====================

  // 赠送物品
  async giftItem(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { inventoryItemId, targetCharacterId, targetName, quantity = 1 } = req.body

      if (!inventoryItemId) {
        throw ApiError.validation({ inventoryItemId: '物品ID不能为空' })
      }

      // 支持通过角色ID或角色名查找目标
      let toCharacterId = targetCharacterId
      if (!toCharacterId && targetName) {
        toCharacterId = await inventoryService.findCharacterByName(targetName)
        if (!toCharacterId) {
          throw ApiError.business(ERROR_CODES.GIFT_TARGET_NOT_FOUND, `找不到道友"${targetName}"`)
        }
      }

      if (!toCharacterId) {
        throw ApiError.validation({ targetCharacterId: '请指定赠送目标' })
      }

      const result = await inventoryService.giftItem(characterId, toCharacterId, inventoryItemId, quantity)
      R.success(res, result, `成功赠送 ${result.itemName} x${result.quantity} 给 ${result.targetName}`)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('不存在')) {
          return next(ApiError.business(ERROR_CODES.ITEM_NOT_FOUND, error.message))
        }
        if (error.message.includes('赠送目标')) {
          return next(ApiError.business(ERROR_CODES.GIFT_TARGET_NOT_FOUND, error.message))
        }
        if (error.message.includes('自己')) {
          return next(ApiError.business(ERROR_CODES.GIFT_SELF_NOT_ALLOWED, error.message))
        }
        if (error.message.includes('不可交易')) {
          return next(ApiError.business(ERROR_CODES.ITEM_NOT_TRADEABLE, error.message))
        }
        if (error.message.includes('已绑定')) {
          return next(ApiError.business(ERROR_CODES.ITEM_ALREADY_BOUND, error.message))
        }
        if (error.message.includes('对方') && error.message.includes('满')) {
          return next(ApiError.business(ERROR_CODES.GIFT_TARGET_INVENTORY_FULL, error.message))
        }
        if (error.message.includes('数量不足')) {
          return next(ApiError.business(ERROR_CODES.ITEM_NOT_ENOUGH, error.message))
        }
      }
      next(error)
    }
  }
}

export const inventoryController = new InventoryController()
