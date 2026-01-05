import { DataSource } from 'typeorm'
import { config } from './index'

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  synchronize: config.nodeEnv === 'development', // 开发环境自动同步
  logging: ['error'], // 关闭 SQL 日志（改为 ['error'] 可只记录错误）
  entities: ['src/models/**/*.ts'],
  migrations: ['src/migrations/**/*.ts'],
  subscribers: []
})
