/**
 * 宗门外交路由
 */
import { Router, type IRouter } from 'express'
import { diplomacyController } from '../controllers/diplomacy.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有外交路由都需要登录
router.use(authMiddleware)

// 获取外交状态（含待处理结盟请求）
router.get('/status', (req, res, next) => diplomacyController.getStatus(req, res, next))

// 获取本宗掌门信息
router.get('/master', (req, res, next) => diplomacyController.getMaster(req, res, next))

// 获取所有宗门掌门列表
router.get('/masters', (req, res, next) => diplomacyController.getAllMasters(req, res, next))

// 获取天下大势（公开，所有玩家可查看结盟和敌对关系）
router.get('/world', (req, res, next) => diplomacyController.getWorldSituation(req, res, next))

// 设置友好关系（仅掌门）
router.post('/friendly', (req, res, next) => diplomacyController.setFriendly(req, res, next))

// 设置敌对关系（仅掌门）
router.post('/hostile', (req, res, next) => diplomacyController.setHostile(req, res, next))

// 发起结盟请求（仅掌门，需双方都是友好关系）
router.post('/alliance/propose', (req, res, next) => diplomacyController.proposeAlliance(req, res, next))

// 接受结盟请求（仅掌门）
router.post('/alliance/accept', (req, res, next) => diplomacyController.acceptAlliance(req, res, next))

// 解除关系（设为中立，仅掌门）
router.post('/cancel', (req, res, next) => diplomacyController.cancelRelation(req, res, next))

export default router
