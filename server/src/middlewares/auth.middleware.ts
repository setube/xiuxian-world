import { Request, Response, NextFunction } from 'express'
import { TokenExpiredError } from 'jsonwebtoken'
import { verifyToken, TokenPayload } from '../utils/jwt'
import { AppDataSource } from '../config/database'
import { User } from '../models/User'
import { Character } from '../models/Character'
import { ApiError } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload
      characterId?: string // 当前用户的角色ID
    }
  }
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('未提供认证令牌', ERROR_CODES.AUTH_TOKEN_MISSING))
  }

  const token = authHeader.substring(7)

  try {
    const payload = verifyToken(token)

    // 验证用户是否仍然存在于数据库中
    const userRepository = AppDataSource.getRepository(User)
    const user = await userRepository.findOne({ where: { id: payload.userId } })

    if (!user) {
      return next(ApiError.business(ERROR_CODES.AUTH_ACCOUNT_DELETED, '账号不存在或已被删除'))
    }

    req.user = payload
    next()
  } catch (error) {
    // 区分令牌过期和令牌无效
    if (error instanceof TokenExpiredError) {
      return next(ApiError.tokenExpired('令牌已过期，请刷新'))
    }
    return next(ApiError.unauthorized('令牌无效', ERROR_CODES.AUTH_TOKEN_INVALID))
  }
}

export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      const payload = verifyToken(token)
      req.user = payload
    } catch {
      // 忽略无效令牌
    }
  }

  next()
}

/**
 * 角色ID中间件 - 从用户信息中解析并设置 characterId
 * 必须在 authMiddleware 之后使用
 * 同时更新角色的 lastActiveAt 时间（用于世界事件选取活跃玩家）
 */
export async function characterMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(ApiError.unauthorized('未认证', ERROR_CODES.AUTH_TOKEN_MISSING))
  }

  try {
    const characterRepository = AppDataSource.getRepository(Character)

    // 优先使用 token 中的 characterId
    if (req.user.characterId) {
      req.characterId = req.user.characterId
      // 异步更新 lastActiveAt，不阻塞请求
      characterRepository.update(
        { id: req.user.characterId },
        { lastActiveAt: Date.now() }
      ).catch(() => {})
      return next()
    }

    // 否则从数据库查询用户的角色
    const character = await characterRepository.findOne({
      where: { userId: req.user.userId }
    })

    if (!character) {
      return next(ApiError.business(ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, '未创建角色'))
    }

    req.characterId = character.id
    // 异步更新 lastActiveAt，不阻塞请求
    characterRepository.update(
      { id: character.id },
      { lastActiveAt: Date.now() }
    ).catch(() => {})
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * 管理员权限中间件
 * 必须在 authMiddleware 之后使用
 */
export async function adminMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(ApiError.unauthorized('未认证', ERROR_CODES.AUTH_TOKEN_MISSING))
  }

  try {
    const userRepository = AppDataSource.getRepository(User)
    const user = await userRepository.findOne({ where: { id: req.user.userId } })

    if (!user || !user.isAdmin) {
      return next(ApiError.forbidden('需要管理员权限'))
    }

    next()
  } catch (error) {
    next(error)
  }
}
