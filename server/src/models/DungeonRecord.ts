import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'
import { DungeonType, DungeonMember } from './DungeonRoom'

/**
 * 副本结果
 */
export type DungeonResult = 'success' | 'failed'

/**
 * 奖励信息
 */
export interface DungeonReward {
  characterId: string
  characterName: string
  spiritStones: number
  cultivation: number
  sectContribution: number
  items: { itemId: string; name: string; quantity: number }[]
  xutianDingFragment: boolean // 是否获得虚天鼎残片
  isFirstClear: boolean // 是否首通
}

/**
 * 副本通关记录
 */
@Entity('dungeon_records')
export class DungeonRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 关联房间ID
  @Index()
  @Column({ type: 'uuid' })
  roomId!: string

  // 副本类型
  @Column({ type: 'varchar', length: 50 })
  dungeonType!: DungeonType

  // 结果: success=通关, failed=失败
  @Column({ type: 'varchar', length: 20 })
  result!: DungeonResult

  // 失败时停在哪一关 (0=未开始就失败, 1-3=对应关卡失败)
  @Column({ type: 'int', nullable: true })
  failedAtStage!: number | null

  // 通关关数 (0-3)
  @Column({ type: 'int', default: 0 })
  clearedStages!: number

  // 团队快照 (JSON)
  @Column({ type: 'text' })
  teamSnapshotJson!: string

  get teamSnapshot(): DungeonMember[] {
    try {
      return JSON.parse(this.teamSnapshotJson || '[]')
    } catch {
      return []
    }
  }

  set teamSnapshot(value: DungeonMember[]) {
    this.teamSnapshotJson = JSON.stringify(value)
  }

  // 奖励分配 (JSON)
  @Column({ type: 'text', default: '[]' })
  rewardsJson!: string

  get rewards(): DungeonReward[] {
    try {
      return JSON.parse(this.rewardsJson || '[]')
    } catch {
      return []
    }
  }

  set rewards(value: DungeonReward[]) {
    this.rewardsJson = JSON.stringify(value)
  }

  // 副本持续时间 (毫秒)
  @Column({ type: 'bigint', default: 0 })
  duration!: number

  // 队长ID
  @Index()
  @Column({ type: 'uuid' })
  leaderId!: string

  // 队长名称
  @Column({ type: 'varchar', length: 50 })
  leaderName!: string

  // 通关时间
  @CreateDateColumn()
  clearedAt!: Date
}

/**
 * 玩家副本历史记录 (个人维度)
 */
@Entity('player_dungeon_records')
export class PlayerDungeonRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 玩家ID
  @Index()
  @Column({ type: 'uuid' })
  characterId!: string

  // 关联副本记录
  @Column({ type: 'uuid' })
  dungeonRecordId!: string

  // 副本类型
  @Column({ type: 'varchar', length: 50 })
  dungeonType!: DungeonType

  // 结果
  @Column({ type: 'varchar', length: 20 })
  result!: DungeonResult

  // 通关关数
  @Column({ type: 'int', default: 0 })
  clearedStages!: number

  // 担任职业
  @Column({ type: 'varchar', length: 20 })
  role!: string

  // 获得奖励 (JSON)
  @Column({ type: 'text', default: '{}' })
  rewardJson!: string

  get reward(): Omit<DungeonReward, 'characterId' | 'characterName'> | null {
    try {
      return JSON.parse(this.rewardJson || 'null')
    } catch {
      return null
    }
  }

  set reward(value: Omit<DungeonReward, 'characterId' | 'characterName'> | null) {
    this.rewardJson = JSON.stringify(value)
  }

  // 是否为首通
  @Column({ type: 'boolean', default: false })
  isFirstClear!: boolean

  // 是否为队长
  @Column({ type: 'boolean', default: false })
  wasLeader!: boolean

  // 记录时间
  @CreateDateColumn()
  recordedAt!: Date
}
