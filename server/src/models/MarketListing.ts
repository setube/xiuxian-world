import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm'
import { Character } from './Character'

export type ListingType = 'per_item' | 'bundle'
export type ListingStatus = 'active' | 'sold' | 'cancelled'

export interface PriceItem {
  itemId: string
  quantity: number
}

@Entity('market_listings')
@Index(['status', 'createdAt'])
@Index(['sellerId', 'status'])
export class MarketListing {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 卖家信息
  @Column({ type: 'uuid' })
  @Index()
  sellerId!: string

  @ManyToOne(() => Character, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerId' })
  seller!: Character

  @Column({ type: 'varchar', length: 50 })
  sellerName!: string // 缓存显示用，避免每次查询都要join

  // 出售物品
  @Column({ type: 'varchar', length: 100 })
  @Index()
  itemId!: string // 物品模板ID

  @Column({ type: 'int' })
  quantity!: number // 上架总数量

  @Column({ type: 'int', default: 0 })
  soldQuantity!: number // 已售数量（仅per_item类型使用）

  // 销售类型
  @Column({ type: 'varchar', length: 20, default: 'bundle' })
  listingType!: ListingType // 'per_item' 按件出售 | 'bundle' 捆绑出售

  // 价格配置 (JSON)
  @Column({ type: 'text' })
  priceJson!: string // [{itemId, quantity}, ...]

  // 状态
  @Column({ type: 'varchar', length: 20, default: 'active' })
  @Index()
  status!: ListingStatus // 'active' | 'sold' | 'cancelled'

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // ==================== Getters/Setters ====================

  // 价格数组 getter/setter
  get price(): PriceItem[] {
    if (!this.priceJson) return []
    try {
      return JSON.parse(this.priceJson)
    } catch {
      return []
    }
  }

  set price(value: PriceItem[]) {
    this.priceJson = JSON.stringify(value)
  }

  // 剩余数量
  get remainingQuantity(): number {
    return this.quantity - this.soldQuantity
  }

  // 单价（仅per_item类型有效）
  get unitPrice(): PriceItem[] | null {
    if (this.listingType !== 'per_item' || this.quantity === 0) return null
    return this.price.map(p => ({
      itemId: p.itemId,
      quantity: Math.floor(p.quantity / this.quantity)
    }))
  }

  // 是否为捆绑销售
  get isBundle(): boolean {
    return this.listingType === 'bundle'
  }
}
