import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Character } from './Character'

/**
 * 木人阁切磋记录
 * 记录玩家与木人傀儡的战斗结果
 */
@Entity('wooden_dummy_records')
export class WoodenDummyRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 挑战者
  @Column({ type: 'uuid' })
  characterId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'characterId' })
  character!: Character

  // 挑战者名字（冗余存储）
  @Column({ type: 'varchar', length: 50 })
  characterName!: string

  // 木人境界
  @Column({ type: 'int' })
  dummyRealmTier!: number

  @Column({ type: 'int' })
  dummyRealmSubTier!: number

  // 木人名称
  @Column({ type: 'varchar', length: 50 })
  dummyName!: string

  // 战斗结果: 0=失败, 1=胜利, 2=平局
  @Column({ type: 'int' })
  result!: number

  // 坚持回合数
  @Column({ type: 'int' })
  roundsLasted!: number

  // 总回合数
  @Column({ type: 'int' })
  totalRounds!: number

  // 造成的总伤害
  @Column({ type: 'int' })
  damageDealt!: number

  // 承受的总伤害
  @Column({ type: 'int' })
  damageTaken!: number

  // 玩家战力（战斗时快照）
  @Column({ type: 'int' })
  characterPower!: number

  // 木人战力
  @Column({ type: 'int' })
  dummyPower!: number

  // 消耗灵石
  @Column({ type: 'bigint' })
  spiritStonesCost!: number

  // 战斗详情（JSON）
  @Column({ type: 'text', default: '[]' })
  battleLogJson!: string

  // 战斗详情getter/setter
  get battleLog(): BattleRound[] {
    try {
      return JSON.parse(this.battleLogJson || '[]')
    } catch {
      return []
    }
  }

  set battleLog(value: BattleRound[]) {
    this.battleLogJson = JSON.stringify(value)
  }

  @CreateDateColumn()
  createdAt!: Date
}

/**
 * 战斗回合记录
 */
export interface BattleRound {
  round: number
  attackerAction: string
  defenderAction: string
  attackerDamage: number
  defenderDamage: number
  attackerHpRemaining: number
  defenderHpRemaining: number
  events: string[]
}

/**
 * 战斗结果常量
 */
export const BATTLE_RESULT = {
  LOSE: 0,
  WIN: 1,
  DRAW: 2
} as const
