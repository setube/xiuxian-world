/**
 * 前端 API 错误类
 */

import type { ApiErrorResponse } from '@/types/api'
import { ERROR_TYPES } from '@/types/api'

/**
 * API 错误类
 *
 * 用于封装后端返回的错误响应，提供便捷的错误判断方法
 */
export class ApiError extends Error {
  /** 错误码 */
  code: number
  /** 错误类型字符串 */
  errorType: string
  /** 错误详情 */
  details?: unknown
  /** 时间戳 */
  timestamp: number

  constructor(response: ApiErrorResponse) {
    super(response.message)
    this.name = 'ApiError'
    this.code = response.code
    this.errorType = response.errorType
    this.details = response.details
    this.timestamp = response.timestamp
  }

  /**
   * 判断是否为特定错误类型
   */
  is(errorType: string): boolean {
    return this.errorType === errorType
  }

  /**
   * 判断是否为认证错误（1xxx）
   */
  isAuthError(): boolean {
    return this.code >= 1001 && this.code <= 1099
  }

  /**
   * 判断是否为玩家错误（2xxx）
   */
  isPlayerError(): boolean {
    return this.code >= 2001 && this.code <= 2099
  }

  /**
   * 判断是否为修炼错误（3xxx）
   */
  isCultivationError(): boolean {
    return this.code >= 3001 && this.code <= 3099
  }

  /**
   * 判断是否为宗门错误（4xxx）
   */
  isSectError(): boolean {
    return this.code >= 4001 && this.code <= 4099
  }

  /**
   * 判断是否需要刷新令牌
   */
  needsTokenRefresh(): boolean {
    return this.errorType === ERROR_TYPES.AUTH_TOKEN_EXPIRED
  }

  /**
   * 判断是否需要重新登录
   */
  needsRelogin(): boolean {
    const reloginTypes: string[] = [
      ERROR_TYPES.AUTH_TOKEN_INVALID,
      ERROR_TYPES.AUTH_REFRESH_TOKEN_INVALID,
      ERROR_TYPES.AUTH_ACCOUNT_DELETED
    ]
    return reloginTypes.includes(this.errorType)
  }

  /**
   * 判断是否为验证错误
   */
  isValidationError(): boolean {
    return this.errorType === ERROR_TYPES.VALIDATION_ERROR
  }

  /**
   * 获取验证错误详情（如果是验证错误的话）
   */
  getValidationErrors(): Array<{ field: string; message: string }> {
    if (!this.isValidationError() || !Array.isArray(this.details)) {
      return []
    }
    return this.details.map((err: { param?: string; field?: string; msg?: string; message?: string }) => ({
      field: err.param || err.field || 'unknown',
      message: err.msg || err.message || '验证失败'
    }))
  }
}

/**
 * 判断是否为 ApiError 实例
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
