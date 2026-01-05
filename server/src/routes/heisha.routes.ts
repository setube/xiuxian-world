/**
 * 黑煞教魔道禁术路由 - 夺舍魔功、魔染红尘、煞气淬体、丹魔之咒
 */
import { Router, type IRouter } from 'express'
import { heishaController } from '../controllers/heisha.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有黑煞教相关路由都需要登录
router.use(authMiddleware)

// 获取魔道禁术系统完整状态
router.get('/status', (req, res, next) => heishaController.getStatus(req, res, next))

// 检查是否被奴役
router.get('/enslaved', (req, res, next) => heishaController.checkEnslaved(req, res, next))

// ==================== 傀儡系统 ====================
// 获取傀儡列表
router.get('/puppets', (req, res, next) => heishaController.getPuppets(req, res, next))

// 发动夺舍
router.post('/seize', (req, res, next) => heishaController.soulSeize(req, res, next))

// 释放傀儡
router.post('/release', (req, res, next) => heishaController.releasePuppet(req, res, next))

// ==================== 侍妾窃取系统 ====================
// 获取窃取的侍妾
router.get('/stolen-consort', (req, res, next) => heishaController.getStolenConsort(req, res, next))

// 窃取侍妾
router.post('/steal-consort', (req, res, next) => heishaController.stealConsort(req, res, next))

// 魔音灌脑
router.post('/brainwash', (req, res, next) => heishaController.brainwash(req, res, next))

// 强索元阴
router.post('/extract', (req, res, next) => heishaController.extract(req, res, next))

// ==================== 丹魔之咒系统 ====================
// 获取咒印状态
router.get('/curse/status', (req, res, next) => heishaController.getCurseStatus(req, res, next))

// 施放丹魔之咒
router.post('/curse/cast', (req, res, next) => heishaController.castCurse(req, res, next))

// 收割诅咒修为
router.post('/curse/harvest', (req, res, next) => heishaController.harvestCurse(req, res, next))

// 解除诅咒
router.post('/curse/remove', (req, res, next) => heishaController.removeCurse(req, res, next))

export default router
