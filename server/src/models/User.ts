import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm'
import { Character } from './Character'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 50, unique: true })
  username!: string

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string

  @Column({ type: 'boolean', default: false })
  isBanned!: boolean

  @Column({ type: 'boolean', default: false })
  isAdmin!: boolean

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt!: Date | null

  // 待确认的角色名（灵根检测前保存）
  @Column({ type: 'varchar', length: 50, nullable: true })
  pendingCharacterName!: string | null

  @OneToMany(() => Character, character => character.user)
  characters!: Character[]
}
