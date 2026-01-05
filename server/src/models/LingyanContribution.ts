import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm'
import { Character } from './Character'
import type { ElementType } from '../game/constants/luoyun'

/**
 * 灵眼之树贡献记录实体 - 记录每个弟子每周期的贡献
 * 每个周期结束后用于计算排名和分配奖励
 */
@Entity('lingyan_contributions')
@Index(['characterId', 'cycle'], { unique: true })
export class LingyanContribution {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 角色ID
  @Column({ type: 'uuid' })
  characterId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'characterId' })
  character!: Character

  // 周期数
  @Column({ type: 'int' })
  cycle!: number

  // 贡献值
  @Column({ type: 'int', default: 0 })
  contribution!: number

  // 本周期浇灌次数
  @Column({ type: 'int', default: 0 })
  wateringCount!: number

  // 上次浇灌日期 (YYYY-MM-DD 格式，用于每日限制)
  @Column({ type: 'varchar', length: 10, nullable: true })
  lastWateringDate!: string | null

  // 献祭妖丹统计 (JSON: { tier: count })
  @Column({ type: 'text', default: '{}' })
  pillsContributedJson!: string

  // 妖丹统计getter/setter
  get pillsContributed(): Record<number, number> {
    try {
      return JSON.parse(this.pillsContributedJson || '{}')
    } catch {
      return {}
    }
  }

  set pillsContributed(value: Record<number, number>) {
    this.pillsContributedJson = JSON.stringify(value)
  }

  // 是否参与了防御
  @Column({ type: 'boolean', default: false })
  defendedInvasion!: boolean

  // 是否已领取奖励
  @Column({ type: 'boolean', default: false })
  rewardsClaimed!: boolean

  // ========== 元素贡献系统字段 ==========

  // 元素贡献统计 (JSON: { wood: number, water: number, earth: number, fire: number, metal: number })
  @Column({ type: 'text', default: '{"wood":0,"water":0,"earth":0,"fire":0,"metal":0}' })
  elementContributionsJson!: string

  // 元素贡献getter/setter
  get elementContributions(): Record<ElementType, number> {
    try {
      return JSON.parse(this.elementContributionsJson || '{"wood":0,"water":0,"earth":0,"fire":0,"metal":0}')
    } catch {
      return { wood: 0, water: 0, earth: 0, fire: 0, metal: 0 }
    }
  }

  set elementContributions(value: Record<ElementType, number>) {
    this.elementContributionsJson = JSON.stringify(value)
  }

  // 满足环境次数
  @Column({ type: 'int', default: 0 })
  environmentSatisfyCount!: number

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // 判断今日是否已浇灌
  hasWateredToday(todayDate: string): boolean {
    return this.lastWateringDate === todayDate
  }

  // 添加妖丹贡献记录
  addPillContribution(tier: number, count: number): void {
    const pills = this.pillsContributed
    pills[tier] = (pills[tier] || 0) + count
    this.pillsContributed = pills
  }

  // 获取某阶妖丹贡献数量
  getPillCount(tier: number): number {
    return this.pillsContributed[tier] || 0
  }

  // 获取总妖丹数量
  get totalPillsCount(): number {
    const pills = this.pillsContributed
    return Object.values(pills).reduce((sum, count) => sum + count, 0)
  }
}
