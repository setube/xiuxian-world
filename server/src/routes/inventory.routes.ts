import { Router, type IRouter } from 'express'
import { inventoryController } from '../controllers/inventory.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有路由都需要认证
router.use(authMiddleware)

// 获取背包物品列表
router.get('/', (req, res, next) => inventoryController.getInventory(req, res, next))

// 获取背包容量
router.get('/capacity', (req, res, next) => inventoryController.getCapacity(req, res, next))

// 获取单个物品详情
router.get('/item/:inventoryItemId', (req, res, next) => inventoryController.getItemDetail(req, res, next))

// 使用物品
router.post('/use/:inventoryItemId', (req, res, next) => inventoryController.useItem(req, res, next))

// 丢弃物品
router.post('/discard/:inventoryItemId', (req, res, next) => inventoryController.discardItem(req, res, next))

// ========== 配方系统 ==========

// 获取已学习的配方列表
router.get('/recipes', (req, res, next) => inventoryController.getLearnedRecipes(req, res, next))

// 学习配方
router.post('/learn-recipe', (req, res, next) => inventoryController.learnRecipe(req, res, next))

// 检查是否可以炼制
router.get('/can-craft/:recipeId', (req, res, next) => inventoryController.canCraft(req, res, next))

// 炼制物品
router.post('/craft', (req, res, next) => inventoryController.craft(req, res, next))

// ========== 赠送系统 ==========

// 赠送物品
router.post('/gift', (req, res, next) => inventoryController.giftItem(req, res, next))

export default router
