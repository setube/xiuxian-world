import { Router, type IRouter } from 'express'
import { windThunderWingsController } from '../controllers/fengxi.controller'
import { authMiddleware, characterMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有路由需要认证和角色中间件
router.use(authMiddleware, characterMiddleware)

// ========== 装备管理 ==========

// 获取风雷翅状态
router.get('/status', windThunderWingsController.getStatus.bind(windThunderWingsController))

// 炼化风雷翅
router.post('/refine', windThunderWingsController.refine.bind(windThunderWingsController))

// 装备风雷翅
router.post('/equip', windThunderWingsController.equip.bind(windThunderWingsController))

// 卸下风雷翅
router.post('/unequip', windThunderWingsController.unequip.bind(windThunderWingsController))

// ========== 风雷降世 · 主动技能 ==========

// 第一式：奇袭夺宝 - 无相劫掠
router.post('/skill/plunder', windThunderWingsController.usePlunder.bind(windThunderWingsController))

// 第二式：奇袭破阵 - 寂灭神雷
router.post('/skill/formation-break', windThunderWingsController.useFormationBreak.bind(windThunderWingsController))

// 第三式：奇袭瞬杀 - 血色惊雷
router.post('/skill/blood-thunder', windThunderWingsController.useBloodThunder.bind(windThunderWingsController))

export default router
