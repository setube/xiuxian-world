import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm'
import { Character } from './Character'

/**
 * 引星盘实体 - 星宫专属观星台系统
 * 用于凝聚星辰产出材料
 */
@Entity('star_disks')
export class StarDisk {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 所属角色
  @Column({ type: 'uuid' })
  characterId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'characterId' })
  character!: Character

  // 引星盘编号 (0-5)
  @Column({ type: 'int' })
  diskIndex!: number

  // 状态: idle-空闲, gathering-凝聚中, ready-精华已成, event-有事件
  @Column({ type: 'varchar', length: 20, default: 'idle' })
  status!: 'idle' | 'gathering' | 'ready' | 'event'

  // 正在凝聚的星辰类型 (star_essence/star_liquid/star_core)
  @Column({ type: 'varchar', length: 50, nullable: true })
  starType!: string | null

  // 开始凝聚时间
  @Column({ type: 'bigint', nullable: true })
  startedAt!: number | null

  // 预计完成时间
  @Column({ type: 'bigint', nullable: true })
  readyAt!: number | null

  // 事件类型: none-无, dim-星光黯淡, chaos-元磁紊乱
  @Column({ type: 'varchar', length: 20, default: 'none' })
  eventType!: 'none' | 'dim' | 'chaos'

  // 事件开始时间
  @Column({ type: 'bigint', nullable: true })
  eventStartAt!: number | null

  // 派遣的侍妾ID
  @Column({ type: 'uuid', nullable: true })
  assignedConsortId!: string | null

  // 是否有侍妾加成（在凝聚开始时确定）
  @Column({ type: 'boolean', default: false })
  hasConsortBonus!: boolean

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
