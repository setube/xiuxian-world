/**
 * 试炼古塔路由
 */
import { Router, type IRouter } from 'express'
import { towerController } from '../controllers/tower.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有路由都需要认证
router.use(authMiddleware)

/**
 * 获取古塔状态
 * GET /api/tower/status
 */
router.get('/status', towerController.getStatus.bind(towerController))

/**
 * 进入古塔（从第一层开始）
 * POST /api/tower/enter
 */
router.post('/enter', towerController.enterTower.bind(towerController))

/**
 * 继续闯塔
 * POST /api/tower/continue
 */
router.post('/continue', towerController.continueTower.bind(towerController))

/**
 * 退出古塔
 * POST /api/tower/exit
 */
router.post('/exit', towerController.exitTower.bind(towerController))

/**
 * 重置古塔（消耗修为）
 * POST /api/tower/reset
 */
router.post('/reset', towerController.resetTower.bind(towerController))

/**
 * 获取琉璃塔榜
 * GET /api/tower/ranking
 * Query: { limit?: number, offset?: number }
 */
router.get('/ranking', towerController.getRanking.bind(towerController))

/**
 * 获取全服首杀记录
 * GET /api/tower/server-firsts
 */
router.get('/server-firsts', towerController.getServerFirsts.bind(towerController))

export default router
