import { Router, type IRouter } from 'express'
import { body } from 'express-validator'
import { woodenDummyController } from '../controllers/woodenDummy.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有路由都需要认证
router.use(authMiddleware)

/**
 * 获取木人阁状态
 * GET /api/dummy/status
 */
router.get('/status', woodenDummyController.getStatus.bind(woodenDummyController))

/**
 * 挑战木人傀儡
 * POST /api/dummy/challenge
 */
router.post(
  '/challenge',
  [
    body('realmTier')
      .isInt({ min: 1, max: 9 })
      .withMessage('境界必须在1-9之间'),
    body('subTier')
      .optional()
      .isInt({ min: 1, max: 4 })
      .withMessage('小境界必须在1-4之间')
  ],
  woodenDummyController.challenge.bind(woodenDummyController)
)

/**
 * 获取战斗历史
 * GET /api/dummy/history
 */
router.get('/history', woodenDummyController.getHistory.bind(woodenDummyController))

export default router
