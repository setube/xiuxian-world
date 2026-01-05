import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Character } from './Character'
import { Consort } from './Consort'

/**
 * 被窃取侍妾实体 - 黑煞教魔染红尘系统
 * 记录从星宫弟子处窃取的侍妾
 */
@Entity('stolen_consorts')
export class StolenConsort {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 窃取者（黑煞教弟子）
  @Column({ type: 'uuid' })
  thieverId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'thieverId' })
  thiever!: Character

  // 窃取者名字（冗余存储）
  @Column({ type: 'varchar', length: 50 })
  thieverName!: string

  // 原主人（星宫弟子）
  @Column({ type: 'uuid' })
  originalOwnerId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'originalOwnerId' })
  originalOwner!: Character

  // 原主人名字（冗余存储）
  @Column({ type: 'varchar', length: 50 })
  originalOwnerName!: string

  // 被窃取的侍妾
  @Column({ type: 'uuid' })
  consortId!: string

  @ManyToOne(() => Consort)
  @JoinColumn({ name: 'consortId' })
  consort!: Consort

  // 侍妾名字（冗余存储）
  @Column({ type: 'varchar', length: 50 })
  consortName!: string

  // 窃取时间
  @Column({ type: 'bigint' })
  stolenAt!: number

  // 归还时间
  @Column({ type: 'bigint' })
  expiresAt!: number

  // 今日魔音灌脑次数
  @Column({ type: 'int', default: 0 })
  brainwashCount!: number

  // 今日强索元阴次数
  @Column({ type: 'int', default: 0 })
  extractCount!: number

  // 上次操作次数重置时间（用于每日重置）
  @Column({ type: 'bigint' })
  lastActionResetAt!: number

  // 状态: active-窃取中, returned-已归还
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: 'active' | 'returned'

  @CreateDateColumn()
  createdAt!: Date
}
