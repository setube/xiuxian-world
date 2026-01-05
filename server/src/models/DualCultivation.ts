import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Character } from './Character'

/**
 * 双修会话记录
 * 记录闭关双修的历史
 */
@Entity('dual_cultivation_sessions')
export class DualCultivationSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 发起者
  @Column({ type: 'uuid' })
  initiatorId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'initiatorId' })
  initiator!: Character

  // 参与者
  @Column({ type: 'uuid' })
  partnerId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'partnerId' })
  partner!: Character

  // 双修类型
  @Column({ type: 'varchar', length: 30 })
  cultivationType!: 'basic' | 'nourish' | 'harvest' // 凡尘缘 | 温养 | 采补

  // 双修状态
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: 'pending' | 'accepted' | 'completed' | 'rejected' | 'expired'

  // 开始时间
  @Column({ type: 'bigint', nullable: true })
  startedAt!: number | null

  // 结束时间
  @Column({ type: 'bigint', nullable: true })
  endedAt!: number | null

  // 双修结果
  @Column({ type: 'int', default: 0 })
  initiatorExpGain!: number // 发起者获得的修为

  @Column({ type: 'int', default: 0 })
  partnerExpGain!: number // 参与者获得的修为

  @Column({ type: 'boolean', default: false })
  hadEnlightenment!: boolean // 是否触发顿悟

  // 邀请过期时间（用于pending状态）
  @Column({ type: 'bigint', nullable: true })
  expiresAt!: number | null

  @CreateDateColumn()
  createdAt!: Date
}

/**
 * 同参契印 (道侣关系)
 * 第二层：缔结同参
 */
@Entity('soul_bonds')
export class SoulBond {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 发起者
  @Column({ type: 'uuid' })
  initiatorId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'initiatorId' })
  initiator!: Character

  // 参与者
  @Column({ type: 'uuid' })
  partnerId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'partnerId' })
  partner!: Character

  // 契约状态
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: 'pending' | 'active' | 'expired' | 'broken'

  // 契约开始时间
  @Column({ type: 'bigint', nullable: true })
  bondStartedAt!: number | null

  // 契约结束时间（7天后）
  @Column({ type: 'bigint', nullable: true })
  bondExpiresAt!: number | null

  // 累计双修温养次数
  @Column({ type: 'int', default: 0 })
  nourishCount!: number

  // 累计获得的额外宗门贡献
  @Column({ type: 'int', default: 0 })
  totalContributionGain!: number

  // 邀请过期时间
  @Column({ type: 'bigint', nullable: true })
  inviteExpiresAt!: number | null

  @CreateDateColumn()
  createdAt!: Date
}

/**
 * 心印炉鼎 (奴役关系)
 * 第三层：种下心印
 */
@Entity('soul_slaves')
export class HehuanSoulSlave {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 主人（合欢宗弟子）
  @Column({ type: 'uuid' })
  masterId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'masterId' })
  master!: Character

  // 炉鼎（被奴役者）
  @Column({ type: 'uuid' })
  slaveId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'slaveId' })
  slave!: Character

  // 奴役状态
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: 'active' | 'escaped' | 'expired'

  // 奴役开始时间
  @Column({ type: 'bigint' })
  enslavedAt!: number

  // 奴役结束时间（3天后）
  @Column({ type: 'bigint' })
  expiresAt!: number

  // 累计采补次数
  @Column({ type: 'int', default: 0 })
  harvestCount!: number

  // 累计采补获得的修为
  @Column({ type: 'int', default: 0 })
  totalHarvestedExp!: number

  // 炉鼎已尝试挣脱次数
  @Column({ type: 'int', default: 0 })
  escapeAttempts!: number

  // 上次采补时间
  @Column({ type: 'bigint', nullable: true })
  lastHarvestTime!: number | null

  @CreateDateColumn()
  createdAt!: Date
}

/**
 * 心神之战记录
 */
@Entity('soul_battles')
export class SoulBattle {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 发起者（合欢宗弟子）
  @Column({ type: 'uuid' })
  attackerId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'attackerId' })
  attacker!: Character

  // 目标
  @Column({ type: 'uuid' })
  targetId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'targetId' })
  target!: Character

  // 战斗结果
  @Column({ type: 'varchar', length: 20 })
  result!: 'attacker_win' | 'target_win'

  // 战斗详情（JSON）
  @Column({ type: 'text', nullable: true })
  battleLogJson!: string | null

  // 是否成功奴役
  @Column({ type: 'boolean', default: false })
  enslavementSuccess!: boolean

  @CreateDateColumn()
  createdAt!: Date
}
