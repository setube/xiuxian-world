import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, Index } from 'typeorm'
import { Character } from './Character'

/**
 * 元婴实体 - 记录角色的元婴状态和属性
 * 每个角色最多拥有一个元婴
 */
@Entity('nascent_souls')
@Index(['characterId'], { unique: true })
export class NascentSoul {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 角色ID
  @Column({ type: 'uuid' })
  characterId!: string

  @OneToOne(() => Character)
  @JoinColumn({ name: 'characterId' })
  character!: Character

  // 元婴等级 (1-10)
  @Column({ type: 'int', default: 1 })
  level!: number

  // 当前经验
  @Column({ type: 'int', default: 0 })
  exp!: number

  // 元婴状态: idle(静养) / projecting(出窍中) / cultivating(闭关中)
  @Column({ type: 'varchar', length: 20, default: 'idle' })
  status!: 'idle' | 'projecting' | 'cultivating'

  // 活动开始时间 (出窍/闭关开始时间)
  @Column({ type: 'bigint', nullable: true })
  activityStartAt!: number | null

  // 上次结算时间 (闭关修为结算用)
  @Column({ type: 'bigint', nullable: true })
  lastSettleAt!: number | null

  // 累积奖励 (JSON字符串，用于存储出窍/闭关累积的奖励)
  @Column({ type: 'text', default: '{}' })
  accumulatedRewardsJson!: string

  // 累积奖励getter/setter
  get accumulatedRewards(): {
    cultivation?: number
    items?: { id: string; quantity: number }[]
  } {
    try {
      return JSON.parse(this.accumulatedRewardsJson || '{}')
    } catch {
      return {}
    }
  }

  set accumulatedRewards(value: {
    cultivation?: number
    items?: { id: string; quantity: number }[]
  }) {
    this.accumulatedRewardsJson = JSON.stringify(value)
  }

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // ========== 辅助方法 ==========

  // 判断是否处于活动中
  isActive(): boolean {
    return this.status !== 'idle'
  }

  // 判断是否在出窍中
  isProjecting(): boolean {
    return this.status === 'projecting'
  }

  // 判断是否在闭关中
  isCultivating(): boolean {
    return this.status === 'cultivating'
  }

  // 获取活动已持续时间（毫秒）
  getElapsedTime(): number {
    if (!this.activityStartAt) return 0
    return Date.now() - this.activityStartAt
  }

  // 开始出窍
  startProjection(): void {
    this.status = 'projecting'
    this.activityStartAt = Date.now()
    this.lastSettleAt = null
    this.accumulatedRewards = {}
  }

  // 开始闭关
  startCultivation(): void {
    this.status = 'cultivating'
    this.activityStartAt = Date.now()
    this.lastSettleAt = Date.now()
    this.accumulatedRewards = { cultivation: 0 }
  }

  // 结束活动，返回静养状态
  returnToIdle(): void {
    this.status = 'idle'
    this.activityStartAt = null
    this.lastSettleAt = null
    this.accumulatedRewards = {}
  }

  // 添加累积修为
  addAccumulatedCultivation(amount: number): void {
    const rewards = this.accumulatedRewards
    rewards.cultivation = (rewards.cultivation || 0) + amount
    this.accumulatedRewards = rewards
  }

  // 添加累积物品
  addAccumulatedItem(itemId: string, quantity: number): void {
    const rewards = this.accumulatedRewards
    if (!rewards.items) {
      rewards.items = []
    }
    const existingItem = rewards.items.find(i => i.id === itemId)
    if (existingItem) {
      existingItem.quantity += quantity
    } else {
      rewards.items.push({ id: itemId, quantity })
    }
    this.accumulatedRewards = rewards
  }
}
