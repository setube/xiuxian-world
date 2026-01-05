/**
 * 星宫宗门专属系统路由 - 道心侍妾、周天星斗大阵、星衍天机、牵星引灵之术
 */
import { Router, type IRouter } from 'express'
import { starPalaceController } from '../controllers/starpalace.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有星宫相关路由都需要登录
router.use(authMiddleware)

// 获取星宫系统完整状态
router.get('/status', (req, res, next) => starPalaceController.getStatus(req, res, next))

// ==================== 侍妾系统 ====================
// 获取侍妾状态
router.get('/consort', (req, res, next) => starPalaceController.getConsort(req, res, next))

// 每日问安
router.post('/consort/greet', (req, res, next) => starPalaceController.greetConsort(req, res, next))

// 赠予侍妾
router.post('/consort/gift', (req, res, next) => starPalaceController.giftConsort(req, res, next))

// 灵力反哺
router.post('/consort/spirit-feedback', (req, res, next) => starPalaceController.spiritFeedback(req, res, next))

// 派遣侍妾
router.post('/consort/assign', (req, res, next) => starPalaceController.assignConsort(req, res, next))

// 召回侍妾
router.post('/consort/recall', (req, res, next) => starPalaceController.recallConsort(req, res, next))

// ==================== 观星台系统 ====================
// 获取观星台状态
router.get('/observatory', (req, res, next) => starPalaceController.getObservatory(req, res, next))

// 开始凝聚星辰
router.post('/disk/start', (req, res, next) => starPalaceController.startGathering(req, res, next))

// 收集产出
router.post('/disk/collect', (req, res, next) => starPalaceController.collectDisk(req, res, next))

// 处理引星盘事件
router.post('/disk/handle-event', (req, res, next) => starPalaceController.handleDiskEvent(req, res, next))

// 扩展引星盘
router.post('/disk/expand', (req, res, next) => starPalaceController.expandDisks(req, res, next))

// ==================== 周天星斗大阵 ====================
// 获取大阵状态
router.get('/array', (req, res, next) => starPalaceController.getArrayStatus(req, res, next))

// 发起大阵
router.post('/array/initiate', (req, res, next) => starPalaceController.initiateArray(req, res, next))

// 加入大阵
router.post('/array/join', (req, res, next) => starPalaceController.joinArray(req, res, next))

// ==================== 星衍天机 ====================
// 获取观星状态
router.get('/stargaze', (req, res, next) => starPalaceController.getStargazeStatus(req, res, next))

// 进行观星
router.post('/stargaze', (req, res, next) => starPalaceController.stargaze(req, res, next))

// 改换星移
router.post('/stargaze/change-fate', (req, res, next) => starPalaceController.changeFate(req, res, next))

export default router
