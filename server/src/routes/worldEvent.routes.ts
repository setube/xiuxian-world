import { Router, type IRouter } from 'express'
import { worldEventController } from '../controllers/worldEvent.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

/**
 * 获取近期世界事件（公开）
 * GET /api/world-events/recent
 * Query: { limit?: number }
 */
router.get('/recent', worldEventController.getRecentEvents.bind(worldEventController))

// 以下路由需要认证
router.use(authMiddleware)

/**
 * 获取我的当前buff/debuff
 * GET /api/world-events/my-buffs
 */
router.get('/my-buffs', worldEventController.getMyBuffs.bind(worldEventController))

/**
 * 获取我的世界事件历史
 * GET /api/world-events/my-history
 * Query: { limit?: number }
 */
router.get('/my-history', worldEventController.getMyEventHistory.bind(worldEventController))

/**
 * 获取修炼效率加成
 * GET /api/world-events/cultivation-multiplier
 */
router.get(
  '/cultivation-multiplier',
  worldEventController.getCultivationMultiplier.bind(worldEventController)
)

export default router
