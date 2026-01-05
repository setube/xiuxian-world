import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Character } from './Character'

/**
 * 周天星斗大阵实体 - 星宫专属团队系统
 * 服务器级别共享，发起者和参与者都能获得修炼加成
 */
@Entity('star_arrays')
export class StarArray {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 发起者角色ID
  @Column({ type: 'uuid' })
  initiatorId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'initiatorId' })
  initiator!: Character

  // 发起者名字（冗余存储，方便显示）
  @Column({ type: 'varchar', length: 50 })
  initiatorName!: string

  // 状态: active-进行中, completed-已完成, expired-已过期
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: 'active' | 'completed' | 'expired'

  // 开始时间
  @Column({ type: 'bigint' })
  startedAt!: number

  // 结束时间（3小时后）
  @Column({ type: 'bigint' })
  expiresAt!: number

  // 参与者ID列表（JSON数组）
  @Column({ type: 'text', default: '[]' })
  participantsJson!: string

  // 参与者列表getter/setter
  get participants(): string[] {
    try {
      return JSON.parse(this.participantsJson || '[]')
    } catch {
      return []
    }
  }

  set participants(value: string[]) {
    this.participantsJson = JSON.stringify(value)
  }

  // 参与者详情（包含名字，方便显示）
  @Column({ type: 'text', default: '[]' })
  participantDetailsJson!: string

  // 参与者详情getter/setter
  get participantDetails(): { id: string; name: string; joinedAt: number }[] {
    try {
      return JSON.parse(this.participantDetailsJson || '[]')
    } catch {
      return []
    }
  }

  set participantDetails(value: { id: string; name: string; joinedAt: number }[]) {
    this.participantDetailsJson = JSON.stringify(value)
  }

  @CreateDateColumn()
  createdAt!: Date
}
