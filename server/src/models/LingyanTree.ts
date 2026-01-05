import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import type { TreeEnvironment, ElementType } from '../game/constants/luoyun'

/**
 * 灵眼之树实体 - 落云宗专属全服共享系统
 * 全局单例模式，所有落云宗弟子共同培育一棵灵眼之树
 */
@Entity('lingyan_trees')
export class LingyanTree {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 成熟度 (0-10000, 表示 0.00%-100.00%)
  @Column({ type: 'int', default: 0 })
  maturity!: number

  // 当前周期数
  @Column({ type: 'int', default: 1 })
  cycle!: number

  // 状态: growing-生长中, harvesting-收获期, invaded-被入侵
  @Column({ type: 'varchar', length: 20, default: 'growing' })
  status!: 'growing' | 'harvesting' | 'invaded'

  // 入侵开始时间
  @Column({ type: 'bigint', nullable: true })
  invasionStartedAt!: number | null

  // 防御者ID列表（JSON数组）
  @Column({ type: 'text', nullable: true })
  invasionDefendersJson!: string | null

  // 防御者列表getter/setter
  get invasionDefenders(): string[] {
    try {
      return JSON.parse(this.invasionDefendersJson || '[]')
    } catch {
      return []
    }
  }

  set invasionDefenders(value: string[]) {
    this.invasionDefendersJson = JSON.stringify(value)
  }

  // 上次收获时间
  @Column({ type: 'bigint', nullable: true })
  lastHarvestAt!: number | null

  // 收获期开始时间
  @Column({ type: 'bigint', nullable: true })
  harvestStartedAt!: number | null

  // ========== 环境系统字段 ==========

  // 当前环境状态
  @Column({ type: 'varchar', length: 20, default: 'thirsty' })
  environment!: TreeEnvironment

  // 上次环境变化时间
  @Column({ type: 'bigint', default: () => 'EXTRACT(EPOCH FROM NOW()) * 1000' })
  lastEnvironmentChangeAt!: number

  // 环境是否已被满足
  @Column({ type: 'boolean', default: false })
  environmentSatisfied!: boolean

  // 满足环境的角色ID
  @Column({ type: 'uuid', nullable: true })
  environmentSatisfiedBy!: string | null

  // ========== 成长阶段系统字段 ==========

  // 当前成长阶段 (1-4)
  @Column({ type: 'int', default: 1 })
  currentStage!: number

  // 阶段元素池 JSON { wood: number, water: number, earth: number, fire: number, metal: number }
  @Column({ type: 'text', default: '{"wood":0,"water":0,"earth":0,"fire":0,"metal":0}' })
  stageElementPoolJson!: string

  // 元素池getter/setter
  get stageElementPool(): Record<ElementType, number> {
    try {
      return JSON.parse(this.stageElementPoolJson || '{"wood":0,"water":0,"earth":0,"fire":0,"metal":0}')
    } catch {
      return { wood: 0, water: 0, earth: 0, fire: 0, metal: 0 }
    }
  }

  set stageElementPool(value: Record<ElementType, number>) {
    this.stageElementPoolJson = JSON.stringify(value)
  }

  // 灵纹数量 (0-4)
  @Column({ type: 'int', default: 0 })
  spiritPatterns!: number

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // 计算成熟度百分比 (0.00 - 100.00)
  get maturityPercent(): number {
    return this.maturity / 100
  }

  // 判断是否成熟
  get isMature(): boolean {
    return this.maturity >= 10000
  }

  // 判断是否正在被入侵
  get isInvaded(): boolean {
    return this.status === 'invaded' && this.invasionStartedAt !== null
  }

  // 判断是否可以收获
  get canHarvest(): boolean {
    return this.status === 'harvesting'
  }

  // 获取防御者数量
  get defendersCount(): number {
    return this.invasionDefenders.length
  }
}
