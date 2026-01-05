import { Router, type IRouter } from 'express'
import { body } from 'express-validator'
import { lootController } from '../controllers/loot.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有路由都需要认证
router.use(authMiddleware)

/**
 * 获取夺宝状态
 * GET /api/loot/status
 */
router.get('/status', lootController.getStatus.bind(lootController))

/**
 * 获取可掠夺目标
 * GET /api/loot/targets
 */
router.get('/targets', lootController.getTargets.bind(lootController))

/**
 * 执行夺宝
 * POST /api/loot/attack
 */
router.post(
  '/attack',
  [
    body('targetId')
      .isUUID()
      .withMessage('目标ID格式无效')
  ],
  lootController.attack.bind(lootController)
)

/**
 * 获取我的掠夺统计
 * GET /api/loot/stats
 */
router.get('/stats', lootController.getStats.bind(lootController))

export default router
