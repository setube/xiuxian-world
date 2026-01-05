import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

/**
 * 古塔挑战记录
 */
@Entity('tower_records')
export class TowerRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index()
  @Column({ type: 'uuid' })
  characterId!: string

  @Column({ type: 'varchar', length: 50 })
  characterName!: string

  // 挑战的层数
  @Column({ type: 'int' })
  floor!: number

  // 层级类型: normal, elite, boss
  @Column({ type: 'varchar', length: 20 })
  floorType!: string

  // 守卫名称
  @Column({ type: 'varchar', length: 100 })
  guardianName!: string

  // 战斗结果: 1=胜利, 0=失败
  @Column({ type: 'int' })
  result!: number

  // 战斗回合数
  @Column({ type: 'int' })
  rounds!: number

  // 玩家战力
  @Column({ type: 'int' })
  characterPower!: number

  // 守卫战力
  @Column({ type: 'int' })
  guardianPower!: number

  // 造成伤害
  @Column({ type: 'int', default: 0 })
  damageDealt!: number

  // 承受伤害
  @Column({ type: 'int', default: 0 })
  damageTaken!: number

  // 获得灵石
  @Column({ type: 'int', default: 0 })
  spiritStonesGained!: number

  // 获得修为
  @Column({ type: 'int', default: 0 })
  experienceGained!: number

  // 是否首通
  @Column({ type: 'boolean', default: false })
  isFirstClear!: boolean

  // 是否全服首杀
  @Column({ type: 'boolean', default: false })
  isServerFirst!: boolean

  @CreateDateColumn()
  createdAt!: Date
}

/**
 * 全服首杀记录
 */
@Entity('tower_server_firsts')
export class TowerServerFirst {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 首杀的层数（仅首领层）
  @Index({ unique: true })
  @Column({ type: 'int' })
  floor!: number

  // 首杀玩家
  @Column({ type: 'uuid' })
  characterId!: string

  @Column({ type: 'varchar', length: 50 })
  characterName!: string

  // 首杀时间
  @CreateDateColumn()
  clearedAt!: Date
}
