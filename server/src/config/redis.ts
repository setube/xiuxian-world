import Redis from 'ioredis'
import { config } from './index'

export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  retryStrategy: times => {
    if (times > 3) {
      console.error('Redis 连接失败，停止重试')
      return null
    }
    return Math.min(times * 200, 2000)
  }
})

redis.on('connect', () => {
  console.log('✅ Redis 连接成功')
})

redis.on('error', err => {
  console.error('❌ Redis 错误:', err.message)
})
