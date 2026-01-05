import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm'
import { Character } from './Character'

// 地块类型
export type PlotType = 'normal' | 'elder'

// 地块状态
export type PlotStatus = 'empty' | 'growing' | 'mature' | 'withered'

// 事件类型
export type GardenEventType = 'none' | 'weed' | 'pest' | 'drought'

@Entity('herb_garden_plots')
@Index(['characterId', 'plotIndex'], { unique: true })
export class HerbGardenPlot {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  characterId!: string

  @ManyToOne(() => Character, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'characterId' })
  character!: Character

  // 地块编号 (0-10, 其中 8-10 为长老专属)
  @Column({ type: 'int' })
  plotIndex!: number

  // 地块类型
  @Column({ type: 'varchar', length: 20, default: 'normal' })
  plotType!: PlotType

  // 地块状态
  @Column({ type: 'varchar', length: 20, default: 'empty' })
  status!: PlotStatus

  // 种植的种子ID
  @Column({ type: 'varchar', length: 100, nullable: true })
  seedId!: string | null

  // 种植时间（时间戳）
  @Column({ type: 'bigint', nullable: true })
  plantedAt!: number | null

  // 预计成熟时间（时间戳）
  @Column({ type: 'bigint', nullable: true })
  matureAt!: number | null

  // 当前事件类型
  @Column({ type: 'varchar', length: 20, default: 'none' })
  eventType!: GardenEventType

  // 事件开始时间（时间戳）
  @Column({ type: 'bigint', nullable: true })
  eventStartAt!: number | null

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // 辅助方法：检查是否为空闲地块
  isAvailable(): boolean {
    return this.status === 'empty'
  }

  // 辅助方法：检查是否已成熟
  isMature(): boolean {
    if (this.status !== 'growing' || !this.matureAt) return false
    return Date.now() >= this.matureAt
  }

  // 辅助方法：检查是否有事件需要处理
  hasEvent(): boolean {
    return this.eventType !== 'none'
  }

  // 辅助方法：获取生长进度（0-100）
  getGrowthProgress(): number {
    if (this.status !== 'growing' || !this.plantedAt || !this.matureAt) return 0
    const now = Date.now()
    if (now >= this.matureAt) return 100
    const total = this.matureAt - this.plantedAt
    const elapsed = now - this.plantedAt
    return Math.floor((elapsed / total) * 100)
  }

  // 辅助方法：获取剩余时间（毫秒）
  getRemainingTime(): number {
    if (this.status !== 'growing' || !this.matureAt) return 0
    return Math.max(0, this.matureAt - Date.now())
  }
}
