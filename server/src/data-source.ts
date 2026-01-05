import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { config } from './config'

// 用于 TypeORM CLI 的数据源配置
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  synchronize: false, // CLI 模式下不自动同步
  logging: true,
  entities: ['src/models/**/*.ts'],
  migrations: ['src/migrations/**/*.ts'],
  subscribers: []
})
