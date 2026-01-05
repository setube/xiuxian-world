import { Router, type IRouter } from 'express'
import { flameFanController } from '../controllers/flameFan.controller'
import { authMiddleware, characterMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有路由需要认证和角色中间件
router.use(authMiddleware, characterMiddleware)

// ========== 七焰扇系统 ==========

// 获取七焰扇状态
router.get('/status', flameFanController.getStatus.bind(flameFanController))

// 炼制火焰扇
router.post('/craft', flameFanController.craft.bind(flameFanController))

// 装备火焰扇
router.post('/equip', flameFanController.equip.bind(flameFanController))

// 卸下火焰扇
router.post('/unequip', flameFanController.unequip.bind(flameFanController))

export default router
