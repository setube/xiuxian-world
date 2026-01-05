import { Request, Response, NextFunction } from 'express'
import { marketService } from '../services/market.service'
import { playerService } from '../services/player.service'
import { R, ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'
import type { ItemType } from '../game/constants/items'

export class MarketController {
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

  // 获取市场挂单列表
  async getListings(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { page, pageSize, search, itemType } = req.query

      const result = await marketService.getListings({
        page: page ? parseInt(page as string, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : 20,
        search: search as string | undefined,
        itemType: itemType as ItemType | undefined
      })

      R.success(res, result)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  // 获取我的挂单
  async getMyListings(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const listings = await marketService.getMyListings(characterId)
      R.success(res, { listings })
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  // 获取挂单详情
  async getListingDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { listingId } = req.params

      if (!listingId) {
        throw ApiError.validation({ listingId: '挂单ID不能为空' })
      }

      const listing = await marketService.getListingDetail(listingId)
      if (!listing) {
        throw ApiError.business(ERROR_CODES.MARKET_LISTING_NOT_FOUND, '挂单不存在')
      }

      R.success(res, listing)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(error)
    }
  }

  // 创建挂单（上架物品）
  async createListing(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { itemId, quantity, price } = req.body

      // 参数验证
      if (!itemId) {
        throw ApiError.validation({ itemId: '物品ID不能为空' })
      }
      if (!quantity || quantity <= 0) {
        throw ApiError.validation({ quantity: '数量必须大于0' })
      }
      if (!price || !Array.isArray(price) || price.length === 0) {
        throw ApiError.validation({ price: '请设置交换价格' })
      }

      const result = await marketService.createListing(characterId, itemId, quantity, price)
      R.success(res, result, result.message)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('不存在')) {
          return next(ApiError.business(ERROR_CODES.ITEM_NOT_FOUND, error.message))
        }
        if (error.message.includes('不可交易')) {
          return next(ApiError.business(ERROR_CODES.MARKET_ITEM_NOT_TRADEABLE, error.message))
        }
        if (error.message.includes('数量不足')) {
          return next(ApiError.business(ERROR_CODES.MARKET_NOT_ENOUGH_ITEMS, error.message))
        }
        if (error.message.includes('价格')) {
          return next(ApiError.business(ERROR_CODES.MARKET_INVALID_PRICE, error.message))
        }
      }
      next(error)
    }
  }

  // 取消挂单（下架物品）
  async cancelListing(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { listingId } = req.params

      if (!listingId) {
        throw ApiError.validation({ listingId: '挂单ID不能为空' })
      }

      const result = await marketService.cancelListing(characterId, listingId)
      R.success(res, result, result.message)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('不存在')) {
          return next(ApiError.business(ERROR_CODES.MARKET_LISTING_NOT_FOUND, error.message))
        }
        if (error.message.includes('不是你的')) {
          return next(ApiError.business(ERROR_CODES.MARKET_NOT_LISTING_OWNER, error.message))
        }
        if (error.message.includes('已结束')) {
          return next(ApiError.business(ERROR_CODES.MARKET_LISTING_CANCELLED, error.message))
        }
      }
      next(error)
    }
  }

  // 购买物品
  async purchase(req: Request, res: Response, next: NextFunction) {
    try {
      const characterId = await this.getCharacterId(req)
      if (!characterId) {
        throw ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色')
      }

      const { listingId } = req.params
      const { quantity } = req.body

      if (!listingId) {
        throw ApiError.validation({ listingId: '挂单ID不能为空' })
      }

      const result = await marketService.purchase(characterId, listingId, quantity)
      R.success(res, result, result.message)
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      if (error instanceof Error) {
        if (error.message.includes('不存在')) {
          return next(ApiError.business(ERROR_CODES.MARKET_LISTING_NOT_FOUND, error.message))
        }
        if (error.message.includes('已下架') || error.message.includes('已售罄')) {
          return next(ApiError.business(ERROR_CODES.MARKET_LISTING_SOLD_OUT, error.message))
        }
        if (error.message.includes('自己')) {
          return next(ApiError.business(ERROR_CODES.MARKET_CANNOT_BUY_OWN, error.message))
        }
        if (error.message.includes('库存不足')) {
          return next(ApiError.business(ERROR_CODES.MARKET_NOT_ENOUGH_ITEMS, error.message))
        }
        if (error.message.includes('支付物品不足')) {
          return next(ApiError.business(ERROR_CODES.MARKET_NOT_ENOUGH_PAYMENT, error.message))
        }
        if (error.message.includes('你的储物袋已满')) {
          return next(ApiError.business(ERROR_CODES.MARKET_BUYER_INVENTORY_FULL, error.message))
        }
        if (error.message.includes('卖家储物袋')) {
          return next(ApiError.business(ERROR_CODES.MARKET_SELLER_INVENTORY_FULL, error.message))
        }
        if (error.message.includes('必须大于0')) {
          return next(ApiError.business(ERROR_CODES.MARKET_INVALID_QUANTITY, error.message))
        }
      }
      next(error)
    }
  }
}

export const marketController = new MarketController()
