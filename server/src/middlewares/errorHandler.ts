/**
 * 全局错误处理中间件
 */

import { Request, Response, NextFunction } from 'express'
import { ApiError, R } from '../utils/response'
import { ERROR_CODES } from '../utils/errorCodes'

/**
 * 全局错误处理中间件
 *
 * 功能：
 * 1. 捕获 ApiError 并返回统一格式的错误响应
 * 2. 捕获其他错误并返回服务器内部错误
 * 3. 在开发环境下返回详细错误信息
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // 日志记录
  console.error('[Error]', {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  })

  // 处理 ApiError
  if (err instanceof ApiError) {
    R.fromError(res, err)
    return
  }

  // 处理 JSON 解析错误
  if (err instanceof SyntaxError && 'body' in err) {
    R.error(res, ERROR_CODES.VALIDATION_ERROR, '请求体格式错误', undefined, 400)
    return
  }

  // 处理其他未知错误
  const isDev = process.env.NODE_ENV !== 'production'
  R.error(res, ERROR_CODES.INTERNAL_ERROR, isDev ? err.message : '服务器内部错误', isDev ? { stack: err.stack } : undefined, 500)
}

/**
 * 404 处理中间件
 */
export function notFoundHandler(_req: Request, res: Response): void {
  R.notFound(res, '接口不存在')
}

/**
 * 异步处理器包装器
 *
 * 用于包装异步路由处理函数，自动捕获错误并传递给错误处理中间件
 *
 * 使用示例：
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await userService.findAll()
 *   R.success(res, users)
 * }))
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
