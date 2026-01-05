/**
 * 太一门专属系统路由 - 神识与引道
 */
import { Router, type IRouter } from 'express'
import { taiyiController } from '../controllers/taiyi.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有太一门相关路由都需要登录
router.use(authMiddleware)

// 获取太一门系统状态
router.get('/status', (req, res, next) => taiyiController.getStatus(req, res, next))

// 获取元素列表
router.get('/elements', (req, res, next) => taiyiController.getElements(req, res, next))

// 使用引道
router.post('/guidance', (req, res, next) => taiyiController.useGuidance(req, res, next))

// 使用神识冲击
router.post('/strike', (req, res, next) => taiyiController.useConsciousnessStrike(req, res, next))

export default router
