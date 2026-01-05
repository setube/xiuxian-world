/**
 * 合欢宗情缘三境路由 - 凡尘缘、同参道、魔染道
 */
import { Router, type IRouter } from 'express'
import { hehuanController } from '../controllers/hehuan.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有合欢宗相关路由都需要登录
router.use(authMiddleware)

// 获取情缘三境系统完整状态
router.get('/status', (req, res, next) => hehuanController.getStatus(req, res, next))

// 获取待处理的邀请
router.get('/invites', (req, res, next) => hehuanController.getPendingInvites(req, res, next))

// ==================== 第一层：凡尘缘 (闭关双修) ====================

// 发起闭关双修邀请
router.post('/basic/invite', (req, res, next) => hehuanController.inviteBasicDual(req, res, next))

// 接受双修邀请
router.post('/basic/accept', (req, res, next) => hehuanController.acceptBasicDual(req, res, next))

// 拒绝双修邀请
router.post('/basic/reject', (req, res, next) => hehuanController.rejectBasicDual(req, res, next))

// ==================== 第二层：同参道 (缔结同参 & 双修温养) ====================

// 获取同参信息
router.get('/bond', (req, res, next) => hehuanController.getBondInfo(req, res, next))

// 发起缔结同参邀请
router.post('/bond/invite', (req, res, next) => hehuanController.inviteSoulBond(req, res, next))

// 接受同参契约
router.post('/bond/accept', (req, res, next) => hehuanController.acceptSoulBond(req, res, next))

// 拒绝同参契约
router.post('/bond/reject', (req, res, next) => hehuanController.rejectSoulBond(req, res, next))

// 发起双修温养
router.post('/nourish/initiate', (req, res, next) => hehuanController.initiateNourish(req, res, next))

// 接受温养邀请
router.post('/nourish/accept', (req, res, next) => hehuanController.acceptNourish(req, res, next))

// ==================== 第三层：魔染道 (种下心印 & 双修采补) ====================

// 获取炉鼎列表
router.get('/slaves', (req, res, next) => hehuanController.getSlaves(req, res, next))

// 发起心神之战
router.post('/soul-battle', (req, res, next) => hehuanController.initiateSoulBattle(req, res, next))

// 采补炉鼎
router.post('/harvest', (req, res, next) => hehuanController.harvestSlave(req, res, next))

// 挣脱心印（被奴役者使用）
router.post('/escape', (req, res, next) => hehuanController.attemptEscape(req, res, next))

// 检查是否被奴役
router.get('/enslaved', (req, res, next) => hehuanController.checkEnslaved(req, res, next))

export default router
