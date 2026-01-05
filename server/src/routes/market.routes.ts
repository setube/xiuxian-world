import { Router, type IRouter } from 'express'
import { marketController } from '../controllers/market.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有路由都需要认证
router.use(authMiddleware)

// 获取市场挂单列表
router.get('/', (req, res, next) => marketController.getListings(req, res, next))

// 获取我的挂单
router.get('/my-listings', (req, res, next) => marketController.getMyListings(req, res, next))

// 获取挂单详情
router.get('/listing/:listingId', (req, res, next) => marketController.getListingDetail(req, res, next))

// 创建挂单（上架物品）
router.post('/list', (req, res, next) => marketController.createListing(req, res, next))

// 取消挂单（下架物品）
router.post('/cancel/:listingId', (req, res, next) => marketController.cancelListing(req, res, next))

// 购买物品
router.post('/purchase/:listingId', (req, res, next) => marketController.purchase(req, res, next))

export default router
