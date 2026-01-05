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

@Entity('cave_sceneries')
@Index(['characterId', 'sceneryId'], { unique: true })
export class CaveScenery {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  characterId!: string

  @ManyToOne(() => Character, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'characterId' })
  character!: Character

  @Column({ type: 'varchar', length: 50 })
  sceneryId!: string // 景观配置ID

  @Column({ type: 'boolean', default: false })
  isDisplayed!: boolean // 是否已布置展示

  @Column({ type: 'bigint' })
  unlockedAt!: number // 解锁时间戳

  @CreateDateColumn()
  createdAt!: Date
}
