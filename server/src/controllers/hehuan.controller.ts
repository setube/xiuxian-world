/**
 * 合欢宗情缘三境控制器
 */
import { Request, Response, NextFunction } from 'express'
import { dualCultivationService } from '../services/dualCultivation.service'
import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { DualCultivationSession, SoulBond } from '../models/DualCultivation'
import {
  HEHUAN_SECT_ID,
  BASIC_DUAL_CULTIVATION,
  SOUL_BOND,
  NOURISH_CULTIVATION,
  SOUL_IMPRINT,
  meetsRealmRequirement
} from '../game/constants/hehuanDualCultivation'
import { R } from '../utils/response'

const characterRepository = AppDataSource.getRepository(Character)
const sessionRepository = AppDataSource.getRepository(DualCultivationSession)
const bondRepository = AppDataSource.getRepository(SoulBond)

class HehuanController {
  /**
   * 获取情缘三境系统完整状态
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return R.unauthorized(res, '未登录')
      }

      const character = await characterRepository.findOne({
        where: { userId },
        relations: ['realm']
      })

      if (!character) {
        return R.notFound(res, '角色不存在')
      }

      const isHehuanMember = character.sectId === HEHUAN_SECT_ID

      // 各层功能解锁状态
      const layer1Unlocked = meetsRealmRequirement(
        character.realm.tier,
        character.realm.subTier,
        BASIC_DUAL_CULTIVATION.minRealmTier,
        BASIC_DUAL_CULTIVATION.minRealmSubTier
      )

      const layer2Unlocked =
        isHehuanMember &&
        meetsRealmRequirement(character.realm.tier, character.realm.subTier, SOUL_BOND.minRealmTier, SOUL_BOND.minRealmSubTier)

      const layer3Unlocked =
        isHehuanMember &&
        meetsRealmRequirement(character.realm.tier, character.realm.subTier, SOUL_IMPRINT.minRealmTier, SOUL_IMPRINT.minRealmSubTier)

      // 获取同参信息
      const bond = await dualCultivationService.getBondInfo(character.id)

      // 获取炉鼎列表
      const slaves = layer3Unlocked ? await dualCultivationService.getSlaves(character.id) : []

      // 被奴役状态
      const enslavedInfo = character.enslavedBy
        ? {
            isEnslaved: true,
            masterId: character.enslavedBy,
            expiresAt: character.enslavedUntil
          }
        : { isEnslaved: false }

      // 获取最近双修记录
      const lastSession = await sessionRepository.findOne({
        where: { initiatorId: character.id, status: 'completed' },
        order: { endedAt: 'DESC' }
      })

      // 冷却计算
      const now = Date.now()
      let basicCooldownEnd = 0
      let nourishCooldownEnd = 0

      if (lastSession && lastSession.endedAt) {
        if (lastSession.cultivationType === 'basic') {
          basicCooldownEnd = lastSession.endedAt + BASIC_DUAL_CULTIVATION.cooldownMs
        } else if (lastSession.cultivationType === 'nourish') {
          nourishCooldownEnd = lastSession.endedAt + NOURISH_CULTIVATION.cooldownMs
        }
      }

      R.success(res, {
        isHehuanMember,
        layers: {
          layer1: {
            name: '凡尘缘',
            unlocked: layer1Unlocked,
            description: '闭关双修，炼气四层可用',
            cooldownEnd: basicCooldownEnd > now ? basicCooldownEnd : 0,
            hehuanBonus: isHehuanMember ? '+10% 修为收益' : null
          },
          layer2: {
            name: '同参道',
            unlocked: layer2Unlocked,
            description: '缔结同参，筑基初期可用（合欢宗专属）',
            bond: bond
              ? {
                  partnerId: bond.initiatorId === character.id ? bond.partnerId : bond.initiatorId,
                  partnerName: bond.initiatorId === character.id ? bond.partner?.name : bond.initiator?.name,
                  expiresAt: bond.bondExpiresAt,
                  nourishCount: bond.nourishCount
                }
              : null,
            cooldownEnd: nourishCooldownEnd > now ? nourishCooldownEnd : 0
          },
          layer3: {
            name: '魔染道',
            unlocked: layer3Unlocked,
            description: '心印秘法，金丹初期可用（合欢宗专属）',
            slaves: slaves.map(s => ({
              id: s.id,
              slaveId: s.slaveId,
              slaveName: s.slave?.name,
              slaveRealm: s.slave?.realm?.name,
              expiresAt: s.expiresAt,
              harvestCount: s.harvestCount,
              lastHarvestTime: s.lastHarvestTime
            })),
            maxSlaves: SOUL_IMPRINT.maxSlaves
          }
        },
        enslavedInfo
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取待处理的邀请
   */
  async getPendingInvites(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return R.unauthorized(res, '未登录')
      }

      const character = await characterRepository.findOne({ where: { userId } })
      if (!character) {
        return R.notFound(res, '角色不存在')
      }

      const invites = await dualCultivationService.getPendingInvites(character.id)

      R.success(res, {
        sessions: invites.sessions.map(s => ({
          id: s.id,
          type: s.cultivationType,
          initiatorId: s.initiatorId,
          initiatorName: s.initiator?.name,
          expiresAt: s.expiresAt
        })),
        bonds: invites.bonds.map(b => ({
          id: b.id,
          initiatorId: b.initiatorId,
          initiatorName: b.initiator?.name,
          expiresAt: b.inviteExpiresAt
        }))
      })
    } catch (error) {
      next(error)
    }
  }

  // ==================== 第一层：凡尘缘 ====================

  /**
   * 发起闭关双修邀请
   */
  async inviteBasicDual(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return R.unauthorized(res, '未登录')
      }

      const { targetId, targetName } = req.body
      if (!targetId && !targetName) {
        return R.error(res, 400, '请指定双修对象')
      }

      const character = await characterRepository.findOne({ where: { userId } })
      if (!character) {
        return R.notFound(res, '角色不存在')
      }

      // 支持按道号查找
      let partnerId = targetId
      if (!partnerId && targetName) {
        const target = await characterRepository.findOne({ where: { name: targetName } })
        if (!target) {
          return R.notFound(res, '找不到该修士')
        }
        partnerId = target.id
      }

      const result = await dualCultivationService.inviteBasicDualCultivation(character.id, partnerId)

      if (result.success) {
        R.success(res, result, result.message)
      } else {
        R.error(res, 400, result.message)
      }
    } catch (error) {
      next(error)
    }
  }

  /**
   * 接受双修邀请
   */
  async acceptBasicDual(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return R.unauthorized(res, '未登录')
      }

      const { sessionId } = req.body
      if (!sessionId) {
        return R.error(res, 400, '请指定邀请ID')
      }

      const character = await characterRepository.findOne({ where: { userId } })
      if (!character) {
        return R.notFound(res, '角色不存在')
      }

      const result = await dualCultivationService.acceptDualCultivation(sessionId, character.id)

      if (result.success) {
        R.success(res, result, result.message)
      } else {
        R.error(res, 400, result.message)
      }
    } catch (error) {
      next(error)
    }
  }

  /**
   * 拒绝双修邀请
   */
  async rejectBasicDual(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return R.unauthorized(res, '未登录')
      }

      const { sessionId } = req.body
      if (!sessionId) {
        return R.error(res, 400, '请指定邀请ID')
      }

      const character = await characterRepository.findOne({ where: { userId } })
      if (!character) {
        return R.notFound(res, '角色不存在')
      }

      const session = await sessionRepository.findOne({
        where: { id: sessionId, partnerId: character.id, status: 'pending' }
      })

      if (!session) {
        return R.notFound(res, '邀请不存在')
      }

      session.status = 'rejected'
      await sessionRepository.save(session)

      R.success(res, { success: true }, '已拒绝双修邀请')
    } catch (error) {
      next(error)
    }
  }

  // ==================== 第二层：同参道 ====================

  /**
   * 获取同参信息
   */
  async getBondInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return R.unauthorized(res, '未登录')
      }

      const character = await characterRepository.findOne({ where: { userId } })
      if (!character) {
        return R.notFound(res, '角色不存在')
      }

      const bond = await dualCultivationService.getBondInfo(character.id)

      if (!bond) {
        return R.success(res, { hasBond: false })
      }

      const partnerId = bond.initiatorId === character.id ? bond.partnerId : bond.initiatorId
      const partner = bond.initiatorId === character.id ? bond.partner : bond.initiator

      R.success(res, {
        hasBond: true,
        bond: {
          id: bond.id,
          partnerId,
          partnerName: partner?.name,
          partnerRealm: partner?.realm?.name,
          bondStartedAt: bond.bondStartedAt,
          bondExpiresAt: bond.bondExpiresAt,
          nourishCount: bond.nourishCount,
          totalContributionGain: bond.totalContributionGain
        }
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 发起缔结同参邀请
   */
  async inviteSoulBond(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return R.unauthorized(res, '未登录')
      }

      const { targetId, targetName } = req.body
      if (!targetId && !targetName) {
        return R.error(res, 400, '请指定同参对象')
      }

      const character = await characterRepository.findOne({ where: { userId } })
      if (!character) {
        return R.notFound(res, '角色不存在')
      }

      // 支持按道号查找
      let partnerId = targetId
      if (!partnerId && targetName) {
        const target = await characterRepository.findOne({ where: { name: targetName } })
        if (!target) {
          return R.notFound(res, '找不到该修士')
        }
        partnerId = target.id
      }

      const result = await dualCultivationService.inviteSoulBond(character.id, partnerId)

      if (result.success) {
        R.success(res, result, result.message)
      } else {
        R.error(res, 400, result.message)
      }
    } catch (error) {
      next(error)
    }
  }

  /**
   * 接受同参契约
   */
  async acceptSoulBond(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return R.unauthorized(res, '未登录')
      }

      const { bondId } = req.body
      if (!bondId) {
        return R.error(res, 400, '请指定契约ID')
      }

      const character = await characterRepository.findOne({ where: { userId } })
      if (!character) {
        return R.notFound(res, '角色不存在')
      }

      const result = await dualCultivationService.acceptSoulBond(bondId, character.id)

      if (result.success) {
        R.success(res, result, result.message)
      } else {
        R.error(res, 400, result.message)
      }
    } catch (error) {
      next(error)
    }
  }

  /**
   * 拒绝同参契约
   */
  async rejectSoulBond(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return R.unauthorized(res, '未登录')
      }

      const { bondId } = req.body
      if (!bondId) {
        return R.error(res, 400, '请指定契约ID')
      }

      const character = await characterRepository.findOne({ where: { userId } })
      if (!character) {
        return R.notFound(res, '角色不存在')
      }

      const bond = await bondRepository.findOne({
        where: { id: bondId, partnerId: character.id, status: 'pending' }
      })

      if (!bond) {
        return R.notFound(res, '契约邀请不存在')
      }

      bond.status = 'broken'
      await bondRepository.save(bond)

      R.success(res, { success: true }, '已拒绝同参契约')
    } catch (error) {
      next(error)
    }
  }

  /**
   * 发起双修温养
   */
  async initiateNourish(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return R.unauthorized(res, '未登录')
      }

      const character = await characterRepository.findOne({ where: { userId } })
      if (!character) {
        return R.notFound(res, '角色不存在')
      }

      const result = await dualCultivationService.initiateNourishCultivation(character.id)

      if (result.success) {
        R.success(res, result, result.message)
      } else {
        R.error(res, 400, result.message)
      }
    } catch (error) {
      next(error)
    }
  }

  /**
   * 接受温养邀请
   */
  async acceptNourish(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return R.unauthorized(res, '未登录')
      }

      const { sessionId } = req.body
      if (!sessionId) {
        return R.error(res, 400, '请指定邀请ID')
      }

      const character = await characterRepository.findOne({ where: { userId } })
      if (!character) {
        return R.notFound(res, '角色不存在')
      }

      const result = await dualCultivationService.acceptDualCultivation(sessionId, character.id)

      if (result.success) {
        R.success(res, result, result.message)
      } else {
        R.error(res, 400, result.message)
      }
    } catch (error) {
      next(error)
    }
  }

  // ==================== 第三层：魔染道 ====================

  /**
   * 获取炉鼎列表
   */
  async getSlaves(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return R.unauthorized(res, '未登录')
      }

      const character = await characterRepository.findOne({ where: { userId } })
      if (!character) {
        return R.notFound(res, '角色不存在')
      }

      const slaves = await dualCultivationService.getSlaves(character.id)

      R.success(res, {
        slaves: slaves.map(s => ({
          id: s.id,
          slaveId: s.slaveId,
          slaveName: s.slave?.name,
          slaveRealm: s.slave?.realm?.name,
          enslavedAt: s.enslavedAt,
          expiresAt: s.expiresAt,
          harvestCount: s.harvestCount,
          totalHarvestedExp: s.totalHarvestedExp,
          lastHarvestTime: s.lastHarvestTime
        })),
        maxSlaves: SOUL_IMPRINT.maxSlaves
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 发起心神之战
   */
  async initiateSoulBattle(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return R.unauthorized(res, '未登录')
      }

      const { targetId, targetName } = req.body
      if (!targetId && !targetName) {
        return R.error(res, 400, '请指定目标')
      }

      const character = await characterRepository.findOne({ where: { userId } })
      if (!character) {
        return R.notFound(res, '角色不存在')
      }

      // 支持按道号查找
      let realTargetId = targetId
      if (!realTargetId && targetName) {
        const target = await characterRepository.findOne({ where: { name: targetName } })
        if (!target) {
          return R.notFound(res, '找不到该修士')
        }
        realTargetId = target.id
      }

      const result = await dualCultivationService.initiateSoulBattle(character.id, realTargetId)

      if (result.success) {
        R.success(res, result, result.message)
      } else {
        R.error(res, 400, result.message)
      }
    } catch (error) {
      next(error)
    }
  }

  /**
   * 采补炉鼎
   */
  async harvestSlave(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return R.unauthorized(res, '未登录')
      }

      const { slaveId } = req.body
      if (!slaveId) {
        return R.error(res, 400, '请指定炉鼎')
      }

      const character = await characterRepository.findOne({ where: { userId } })
      if (!character) {
        return R.notFound(res, '角色不存在')
      }

      const result = await dualCultivationService.harvestSlave(character.id, slaveId)

      if (result.success) {
        R.success(res, result, result.message)
      } else {
        R.error(res, 400, result.message)
      }
    } catch (error) {
      next(error)
    }
  }

  /**
   * 尝试挣脱心印
   */
  async attemptEscape(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return R.unauthorized(res, '未登录')
      }

      const character = await characterRepository.findOne({ where: { userId } })
      if (!character) {
        return R.notFound(res, '角色不存在')
      }

      const result = await dualCultivationService.attemptEscape(character.id)

      if (result.success) {
        R.success(res, result, result.message)
      } else {
        R.error(res, 400, result.message)
      }
    } catch (error) {
      next(error)
    }
  }

  /**
   * 检查是否被奴役
   */
  async checkEnslaved(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return R.unauthorized(res, '未登录')
      }

      const character = await characterRepository.findOne({ where: { userId } })
      if (!character) {
        return R.notFound(res, '角色不存在')
      }

      if (!character.enslavedBy) {
        return R.success(res, { isEnslaved: false })
      }

      const master = await characterRepository.findOne({
        where: { id: character.enslavedBy },
        relations: ['realm']
      })

      R.success(res, {
        isEnslaved: true,
        masterId: character.enslavedBy,
        masterName: master?.name,
        masterRealm: master?.realm?.name,
        expiresAt: character.enslavedUntil
      })
    } catch (error) {
      next(error)
    }
  }
}

export const hehuanController = new HehuanController()
