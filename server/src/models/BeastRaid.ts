import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Character } from './Character'
import { SpiritBeast } from './SpiritBeast'

/**
 * 灵兽偷菜记录实体 - 万灵宗灵兽偷菜系统
 * 记录灵兽偷菜的历史记录
 */
@Entity('beast_raids')
export class BeastRaid {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 发起偷菜的角色（万灵宗弟子）
  @Column({ type: 'uuid' })
  raiderId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'raiderId' })
  raider!: Character

  // 发起偷菜的角色名（冗余存储）
  @Column({ type: 'varchar', length: 50 })
  raiderName!: string

  // 执行任务的灵兽
  @Column({ type: 'uuid' })
  beastId!: string

  @ManyToOne(() => SpiritBeast)
  @JoinColumn({ name: 'beastId' })
  beast!: SpiritBeast

  // 灵兽名（冗余存储）
  @Column({ type: 'varchar', length: 50 })
  beastName!: string

  // 被偷的目标角色（黄枫谷弟子）
  @Column({ type: 'uuid' })
  targetId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'targetId' })
  target!: Character

  // 目标角色名（冗余存储）
  @Column({ type: 'varchar', length: 50 })
  targetName!: string

  // 是否成功
  @Column({ type: 'boolean' })
  success!: boolean

  // 奖励物品列表（JSON字符串）
  @Column({ type: 'text', default: '[]' })
  rewardsJson!: string

  // 奖励getter/setter
  get rewards(): { itemId: string; itemName: string; count: number }[] {
    try {
      return JSON.parse(this.rewardsJson || '[]')
    } catch {
      return []
    }
  }

  set rewards(value: { itemId: string; itemName: string; count: number }[]) {
    this.rewardsJson = JSON.stringify(value)
  }

  // 灵兽是否受伤
  @Column({ type: 'boolean', default: false })
  beastInjured!: boolean

  // 忠诚度变化
  @Column({ type: 'int', default: 0 })
  loyaltyChange!: number

  @CreateDateColumn()
  createdAt!: Date
}
