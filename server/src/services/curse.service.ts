/**
 * 丹魔之咒服务 - 黑煞教魔道禁术
 *
 * 功能：
 * 1. 下咒：消耗丹魔心萃对目标施加咒印
 * 2. 咒印效果：每10分钟吸取100-200修为，炼丹成功率-10%
 * 3. 收割：施咒者可收取累积的修为
 * 4. 解咒：服用九转解厄丹解除咒印
 */
import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import {
  HEISHA_SECT_ID,
  DEMON_CURSE_CONFIG,
  CURSE_ANTIDOTE_ID,
  type CurseStatus,
  type CasterCurseRecord,
  type CastCurseResult,
  type HarvestCurseResult,
  type RemoveCurseResult
} from '../game/constants/heisha'
import { inventoryService } from './inventory.service'
import { ERROR_CODES } from '../utils/errorCodes'

const characterRepository = AppDataSource.getRepository(Character)

class CurseService {
  /**
   * 获取角色的咒印状态（被下咒者视角）
   */
  async getCurseStatus(characterId: string): Promise<CurseStatus> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    // 检查咒印是否过期
    if (character.curseType && character.curseExpiresAt) {
      if (Date.now() > character.curseExpiresAt) {
        // 咒印已过期，清除咒印（但不返还修为给施咒者）
        await this.expireCurse(character)
        return {
          isCursed: false,
          curseType: null,
          casterName: null,
          startTime: null,
          expiresAt: null,
          remainingMs: null,
          storedCultivation: 0
        }
      }
    }

    if (!character.curseType) {
      return {
        isCursed: false,
        curseType: null,
        casterName: null,
        startTime: null,
        expiresAt: null,
        remainingMs: null,
        storedCultivation: 0
      }
    }

    const remainingMs = character.curseExpiresAt ? character.curseExpiresAt - Date.now() : null

    return {
      isCursed: true,
      curseType: character.curseType,
      casterName: character.curseCasterName,
      startTime: character.curseStartTime ? Number(character.curseStartTime) : null,
      expiresAt: character.curseExpiresAt ? Number(character.curseExpiresAt) : null,
      remainingMs: remainingMs && remainingMs > 0 ? remainingMs : null,
      storedCultivation: character.curseStoredCultivation
    }
  }

  /**
   * 获取施咒者的咒印记录（施咒者视角）
   */
  async getCasterCurseRecords(casterId: string): Promise<CasterCurseRecord[]> {
    const victims = await characterRepository.find({
      where: { curseCasterId: casterId }
    })

    const now = Date.now()
    const records: CasterCurseRecord[] = []

    for (const victim of victims) {
      if (victim.curseType && victim.curseExpiresAt && victim.curseExpiresAt > now) {
        records.push({
          targetId: victim.id,
          targetName: victim.name,
          storedCultivation: victim.curseStoredCultivation,
          expiresAt: Number(victim.curseExpiresAt),
          remainingMs: victim.curseExpiresAt - now
        })
      }
    }

    return records
  }

  /**
   * 下咒
   */
  async castCurse(casterId: string, targetId: string): Promise<CastCurseResult> {
    // 获取施咒者
    const caster = await characterRepository.findOne({
      where: { id: casterId },
      relations: ['realm']
    })

    if (!caster) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    // 检查是否是黑煞教弟子
    if (caster.sectId !== HEISHA_SECT_ID) {
      throw { code: ERROR_CODES.HEISHA_NOT_MEMBER, message: '只有黑煞教弟子才能施展丹魔之咒' }
    }

    // 不能对自己下咒
    if (casterId === targetId) {
      throw { code: ERROR_CODES.CURSE_SELF_TARGET, message: '不能对自己施展咒术' }
    }

    // 检查是否有丹魔心萃
    const curseItemCount = await inventoryService.getItemQuantity(casterId, DEMON_CURSE_CONFIG.curseItemId)
    if (curseItemCount < DEMON_CURSE_CONFIG.curseItemCost) {
      throw { code: ERROR_CODES.CURSE_NO_ITEM, message: '缺少【丹魔心萃】，无法施咒' }
    }

    // 检查修为是否足够
    if (Number(caster.experience) < DEMON_CURSE_CONFIG.cultivationCost) {
      throw { code: ERROR_CODES.CURSE_NOT_ENOUGH_CULTIVATION, message: `修为不足，需要${DEMON_CURSE_CONFIG.cultivationCost}点修为` }
    }

    // 获取目标
    const target = await characterRepository.findOne({
      where: { id: targetId },
      relations: ['realm']
    })

    if (!target) {
      throw { code: ERROR_CODES.CURSE_TARGET_NOT_FOUND, message: '目标不存在' }
    }

    // 检查目标是否已被下咒
    if (target.curseType) {
      throw { code: ERROR_CODES.CURSE_TARGET_ALREADY_CURSED, message: '目标已被咒印缠身，无法再次下咒' }
    }

    // 消耗物品和修为
    await inventoryService.removeItem(casterId, DEMON_CURSE_CONFIG.curseItemId, DEMON_CURSE_CONFIG.curseItemCost)
    caster.experience = Number(caster.experience) - DEMON_CURSE_CONFIG.cultivationCost
    await characterRepository.save(caster)

    // 计算成功率
    const realmDiff = caster.realmId - target.realmId
    let successRate: number = DEMON_CURSE_CONFIG.baseSuccessRate

    if (realmDiff > 0) {
      successRate += realmDiff * DEMON_CURSE_CONFIG.realmBonusRate
    } else if (realmDiff < 0) {
      successRate += realmDiff * DEMON_CURSE_CONFIG.realmPenaltyRate
    }

    successRate = Math.max(DEMON_CURSE_CONFIG.minSuccessRate, Math.min(DEMON_CURSE_CONFIG.maxSuccessRate, successRate))

    // 骰子判定
    const roll = Math.random() * 100
    const isSuccess = roll < successRate

    if (!isSuccess) {
      return {
        success: false,
        message: `咒术施展失败！目标道行深厚，咒印未能成功种下。（成功率${successRate.toFixed(0)}%）`,
        targetName: target.name,
        successRate
      }
    }

    // 下咒成功
    const now = Date.now()
    target.curseType = DEMON_CURSE_CONFIG.curseType
    target.curseCasterId = casterId
    target.curseCasterName = caster.name
    target.curseStartTime = now
    target.curseExpiresAt = now + DEMON_CURSE_CONFIG.curseDurationMs
    target.curseStoredCultivation = 0
    target.curseLastTickTime = now

    await characterRepository.save(target)

    return {
      success: true,
      message: `咒术施展成功！已对【${target.name}】种下【丹魔侵蚀】咒印，持续12小时。`,
      targetName: target.name,
      successRate
    }
  }

  /**
   * 收割咒印累积的修为
   */
  async harvestCurse(casterId: string, targetId: string): Promise<HarvestCurseResult> {
    const caster = await characterRepository.findOne({
      where: { id: casterId }
    })

    if (!caster) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    const target = await characterRepository.findOne({
      where: { id: targetId }
    })

    if (!target) {
      throw { code: ERROR_CODES.CURSE_TARGET_NOT_FOUND, message: '目标不存在' }
    }

    // 检查是否是施咒者
    if (target.curseCasterId !== casterId) {
      throw { code: ERROR_CODES.CURSE_NOT_CASTER, message: '你不是该咒印的施咒者' }
    }

    // 检查咒印是否还在生效
    if (!target.curseType || !target.curseExpiresAt || Date.now() > target.curseExpiresAt) {
      throw { code: ERROR_CODES.CURSE_EXPIRED, message: '咒印已失效或过期，无法收割' }
    }

    // 先处理剩余的修为吸取
    await this.processCurseTick(target)

    const cultivationGained = target.curseStoredCultivation

    if (cultivationGained <= 0) {
      // 清除咒印但没有收益
      await this.clearCurse(target)
      return {
        success: true,
        message: `收割完成，但咒印尚未吸取到任何修为。`,
        cultivationGained: 0,
        targetName: target.name
      }
    }

    // 转移修为
    caster.experience = Number(caster.experience) + cultivationGained
    await characterRepository.save(caster)

    // 清除咒印
    await this.clearCurse(target)

    return {
      success: true,
      message: `收割成功！从【${target.name}】处吸取了${cultivationGained}点修为！`,
      cultivationGained,
      targetName: target.name
    }
  }

  /**
   * 解除咒印（服用九转解厄丹）
   */
  async removeCurse(characterId: string): Promise<RemoveCurseResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    // 检查是否被下咒
    if (!character.curseType) {
      throw { code: ERROR_CODES.CURSE_NOT_CURSED, message: '你身上没有咒印' }
    }

    // 检查是否有解咒丹药
    const antidoteCount = await inventoryService.getItemQuantity(characterId, CURSE_ANTIDOTE_ID)
    if (antidoteCount < 1) {
      throw { code: ERROR_CODES.CURSE_NO_ANTIDOTE, message: '缺少【九转解厄丹】，无法解除咒印' }
    }

    // 消耗解咒丹药
    await inventoryService.removeItem(characterId, CURSE_ANTIDOTE_ID, 1)

    const cultivationLost = character.curseStoredCultivation

    // 清除咒印
    await this.clearCurse(character)

    return {
      success: true,
      message: `服下【九转解厄丹】，体内的【丹魔侵蚀】咒印被彻底洗去！${cultivationLost > 0 ? `（已被吸取${cultivationLost}点修为）` : ''}`,
      cultivationLost
    }
  }

  /**
   * 处理咒印的修为吸取（每10分钟调用一次）
   */
  async processCurseTick(character: Character): Promise<number> {
    if (!character.curseType || !character.curseExpiresAt) {
      return 0
    }

    const now = Date.now()

    // 检查咒印是否过期
    if (now > character.curseExpiresAt) {
      await this.expireCurse(character)
      return 0
    }

    const lastTickTime = character.curseLastTickTime
      ? Number(character.curseLastTickTime)
      : character.curseStartTime
      ? Number(character.curseStartTime)
      : now

    // 计算经过了多少个间隔
    const elapsed = now - lastTickTime
    const ticks = Math.floor(elapsed / DEMON_CURSE_CONFIG.drainIntervalMs)

    if (ticks <= 0) {
      return 0
    }

    // 计算总共吸取的修为
    let totalDrained = 0
    for (let i = 0; i < ticks; i++) {
      const drainAmount =
        DEMON_CURSE_CONFIG.drainAmountMin +
        Math.floor(Math.random() * (DEMON_CURSE_CONFIG.drainAmountMax - DEMON_CURSE_CONFIG.drainAmountMin + 1))

      // 不能吸取超过目标拥有的修为
      const actualDrain = Math.min(drainAmount, Number(character.experience))
      if (actualDrain > 0) {
        character.experience = Number(character.experience) - actualDrain
        character.curseStoredCultivation += actualDrain
        totalDrained += actualDrain
      }
    }

    // 更新最后吸取时间
    character.curseLastTickTime = lastTickTime + ticks * DEMON_CURSE_CONFIG.drainIntervalMs

    await characterRepository.save(character)

    return totalDrained
  }

  /**
   * 批量处理所有被下咒角色的修为吸取
   */
  async processAllCurseTicks(): Promise<{ processed: number; totalDrained: number; expired: number }> {
    const now = Date.now()

    // 获取所有有咒印的角色（包括过期的）
    const cursedCharacters = await characterRepository.createQueryBuilder('c').where('c.curseType IS NOT NULL').getMany()

    let processed = 0
    let totalDrained = 0
    let expired = 0

    for (const character of cursedCharacters) {
      try {
        // 检查是否过期
        if (character.curseExpiresAt && Number(character.curseExpiresAt) <= now) {
          await this.expireCurse(character)
          expired++
        } else {
          const drained = await this.processCurseTick(character)
          if (drained > 0) {
            processed++
            totalDrained += drained
          }
        }
      } catch (error) {
        console.error(`处理角色 ${character.id} 的咒印失败:`, error)
      }
    }

    return { processed, totalDrained, expired }
  }

  /**
   * 获取炼丹/炼器成功率惩罚
   */
  getCursePenalty(character: Character): number {
    if (!character.curseType || !character.curseExpiresAt) {
      return 0
    }

    if (Date.now() > character.curseExpiresAt) {
      return 0
    }

    return DEMON_CURSE_CONFIG.alchemyPenalty
  }

  /**
   * 清除咒印（用于收割或解咒）
   */
  private async clearCurse(character: Character): Promise<void> {
    character.curseType = null
    character.curseCasterId = null
    character.curseCasterName = null
    character.curseStartTime = null
    character.curseExpiresAt = null
    character.curseStoredCultivation = 0
    character.curseLastTickTime = null

    await characterRepository.save(character)
  }

  /**
   * 通过角色ID清除咒印（供外部调用，如物品使用）
   */
  async clearCurseById(characterId: string): Promise<void> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    await this.clearCurse(character)
  }

  /**
   * 咒印过期（累积修为作废）
   */
  private async expireCurse(character: Character): Promise<void> {
    // 过期时累积的修为作废，不返还给施咒者
    await this.clearCurse(character)
  }
}

export const curseService = new CurseService()
