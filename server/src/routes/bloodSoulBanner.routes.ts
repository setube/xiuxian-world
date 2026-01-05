/**
 * 血魂幡系统路由 - 黑煞教本命魔宝
 */
import { Router, type IRouter } from 'express'
import { bloodSoulBannerController } from '../controllers/bloodSoulBanner.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有血魂幡相关路由都需要登录
router.use(authMiddleware)

// ==================== 血魂幡管理 ====================
// 获取血魂幡状态
router.get('/status', (req, res, next) => bloodSoulBannerController.getStatus(req, res, next))

// 升级血魂幡
router.post('/upgrade', (req, res, next) => bloodSoulBannerController.upgradeBanner(req, res, next))

// ==================== 煞气池 ====================
// 获取煞气池状态
router.get('/sha-pool', (req, res, next) => bloodSoulBannerController.getShaPoolStatus(req, res, next))

// 每日献祭
router.post('/sacrifice', (req, res, next) => bloodSoulBannerController.dailySacrifice(req, res, next))

// 化功为煞
router.post('/convert', (req, res, next) => bloodSoulBannerController.convertCultivation(req, res, next))

// ==================== 魂魄储备 ====================
// 获取魂魄储备
router.get('/souls', (req, res, next) => bloodSoulBannerController.getSoulStorage(req, res, next))

// ==================== 炼化槽 ====================
// 获取炼化槽列表
router.get('/slots', (req, res, next) => bloodSoulBannerController.getRefinementSlots(req, res, next))

// 囚禁魂魄（开始炼化）
router.post('/slots/start', (req, res, next) => bloodSoulBannerController.startRefinement(req, res, next))

// 安抚幡灵（维护槽位）
router.post('/slots/maintain', (req, res, next) => bloodSoulBannerController.maintainSlot(req, res, next))

// 收取精华（收取炼化产物）
router.post('/slots/collect', (req, res, next) => bloodSoulBannerController.collectRefinement(req, res, next))

// ==================== PvE系统 ====================
// 获取血洗山林状态
router.get('/blood-forest/status', (req, res, next) => bloodSoulBannerController.getBloodForestStatus(req, res, next))

// 血洗山林
router.post('/blood-forest/raid', (req, res, next) => bloodSoulBannerController.raidBloodForest(req, res, next))

// 获取召唤魔影状态
router.get('/shadow-summon/status', (req, res, next) => bloodSoulBannerController.getShadowSummonStatus(req, res, next))

// 召唤魔影
router.post('/shadow-summon/summon', (req, res, next) => bloodSoulBannerController.summonShadow(req, res, next))

export default router
