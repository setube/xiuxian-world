/**
 * 统一响应工具类
 */

import { Response } from 'express'
import { ERROR_CODES, getErrorType, getHttpStatus } from './errorCodes'

// ============ 类型定义 ============

/**
 * 成功响应类型
 */
export interface ApiSuccessResponse<T = unknown> {
  code: 0
  message: string
  data: T
  timestamp: number
}

/**
 * 错误响应类型
 */
export interface ApiErrorResponse {
  code: number
  errorType: string
  message: string
  details?: unknown
  timestamp: number
}

/**
 * 统一响应类型
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// ============ 业务异常类 ============

/**
 * API 业务异常
 *
 * 使用示例：
 * - throw new ApiError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, '用户名或密码错误')
 * - throw ApiError.unauthorized('请先登录')
 * - throw ApiError.validation(errors.array(), '输入验证失败')
 */
export class ApiError extends Error {
  constructor(public code: number, message: string, public details?: unknown, public httpStatus?: number) {
    super(message)
    this.name = 'ApiError'
    // 如果未指定 httpStatus，根据 code 自动推断
    if (!this.httpStatus) {
      this.httpStatus = getHttpStatus(code)
    }
  }

  /**
   * 未认证错误
   */
  static unauthorized(message = '未认证', code: number = ERROR_CODES.AUTH_TOKEN_MISSING) {
    return new ApiError(code, message, undefined, 401)
  }

  /**
   * 令牌过期错误
   */
  static tokenExpired(message = '令牌已过期') {
    return new ApiError(ERROR_CODES.AUTH_TOKEN_EXPIRED, message, undefined, 401)
  }

  /**
   * 禁止访问错误
   */
  static forbidden(message = '无权限', code: number = ERROR_CODES.FORBIDDEN) {
    return new ApiError(code, message, undefined, 403)
  }

  /**
   * 资源不存在错误
   */
  static notFound(message = '资源不存在', code: number = ERROR_CODES.NOT_FOUND) {
    return new ApiError(code, message, undefined, 404)
  }

  /**
   * 验证失败错误
   */
  static validation(details: unknown, message = '输入验证失败') {
    return new ApiError(ERROR_CODES.VALIDATION_ERROR, message, details, 400)
  }

  /**
   * 业务逻辑错误
   */
  static business(code: number, message: string, details?: unknown) {
    return new ApiError(code, message, details)
  }

  /**
   * 服务器内部错误
   */
  static internal(message = '服务器内部错误') {
    return new ApiError(ERROR_CODES.INTERNAL_ERROR, message, undefined, 500)
  }
}

// ============ 响应工具函数 ============

/**
 * 统一响应工具对象
 *
 * 使用示例：
 * - R.success(res, { user: {...} }, '登录成功')
 * - R.created(res, { character: {...} }, '创建成功')
 * - R.error(res, ERROR_CODES.AUTH_INVALID_CREDENTIALS, '用户名或密码错误')
 * - R.validationError(res, errors.array())
 */
export const R = {
  /**
   * 成功响应
   * @param res Express Response 对象
   * @param data 响应数据
   * @param message 成功消息
   * @param httpStatus HTTP 状态码（默认 200）
   */
  success<T>(res: Response, data: T, message = '操作成功', httpStatus = 200): void {
    const response: ApiSuccessResponse<T> = {
      code: 0,
      message,
      data,
      timestamp: Date.now()
    }
    res.status(httpStatus).json(response)
  },

  /**
   * 成功响应（无数据）
   */
  ok(res: Response, message = '操作成功'): void {
    R.success(res, null, message)
  },

  /**
   * 创建成功响应（HTTP 201）
   */
  created<T>(res: Response, data: T, message = '创建成功'): void {
    R.success(res, data, message, 201)
  },

  /**
   * 错误响应
   * @param res Express Response 对象
   * @param code 错误码
   * @param message 错误消息
   * @param details 错误详情（可选）
   * @param httpStatus HTTP 状态码（可选，默认根据 code 推断）
   */
  error(res: Response, code: number, message: string, details?: unknown, httpStatus?: number): void {
    const response: ApiErrorResponse = {
      code,
      errorType: getErrorType(code),
      message,
      timestamp: Date.now()
    }
    if (details !== undefined) {
      response.details = details
    }
    res.status(httpStatus ?? getHttpStatus(code)).json(response)
  },

  /**
   * 从 ApiError 构建错误响应
   */
  fromError(res: Response, err: ApiError): void {
    R.error(res, err.code, err.message, err.details, err.httpStatus)
  },

  /**
   * 验证失败响应
   */
  validationError(res: Response, errors: unknown): void {
    R.error(res, ERROR_CODES.VALIDATION_ERROR, '输入验证失败', errors, 400)
  },

  /**
   * 未认证响应
   */
  unauthorized(res: Response, message = '未认证', code = ERROR_CODES.AUTH_TOKEN_MISSING): void {
    R.error(res, code, message, undefined, 401)
  },

  /**
   * 禁止访问响应
   */
  forbidden(res: Response, message = '无权限'): void {
    R.error(res, ERROR_CODES.FORBIDDEN, message, undefined, 403)
  },

  /**
   * 资源不存在响应
   */
  notFound(res: Response, message = '资源不存在'): void {
    R.error(res, ERROR_CODES.NOT_FOUND, message, undefined, 404)
  },

  /**
   * 服务器错误响应
   */
  serverError(res: Response, message = '服务器内部错误'): void {
    R.error(res, ERROR_CODES.INTERNAL_ERROR, message, undefined, 500)
  }
}

export default R
