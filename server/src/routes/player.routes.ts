import { Router, type IRouter } from 'express'
import { body } from 'express-validator'
import { playerController } from '../controllers/player.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: IRouter = Router()

// 设置角色名（灵根检测前）
router.post(
  '/set-name',
  authMiddleware,
  [
    body('name')
      .isLength({ min: 2, max: 12 })
      .withMessage('角色名长度应为2-12个字符')
      .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
      .withMessage('角色名只能包含字母、数字、下划线和中文')
  ],
  playerController.setName.bind(playerController)
)

// 灵根检测并创建角色
router.post(
  '/detect-spirit-root',
  authMiddleware,
  playerController.detectSpiritRoot.bind(playerController)
)

// 创建角色（保留兼容）
router.post(
  '/create',
  authMiddleware,
  [
    body('name')
      .isLength({ min: 2, max: 12 })
      .withMessage('角色名长度应为2-12个字符')
      .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
      .withMessage('角色名只能包含字母、数字、下划线和中文')
  ],
  playerController.createCharacter.bind(playerController)
)

// 获取当前角色信息
router.get('/profile', authMiddleware, playerController.getProfile.bind(playerController))

// 获取角色属性
router.get('/stats', authMiddleware, playerController.getStats.bind(playerController))

// 查看其他玩家
router.get('/:id', playerController.getPlayer.bind(playerController))

export default router
