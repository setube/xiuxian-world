/**
 * 宗门掌门实体
 * 存储各宗门当前掌门信息
 */
import { Entity, PrimaryColumn, Column } from 'typeorm'

@Entity('sect_master')
export class SectMaster {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  sectId!: string // 宗门ID

  @Column({ type: 'varchar', length: 36, nullable: true })
  masterId!: string | null // 当前掌门角色ID

  @Column({ type: 'varchar', length: 50, nullable: true })
  masterName!: string | null // 掌门名称（缓存，避免频繁查询）

  @Column({ type: 'bigint', nullable: true })
  masterExperience!: number | null // 掌门修为（缓存）

  @Column({ type: 'int', nullable: true })
  masterRealmTier!: number | null // 掌门境界大阶（缓存）

  @Column({ type: 'int', nullable: true })
  masterRealmSubTier!: number | null // 掌门境界小阶（缓存）

  @Column({ type: 'bigint' })
  updatedAt!: number // 上次更新时间

  @Column({ type: 'bigint', nullable: true })
  alliancePenaltyUntil!: number | null // 背盟惩罚截止时间（72小时内不能结盟）
}
