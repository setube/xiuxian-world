import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { Character } from './Character'

// 万宝阁展示槽位
export interface TreasureSlot {
  slot: number // 0-2
  inventoryItemId: string
  itemId: string
  itemName: string
  displayedAt: number
}

// 当前访客数据
export interface CurrentVisitor {
  visitorTypeId: string
  name: string
  description: string
  arrivalTime: number
  expiresAt: number
}

@Entity('cave_dwellings')
export class CaveDwelling {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid', unique: true })
  @Index()
  characterId!: string

  @OneToOne(() => Character, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'characterId' })
  character!: Character

  // ========== 灵脉系统 ==========

  @Column({ type: 'int', default: 1 })
  spiritVeinLevel!: number

  @Column({ type: 'bigint', default: 0 })
  spiritEnergy!: number // 当前已收取的灵气储量

  @Column({ type: 'bigint', nullable: true })
  lastSpiritHarvestTime!: number | null // 上次收取灵气时间

  // ========== 静室系统 ==========

  @Column({ type: 'int', default: 1 })
  meditationChamberLevel!: number

  @Column({ type: 'bigint', nullable: true })
  lastMeditationTime!: number | null // 上次转化时间

  // ========== 万宝阁 (3个固定槽位) ==========

  @Column({ type: 'text', default: '[]' })
  treasureDisplayJson!: string

  get treasureDisplay(): TreasureSlot[] {
    try {
      return JSON.parse(this.treasureDisplayJson || '[]')
    } catch {
      return []
    }
  }

  set treasureDisplay(value: TreasureSlot[]) {
    this.treasureDisplayJson = JSON.stringify(value)
  }

  // ========== 访客系统 ==========

  @Column({ type: 'text', nullable: true })
  currentVisitorJson!: string | null

  get currentVisitor(): CurrentVisitor | null {
    if (!this.currentVisitorJson) return null
    try {
      return JSON.parse(this.currentVisitorJson)
    } catch {
      return null
    }
  }

  set currentVisitor(value: CurrentVisitor | null) {
    this.currentVisitorJson = value ? JSON.stringify(value) : null
  }

  @Column({ type: 'bigint', nullable: true })
  lastVisitorCheckTime!: number | null // 上次检查访客时间

  // ========== 已展示的景观 ==========

  @Column({ type: 'text', default: '[]' })
  displayedSceneriesJson!: string

  get displayedSceneries(): string[] {
    try {
      return JSON.parse(this.displayedSceneriesJson || '[]')
    } catch {
      return []
    }
  }

  set displayedSceneries(value: string[]) {
    this.displayedSceneriesJson = JSON.stringify(value)
  }

  // ========== 统计数据 ==========

  @Column({ type: 'int', default: 0 })
  totalVisitorsReceived!: number // 累计接待访客数

  @Column({ type: 'int', default: 0 })
  totalVisitorsExpelled!: number // 累计驱逐访客数

  @Column({ type: 'int', default: 0 })
  totalGuestMessages!: number // 累计收到留言数

  @Column({ type: 'int', default: 0 })
  totalPlayerVisits!: number // 累计被玩家拜访次数

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // ========== 辅助方法 ==========

  // 获取万宝阁某个槽位
  getTreasureSlot(slot: number): TreasureSlot | undefined {
    return this.treasureDisplay.find((t) => t.slot === slot)
  }

  // 检查访客是否过期
  isVisitorExpired(): boolean {
    const visitor = this.currentVisitor
    if (!visitor) return true
    return Date.now() > visitor.expiresAt
  }
}
