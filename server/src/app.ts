import express, { Application, Request, Response } from 'express'
import cors from 'cors'
import path from 'path'
import { config } from './config'
import { errorHandler, notFoundHandler } from './middlewares/errorHandler'
import { R } from './utils/response'

// 路由
import authRoutes from './routes/auth.routes'
import playerRoutes from './routes/player.routes'
import cultivationRoutes from './routes/cultivation.routes'
import sectRoutes from './routes/sect.routes'
import inventoryRoutes from './routes/inventory.routes'
import herbGardenRoutes from './routes/herbGarden.routes'
import taiyiRoutes from './routes/taiyi.routes'
import starpalaceRoutes from './routes/starpalace.routes'
import heishaRoutes from './routes/heisha.routes'
import pvpRoutes from './routes/pvp.routes'
import wanlingRoutes from './routes/wanling.routes'
import luoyunRoutes from './routes/luoyun.routes'
import yuanyingRoutes from './routes/yuanying.routes'
import hehuanRoutes from './routes/hehuan.routes'
import woodenDummyRoutes from './routes/woodenDummy.routes'
import rankingRoutes from './routes/ranking.routes'
import lootRoutes from './routes/loot.routes'
import towerRoutes from './routes/tower.routes'
import worldEventRoutes from './routes/worldEvent.routes'
import tribulationRoutes from './routes/tribulation.routes'
import marketRoutes from './routes/market.routes'
import caveDwellingRoutes from './routes/caveDwelling.routes'
import fengxiRoutes from './routes/fengxi.routes'
import riftExploreRoutes from './routes/riftExplore.routes'
import dungeonRoutes from './routes/dungeon.routes'
import diplomacyRoutes from './routes/diplomacy.routes'
import bloodSoulBannerRoutes from './routes/bloodSoulBanner.routes'
import flameFanRoutes from './routes/flameFan.routes'

const app: Application = express()

// 中间件
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')))

// API 路由
app.use('/api/auth', authRoutes)
app.use('/api/player', playerRoutes)
app.use('/api/cultivation', cultivationRoutes)
app.use('/api/sect', sectRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/garden', herbGardenRoutes)
app.use('/api/taiyi', taiyiRoutes)
app.use('/api/starpalace', starpalaceRoutes)
app.use('/api/heisha', heishaRoutes)
app.use('/api/pvp', pvpRoutes)
app.use('/api/wanling', wanlingRoutes)
app.use('/api/luoyun', luoyunRoutes)
app.use('/api/yuanying', yuanyingRoutes)
app.use('/api/hehuan', hehuanRoutes)
app.use('/api/dummy', woodenDummyRoutes)
app.use('/api/ranking', rankingRoutes)
app.use('/api/loot', lootRoutes)
app.use('/api/tower', towerRoutes)
app.use('/api/world-events', worldEventRoutes)
app.use('/api/tribulation', tribulationRoutes)
app.use('/api/market', marketRoutes)
app.use('/api/cave', caveDwellingRoutes)
app.use('/api/fengxi', fengxiRoutes)
app.use('/api/rift', riftExploreRoutes)
app.use('/api/dungeon', dungeonRoutes)
app.use('/api/diplomacy', diplomacyRoutes)
app.use('/api/blood-soul-banner', bloodSoulBannerRoutes)
app.use('/api/flame-fan', flameFanRoutes)

// 健康检查
app.get('/health', (_req: Request, res: Response) => {
  R.success(res, { timestamp: new Date().toISOString() }, 'ok')
})

// SPA fallback - 所有未匹配的路由都返回前端页面（必须在 API 路由之后）
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

// 404 处理
app.use(notFoundHandler)

// 全局错误处理（必须放在最后）
app.use(errorHandler)

export default app
