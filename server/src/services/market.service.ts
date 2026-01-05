import { AppDataSource } from '../config/database'
import { Like, In } from 'typeorm'
import { Character } from '../models/Character'
import { InventoryItem } from '../models/InventoryItem'
import { MarketListing, type PriceItem, type ListingType } from '../models/MarketListing'
import { getItemTemplate, type ItemTemplate, type ItemType } from '../game/constants/items'
import { inventoryService } from './inventory.service'

const characterRepository = AppDataSource.getRepository(Character)
const inventoryRepository = AppDataSource.getRepository(InventoryItem)
const marketRepository = AppDataSource.getRepository(MarketListing)

// 挂单（带模板信息）
export interface MarketListingWithTemplate {
  id: string
  sellerId: string
  sellerName: string
  itemId: string
  itemTemplate: ItemTemplate
  quantity: number
  soldQuantity: number
  remainingQuantity: number
  listingType: ListingType
  price: PriceItem[]
  priceWithTemplates: { itemId: string; quantity: number; template: ItemTemplate }[]
  unitPrice: PriceItem[] | null
  isBundle: boolean
  status: string
  createdAt: Date
}

// 上架结果
export interface CreateListingResult {
  listing: MarketListingWithTemplate
  message: string
}

// 购买结果
export interface PurchaseResult {
  purchasedItem: { itemId: string; itemName: string; quantity: number }
  cost: { itemId: string; itemName: string; quantity: number }[]
  listingRemaining: number
  message: string
}

export class MarketService {
  // ==================== 查询方法 ====================

  /**
   * 获取市场挂单列表
   */
  async getListings(options?: {
    page?: number
    pageSize?: number
    search?: string
    itemType?: ItemType
  }): Promise<{ listings: MarketListingWithTemplate[]; total: number; page: number; totalPages: number }> {
    const { page = 1, pageSize = 20, search, itemType } = options || {}

    // 构建查询条件
    const queryBuilder = marketRepository.createQueryBuilder('listing')
      .where('listing.status = :status', { status: 'active' })
      .orderBy('listing.createdAt', 'DESC')

    // 获取所有active挂单
    const allListings = await queryBuilder.getMany()

    // 转换为带模板的挂单
    let listingsWithTemplate = allListings
      .map(listing => this.toListingWithTemplate(listing))
      .filter((l): l is MarketListingWithTemplate => l !== null)

    // 搜索过滤（按物品名称）
    if (search) {
      const searchLower = search.toLowerCase()
      listingsWithTemplate = listingsWithTemplate.filter(l =>
        l.itemTemplate.name.toLowerCase().includes(searchLower)
      )
    }

    // 类型过滤
    if (itemType) {
      listingsWithTemplate = listingsWithTemplate.filter(l =>
        l.itemTemplate.type === itemType
      )
    }

    // 计算分页
    const total = listingsWithTemplate.length
    const totalPages = Math.ceil(total / pageSize)
    const startIndex = (page - 1) * pageSize
    const paginatedListings = listingsWithTemplate.slice(startIndex, startIndex + pageSize)

    return { listings: paginatedListings, total, page, totalPages }
  }

  /**
   * 获取我的挂单
   */
  async getMyListings(characterId: string): Promise<MarketListingWithTemplate[]> {
    const listings = await marketRepository.find({
      where: { sellerId: characterId, status: 'active' },
      order: { createdAt: 'DESC' }
    })

    return listings
      .map(listing => this.toListingWithTemplate(listing))
      .filter((l): l is MarketListingWithTemplate => l !== null)
  }

  /**
   * 获取单个挂单详情
   */
  async getListingDetail(listingId: string): Promise<MarketListingWithTemplate | null> {
    const listing = await marketRepository.findOne({
      where: { id: listingId }
    })

    if (!listing) return null
    return this.toListingWithTemplate(listing)
  }

  // ==================== 操作方法 ====================

  /**
   * 创建挂单（上架物品）
   */
  async createListing(
    characterId: string,
    itemId: string,
    quantity: number,
    price: PriceItem[]
  ): Promise<CreateListingResult> {
    // 1. 验证物品模板
    const template = getItemTemplate(itemId)
    if (!template) {
      throw new Error('物品不存在')
    }

    // 2. 验证物品可交易
    if (!template.tradeable) {
      throw new Error('该物品不可交易')
    }

    // 3. 验证价格配置
    if (!price || price.length === 0) {
      throw new Error('请设置交换价格')
    }

    for (const p of price) {
      const priceTemplate = getItemTemplate(p.itemId)
      if (!priceTemplate) {
        throw new Error(`价格物品 ${p.itemId} 不存在`)
      }
      if (p.quantity <= 0) {
        throw new Error('价格数量必须大于0')
      }
    }

    // 4. 获取卖家信息
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    // 5. 检查卖家是否有足够的物品（未绑定的）
    const availableItems = await inventoryRepository.find({
      where: { characterId, itemId, isBound: false }
    })

    const totalAvailable = availableItems.reduce((sum, item) => sum + item.quantity, 0)
    if (totalAvailable < quantity) {
      throw new Error(`可交易的${template.name}数量不足，拥有${totalAvailable}个，需要${quantity}个`)
    }

    // 6. 判断销售类型（按件/捆绑）
    const listingType = this.determineListingType(quantity, price)

    // 7. 执行事务：扣除物品 + 创建挂单
    return AppDataSource.transaction(async manager => {
      // 扣除卖家物品
      let needToRemove = quantity
      const itemsToUpdate = await manager.find(InventoryItem, {
        where: { characterId, itemId, isBound: false },
        order: { obtainedAt: 'ASC' }
      })

      for (const item of itemsToUpdate) {
        if (needToRemove <= 0) break

        const removeFromThis = Math.min(needToRemove, item.quantity)
        item.quantity -= removeFromThis
        needToRemove -= removeFromThis

        if (item.quantity <= 0) {
          await manager.remove(InventoryItem, item)
        } else {
          await manager.save(InventoryItem, item)
        }
      }

      // 创建挂单
      const listing = manager.create(MarketListing, {
        sellerId: characterId,
        sellerName: character.name,
        itemId,
        quantity,
        soldQuantity: 0,
        listingType,
        priceJson: JSON.stringify(price),
        status: 'active'
      })

      const savedListing = await manager.save(MarketListing, listing)
      const listingWithTemplate = this.toListingWithTemplate(savedListing)!

      const typeText = listingType === 'per_item' ? '按件出售' : '捆绑出售'
      return {
        listing: listingWithTemplate,
        message: `成功上架${quantity}个${template.name}（${typeText}）`
      }
    })
  }

  /**
   * 取消挂单（下架物品）
   */
  async cancelListing(characterId: string, listingId: string): Promise<{ returnedItem: { itemId: string; itemName: string; quantity: number }; message: string }> {
    // 使用事务和悲观锁防止并发问题（与purchase操作互斥）
    return AppDataSource.transaction(async manager => {
      // 锁定挂单记录
      const listing = await manager.findOne(MarketListing, {
        where: { id: listingId },
        lock: { mode: 'pessimistic_write' }
      })

      if (!listing) {
        throw new Error('挂单不存在')
      }

      if (listing.sellerId !== characterId) {
        throw new Error('这不是你的挂单')
      }

      if (listing.status !== 'active') {
        throw new Error('挂单已结束')
      }

      const template = getItemTemplate(listing.itemId)
      const returnQuantity = listing.remainingQuantity

      // 更新挂单状态
      listing.status = 'cancelled'
      await manager.save(MarketListing, listing)

      // 返还物品给卖家
      await inventoryService.addItem(listing.sellerId, listing.itemId, returnQuantity)

      return {
        returnedItem: {
          itemId: listing.itemId,
          itemName: template?.name || listing.itemId,
          quantity: returnQuantity
        },
        message: `已下架${returnQuantity}个${template?.name || listing.itemId}`
      }
    })
  }

  /**
   * 购买物品
   */
  async purchase(
    buyerId: string,
    listingId: string,
    quantity?: number
  ): Promise<PurchaseResult> {
    // 使用事务和悲观锁防止并发问题
    return AppDataSource.transaction(async manager => {
      // 1. 锁定挂单记录
      const listing = await manager.findOne(MarketListing, {
        where: { id: listingId },
        lock: { mode: 'pessimistic_write' }
      })

      if (!listing) {
        throw new Error('挂单不存在')
      }

      if (listing.status !== 'active') {
        throw new Error('挂单已下架或已售罄')
      }

      if (listing.sellerId === buyerId) {
        throw new Error('不能购买自己的物品')
      }

      // 2. 确定购买数量
      let purchaseQty: number
      if (listing.listingType === 'bundle') {
        // 捆绑销售：必须购买全部
        purchaseQty = listing.remainingQuantity
      } else {
        // 按件销售：购买指定数量
        purchaseQty = quantity || 1
        if (purchaseQty <= 0) {
          throw new Error('购买数量必须大于0')
        }
        if (purchaseQty > listing.remainingQuantity) {
          throw new Error(`库存不足，剩余${listing.remainingQuantity}个`)
        }
      }

      // 3. 计算费用
      const cost = this.calculateCost(listing, purchaseQty)

      // 4. 检查买家是否有足够的支付物品
      const hasPayment = await inventoryService.hasItems(buyerId, cost)
      if (!hasPayment) {
        const costText = cost.map(c => {
          const t = getItemTemplate(c.itemId)
          return `${t?.name || c.itemId}×${c.quantity}`
        }).join('、')
        throw new Error(`支付物品不足，需要: ${costText}`)
      }

      // 5. 检查买家背包空间
      const buyerCapacity = await inventoryService.getCapacity(buyerId)
      if (buyerCapacity.available <= 0) {
        throw new Error('你的储物袋已满')
      }

      // 6. 检查卖家背包空间（用于接收支付物品）
      const sellerCapacity = await inventoryService.getCapacity(listing.sellerId)
      if (sellerCapacity.available < cost.length) {
        throw new Error('卖家储物袋空间不足，无法完成交易')
      }

      // 7. 执行交易
      // 7.1 扣除买家支付物品
      await inventoryService.removeItems(buyerId, cost)

      // 7.2 给卖家支付物品
      await inventoryService.addItems(listing.sellerId, cost)

      // 7.3 给买家购买的物品
      await inventoryService.addItem(buyerId, listing.itemId, purchaseQty)

      // 8. 更新挂单
      listing.soldQuantity += purchaseQty
      if (listing.remainingQuantity <= 0) {
        listing.status = 'sold'
      }
      await manager.save(MarketListing, listing)

      // 9. 构建返回结果
      const itemTemplate = getItemTemplate(listing.itemId)
      const costWithNames = cost.map(c => {
        const t = getItemTemplate(c.itemId)
        return {
          itemId: c.itemId,
          itemName: t?.name || c.itemId,
          quantity: c.quantity
        }
      })

      return {
        purchasedItem: {
          itemId: listing.itemId,
          itemName: itemTemplate?.name || listing.itemId,
          quantity: purchaseQty
        },
        cost: costWithNames,
        listingRemaining: listing.remainingQuantity,
        message: `成功购买${purchaseQty}个${itemTemplate?.name || listing.itemId}`
      }
    })
  }

  // ==================== 辅助方法 ====================

  /**
   * 判断销售类型
   */
  private determineListingType(quantity: number, price: PriceItem[]): ListingType {
    // 如果所有价格物品数量都能被上架数量整除，则为按件出售
    const isDivisible = price.every(p => p.quantity % quantity === 0)
    return isDivisible ? 'per_item' : 'bundle'
  }

  /**
   * 计算购买费用
   */
  private calculateCost(listing: MarketListing, purchaseQty: number): PriceItem[] {
    const price = listing.price

    if (listing.listingType === 'bundle') {
      // 捆绑销售：返回总价
      return price
    }

    // 按件销售：计算单价 × 数量
    return price.map(p => ({
      itemId: p.itemId,
      quantity: Math.floor(p.quantity / listing.quantity) * purchaseQty
    }))
  }

  /**
   * 转换为带模板的挂单
   */
  private toListingWithTemplate(listing: MarketListing): MarketListingWithTemplate | null {
    const template = getItemTemplate(listing.itemId)
    if (!template) return null

    const price = listing.price
    const priceWithTemplates = price.map(p => {
      const t = getItemTemplate(p.itemId)
      return {
        itemId: p.itemId,
        quantity: p.quantity,
        template: t!
      }
    }).filter(p => p.template)

    return {
      id: listing.id,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      itemId: listing.itemId,
      itemTemplate: template,
      quantity: listing.quantity,
      soldQuantity: listing.soldQuantity,
      remainingQuantity: listing.remainingQuantity,
      listingType: listing.listingType,
      price,
      priceWithTemplates,
      unitPrice: listing.unitPrice,
      isBundle: listing.isBundle,
      status: listing.status,
      createdAt: listing.createdAt
    }
  }
}

export const marketService = new MarketService()
