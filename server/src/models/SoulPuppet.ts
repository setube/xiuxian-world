import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Character } from './Character'

/**
 * 傀儡实体 - 黑煞教夺舍魔功系统
 * 记录被奴役的玩家及奴役状态
 */
@Entity('soul_puppets')
export class SoulPuppet {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 主人（黑煞教弟子）
  @Column({ type: 'uuid' })
  masterId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'masterId' })
  master!: Character

  // 主人名字（冗余存储）
  @Column({ type: 'varchar', length: 50 })
  masterName!: string

  // 傀儡（被奴役者）
  @Column({ type: 'uuid' })
  puppetId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'puppetId' })
  puppet!: Character

  // 傀儡名字（冗余存储）
  @Column({ type: 'varchar', length: 50 })
  puppetName!: string

  // 傀儡境界ID（冗余存储，用于战力计算）
  @Column({ type: 'int' })
  puppetRealmId!: number

  // 奴役开始时间
  @Column({ type: 'bigint' })
  enslaveStartAt!: number

  // 奴役结束时间
  @Column({ type: 'bigint' })
  enslaveExpiresAt!: number

  // 状态: active-生效中, expired-已过期
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: 'active' | 'expired'

  @CreateDateColumn()
  createdAt!: Date
}
