import { Router, type IRouter } from 'express'
import { sectController } from '../controllers/sect.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有宗门相关路由都需要登录
router.use(authMiddleware)

// 获取宗门状态（包含当前宗门信息或可加入的宗门列表）
router.get('/status', (req, res, next) => sectController.getStatus(req, res, next))

// 加入宗门
router.post('/join', (req, res, next) => sectController.join(req, res, next))

// 叛门
router.post('/leave', (req, res, next) => sectController.leave(req, res, next))

// 领取俸禄
router.post('/salary', (req, res, next) => sectController.claimSalary(req, res, next))

// 晋升
router.post('/promote', (req, res, next) => sectController.promote(req, res, next))

// 获取宗门成员列表
router.get('/members', (req, res, next) => sectController.getMembers(req, res, next))

// 宗门点卯
router.post('/checkin', (req, res, next) => sectController.checkIn(req, res, next))

// 宗门传功
router.post('/teach', (req, res, next) => sectController.teach(req, res, next))

// 获取宝库物品
router.get('/treasury', (req, res, next) => sectController.getTreasuryItems(req, res, next))

// 购买宝库物品
router.post('/treasury/purchase', (req, res, next) => sectController.purchaseTreasuryItem(req, res, next))

// 捐献灵石
router.post('/donate', (req, res, next) => sectController.donate(req, res, next))

// 获取悬赏列表
router.get('/bounties', (req, res, next) => sectController.getBounties(req, res, next))

// 接受悬赏
router.post('/bounties/accept', (req, res, next) => sectController.acceptBounty(req, res, next))

// 提交悬赏
router.post('/bounties/submit', (req, res, next) => sectController.submitBounty(req, res, next))

// 放弃悬赏
router.post('/bounties/abandon', (req, res, next) => sectController.abandonBounty(req, res, next))

export default router
