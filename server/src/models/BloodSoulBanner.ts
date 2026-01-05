import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Character } from './Character'

/**
 * 血魂幡实体 - 黑煞教本命魔宝
 * 每个黑煞教弟子筑基后获得一个血魂幡
 */
@Entity('blood_soul_banners')
export class BloodSoulBanner {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 所属角色
  @Column({ type: 'uuid', unique: true })
  characterId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'characterId' })
  character!: Character

  // 血魂幡等阶 (1-10)
  @Column({ type: 'int', default: 1 })
  level!: number

  // 上次每日献祭时间
  @Column({ type: 'bigint', nullable: true })
  lastDailySacrificeTime!: number | null

  // 今日化功为煞获得的煞气量
  @Column({ type: 'int', default: 0 })
  dailyConvertedSha!: number

  // 上次化功为煞日期 (用于每日重置)
  @Column({ type: 'varchar', length: 20, nullable: true })
  lastConvertDate!: string | null

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
