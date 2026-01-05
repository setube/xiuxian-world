/**
 * 万灵宗路由 - 灵兽养成系统
 */
import { Router, type IRouter } from 'express'
import { wanlingController } from '../controllers/wanling.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有路由需要认证
router.use(authMiddleware)

// ==================== 状态查询 ====================

// 获取万灵宗状态
router.get('/status', (req, res, next) => wanlingController.getStatus(req, res, next))

// 获取灵兽列表
router.get('/beasts', (req, res, next) => wanlingController.getBeasts(req, res, next))

// ==================== 寻觅灵兽 ====================

// 寻觅灵兽
router.post('/search', (req, res, next) => wanlingController.searchBeast(req, res, next))

// ==================== 灵兽管理 ====================

// 喂养灵兽
router.post('/beast/feed', (req, res, next) => wanlingController.feedBeast(req, res, next))

// 出战灵兽
router.post('/beast/deploy', (req, res, next) => wanlingController.deployBeast(req, res, next))

// 收回灵兽
router.post('/beast/recall', (req, res, next) => wanlingController.recallBeast(req, res, next))

// 灵兽休息
router.post('/beast/rest', (req, res, next) => wanlingController.restBeast(req, res, next))

// 灵兽改名
router.post('/beast/rename', (req, res, next) => wanlingController.renameBeast(req, res, next))

// 放生灵兽
router.post('/beast/release', (req, res, next) => wanlingController.releaseBeast(req, res, next))

// 进化灵兽
router.post('/beast/evolve', (req, res, next) => wanlingController.evolveBeast(req, res, next))

// ==================== 偷菜系统 ====================

// 获取偷菜目标
router.get('/raid/targets', (req, res, next) => wanlingController.getRaidTargets(req, res, next))

// 执行偷菜
router.post('/raid', (req, res, next) => wanlingController.raidGarden(req, res, next))

// 获取偷菜记录
router.get('/raid/history', (req, res, next) => wanlingController.getRaidHistory(req, res, next))

// ==================== 万兽渊探渊 ====================

// 探渊（火凤之翎掉落）
router.post('/abyss/explore', (req, res, next) => wanlingController.exploreAbyss(req, res, next))

export default router
