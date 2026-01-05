import jwt from 'jsonwebtoken'
import { config } from '../config'

export interface TokenPayload {
  userId: string
  characterId?: string
  username: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export function generateTokens(payload: TokenPayload): AuthTokens {
  const accessToken = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as jwt.SignOptions)

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn } as jwt.SignOptions)

  return { accessToken, refreshToken }
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.secret) as TokenPayload
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload
}
