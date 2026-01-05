import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm'
import { Character } from './Character'

@Entity('inventory_items')
@Index(['characterId', 'itemId'])
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  characterId!: string

  @ManyToOne(() => Character, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'characterId' })
  character!: Character

  @Column({ type: 'varchar', length: 100 })
  @Index()
  itemId!: string // 对应常量配置中的物品模板ID

  @Column({ type: 'int', default: 1 })
  quantity!: number // 堆叠数量

  // 唯一物品的额外属性（JSON存储）
  @Column({ type: 'text', nullable: true })
  extraDataJson!: string | null

  // 物品绑定状态
  @Column({ type: 'boolean', default: false })
  isBound!: boolean // 是否绑定（绑定后不可赠送）

  // 获取时间（用于排序）
  @Column({ type: 'bigint' })
  obtainedAt!: number

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // extraData getter/setter
  get extraData(): Record<string, unknown> | null {
    if (!this.extraDataJson) return null
    try {
      return JSON.parse(this.extraDataJson)
    } catch {
      return null
    }
  }

  set extraData(value: Record<string, unknown> | null) {
    this.extraDataJson = value ? JSON.stringify(value) : null
  }
}
