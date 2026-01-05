/**
 * 落云宗专属系统路由 - 灵眼之树系统
 */
import { Router, type IRouter } from 'express'
import * as luoyunController from '../controllers/luoyun.controller'
import { authMiddleware, characterMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有落云宗相关路由都需要登录并有角色
router.use(authMiddleware)
router.use(characterMiddleware)

// 获取落云宗系统完整状态（灵树状态 + 个人贡献 + 排名）
router.get('/status', luoyunController.getStatus)

// 浇灌灵树（每日一次，消耗修为）
router.post('/water', luoyunController.waterTree)

// 献祭妖丹（增加成熟度和贡献）
router.post('/offer-pill', luoyunController.offerPill)

// 参与防御入侵
router.post('/defend', luoyunController.defend)

// 领取收获奖励
router.post('/harvest', luoyunController.claimHarvest)

// 获取贡献排行榜
router.get('/rankings', luoyunController.getRankings)

// 使用灵眼之液（升级灵根或催熟灵草）
router.post('/use-liquid', luoyunController.useLiquid)

// 满足当前环境需求（环境系统）
router.post('/satisfy-environment', luoyunController.satisfyEnvironment)

export default router
