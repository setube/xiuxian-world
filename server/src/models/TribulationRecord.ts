import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

/**
 * 渡劫记录模型
 * 记录结丹之劫、元婴之劫的尝试，用于天机回溯
 */
@Entity('tribulation_records')
export class TribulationRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 角色ID
  @Column({ type: 'uuid' })
  characterId!: string

  // 角色名称（冗余存储）
  @Column({ type: 'varchar', length: 50 })
  characterName!: string

  // 用户ID（用于角色死亡后恢复）
  @Column({ type: 'uuid' })
  userId!: string

  // 渡劫类型: foundation（筑基）/ core_formation（结丹）/ nascent_soul（元婴）
  @Column({ type: 'varchar', length: 20 })
  tribulationType!: string

  // 是否成功
  @Column({ type: 'boolean' })
  success!: boolean

  // 消耗的物品（JSON，用于回溯时返还）
  @Column({ type: 'text', nullable: true })
  consumedItemsJson!: string | null

  get consumedItems(): { itemId: string; quantity: number; name: string }[] {
    if (!this.consumedItemsJson) return []
    try {
      return JSON.parse(this.consumedItemsJson)
    } catch {
      return []
    }
  }

  set consumedItems(value: { itemId: string; quantity: number; name: string }[]) {
    this.consumedItemsJson = JSON.stringify(value)
  }

  // 原境界tier
  @Column({ type: 'int' })
  originalTier!: number

  // 原境界subTier
  @Column({ type: 'int' })
  originalSubTier!: number

  // 原境界ID
  @Column({ type: 'int' })
  originalRealmId!: number

  // 原境界名称
  @Column({ type: 'varchar', length: 50 })
  originalRealmName!: string

  // 角色死亡时的完整数据快照（用于天机回溯恢复）
  @Column({ type: 'text', nullable: true })
  characterSnapshotJson!: string | null

  // 是否已回溯
  @Column({ type: 'boolean', default: false })
  rolledBack!: boolean

  // 执行回溯的管理员ID
  @Column({ type: 'uuid', nullable: true })
  rolledBackBy!: string | null

  // 回溯时间
  @Column({ type: 'bigint', nullable: true })
  rolledBackAt!: number | null

  // 尝试时间
  @Column({ type: 'bigint' })
  attemptedAt!: number

  @CreateDateColumn()
  createdAt!: Date
}
