import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { BloodSoulBanner } from './BloodSoulBanner'

/**
 * 炼化槽实体 - 血魂幡的生产线
 * 用于将魂魄炼化为材料
 */
@Entity('refinement_slots')
export class RefinementSlot {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 所属血魂幡
  @Column({ type: 'uuid' })
  bannerId!: string

  @ManyToOne(() => BloodSoulBanner)
  @JoinColumn({ name: 'bannerId' })
  banner!: BloodSoulBanner

  // 槽位索引 (0-4)
  @Column({ type: 'int' })
  slotIndex!: number

  // 正在炼化的魂魄类型
  @Column({ type: 'varchar', length: 50, nullable: true })
  soulType!: string | null

  // 状态: empty-空闲, refining-炼化中, complete-已完成
  @Column({ type: 'varchar', length: 20, default: 'empty' })
  status!: 'empty' | 'refining' | 'complete'

  // 炼化开始时间
  @Column({ type: 'bigint', nullable: true })
  startTime!: number | null

  // 炼化结束时间
  @Column({ type: 'bigint', nullable: true })
  endTime!: number | null

  // 稳定度 (0-100)，需要安抚幡灵维护
  @Column({ type: 'int', default: 100 })
  stability!: number

  // 上次维护时间
  @Column({ type: 'bigint', nullable: true })
  lastMaintenanceTime!: number | null

  @CreateDateColumn()
  createdAt!: Date
}
