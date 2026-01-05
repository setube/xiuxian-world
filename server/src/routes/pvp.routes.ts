/**
 * PvP战斗路由 - 简易异步1v1战斗系统
 */
import { Router, type IRouter, type Request, type Response, type NextFunction } from 'express'
import { body } from 'express-validator'
import { pvpController } from '../controllers/pvp.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有PvP相关路由都需要登录
router.use(authMiddleware)

// 获取PvP状态
router.get('/status', (req: Request, res: Response, next: NextFunction) => pvpController.getStatus(req, res, next))

// 获取可挑战目标列表
router.get('/targets', (req: Request, res: Response, next: NextFunction) => pvpController.getTargets(req, res, next))

// 发起挑战
router.post(
  '/challenge',
  [body('targetId').isUUID().withMessage('目标ID格式无效')],
  (req: Request, res: Response, next: NextFunction) => pvpController.challenge(req, res, next)
)

// 获取战斗历史
router.get('/history', (req: Request, res: Response, next: NextFunction) => pvpController.getHistory(req, res, next))

// ==================== 神魂陨落系统 ====================

// 获取神魂状态（神魂动荡、道心破碎、杀戮值、仇敌列表）
router.get('/soul-status', (req: Request, res: Response, next: NextFunction) => pvpController.getSoulStatus(req, res, next))

// 获取仇敌列表
router.get('/enemies', (req: Request, res: Response, next: NextFunction) => pvpController.getEnemies(req, res, next))

// 获取杀戮值
router.get('/kill-count', (req: Request, res: Response, next: NextFunction) => pvpController.getKillCount(req, res, next))

export default router
