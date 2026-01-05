import { Router, type IRouter } from 'express'
import { cultivationController } from '../controllers/cultivation.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有修炼相关路由都需要登录
router.use(authMiddleware)

// 获取修炼状态
router.get('/status', (req, res, next) => cultivationController.getStatus(req, res, next))

// 开始闭关修炼
router.post('/start', (req, res, next) => cultivationController.startCultivation(req, res, next))

// 开始深度闭关（神游太虚）
router.post('/deep/start', (req, res, next) => cultivationController.startDeepCultivation(req, res, next))

// 结束深度闭关
router.post('/deep/finish', (req, res, next) => cultivationController.finishDeepCultivation(req, res, next))

// 切换和平模式
router.post('/peace-mode', (req, res, next) => cultivationController.togglePeaceMode(req, res, next))

// 清除丹毒
router.post('/clear-poison', (req, res, next) => cultivationController.clearPoison(req, res, next))

// 处理上线（结算被动修炼）
router.post('/online', (req, res, next) => cultivationController.handleOnline(req, res, next))

export default router
