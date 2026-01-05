import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

/**
 * 副本房间成员信息
 */
export interface DungeonMember {
  characterId: string
  name: string
  role: string // 职业: 破军/御山/灵医/咒师/影刃
  power: number // 战力快照
  spiritRoot: string // 灵根类型
  realmId: number // 境界
  joinedAt: number // 加入时间戳
}

/**
 * 副本类型
 */
export type DungeonType = 'xutian_demon'

/**
 * 副本房间状态
 */
export type DungeonRoomStatus =
  | 'waiting' // 等待中，可加入
  | 'in_progress' // 进行中
  | 'completed' // 已完成（通关）
  | 'failed' // 失败
  | 'disbanded' // 已解散

/**
 * 副本阶段
 */
export type DungeonStage = 0 | 1 | 2 | 3 // 0=未开始, 1=灵渊之地, 2=冰火之路, 3=决战蛮胡子

/**
 * 冰火之路选择
 */
export type PathChoice = 'ice' | 'fire'

/**
 * 关卡结果
 */
export interface StageResult {
  stage: number
  stageName: string
  success: boolean
  events: string[]
  bonuses: string[]
  timestamp: number
}

/**
 * 虚天殿·降魔 副本房间
 */
@Entity('dungeon_rooms')
export class DungeonRoom {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 队长信息
  @Index()
  @Column({ type: 'uuid' })
  leaderId!: string

  @Column({ type: 'varchar', length: 50 })
  leaderName!: string

  // 副本类型
  @Column({ type: 'varchar', length: 50, default: 'xutian_demon' })
  dungeonType!: DungeonType

  // 房间状态
  @Index()
  @Column({ type: 'varchar', length: 20, default: 'waiting' })
  status!: DungeonRoomStatus

  // 当前阶段: 0=未开始, 1=灵渊之地, 2=冰火之路, 3=决战蛮胡子
  @Column({ type: 'int', default: 0 })
  currentStage!: DungeonStage

  // 成员列表 (JSON)
  @Column({ type: 'text', default: '[]' })
  membersJson!: string

  get members(): DungeonMember[] {
    try {
      return JSON.parse(this.membersJson || '[]')
    } catch {
      return []
    }
  }

  set members(value: DungeonMember[]) {
    this.membersJson = JSON.stringify(value)
  }

  // 第二关选择的道路 (冰/火)
  @Column({ type: 'varchar', length: 10, nullable: true })
  selectedPath!: PathChoice | null

  // 关卡结果记录 (JSON)
  @Column({ type: 'text', default: '[]' })
  stageResultsJson!: string

  get stageResults(): StageResult[] {
    try {
      return JSON.parse(this.stageResultsJson || '[]')
    } catch {
      return []
    }
  }

  set stageResults(value: StageResult[]) {
    this.stageResultsJson = JSON.stringify(value)
  }

  // 房间密码 (可选，用于私人房间)
  @Column({ type: 'varchar', length: 20, nullable: true })
  password!: string | null

  // 最低境界要求
  @Column({ type: 'int', default: 5 })
  minRealmRequired!: number

  // 创建时间
  @CreateDateColumn()
  createdAt!: Date

  // 开始时间
  @Column({ type: 'timestamp', nullable: true })
  startedAt!: Date | null

  // 完成时间
  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null
}
