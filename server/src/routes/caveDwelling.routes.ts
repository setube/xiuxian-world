import { Router, type IRouter } from 'express'
import { caveDwellingController } from '../controllers/caveDwelling.controller'
import { formationController } from '../controllers/formation.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有路由都需要认证
router.use(authMiddleware)

// ========== 洞府管理 ==========

// 检查是否可以开辟洞府
router.get('/can-open', (req, res, next) => caveDwellingController.canOpenCave(req, res, next))

// 开辟洞府
router.post('/open', (req, res, next) => caveDwellingController.openCave(req, res, next))

// 获取洞府信息
router.get('/info', (req, res, next) => caveDwellingController.getCaveInfo(req, res, next))

// ========== 灵脉系统 ==========

// 收取灵气
router.post('/spirit-vein/harvest', (req, res, next) => caveDwellingController.harvestSpiritEnergy(req, res, next))

// 升级灵脉
router.post('/spirit-vein/upgrade', (req, res, next) => caveDwellingController.upgradeSpiritVein(req, res, next))

// ========== 静室系统 ==========

// 转化灵气为修为
router.post('/meditation/convert', (req, res, next) => caveDwellingController.convertSpiritToExp(req, res, next))

// 升级静室
router.post('/meditation/upgrade', (req, res, next) => caveDwellingController.upgradeMeditationChamber(req, res, next))

// ========== 万宝阁 ==========

// 获取万宝阁
router.get('/treasure', (req, res, next) => caveDwellingController.getTreasureDisplay(req, res, next))

// 上架物品
router.post('/treasure/display', (req, res, next) => caveDwellingController.displayTreasure(req, res, next))

// 下架物品
router.post('/treasure/remove', (req, res, next) => caveDwellingController.removeTreasure(req, res, next))

// ========== 景观系统 ==========

// 获取景观列表
router.get('/scenery', (req, res, next) => caveDwellingController.getSceneryGallery(req, res, next))

// 布置/取消布置景观
router.post('/scenery/toggle', (req, res, next) => caveDwellingController.displayScenery(req, res, next))

// ========== 访客系统 ==========

// 获取当前访客
router.get('/visitor', (req, res, next) => caveDwellingController.getCurrentVisitor(req, res, next))

// 接待访客
router.post('/visitor/receive', (req, res, next) => caveDwellingController.receiveVisitor(req, res, next))

// 驱逐访客
router.post('/visitor/expel', (req, res, next) => caveDwellingController.expelVisitor(req, res, next))

// 获取访客记录
router.get('/visitor/logs', (req, res, next) => caveDwellingController.getVisitorLogs(req, res, next))

// ========== 社交系统 ==========

// 拜访他人洞府
router.get('/visit', (req, res, next) => caveDwellingController.visitOtherCave(req, res, next))

// 留言
router.post('/message', (req, res, next) => caveDwellingController.leaveMessage(req, res, next))

// 获取留言列表
router.get('/messages', (req, res, next) => caveDwellingController.getMessages(req, res, next))

// 标记留言已读
router.post('/message/read', (req, res, next) => caveDwellingController.markMessageRead(req, res, next))

// ========== 护府阵法 ==========

// 获取阵法状态
router.get('/formation/status', formationController.getStatus.bind(formationController))

// 获取所有阵法模板
router.get('/formation/templates', formationController.getAllFormations.bind(formationController))

// 学习阵法
router.post('/formation/learn', formationController.learn.bind(formationController))

// 激活阵法
router.post('/formation/activate', formationController.activate.bind(formationController))

// 撤销阵法
router.post('/formation/deactivate', formationController.deactivate.bind(formationController))

export default router
