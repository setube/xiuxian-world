import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Character } from './Character'

/**
 * 侍妾实体 - 星宫专属系统
 * 每个星宫弟子入门时自动分配一位侍妾
 */
@Entity('consorts')
export class Consort {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  // 所属角色
  @Column({ type: 'uuid' })
  characterId!: string

  @ManyToOne(() => Character)
  @JoinColumn({ name: 'characterId' })
  character!: Character

  // 侍妾模板ID（对应CONSORT_TEMPLATES中的key）
  @Column({ type: 'varchar', length: 50 })
  consortId!: string

  // 侍妾名字（从模板获取，可自定义）
  @Column({ type: 'varchar', length: 50 })
  name!: string

  // 好感度 (0-100)
  @Column({ type: 'int', default: 0 })
  affection!: number

  // 侍妾等级 (1-10)，影响加成效果
  @Column({ type: 'int', default: 1 })
  level!: number

  // 派遣的引星盘编号 (0-5)，null表示未派遣
  @Column({ type: 'int', nullable: true })
  assignedDiskIndex!: number | null

  // 上次问安时间
  @Column({ type: 'bigint', nullable: true })
  lastGreetingTime!: number | null

  // 灵力反哺buff过期时间
  @Column({ type: 'bigint', nullable: true })
  spiritFeedbackExpiresAt!: number | null

  // 侍妾卜算结果（JSON字符串）
  @Column({ type: 'text', nullable: true })
  divinationResultJson!: string | null

  // 本周免费改命次数（某些侍妾技能提供）
  @Column({ type: 'int', default: 0 })
  freeChangeFateCount!: number

  // 上次重置免费改命的周日期
  @Column({ type: 'varchar', length: 20, nullable: true })
  lastChangeFateResetWeek!: string | null

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
