/**
 * 太一门专属系统服务 - 神识与引道
 */
import { AppDataSource } from '../config/database'
import { EntityManager } from 'typeorm'
import { Character } from '../models/Character'
import {
  ElementType,
  ELEMENT_NAMES,
  ELEMENT_DAO_NAMES,
  GUIDANCE_BUFFS,
  GUIDANCE_CONFIG,
  CONSCIOUSNESS_CONFIG,
  GuidanceBuff,
  canUseGuidance,
  getGuidanceCooldownRemaining,
  isBuffActive,
  getBuffRemainingTime,
  calculateConsciousnessBonus,
  cleanExpiredDebuffs,
  calculateTotalDebuffEffect
} from '../game/constants/taiyi'
import { ERROR_CODES } from '../utils/errorCodes'

const characterRepository = AppDataSource.getRepository(Character)

// 太一门宗门ID
const TAIYI_SECT_ID = 'taiyi'

export interface TaiyiStatus {
  isTaiyiMember: boolean
  consciousness: number
  consciousnessBonus: number // 神识带来的闭关成功率加成
  lastGuidanceTime: number | null
  canUseGuidance: boolean
  guidanceCooldownRemaining: number // 毫秒
  activeBuff: {
    element: ElementType
    buff: GuidanceBuff
    expiresAt: number
    remainingTime: number
  } | null
  debuffs: {
    sourceCharacterId: string
    appliedAt: number
    expiresAt: number
    failureRateIncrease: number
  }[]
  totalDebuffEffect: number // 总的神识冲击减益效果
}

export interface GuidanceResult {
  success: boolean
  element: ElementType
  consciousnessGained: number
  newConsciousness: number
  buff: GuidanceBuff
  buffExpiresAt: number
  message: string
}

export interface ConsciousnessStrikeResult {
  success: boolean
  consciousnessConsumed: number
  targetName: string
  effectApplied: boolean
  failureRateIncrease: number
  debuffDuration: number
  message: string
}

class TaiyiService {
  /**
   * 检查是否为太一门弟子
   */
  private isTaiyiMember(character: Character): boolean {
    return character.sectId === TAIYI_SECT_ID
  }

  /**
   * 获取太一门系统状态
   */
  async getStatus(characterId: string): Promise<TaiyiStatus> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    const isMember = this.isTaiyiMember(character)

    if (!isMember) {
      return {
        isTaiyiMember: false,
        consciousness: 0,
        consciousnessBonus: 0,
        lastGuidanceTime: null,
        canUseGuidance: false,
        guidanceCooldownRemaining: 0,
        activeBuff: null,
        debuffs: [],
        totalDebuffEffect: 0
      }
    }

    const lastGuidanceTime = character.lastGuidanceTime ? Number(character.lastGuidanceTime) : null
    const buffExpiresAt = character.buffExpiresAt ? Number(character.buffExpiresAt) : null
    const consciousness = character.consciousness || 0
    const consciousnessBonus = calculateConsciousnessBonus(consciousness)

    // 清理过期的减益
    const debuffs = cleanExpiredDebuffs(character.consciousnessDebuffs || [])
    if (debuffs.length !== (character.consciousnessDebuffs || []).length) {
      character.consciousnessDebuffs = debuffs
      await characterRepository.save(character)
    }

    // 激活的增益
    let activeBuff = null
    if (character.activeBuffElement && buffExpiresAt && isBuffActive(buffExpiresAt)) {
      const element = character.activeBuffElement as ElementType
      activeBuff = {
        element,
        buff: GUIDANCE_BUFFS[element],
        expiresAt: buffExpiresAt,
        remainingTime: getBuffRemainingTime(buffExpiresAt)
      }
    }

    return {
      isTaiyiMember: true,
      consciousness,
      consciousnessBonus,
      lastGuidanceTime,
      canUseGuidance: canUseGuidance(lastGuidanceTime),
      guidanceCooldownRemaining: getGuidanceCooldownRemaining(lastGuidanceTime),
      activeBuff,
      debuffs,
      totalDebuffEffect: calculateTotalDebuffEffect(debuffs)
    }
  }

  /**
   * 使用引道（使用事务保护）
   */
  async useGuidance(characterId: string, element: ElementType): Promise<GuidanceResult> {
    // 验证元素类型（不需要事务）
    if (!GUIDANCE_BUFFS[element]) {
      throw { code: ERROR_CODES.TAIYI_INVALID_ELEMENT, message: '无效的元素类型' }
    }

    // 使用事务确保引道操作的原子性
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 获取角色（使用悲观锁）
      const character = await manager.findOne(Character, {
        where: { id: characterId },
        lock: { mode: 'pessimistic_write' }
      })

      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      // 检查是否为太一门弟子
      if (!this.isTaiyiMember(character)) {
        throw { code: ERROR_CODES.TAIYI_NOT_MEMBER, message: '只有太一门弟子才能使用引道' }
      }

      // 检查冷却
      const lastGuidanceTime = character.lastGuidanceTime ? Number(character.lastGuidanceTime) : null
      if (!canUseGuidance(lastGuidanceTime)) {
        const remaining = getGuidanceCooldownRemaining(lastGuidanceTime)
        const hours = Math.ceil(remaining / (60 * 60 * 1000))
        throw {
          code: ERROR_CODES.TAIYI_GUIDANCE_COOLDOWN,
          message: `引道冷却中，还需等待约${hours}小时`
        }
      }

      const now = Date.now()
      const buff = GUIDANCE_BUFFS[element]
      const buffExpiresAt = now + buff.durationHours * 60 * 60 * 1000

      // 更新角色数据
      character.consciousness = (character.consciousness || 0) + GUIDANCE_CONFIG.consciousnessGain
      character.lastGuidanceTime = now
      character.activeBuffElement = element
      character.buffExpiresAt = buffExpiresAt

      await manager.save(Character, character)

      const daoName = ELEMENT_DAO_NAMES[element]

      return {
        success: true,
        element,
        consciousnessGained: GUIDANCE_CONFIG.consciousnessGain,
        newConsciousness: character.consciousness,
        buff,
        buffExpiresAt,
        message: `你参悟${daoName}，获得${GUIDANCE_CONFIG.consciousnessGain}点神识，${buff.name}增益持续${buff.durationHours}小时`
      }
    })
  }

  /**
   * 使用神识冲击（使用事务保护）
   */
  async useConsciousnessStrike(characterId: string, targetCharacterId: string): Promise<ConsciousnessStrikeResult> {
    // 检查是否对自己使用（不需要事务）
    if (characterId === targetCharacterId) {
      throw { code: ERROR_CODES.TAIYI_STRIKE_SELF_NOT_ALLOWED, message: '不能对自己使用神识冲击' }
    }

    // 使用事务确保神识冲击操作的原子性
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 获取攻击者（使用悲观锁）
      const character = await manager.findOne(Character, {
        where: { id: characterId },
        lock: { mode: 'pessimistic_write' }
      })

      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      // 检查是否为太一门弟子
      if (!this.isTaiyiMember(character)) {
        throw { code: ERROR_CODES.TAIYI_NOT_MEMBER, message: '只有太一门弟子才能使用神识冲击' }
      }

      // 检查神识是否足够
      const cost = CONSCIOUSNESS_CONFIG.consciousnessStrike.cost
      if ((character.consciousness || 0) < cost) {
        throw {
          code: ERROR_CODES.TAIYI_CONSCIOUSNESS_NOT_ENOUGH,
          message: `神识不足，需要${cost}点神识`
        }
      }

      // 获取目标（使用悲观锁）
      const target = await manager.findOne(Character, {
        where: { id: targetCharacterId },
        lock: { mode: 'pessimistic_write' }
      })

      if (!target) {
        throw { code: ERROR_CODES.TAIYI_STRIKE_TARGET_NOT_FOUND, message: '目标角色不存在' }
      }

      // 消耗神识
      character.consciousness -= cost

      // 判定是否成功
      const successChance = CONSCIOUSNESS_CONFIG.consciousnessStrike.successChance
      const roll = Math.random() * 100

      if (roll > successChance) {
        // 失败：只保存攻击者的神识消耗
        await manager.save(Character, character)
        return {
          success: false,
          consciousnessConsumed: cost,
          targetName: target.name,
          effectApplied: false,
          failureRateIncrease: 0,
          debuffDuration: 0,
          message: `神识冲击未能命中${target.name}，消耗了${cost}点神识`
        }
      }

      // 成功，给目标施加减益
      const now = Date.now()
      const debuffDurationMs = CONSCIOUSNESS_CONFIG.consciousnessStrike.debuffDurationHours * 60 * 60 * 1000
      const failureRateIncrease = CONSCIOUSNESS_CONFIG.consciousnessStrike.failureRateIncrease

      const newDebuff = {
        sourceCharacterId: characterId,
        appliedAt: now,
        expiresAt: now + debuffDurationMs,
        failureRateIncrease
      }

      // 清理过期减益并添加新减益
      const existingDebuffs = cleanExpiredDebuffs(target.consciousnessDebuffs || [])
      target.consciousnessDebuffs = [...existingDebuffs, newDebuff]

      // 在事务中同时保存攻击者和目标
      await manager.save(Character, character)
      await manager.save(Character, target)

      return {
        success: true,
        consciousnessConsumed: cost,
        targetName: target.name,
        effectApplied: true,
        failureRateIncrease,
        debuffDuration: CONSCIOUSNESS_CONFIG.consciousnessStrike.debuffDurationHours,
        message: `神识冲击命中${target.name}！对方在${CONSCIOUSNESS_CONFIG.consciousnessStrike.debuffDurationHours}小时内闭关失败率增加${failureRateIncrease}%`
      }
    })
  }

  /**
   * 获取角色的神识加成（用于修炼系统）
   */
  async getConsciousnessBonus(characterId: string): Promise<number> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character || !this.isTaiyiMember(character)) {
      return 0
    }

    return calculateConsciousnessBonus(character.consciousness || 0)
  }

  /**
   * 获取角色当前激活的引道增益（用于其他系统查询）
   */
  async getActiveBuff(characterId: string): Promise<GuidanceBuff | null> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character || !this.isTaiyiMember(character)) {
      return null
    }

    const buffExpiresAt = character.buffExpiresAt ? Number(character.buffExpiresAt) : null
    if (!character.activeBuffElement || !buffExpiresAt || !isBuffActive(buffExpiresAt)) {
      return null
    }

    return GUIDANCE_BUFFS[character.activeBuffElement as ElementType]
  }

  /**
   * 获取角色受到的神识冲击减益总效果（用于修炼系统）
   */
  async getDebuffEffect(characterId: string): Promise<number> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      return 0
    }

    const debuffs = cleanExpiredDebuffs(character.consciousnessDebuffs || [])

    // 如果有过期的减益被清理，保存一下
    if (debuffs.length !== (character.consciousnessDebuffs || []).length) {
      character.consciousnessDebuffs = debuffs
      await characterRepository.save(character)
    }

    return calculateTotalDebuffEffect(debuffs)
  }

  /**
   * 获取元素列表（用于前端展示选择）
   */
  getElementList() {
    return Object.entries(GUIDANCE_BUFFS).map(([element, buff]) => ({
      element: element as ElementType,
      name: ELEMENT_NAMES[element as ElementType],
      daoName: ELEMENT_DAO_NAMES[element as ElementType],
      buff
    }))
  }
}

export const taiyiService = new TaiyiService()
