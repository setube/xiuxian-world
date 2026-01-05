/**
 * 宗门外交关系实体
 * 存储宗门间的外交状态（友好/敌对/结盟/中立）
 */
import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'

export type DiplomacyStatus = 'friendly' | 'hostile' | 'allied' | 'neutral'

@Entity('sect_diplomacy')
@Index(['sourceSectId', 'targetSectId'], { unique: true })
export class SectDiplomacy {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 50 })
  @Index()
  sourceSectId!: string // 发起方宗门ID

  @Column({ type: 'varchar', length: 50 })
  @Index()
  targetSectId!: string // 目标宗门ID

  @Column({ type: 'varchar', length: 20, default: 'neutral' })
  status!: DiplomacyStatus // 外交状态

  @Column({ type: 'bigint' })
  createdAt!: number // 创建时间

  @Column({ type: 'bigint', nullable: true })
  lastChangedAt!: number | null // 上次状态变更时间（用于24小时冷却）

  @Column({ type: 'bigint', nullable: true })
  allianceProposedAt!: number | null // 结盟请求发起时间（1小时有效期）

  @Column({ type: 'varchar', length: 36, nullable: true })
  allianceProposedBy!: string | null // 结盟请求发起者角色ID
}
