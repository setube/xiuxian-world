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

@Entity('cave_guest_messages')
export class CaveGuestMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  caveOwnerId!: string // 洞府主人ID

  @ManyToOne(() => Character, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'caveOwnerId' })
  caveOwner!: Character

  @Column({ type: 'uuid' })
  @Index()
  visitorId!: string // 访客ID

  @ManyToOne(() => Character, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'visitorId' })
  visitor!: Character

  @Column({ type: 'varchar', length: 50 })
  visitorName!: string // 访客名称（冗余存储，方便展示）

  @Column({ type: 'text' })
  content!: string // 留言内容

  @Column({ type: 'boolean', default: false })
  isRead!: boolean // 是否已读

  @Column({ type: 'bigint' })
  createdAtTimestamp!: number // 创建时间戳

  @CreateDateColumn()
  createdAt!: Date
}
