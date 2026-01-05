import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

/**
 * 世界事件模型
 * 记录天道演化的祥瑞与厄运事件
 */
@Entity('world_events')
export class WorldEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 事件类型: blessing（祥瑞）/ calamity（厄运）
  @Column({ type: 'varchar', length: 20 })
  type!: string

  // 效果类型: exp_bonus, spirit_stones, cultivation_buff, rare_item, exp_loss, item_loss, cultivation_debuff
  @Column({ type: 'varchar', length: 50 })
  effectType!: string

  // 目标角色ID
  @Column({ type: 'uuid' })
  targetCharacterId!: string

  // 目标角色名称（冗余存储，方便展示）
  @Column({ type: 'varchar', length: 50 })
  targetCharacterName!: string

  // 事件描述
  @Column({ type: 'text' })
  description!: string

  // 效果数值（修为、灵石数量或buff百分比）
  @Column({ type: 'int', default: 0 })
  value!: number

  // 获得的物品ID（如果是物品奖励）
  @Column({ type: 'varchar', length: 50, nullable: true })
  itemId!: string | null

  // 物品名称
  @Column({ type: 'varchar', length: 100, nullable: true })
  itemName!: string | null

  // Buff/Debuff过期时间
  @Column({ type: 'bigint', nullable: true })
  buffExpiresAt!: number | null

  // 事件触发时间
  @Column({ type: 'bigint' })
  triggeredAt!: number

  @CreateDateColumn()
  createdAt!: Date
}
