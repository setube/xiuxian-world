import bcrypt from 'bcryptjs'
import { AppDataSource } from '../config/database'
import { User } from '../models/User'
import { Character } from '../models/Character'
import { generateTokens, verifyRefreshToken, AuthTokens } from '../utils/jwt'

const userRepository = AppDataSource.getRepository(User)
const characterRepository = AppDataSource.getRepository(Character)

export interface RegisterDto {
  username: string
  email: string
  password: string
}

export interface LoginDto {
  username: string
  password: string
}

export class AuthService {
  async register(data: RegisterDto): Promise<{ user: User; tokens: AuthTokens }> {
    // 检查用户名是否存在
    const existingUser = await userRepository.findOne({
      where: [{ username: data.username }, { email: data.email }]
    })

    if (existingUser) {
      throw new Error('用户名或邮箱已被使用')
    }

    // 创建用户
    const passwordHash = await bcrypt.hash(data.password, 10)
    const user = userRepository.create({
      username: data.username,
      email: data.email,
      passwordHash
    })
    await userRepository.save(user)

    // 生成令牌
    const tokens = generateTokens({
      userId: user.id,
      username: user.username
    })

    return { user, tokens }
  }

  async login(data: LoginDto): Promise<{ user: User; character: Character | null; tokens: AuthTokens }> {
    // 查找用户
    const user = await userRepository.findOne({
      where: { username: data.username }
    })

    if (!user) {
      throw new Error('用户名或密码错误')
    }

    if (user.isBanned) {
      throw new Error('账号已被封禁')
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash)
    if (!isValidPassword) {
      throw new Error('用户名或密码错误')
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date()
    await userRepository.save(user)

    // 查找角色
    const character = await characterRepository.findOne({
      where: { userId: user.id },
      relations: ['realm']
    })

    // 生成令牌
    const tokens = generateTokens({
      userId: user.id,
      characterId: character?.id,
      username: user.username
    })

    return { user, character, tokens }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = verifyRefreshToken(refreshToken)

      // 查找用户确保仍然有效
      const user = await userRepository.findOne({
        where: { id: payload.userId }
      })

      if (!user || user.isBanned) {
        throw new Error('用户不存在或已被封禁')
      }

      // 查找角色
      const character = await characterRepository.findOne({
        where: { userId: user.id }
      })

      // 生成新令牌
      return generateTokens({
        userId: user.id,
        characterId: character?.id,
        username: user.username
      })
    } catch {
      throw new Error('刷新令牌无效或已过期')
    }
  }
}

export const authService = new AuthService()
