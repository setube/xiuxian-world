import 'reflect-metadata'
import { createServer } from 'http'
import { Server } from 'socket.io'
import app from './app'
import { config } from './config'
import { AppDataSource } from './config/database'
import { initializeSocket } from './socket'
import { seedRealms } from './seeds/realms.seed'
import { dualCultivationService } from './services/dualCultivation.service'
import { yuanyingService } from './services/yuanying.service'
import { worldEventService } from './services/worldEvent.service'
import { cultivationService } from './services/cultivation.service'
import { caveDwellingService } from './services/caveDwelling.service'
import { curseService } from './services/curse.service'
import { sectMasterService } from './services/sectMaster.service'
import { luoyunService } from './services/luoyun.service'
import { DIPLOMACY_CONFIG } from './game/constants/diplomacy'

// 定时任务间隔：每10分钟执行一次过期清理
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000

// 元婴闭关结算间隔：每30分钟执行一次
const YUANYING_SETTLE_INTERVAL_MS = 30 * 60 * 1000

// 世界事件触发间隔：每小时
const WORLD_EVENT_INTERVAL_MS = 60 * 60 * 1000

// 南宫婉奇遇过期检查间隔：每分钟
const NANGONG_WAN_CHECK_INTERVAL_MS = 60 * 1000

// 洞府访客触发间隔：每30分钟
const CAVE_VISITOR_INTERVAL_MS = 30 * 60 * 1000

// 洞府访客过期清理间隔：每5分钟
const CAVE_VISITOR_CLEANUP_INTERVAL_MS = 5 * 60 * 1000

// 丹魔之咒扣除间隔：每10分钟
const CURSE_TICK_INTERVAL_MS = 10 * 60 * 1000

// 掌门选举检查间隔：每分钟
const MASTER_ELECTION_CHECK_INTERVAL_MS = 60 * 1000

// 落云宗灵眼树环境变化间隔：每小时
const LUOYUN_ENVIRONMENT_INTERVAL_MS = 60 * 60 * 1000

// 记录上次掌门选举日期，防止重复执行
let lastMasterElectionDate: string | null = null

async function bootstrap() {
  try {
    // 连接数据库
    await AppDataSource.initialize()
    console.log('✅ 数据库连接成功')

    // 初始化种子数据
    await seedRealms()

    // 初始化宗门掌门数据
    await sectMasterService.initializeAllMasters()
    console.log('✅ 宗门掌门数据初始化完成')

    // 创建 HTTP 服务器
    const httpServer = createServer(app)

    // 初始化 Socket.IO
    const io = new Server(httpServer, {
      cors: {
        origin: config.clientUrl,
        credentials: true
      }
    })
    initializeSocket(io)
    console.log('✅ Socket.IO 初始化成功')

    // 启动定时清理任务
    setInterval(async () => {
      try {
        const result = await dualCultivationService.runCleanupTasks()
        if (result.slavesCleared > 0 || result.bondsCleared > 0) {
          console.log(`🧹 过期清理: 奴役关系 ${result.slavesCleared} 条, 同参契约 ${result.bondsCleared} 条`)
        }
      } catch (error) {
        console.error('❌ 过期清理任务失败:', error)
      }
    }, CLEANUP_INTERVAL_MS)
    console.log('✅ 定时清理任务已启动 (每10分钟)')

    // 启动元婴闭关结算任务
    setInterval(async () => {
      try {
        await yuanyingService.settleAllCultivations()
      } catch (error) {
        console.error('❌ 元婴闭关结算任务失败:', error)
      }
    }, YUANYING_SETTLE_INTERVAL_MS)
    console.log('✅ 元婴闭关结算任务已启动 (每30分钟)')

    // 启动世界事件触发任务
    setInterval(async () => {
      try {
        const event = await worldEventService.triggerWorldEvent()
        if (event) {
          console.log(`🌍 世界事件触发: ${event.description}`)
        }
      } catch (error) {
        console.error('❌ 世界事件触发失败:', error)
      }
    }, WORLD_EVENT_INTERVAL_MS)
    console.log('✅ 世界事件触发任务已启动 (每小时)')

    // 启动南宫婉奇遇过期检查任务
    setInterval(async () => {
      try {
        const endedCount = await cultivationService.checkAndEndExpiredNangongWan()
        if (endedCount > 0) {
          console.log(`💜 南宫婉奇遇结束: ${endedCount} 位修士`)
        }
      } catch (error) {
        console.error('❌ 南宫婉奇遇检查失败:', error)
      }
    }, NANGONG_WAN_CHECK_INTERVAL_MS)
    console.log('✅ 南宫婉奇遇检查任务已启动 (每分钟)')

    // 启动洞府访客触发任务
    setInterval(async () => {
      try {
        const triggeredCount = await caveDwellingService.triggerVisitorsForAllCaves()
        if (triggeredCount > 0) {
          console.log(`🏠 洞府访客触发: ${triggeredCount} 位道友迎来访客`)
        }
      } catch (error) {
        console.error('❌ 洞府访客触发失败:', error)
      }
    }, CAVE_VISITOR_INTERVAL_MS)
    console.log('✅ 洞府访客触发任务已启动 (每30分钟)')

    // 启动洞府访客过期清理任务
    setInterval(async () => {
      try {
        const cleanedCount = await caveDwellingService.cleanupExpiredVisitors()
        if (cleanedCount > 0) {
          console.log(`🧹 洞府访客清理: ${cleanedCount} 位访客离去`)
        }
      } catch (error) {
        console.error('❌ 洞府访客清理失败:', error)
      }
    }, CAVE_VISITOR_CLEANUP_INTERVAL_MS)
    console.log('✅ 洞府访客清理任务已启动 (每5分钟)')

    // 启动丹魔之咒处理任务
    setInterval(async () => {
      try {
        const result = await curseService.processAllCurseTicks()
        if (result.processed > 0) {
          console.log(`😈 丹魔之咒处理: ${result.processed} 人被侵蚀，共吸取 ${result.totalDrained} 修为`)
        }
        if (result.expired > 0) {
          console.log(`✨ 丹魔之咒消散: ${result.expired} 人解脱咒印`)
        }
      } catch (error) {
        console.error('❌ 丹魔之咒处理失败:', error)
      }
    }, CURSE_TICK_INTERVAL_MS)
    console.log('✅ 丹魔之咒处理任务已启动 (每10分钟)')

    // 启动掌门选举检查任务（每分钟检查是否到达00:15上海时间）
    setInterval(async () => {
      try {
        const now = new Date()
        // 转换为上海时间
        const shanghaiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }))
        const hour = shanghaiTime.getHours()
        const minute = shanghaiTime.getMinutes()

        // 检查是否到达选举时间（00:15）
        if (hour === DIPLOMACY_CONFIG.masterSelectionHour && minute === DIPLOMACY_CONFIG.masterSelectionMinute) {
          // 防止重复执行：检查今天是否已经执行过
          const today = shanghaiTime.toISOString().split('T')[0]
          if (lastMasterElectionDate !== today) {
            console.log('🏛️ 开始执行每日掌门选举...')
            const electionResult = await sectMasterService.electAllMasters()
            lastMasterElectionDate = today

            // 统计选举结果
            console.log(`🏛️ 掌门选举完成: ${electionResult.changed}/${electionResult.total} 个宗门更换掌门`)
          }
        }
      } catch (error) {
        console.error('❌ 掌门选举任务失败:', error)
      }
    }, MASTER_ELECTION_CHECK_INTERVAL_MS)
    console.log('✅ 掌门选举任务已启动 (每日00:15上海时间)')

    // 启动落云宗灵眼树环境变化任务（每小时）
    setInterval(async () => {
      try {
        const result = await luoyunService.changeEnvironment()
        if (result) {
          console.log(
            `🌳 落云宗环境变化: ${result.oldEnvironment} -> ${result.newEnvironment}${
              result.wasSatisfied ? '' : ` (惩罚: -${result.maturityPenalty}成熟度)`
            }`
          )
        }
      } catch (error) {
        console.error('❌ 落云宗环境变化失败:', error)
      }
    }, LUOYUN_ENVIRONMENT_INTERVAL_MS)
    console.log('✅ 落云宗环境变化任务已启动 (每小时)')

    // 启动服务器
    httpServer.listen(config.port, () => {
      console.log(`🚀 服务器运行在 http://localhost:${config.port}`)
      console.log(`📖 环境: ${config.nodeEnv}`)
    })
  } catch (error) {
    console.error('❌ 启动失败:', error)
    process.exit(1)
  }
}

bootstrap()
