import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { InventoryItem } from '../models/InventoryItem'
import {
  COOLDOWN_REDUCTION,
  EFFICIENCY_BOOST,
  COMBAT_PASSIVES,
  ACTIVE_SKILL_CONFIG,
  SKILL_PLUNDER,
  SKILL_FORMATION_BREAK,
  SKILL_BLOOD_THUNDER,
  SKILL_DESCRIPTIONS,
  calculateReducedCooldown,
  calculatePlunderLootRate,
  calculateBloodThunderDamage,
  rollFormationBreak,
} from '../game/constants/fengxi'
import { getItemTemplate } from '../game/constants/items'

const characterRepository = AppDataSource.getRepository(Character)
const inventoryRepository = AppDataSource.getRepository(InventoryItem)

// ========== 返回类型定义 ==========

export interface WindThunderWingsStatusResult {
  hasWings: boolean // 背包中是否有风雷翅
  refined: boolean // 是否已炼化
  equipped: boolean // 是��已装备
  locked: boolean // 是否被锁定
  lockedUntil: number | null // 锁定结束时间
  lockReasons: { skillId: string; skillName: string; unlocksAt: number; remaining: number }[]
  skillCooldownUntil: number | null // 主动技能冷却结束时间
  skillCooldownRemaining: number // 主动技能冷却剩余时间
  // 神通描述
  passiveSkills: typeof SKILL_DESCRIPTIONS
  // 冷却缩减配置
  cooldownReduction: typeof COOLDOWN_REDUCTION
  efficiencyBoost: typeof EFFICIENCY_BOOST
  combatPassives: typeof COMBAT_PASSIVES
}

export interface SkillUseResult {
  success: boolean
  skillName: string
  message: string
  targetName?: string
  damage?: number
  selfCost?: number
  lootSuccess?: boolean
  lootedItem?: { itemId: string; itemName: string; quantity: number }
  lootedSpiritStones?: number
  formationBroken?: boolean
}

/**
 * 风雷翅装备系统服务
 */
class WindThunderWingsService {
  /**
   * 获取风雷翅状态
   */
  async getStatus(characterId: string): Promise<WindThunderWingsStatusResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    const now = Date.now()

    // 检查背包中是否有风雷翅
    const inventoryItem = await inventoryRepository.findOne({
      where: { characterId, itemId: 'wind_thunder_wings' },
    })
    const hasWings = (inventoryItem && inventoryItem.quantity > 0) || character.hasWindThunderWings

    // 清理过期的锁定原因
    await this.cleanupExpiredLocks(character)

    // 计算锁定状态
    const lockReasons = character.windThunderWingsLockReasons.map(reason => ({
      ...reason,
      remaining: Math.max(0, reason.unlocksAt - now),
    }))
    const locked = lockReasons.some(r => r.remaining > 0)
    const lockedUntil = locked ? Math.max(...lockReasons.map(r => r.unlocksAt)) : null

    // 计算技能冷却
    const skillCooldownRemaining = character.windThunderSkillCooldownUntil
      ? Math.max(0, character.windThunderSkillCooldownUntil - now)
      : 0

    return {
      hasWings,
      refined: character.hasWindThunderWings,
      equipped: character.windThunderWingsEquipped,
      locked,
      lockedUntil,
      lockReasons,
      skillCooldownUntil: character.windThunderSkillCooldownUntil,
      skillCooldownRemaining,
      passiveSkills: SKILL_DESCRIPTIONS,
      cooldownReduction: COOLDOWN_REDUCTION,
      efficiencyBoost: EFFICIENCY_BOOST,
      combatPassives: COMBAT_PASSIVES,
    }
  }

  /**
   * 炼化风雷翅
   */
  async refine(characterId: string): Promise<{ success: boolean; message: string }> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (character.hasWindThunderWings) {
      throw new Error('你已经炼化了风雷翅')
    }

    // 检查背包中是否有风雷翅
    const inventoryItem = await inventoryRepository.findOne({
      where: { characterId, itemId: 'wind_thunder_wings' },
    })

    if (!inventoryItem || inventoryItem.quantity < 1) {
      throw new Error('你没有风雷翅')
    }

    // 消耗物品
    inventoryItem.quantity -= 1
    if (inventoryItem.quantity <= 0) {
      await inventoryRepository.remove(inventoryItem)
    } else {
      await inventoryRepository.save(inventoryItem)
    }

    // 标记为已炼化，自动装备
    character.hasWindThunderWings = true
    character.windThunderWingsEquipped = true
    await characterRepository.save(character)

    return {
      success: true,
      message: '炼化成功！风雷翅与你的灵魂相连，已自动装备。你获得了三大神通：【天行神速】【雷光遁影】【风雷降世】！',
    }
  }

  /**
   * 装备风雷翅
   */
  async equip(characterId: string): Promise<{ success: boolean; message: string }> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (!character.hasWindThunderWings) {
      throw new Error('你尚未炼化风雷翅')
    }

    if (character.windThunderWingsEquipped) {
      throw new Error('风雷翅已经装备中')
    }

    character.windThunderWingsEquipped = true
    await characterRepository.save(character)

    return {
      success: true,
      message: '风雷翅已装备，三大神通已激活！',
    }
  }

  /**
   * 卸下风雷翅
   */
  async unequip(characterId: string): Promise<{ success: boolean; message: string }> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (!character.windThunderWingsEquipped) {
      throw new Error('风雷翅未装备')
    }

    // 清理过期的锁定
    await this.cleanupExpiredLocks(character)

    // 检查是否被锁定
    const now = Date.now()
    const activeLocks = character.windThunderWingsLockReasons.filter(r => r.unlocksAt > now)
    if (activeLocks.length > 0) {
      const lockNames = activeLocks.map(r => r.skillName).join('、')
      const maxUnlock = Math.max(...activeLocks.map(r => r.unlocksAt))
      const remainingMs = maxUnlock - now
      const remainingMin = Math.ceil(remainingMs / 60000)
      throw new Error(`【神通反锁】风雷翅被 ${lockNames} 的因果之力锁定，还需 ${remainingMin} 分钟才能卸下`)
    }

    character.windThunderWingsEquipped = false
    await characterRepository.save(character)

    return {
      success: true,
      message: '风雷翅已卸下，神通效果已消失。',
    }
  }

  /**
   * 添加神通反锁
   * 当使用了带冷却缩减的神通时调用
   */
  async addSkillLock(
    characterId: string,
    skillId: string,
    skillName: string,
    cooldownEndTime: number
  ): Promise<void> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
    })

    if (!character || !character.windThunderWingsEquipped) {
      return
    }

    const lockReasons = character.windThunderWingsLockReasons
    // 更新或添加锁定原因
    const existingIndex = lockReasons.findIndex(r => r.skillId === skillId)
    if (existingIndex >= 0) {
      lockReasons[existingIndex].unlocksAt = cooldownEndTime
    } else {
      lockReasons.push({ skillId, skillName, unlocksAt: cooldownEndTime })
    }

    character.windThunderWingsLockReasons = lockReasons
    character.windThunderWingsLockedUntil = Math.max(...lockReasons.map(r => r.unlocksAt))
    await characterRepository.save(character)
  }

  /**
   * 清理过期的锁定
   */
  private async cleanupExpiredLocks(character: Character): Promise<void> {
    const now = Date.now()
    const lockReasons = character.windThunderWingsLockReasons.filter(r => r.unlocksAt > now)

    if (lockReasons.length !== character.windThunderWingsLockReasons.length) {
      character.windThunderWingsLockReasons = lockReasons
      character.windThunderWingsLockedUntil = lockReasons.length > 0
        ? Math.max(...lockReasons.map(r => r.unlocksAt))
        : null
      await characterRepository.save(character)
    }
  }

  /**
   * 检查角色是否装备了风雷翅
   */
  async isEquipped(characterId: string): Promise<boolean> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      select: ['windThunderWingsEquipped'],
    })
    return character?.windThunderWingsEquipped || false
  }

  /**
   * 获取冷却缩减率（如果装备了风雷翅）
   */
  async getCooldownReduction(characterId: string, skillType: keyof typeof COOLDOWN_REDUCTION): Promise<number> {
    const equipped = await this.isEquipped(characterId)
    if (!equipped) return 0
    return COOLDOWN_REDUCTION[skillType]?.reduction || 0
  }

  /**
   * 获取效率提升率（如果装备了风雷翅）
   */
  async getEfficiencyBoost(characterId: string, boostType: keyof typeof EFFICIENCY_BOOST): Promise<number> {
    const equipped = await this.isEquipped(characterId)
    if (!equipped) return 0
    return EFFICIENCY_BOOST[boostType]?.reduction || 0
  }

  // ========== 风雷降世 · 主动技能 ==========

  /**
   * 检查主动技能是否可用
   */
  async canUseActiveSkill(characterId: string): Promise<{ canUse: boolean; reason?: string; cooldownRemaining?: number }> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
    })

    if (!character) {
      return { canUse: false, reason: '角色不存在' }
    }

    if (!character.windThunderWingsEquipped) {
      return { canUse: false, reason: '未装备风雷翅' }
    }

    if (Number(character.experience) < ACTIVE_SKILL_CONFIG.cultivationCost) {
      return { canUse: false, reason: `修为不足，需要 ${ACTIVE_SKILL_CONFIG.cultivationCost} 点` }
    }

    const now = Date.now()
    if (character.windThunderSkillCooldownUntil && character.windThunderSkillCooldownUntil > now) {
      const remaining = character.windThunderSkillCooldownUntil - now
      return { canUse: false, reason: '技能冷却中', cooldownRemaining: remaining }
    }

    return { canUse: true }
  }

  /**
   * 第一式：奇袭夺宝 - 无相劫掠
   */
  async usePlunder(characterId: string, targetId: string): Promise<SkillUseResult> {
    const canUse = await this.canUseActiveSkill(characterId)
    if (!canUse.canUse) {
      throw new Error(canUse.reason)
    }

    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm'],
    })
    const target = await characterRepository.findOne({
      where: { id: targetId },
      relations: ['realm'],
    })

    if (!character || !target) {
      throw new Error('角色不存在')
    }

    if (character.id === target.id) {
      throw new Error('不能对自己使用')
    }

    // 计算战力（简化版）
    const selfPower = this.calculatePower(character)
    const targetPower = this.calculatePower(target)

    // 检查天道禁制：只能对战力≤自己的目标
    if (targetPower > selfPower) {
      throw new Error('【天道禁制】此招只能对战力低于或等于你的目标施展')
    }

    const now = Date.now()

    // 扣除修为
    character.experience = Math.max(0, Number(character.experience) - ACTIVE_SKILL_CONFIG.cultivationCost)

    // 对目标造成象征性伤害
    const actualDamage = Math.min(Number(target.experience), SKILL_PLUNDER.symbolicDamage)
    target.experience = Math.max(0, Number(target.experience) - actualDamage)

    // 计算夺宝率
    const lootRate = calculatePlunderLootRate(SKILL_PLUNDER.symbolicDamage, actualDamage)
    const lootSuccess = Math.random() < lootRate

    let lootedItem: { itemId: string; itemName: string; quantity: number } | undefined
    let lootedSpiritStones = 0

    if (lootSuccess) {
      // 夺取灵石（10%）
      const stolenStones = Math.floor(Number(target.spiritStones) * 0.1)
      if (stolenStones > 0) {
        target.spiritStones = Number(target.spiritStones) - stolenStones
        character.spiritStones = Number(character.spiritStones) + stolenStones
        lootedSpiritStones = stolenStones
      }
    }

    // 设置冷却
    character.windThunderSkillCooldownUntil = now + ACTIVE_SKILL_CONFIG.cooldown

    // 添加神通反锁（无相劫掠）
    const lockUntil = now + ACTIVE_SKILL_CONFIG.cooldown
    character.windThunderWingsLockReasons = [
      ...character.windThunderWingsLockReasons.filter(r => r.unlocksAt > now),
      { skillId: SKILL_PLUNDER.id, skillName: SKILL_PLUNDER.name, unlocksAt: lockUntil }
    ]
    character.windThunderWingsLockedUntil = Math.max(
      character.windThunderWingsLockedUntil || 0,
      lockUntil
    )

    await characterRepository.save(character)
    await characterRepository.save(target)

    return {
      success: true,
      skillName: SKILL_PLUNDER.name,
      message: lootSuccess
        ? `【${SKILL_PLUNDER.name}】奏效！你对 ${target.name} 造成了 ${actualDamage} 点修为伤害，并夺取了 ${lootedSpiritStones} 灵石！`
        : `【${SKILL_PLUNDER.name}】你对 ${target.name} 造成了 ${actualDamage} 点修为伤害，但夺宝判定失败。`,
      targetName: target.name,
      damage: actualDamage,
      selfCost: ACTIVE_SKILL_CONFIG.cultivationCost,
      lootSuccess,
      lootedSpiritStones,
    }
  }

  /**
   * 第二式：奇袭破阵 - 寂灭神雷
   */
  async useFormationBreak(characterId: string, targetId: string): Promise<SkillUseResult> {
    const canUse = await this.canUseActiveSkill(characterId)
    if (!canUse.canUse) {
      throw new Error(canUse.reason)
    }

    const character = await characterRepository.findOne({
      where: { id: characterId },
    })
    const target = await characterRepository.findOne({
      where: { id: targetId },
    })

    if (!character || !target) {
      throw new Error('角色不存在')
    }

    if (character.id === target.id) {
      throw new Error('不能对自己使用')
    }

    const now = Date.now()

    // 扣除修为
    character.experience = Math.max(0, Number(character.experience) - ACTIVE_SKILL_CONFIG.cultivationCost)

    // 判定破阵
    const formationBroken = target.activeFormationId ? rollFormationBreak() : false

    if (formationBroken && target.activeFormationId) {
      // 破坏阵法
      target.activeFormationId = null
      target.formationExpiresAt = null
    }

    // 造成修为伤害
    const cultivationDamage = Math.min(Number(target.experience), SKILL_FORMATION_BREAK.cultivationDamage)
    target.experience = Math.max(0, Number(target.experience) - cultivationDamage)

    // 设置冷却
    character.windThunderSkillCooldownUntil = now + ACTIVE_SKILL_CONFIG.cooldown

    // 添加神通反锁（寂灭神雷）
    const lockUntil = now + ACTIVE_SKILL_CONFIG.cooldown
    character.windThunderWingsLockReasons = [
      ...character.windThunderWingsLockReasons.filter(r => r.unlocksAt > now),
      { skillId: SKILL_FORMATION_BREAK.id, skillName: SKILL_FORMATION_BREAK.name, unlocksAt: lockUntil }
    ]
    character.windThunderWingsLockedUntil = Math.max(
      character.windThunderWingsLockedUntil || 0,
      lockUntil
    )

    await characterRepository.save(character)
    await characterRepository.save(target)

    const hasFormation = target.activeFormationId !== null
    let message: string

    if (!hasFormation) {
      message = `【${SKILL_FORMATION_BREAK.name}】你对 ${target.name} 发动寂灭神雷，对方并无护山大阵，造成了 ${cultivationDamage} 点修为伤害！`
    } else if (formationBroken) {
      message = `【${SKILL_FORMATION_BREAK.name}】神雷降临！你成功摧毁了 ${target.name} 的护山大阵，并造成了 ${cultivationDamage} 点修为伤害！`
    } else {
      message = `【${SKILL_FORMATION_BREAK.name}】你对 ${target.name} 发动寂灭神雷，但阵法抵御住了攻击！造成了 ${cultivationDamage} 点修为伤害。`
    }

    return {
      success: true,
      skillName: SKILL_FORMATION_BREAK.name,
      message,
      targetName: target.name,
      damage: cultivationDamage,
      selfCost: ACTIVE_SKILL_CONFIG.cultivationCost,
      formationBroken,
    }
  }

  /**
   * 第三式：奇袭瞬杀 - 血色惊雷
   */
  async useBloodThunder(characterId: string, targetId: string): Promise<SkillUseResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
    })
    const target = await characterRepository.findOne({
      where: { id: targetId },
    })

    if (!character || !target) {
      throw new Error('角色不存在')
    }

    if (!character.windThunderWingsEquipped) {
      throw new Error('未装备风雷翅')
    }

    if (character.id === target.id) {
      throw new Error('不能对自己使用')
    }

    const now = Date.now()

    // 检查冷却
    if (character.windThunderSkillCooldownUntil && character.windThunderSkillCooldownUntil > now) {
      throw new Error('技能冷却中')
    }

    // 计算伤害：消耗10%总修为，造成5倍伤害
    const { selfCost, damage } = calculateBloodThunderDamage(Number(character.experience))

    if (selfCost < 100) {
      throw new Error('修为过低，无法施展此招')
    }

    // 扣除自身修为
    character.experience = Math.max(0, Number(character.experience) - selfCost)

    // 对目标造成伤害
    const actualDamage = Math.min(Number(target.experience), damage)
    target.experience = Math.max(0, Number(target.experience) - actualDamage)

    // 设置冷却
    character.windThunderSkillCooldownUntil = now + ACTIVE_SKILL_CONFIG.cooldown

    // 添加神通反锁（血色惊雷）
    const lockUntil = now + ACTIVE_SKILL_CONFIG.cooldown
    character.windThunderWingsLockReasons = [
      ...character.windThunderWingsLockReasons.filter(r => r.unlocksAt > now),
      { skillId: SKILL_BLOOD_THUNDER.id, skillName: SKILL_BLOOD_THUNDER.name, unlocksAt: lockUntil }
    ]
    character.windThunderWingsLockedUntil = Math.max(
      character.windThunderWingsLockedUntil || 0,
      lockUntil
    )

    await characterRepository.save(character)
    await characterRepository.save(target)

    return {
      success: true,
      skillName: SKILL_BLOOD_THUNDER.name,
      message: `【${SKILL_BLOOD_THUNDER.name}】你燃烧 ${selfCost} 点修为化为血色惊雷，对 ${target.name} 造成了 ${actualDamage} 点毁灭性伤害！此招无法触发夺宝。`,
      targetName: target.name,
      damage: actualDamage,
      selfCost,
      lootSuccess: false, // 永远无法触发夺宝
    }
  }

  /**
   * 简化的战力计算
   */
  private calculatePower(character: Character): number {
    const realmTier = character.realm?.tier || 1
    const realmBonus = realmTier * 1000
    const statsBonus = character.attack + character.defense + character.speed
    return realmBonus + statsBonus + Math.floor(Number(character.experience) / 100)
  }
}

export const windThunderWingsService = new WindThunderWingsService()
