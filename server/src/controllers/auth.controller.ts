import { Request, Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'
import { authService } from '../services/auth.service'
import { R, ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return R.validationError(res, errors.array())
      }

      const { username, email, password } = req.body
      const result = await authService.register({ username, email, password })

      R.created(
        res,
        {
          user: {
            id: result.user.id,
            username: result.user.username,
            email: result.user.email
          },
          tokens: result.tokens
        },
        '注册成功'
      )
    } catch (error) {
      // 业务错误转换为 ApiError
      if (error instanceof Error) {
        if (error.message.includes('已存在') || error.message.includes('已被使用')) {
          return next(ApiError.business(ERROR_CODES.AUTH_USER_ALREADY_EXISTS, error.message))
        }
      }
      next(error)
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return R.validationError(res, errors.array())
      }

      const { username, password } = req.body
      const result = await authService.login({ username, password })

      R.success(
        res,
        {
          user: {
            id: result.user.id,
            username: result.user.username,
            email: result.user.email
          },
          character: result.character
            ? {
                id: result.character.id,
                name: result.character.name,
                spiritRootId: result.character.spiritRootId,
                level: result.character.level,
                realm: result.character.realm
              }
            : null,
          tokens: result.tokens
        },
        '登录成功'
      )
    } catch (error) {
      if (error instanceof Error) {
        return next(ApiError.business(ERROR_CODES.AUTH_INVALID_CREDENTIALS, error.message))
      }
      next(error)
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body
      if (!refreshToken) {
        throw ApiError.business(ERROR_CODES.AUTH_REFRESH_TOKEN_INVALID, '缺少刷新令牌')
      }

      const tokens = await authService.refreshToken(refreshToken)
      R.success(res, { tokens }, '刷新成功')
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error)
      }
      next(ApiError.business(ERROR_CODES.AUTH_REFRESH_TOKEN_INVALID, '刷新失败'))
    }
  }

  async logout(_req: Request, res: Response) {
    // 客户端删除令牌即可，服务端可以选择将令牌加入黑名单
    R.ok(res, '登出成功')
  }
}

export const authController = new AuthController()
