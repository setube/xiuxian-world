import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity('realms')
export class Realm {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'varchar', length: 50 })
  name!: string

  @Column({ type: 'int' })
  tier!: number // 大境界 (1=炼气, 2=筑基, etc.)

  @Column({ type: 'int' })
  subTier!: number // 小境界 (1=初期, 2=中期, 3=后期, 4=圆满)

  @Column({ type: 'bigint' })
  requiredExperience!: number

  @Column({ type: 'int' })
  breakthroughDifficulty!: number // 突破难度 (1-100)

  @Column({ type: 'int', default: 0 })
  hpBonus!: number

  @Column({ type: 'int', default: 0 })
  mpBonus!: number

  @Column({ type: 'int', default: 0 })
  attackBonus!: number

  @Column({ type: 'int', default: 0 })
  defenseBonus!: number

  @Column({ type: 'text', nullable: true })
  description!: string | null
}
