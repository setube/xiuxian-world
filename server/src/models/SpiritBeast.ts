import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Character } from './Character'

/**
 * 灵兽实体 - 万灵宗灵兽养成系统
 * 记录玩家拥有的灵兽信息
 */
@Entity('spirit_beasts')
export class SpiritBeast {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 所属角色
  @Column({ type: 'uuid' })
  characterId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'characterId' })
  character!: Character

  // 灵兽模板ID（对应 BEAST_TEMPLATES）
  @Column({ type: 'varchar', length: 50 })
  templateId!: string

  // 灵兽原名（模板名称）
  @Column({ type: 'varchar', length: 50 })
  name!: string

  // 玩家自定义名称
  @Column({ type: 'varchar', length: 50, nullable: true })
  customName!: string | null

  // 稀有度: common, uncommon, rare, epic, legendary
  @Column({ type: 'varchar', length: 20 })
  rarity!: string

  // 等级
  @Column({ type: 'int', default: 1 })
  level!: number

  // 当前经验值
  @Column({ type: 'int', default: 0 })
  exp!: number

  // 基础属性（根据等级计算）
  @Column({ type: 'int', default: 10 })
  attack!: number

  @Column({ type: 'int', default: 5 })
  defense!: number

  @Column({ type: 'int', default: 10 })
  speed!: number

  @Column({ type: 'int', default: 50 })
  hp!: number

  @Column({ type: 'int', default: 50 })
  currentHp!: number

  // 饱食度 (0-100)
  @Column({ type: 'int', default: 100 })
  satiety!: number

  // 忠诚度 (0-100)
  @Column({ type: 'int', default: 50 })
  loyalty!: number

  // 状态: idle(空闲), deployed(出战), resting(休息), injured(受伤), raiding(偷菜中)
  @Column({ type: 'varchar', length: 20, default: 'idle' })
  status!: string

  // 出战开始时间
  @Column({ type: 'bigint', nullable: true })
  deployedAt!: number | null

  // 受伤恢复时间
  @Column({ type: 'bigint', nullable: true })
  injuredUntil!: number | null

  // 上次饱食度衰减时间
  @Column({ type: 'bigint', nullable: true })
  lastSatietyDecayTime!: number | null

  // 技能列表（JSON字符串）
  @Column({ type: 'text', default: '[]' })
  skillsJson!: string

  // 技能getter/setter
  get skills(): string[] {
    try {
      return JSON.parse(this.skillsJson || '[]')
    } catch {
      return []
    }
  }

  set skills(value: string[]) {
    this.skillsJson = JSON.stringify(value)
  }

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
