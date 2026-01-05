import { Router, type IRouter } from 'express'
import { herbGardenController } from '../controllers/herbGarden.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有路由都需要认证
router.use(authMiddleware)

// ========== 基础功能 ==========

// 获取药园状态
router.get('/', (req, res, next) => herbGardenController.getGarden(req, res, next))

// 获取可用种子列表
router.get('/seeds', (req, res, next) => herbGardenController.getSeeds(req, res, next))

// 播种
router.post('/plant', (req, res, next) => herbGardenController.plant(req, res, next))

// 采收
router.post('/harvest', (req, res, next) => herbGardenController.harvest(req, res, next))

// 处理事件（除草/除虫/浇水）
router.post('/handle-event', (req, res, next) => herbGardenController.handleEvent(req, res, next))

// ========== 扩展功能 ==========

// 扩建药园
router.post('/expand', (req, res, next) => herbGardenController.expand(req, res, next))

// 晋升丹道长老
router.post('/become-elder', (req, res, next) => herbGardenController.becomeElder(req, res, next))

// ========== 洞天寻宝 ==========

// 获取探索状态
router.get('/explore/status', (req, res, next) => herbGardenController.getExploreStatus(req, res, next))

// 开始探索
router.post('/explore', (req, res, next) => herbGardenController.startExplore(req, res, next))

// 战斗行动
router.post('/explore/combat', (req, res, next) => herbGardenController.combat(req, res, next))

export default router
