/**
 * 虚空裂缝探索路由
 */
import { Router, type IRouter } from 'express'
import { authMiddleware, characterMiddleware } from '../middlewares/auth.middleware'
import * as riftExploreController from '../controllers/riftExplore.controller'

const router: IRouter = Router()

// 所有路由需要认证和角色
router.use(authMiddleware, characterMiddleware)

// 获取裂缝探索状态
router.get('/status', riftExploreController.getStatus)

// 进行裂缝探索
router.post('/explore', riftExploreController.explore)

export default router
