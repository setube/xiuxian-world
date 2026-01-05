import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Character } from './Character'

/**
 * PvP挑战实体 - 简易异步1v1战斗系统
 * 记录玩家间的PvP挑战和结果
 */
@Entity('pvp_challenges')
export class PvpChallenge {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 挑战者
  @Column({ type: 'uuid' })
  challengerId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'challengerId' })
  challenger!: Character

  // 挑战者名字（冗余存储）
  @Column({ type: 'varchar', length: 50 })
  challengerName!: string

  // 被挑战者
  @Column({ type: 'uuid' })
  defenderId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'defenderId' })
  defender!: Character

  // 被挑战者名字（冗余存储）
  @Column({ type: 'varchar', length: 50 })
  defenderName!: string

  // 挑战者战力（战斗时快照）
  @Column({ type: 'int' })
  challengerPower!: number

  // 被挑战者战力（战斗时快照）
  @Column({ type: 'int' })
  defenderPower!: number

  // 胜利者ID（平局时为null）
  @Column({ type: 'uuid', nullable: true })
  winnerId!: string | null

  // 结果: challenger_win-挑战者胜, defender_win-被挑战者胜, draw-平局
  @Column({ type: 'varchar', length: 20 })
  result!: 'challenger_win' | 'defender_win' | 'draw'

  // 奖惩记录（JSON）
  @Column({ type: 'text', default: '{}' })
  rewardsJson!: string

  // 奖惩记录getter/setter
  get rewards(): {
    winnerCultivationGain: number
    loserCultivationLoss: number
    shaEnergyGain: number
  } {
    try {
      return JSON.parse(this.rewardsJson || '{}')
    } catch {
      return { winnerCultivationGain: 0, loserCultivationLoss: 0, shaEnergyGain: 0 }
    }
  }

  set rewards(value: { winnerCultivationGain: number; loserCultivationLoss: number; shaEnergyGain: number }) {
    this.rewardsJson = JSON.stringify(value)
  }

  @CreateDateColumn()
  createdAt!: Date
}
