import { Router, type IRouter } from 'express'
import { body } from 'express-validator'
import { authController } from '../controllers/auth.controller'

const router: IRouter = Router()

// 注册
router.post(
  '/register',
  [
    body('username')
      .isLength({ min: 2, max: 20 })
      .withMessage('用户名长度应为2-20个字符')
      .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
      .withMessage('用户名只能包含字母、数字、下划线和中文'),
    body('email').isEmail().withMessage('邮箱格式不正确'),
    body('password').isLength({ min: 6, max: 50 }).withMessage('密码长度应为6-50个字符')
  ],
  authController.register.bind(authController)
)

// 登录
router.post(
  '/login',
  [body('username').notEmpty().withMessage('用户名不能为空'), body('password').notEmpty().withMessage('密码不能为空')],
  authController.login.bind(authController)
)

// 刷新令牌
router.post('/refresh', authController.refresh.bind(authController))

// 登出
router.post('/logout', authController.logout.bind(authController))

export default router
