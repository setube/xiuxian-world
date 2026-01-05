import { Router, type IRouter } from 'express'
import { tribulationController } from '../controllers/tribulation.controller'
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有路由需要认证
router.use(authMiddleware)

/**
 * 获取渡劫状态
 * GET /api/tribulation/status
 */
router.get('/status', tribulationController.getStatus.bind(tribulationController))

/**
 * 尝试筑基之劫
 * POST /api/tribulation/foundation
 */
router.post('/foundation', tribulationController.attemptFoundation.bind(tribulationController))

/**
 * 尝试结丹之劫
 * POST /api/tribulation/core-formation
 */
router.post(
  '/core-formation',
  tribulationController.attemptCoreFormation.bind(tribulationController)
)

/**
 * 尝试元婴之劫
 * POST /api/tribulation/nascent-soul
 */
router.post('/nascent-soul', tribulationController.attemptNascentSoul.bind(tribulationController))

/**
 * 获取渡劫记录
 * GET /api/tribulation/records
 * Query: { limit?: number }
 */
router.get('/records', tribulationController.getRecords.bind(tribulationController))

/**
 * 获取南宫婉奇遇状态
 * GET /api/tribulation/nangong-wan/status
 */
router.get(
  '/nangong-wan/status',
  tribulationController.getNangongWanStatus.bind(tribulationController)
)

// 管理员路由（需要管理员权限）
/**
 * 管理员获取可回溯的失败记录
 * GET /api/tribulation/admin/failed-records
 */
router.get(
  '/admin/failed-records',
  adminMiddleware,
  tribulationController.adminGetFailedRecords.bind(tribulationController)
)

/**
 * 管理员天机回溯
 * POST /api/tribulation/admin/rollback/:recordId
 */
router.post(
  '/admin/rollback/:recordId',
  adminMiddleware,
  tribulationController.adminRollback.bind(tribulationController)
)

export default router
