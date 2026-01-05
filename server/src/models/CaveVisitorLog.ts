import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { Character } from './Character'

// 访客类型
export type VisitorType = 'npc' | 'player'

// 访客处理动作
export type VisitorAction = 'received' | 'expelled' | 'expired'

// 访客结果
export interface VisitorResult {
  outcomeType: string // 结果类型
  description: string // 结果描述
  rewards?: {
    spiritStones?: number
    exp?: number
    items?: { itemId: string; quantity: number; itemName: string }[]
  }
  penalties?: {
    spiritStones?: number
    exp?: number
    debuff?: { type: string; duration: number }
  }
}

@Entity('cave_visitor_logs')
export class CaveVisitorLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  caveOwnerId!: string // 洞府主人ID

  @ManyToOne(() => Character, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'caveOwnerId' })
  caveOwner!: Character

  @Column({ type: 'varchar', length: 20 })
  visitorType!: VisitorType // 访客类型: npc | player

  @Column({ type: 'varchar', length: 50, nullable: true })
  visitorTypeId!: string | null // NPC访客配置ID (npc类型时使用)

  @Column({ type: 'uuid', nullable: true })
  visitorCharacterId!: string | null // 玩家访客角色ID (player类型时使用)

  @Column({ type: 'varchar', length: 50 })
  visitorName!: string // 访客名称

  @Column({ type: 'varchar', length: 20 })
  action!: VisitorAction // 处理动作

  @Column({ type: 'text', nullable: true })
  resultJson!: string | null // 访客事件结果 (JSON)

  get result(): VisitorResult | null {
    if (!this.resultJson) return null
    try {
      return JSON.parse(this.resultJson)
    } catch {
      return null
    }
  }

  set result(value: VisitorResult | null) {
    this.resultJson = value ? JSON.stringify(value) : null
  }

  @Column({ type: 'bigint' })
  visitedAt!: number // 访问时间戳

  @CreateDateColumn()
  createdAt!: Date
}
