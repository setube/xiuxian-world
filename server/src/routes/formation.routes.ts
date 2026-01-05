import { Router, type IRouter } from 'express'
import { body } from 'express-validator'
import { formationController } from '../controllers/formation.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 所有路由都需要认证
router.use(authMiddleware)

/**
 * 获取阵法状态
 * GET /api/formation/status
 */
router.get('/status', formationController.getStatus.bind(formationController))

/**
 * 学习阵法
 * POST /api/formation/learn
 */
router.post(
  '/learn',
  [
    body('formationId')
      .isString()
      .notEmpty()
      .withMessage('阵法ID不能为空')
  ],
  formationController.learn.bind(formationController)
)

/**
 * 激活阵法
 * POST /api/formation/activate
 */
router.post(
  '/activate',
  [
    body('formationId')
      .isString()
      .notEmpty()
      .withMessage('阵法ID不能为空')
  ],
  formationController.activate.bind(formationController)
)

/**
 * 撤销阵法
 * POST /api/formation/deactivate
 */
router.post('/deactivate', formationController.deactivate.bind(formationController))

/**
 * 获取所有阵法模板
 * GET /api/formation/templates
 */
router.get('/templates', formationController.getAllFormations.bind(formationController))

export default router
