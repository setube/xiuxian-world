import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { InventoryItem } from '../models/InventoryItem'
import {
  FLAME_FAN_CONFIG,
  FIRE_RESONANCE_CONFIG,
  CRAFTING_CONFIG,
  SUCCESS_RATE_BONUSES,
  FAILURE_PENALTY_CONFIG,
  checkFireResonance,
  hasFireElement,
  calculateCraftSuccessRate,
  getFlameFanCombatPower,
  getFlameFanName,
  getRealmName,
  rollDebuffType
} from '../game/constants/flameFan'
import { getItemTemplate } from '../game/constants/items'
import { SPIRIT_ROOTS } from '../game/constants/spiritRoots'

const characterRepository = AppDataSource.getRepository(Character)
const inventoryRepository = AppDataSource.getRepository(InventoryItem)

// ========== 返回类型定义 ==========

export interface FlameFanStatusResult {
  hasThreeFlameFan: boolean
  hasSevenFlameFan: boolean
  equippedFlameFan: 'three_flame_fan' | 'seven_flame_fan' | null
  combatPower: number
  fireResonance: {
    hasResonance: boolean
    bonusPercent: number
    type: 'full' | 'partial' | 'none'
  }
  debuff: {
    type: string
    cultivationReduction: number
    combatPowerReduction: number
    description: string
    remainingMs: number
  } | null
  craftInfo: {
    threeFlameFan: {
      canCraft: boolean
      reason?: string
      successRate: number
      materials: { itemId: string; name: string; required: number; owned: number }[]
      spiritStoneCost: number
    }
    sevenFlameFan: {
      canCraft: boolean
      reason?: string
      successRate: number
      materials: { itemId: string; name: string; required: number; owned: number }[]
      spiritStoneCost: number
    }
  }
}

export interface CraftFlameFanResult {
  success: boolean
  crafted: boolean
  message: string
  itemName: string
  penalties?: {
    materialsLost: boolean
    cultivationLost: number
    debuffApplied: boolean
    debuffDescription?: string
  }
}

export interface EquipResult {
  success: boolean
  message: string
  equippedFlameFan: 'three_flame_fan' | 'seven_flame_fan' | null
  combatPower: number
}

/**
 * 七焰扇装备系统服务
 */
class FlameFanService {
  /**
   * 获取七焰扇状态
   */
  async getStatus(characterId: string): Promise<FlameFanStatusResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    const now = Date.now()

    // 清理过期的debuff
    await this.cleanupExpiredDebuffs(character)

    // 检查火灵根共鸣
    const fireResonance = checkFireResonance(character.spiritRootId || '')

    // 计算当前战力加成
    const combatPower = getFlameFanCombatPower(character.equippedFlameFan)

    // 获取debuff信息
    let debuff = null
    if (character.flameFanDebuff && character.flameFanDebuffExpiresAt) {
      const remainingMs = Math.max(0, Number(character.flameFanDebuffExpiresAt) - now)
      if (remainingMs > 0) {
        debuff = {
          ...character.flameFanDebuff,
          remainingMs
        }
      }
    }

    // 获取炼制信息
    const craftInfo = await this.getCraftInfo(character)

    return {
      hasThreeFlameFan: character.hasThreeFlameFan,
      hasSevenFlameFan: character.hasSevenFlameFan,
      equippedFlameFan: character.equippedFlameFan,
      combatPower,
      fireResonance,
      debuff,
      craftInfo
    }
  }

  /**
   * 获取炼制信息
   */
  private async getCraftInfo(character: Character): Promise<FlameFanStatusResult['craftInfo']> {
    const realmTier = character.realm?.tier || 1
    const spiritRoot = character.spiritRootId ? SPIRIT_ROOTS[character.spiritRootId] : null
    const hasFireRoot = spiritRoot ? hasFireElement(spiritRoot.elements) : false

    // 获取角色物品
    const inventory = await inventoryRepository.find({
      where: { characterId: character.id }
    })
    const getItemCount = (itemId: string) => {
      const item = inventory.find(i => i.itemId === itemId)
      return item?.quantity || 0
    }

    // 三焰扇炼制信息
    const threeFanConfig = CRAFTING_CONFIG.threeFlameFan
    const threeFanMaterials = threeFanConfig.materials.map(m => {
      const template = getItemTemplate(m.itemId)
      return {
        itemId: m.itemId,
        name: template?.name || m.itemId,
        required: m.quantity,
        owned: getItemCount(m.itemId)
      }
    })
    const threeFanSuccessRate = calculateCraftSuccessRate(threeFanConfig.baseSuccessRate, {
      hasFireRoot,
      sectId: character.sectId
    })

    let threeFanCanCraft = true
    let threeFanReason: string | undefined

    if (character.hasThreeFlameFan) {
      threeFanCanCraft = false
      threeFanReason = '已拥有三焰扇'
    } else if (realmTier < threeFanConfig.minRealm) {
      threeFanCanCraft = false
      threeFanReason = `需要${getRealmName(threeFanConfig.minRealm)}以上境界`
    } else if (Number(character.spiritStones) < threeFanConfig.spiritStoneCost) {
      threeFanCanCraft = false
      threeFanReason = `灵石不足（需要${threeFanConfig.spiritStoneCost}）`
    } else if (threeFanMaterials.some(m => m.owned < m.required)) {
      threeFanCanCraft = false
      threeFanReason = '材料不足'
    }

    // 七焰扇炼制信息
    const sevenFanConfig = CRAFTING_CONFIG.sevenFlameFan
    const sevenFanMaterials = sevenFanConfig.materials.map(m => {
      const template = getItemTemplate(m.itemId)
      return {
        itemId: m.itemId,
        name: template?.name || m.itemId,
        required: m.quantity,
        owned: m.itemId === 'three_flame_fan' ? (character.hasThreeFlameFan ? 1 : 0) : getItemCount(m.itemId)
      }
    })
    const sevenFanSuccessRate = calculateCraftSuccessRate(sevenFanConfig.baseSuccessRate, {
      hasFireRoot,
      sectId: character.sectId
    })

    let sevenFanCanCraft = true
    let sevenFanReason: string | undefined

    if (character.hasSevenFlameFan) {
      sevenFanCanCraft = false
      sevenFanReason = '已拥有七焰扇'
    } else if (!character.hasThreeFlameFan) {
      sevenFanCanCraft = false
      sevenFanReason = '需要三焰扇作为基材'
    } else if (realmTier < sevenFanConfig.minRealm) {
      sevenFanCanCraft = false
      sevenFanReason = `需要${getRealmName(sevenFanConfig.minRealm)}以上境界`
    } else if (Number(character.spiritStones) < sevenFanConfig.spiritStoneCost) {
      sevenFanCanCraft = false
      sevenFanReason = `灵石不足（需要${sevenFanConfig.spiritStoneCost}）`
    } else if (sevenFanMaterials.some(m => m.owned < m.required)) {
      sevenFanCanCraft = false
      sevenFanReason = '材料不足'
    }

    return {
      threeFlameFan: {
        canCraft: threeFanCanCraft,
        reason: threeFanReason,
        successRate: threeFanSuccessRate,
        materials: threeFanMaterials,
        spiritStoneCost: threeFanConfig.spiritStoneCost
      },
      sevenFlameFan: {
        canCraft: sevenFanCanCraft,
        reason: sevenFanReason,
        successRate: sevenFanSuccessRate,
        materials: sevenFanMaterials,
        spiritStoneCost: sevenFanConfig.spiritStoneCost
      }
    }
  }

  /**
   * 炼制火焰扇
   */
  async craftFlameFan(
    characterId: string,
    type: 'three_flame_fan' | 'seven_flame_fan'
  ): Promise<CraftFlameFanResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    const realmTier = character.realm?.tier || 1
    const spiritRoot = character.spiritRootId ? SPIRIT_ROOTS[character.spiritRootId] : null
    const hasFireRoot = spiritRoot ? hasFireElement(spiritRoot.elements) : false
    const now = Date.now()

    // 根据类型获取配置
    const isThreeFan = type === 'three_flame_fan'
    const config = isThreeFan ? CRAFTING_CONFIG.threeFlameFan : CRAFTING_CONFIG.sevenFlameFan
    const penaltyConfig = isThreeFan
      ? FAILURE_PENALTY_CONFIG.threeFlameFan
      : FAILURE_PENALTY_CONFIG.sevenFlameFan
    const itemName = isThreeFan ? FLAME_FAN_CONFIG.threeFlameFan.name : FLAME_FAN_CONFIG.sevenFlameFan.name

    // 检查前置条件
    if (isThreeFan && character.hasThreeFlameFan) {
      throw new Error('你已经拥有三焰扇')
    }
    if (!isThreeFan && character.hasSevenFlameFan) {
      throw new Error('你已经拥有七焰扇')
    }
    if (!isThreeFan && !character.hasThreeFlameFan) {
      throw new Error('需要三焰扇作为基材才能炼制七焰扇')
    }
    if (realmTier < config.minRealm) {
      throw new Error(`需要${getRealmName(config.minRealm)}以上境界才能炼制${itemName}`)
    }

    // 检查灵石
    if (Number(character.spiritStones) < config.spiritStoneCost) {
      throw new Error(`灵石不足，需要${config.spiritStoneCost}灵石`)
    }

    // 检查材料（除三焰扇外的材料）
    const inventory = await inventoryRepository.find({
      where: { characterId }
    })
    const getItemCount = (itemId: string) => {
      const item = inventory.find(i => i.itemId === itemId)
      return item?.quantity || 0
    }

    for (const material of config.materials) {
      if (material.itemId === 'three_flame_fan') {
        // 三焰扇作为基材，检查角色是否拥有
        if (!character.hasThreeFlameFan) {
          throw new Error('需要三焰扇作为基材')
        }
      } else {
        const owned = getItemCount(material.itemId)
        if (owned < material.quantity) {
          const template = getItemTemplate(material.itemId)
          throw new Error(`材料不足：${template?.name || material.itemId}（需要${material.quantity}，拥有${owned}）`)
        }
      }
    }

    // 扣除灵石
    character.spiritStones = Number(character.spiritStones) - config.spiritStoneCost

    // 扣除材料（除三焰扇外）
    for (const material of config.materials) {
      if (material.itemId === 'three_flame_fan') continue

      const invItem = inventory.find(i => i.itemId === material.itemId)
      if (invItem) {
        invItem.quantity -= material.quantity
        if (invItem.quantity <= 0) {
          await inventoryRepository.remove(invItem)
        } else {
          await inventoryRepository.save(invItem)
        }
      }
    }

    // 计算成功率
    const successRate = calculateCraftSuccessRate(config.baseSuccessRate, {
      hasFireRoot,
      sectId: character.sectId
    })

    // 判定成功
    const roll = Math.random() * 100
    const success = roll < successRate

    if (success) {
      // 炼制成功
      if (isThreeFan) {
        character.hasThreeFlameFan = true
      } else {
        // 七焰扇炼制成功，消耗三焰扇
        character.hasThreeFlameFan = false
        character.hasSevenFlameFan = true
        // 如果之前装备的是三焰扇，自动切换到七焰扇
        if (character.equippedFlameFan === 'three_flame_fan') {
          character.equippedFlameFan = 'seven_flame_fan'
        }
      }

      await characterRepository.save(character)

      return {
        success: true,
        crafted: true,
        message: `炼制成功！你获得了【${itemName}】！`,
        itemName
      }
    } else {
      // 炼制失败
      const penalties: CraftFlameFanResult['penalties'] = {
        materialsLost: true,
        cultivationLost: 0,
        debuffApplied: false
      }

      // 失败时，如果炼制七焰扇，消耗三焰扇
      if (!isThreeFan) {
        character.hasThreeFlameFan = false
        if (character.equippedFlameFan === 'three_flame_fan') {
          character.equippedFlameFan = null
        }
      }

      // 修为惩罚
      const cultivationLossPercent = penaltyConfig.cultivationLossPercent
      const cultivationLost = Math.floor(Number(character.experience) * (cultivationLossPercent / 100))
      character.experience = Math.max(0, Number(character.experience) - cultivationLost)
      penalties.cultivationLost = cultivationLost

      // debuff判定
      const debuffRoll = Math.random()
      if (debuffRoll < penaltyConfig.debuffChance) {
        penalties.debuffApplied = true

        if (isThreeFan) {
          // 三焰扇失败debuff
          const debuff = FAILURE_PENALTY_CONFIG.threeFlameFan.debuff
          character.flameFanDebuff = {
            type: debuff.type,
            cultivationReduction: debuff.cultivationReduction,
            combatPowerReduction: debuff.combatPowerReduction,
            description: debuff.description
          }
          character.flameFanDebuffExpiresAt = now + FAILURE_PENALTY_CONFIG.threeFlameFan.debuffDuration
          penalties.debuffDescription = debuff.description
        } else {
          // 七焰扇失败debuff（随机选择）
          const debuffOption = rollDebuffType()
          character.flameFanDebuff = {
            type: debuffOption.type,
            cultivationReduction: debuffOption.cultivationReduction,
            combatPowerReduction: debuffOption.combatPowerReduction,
            description: debuffOption.description
          }
          character.flameFanDebuffExpiresAt = now + FAILURE_PENALTY_CONFIG.sevenFlameFan.debuffDuration
          penalties.debuffDescription = debuffOption.description
        }
      }

      await characterRepository.save(character)

      let message = `炼制失败！材料全部损失，损失${cultivationLossPercent}%修为（${cultivationLost}点）。`
      if (!isThreeFan) {
        message = `炼制失败！三焰扇炸毁，全部材料损失，损失${cultivationLossPercent}%修为（${cultivationLost}点）。`
      }
      if (penalties.debuffApplied && penalties.debuffDescription) {
        message += ` ${penalties.debuffDescription}`
      }

      return {
        success: true,
        crafted: false,
        message,
        itemName,
        penalties
      }
    }
  }

  /**
   * 装备火焰扇
   */
  async equip(
    characterId: string,
    type: 'three_flame_fan' | 'seven_flame_fan'
  ): Promise<EquipResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (type === 'three_flame_fan' && !character.hasThreeFlameFan) {
      throw new Error('你没有三焰扇')
    }
    if (type === 'seven_flame_fan' && !character.hasSevenFlameFan) {
      throw new Error('你没有七焰扇')
    }

    if (character.equippedFlameFan === type) {
      throw new Error(`${getFlameFanName(type)}已经装备中`)
    }

    character.equippedFlameFan = type
    await characterRepository.save(character)

    const combatPower = getFlameFanCombatPower(type)
    const resonance = checkFireResonance(character.spiritRootId || '')

    let message = `【${getFlameFanName(type)}】已装备，战力+${combatPower.toLocaleString()}！`
    if (resonance.hasResonance) {
      message += ` 火灵根共鸣激活，伤害+${resonance.bonusPercent}%！`
    }

    return {
      success: true,
      message,
      equippedFlameFan: type,
      combatPower
    }
  }

  /**
   * 卸下火焰扇
   */
  async unequip(characterId: string): Promise<EquipResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (!character.equippedFlameFan) {
      throw new Error('未装备任何火焰扇')
    }

    const previousName = getFlameFanName(character.equippedFlameFan)
    character.equippedFlameFan = null
    await characterRepository.save(character)

    return {
      success: true,
      message: `【${previousName}】已卸下。`,
      equippedFlameFan: null,
      combatPower: 0
    }
  }

  /**
   * 获取战力加成（供PvP系统调用）
   */
  async getCombatPowerBonus(characterId: string): Promise<number> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      select: ['equippedFlameFan', 'flameFanDebuffJson', 'flameFanDebuffExpiresAt']
    })

    if (!character) return 0

    let combatPower = getFlameFanCombatPower(character.equippedFlameFan)

    // 检查debuff减益
    const now = Date.now()
    if (character.flameFanDebuff && character.flameFanDebuffExpiresAt) {
      if (Number(character.flameFanDebuffExpiresAt) > now) {
        combatPower *= (1 - character.flameFanDebuff.combatPowerReduction / 100)
      }
    }

    return Math.floor(combatPower)
  }

  /**
   * 获取火灵根共鸣伤害加成（供PvP系统调用）
   */
  async getFireResonanceDamageBonus(characterId: string): Promise<number> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      select: ['equippedFlameFan', 'spiritRootId']
    })

    if (!character || !character.equippedFlameFan) return 0

    const resonance = checkFireResonance(character.spiritRootId || '')
    return resonance.bonusPercent
  }

  /**
   * 获取修炼效率减益（供修炼系统调用）
   */
  async getCultivationPenalty(characterId: string): Promise<number> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      select: ['flameFanDebuffJson', 'flameFanDebuffExpiresAt']
    })

    if (!character) return 0

    const now = Date.now()
    if (character.flameFanDebuff && character.flameFanDebuffExpiresAt) {
      if (Number(character.flameFanDebuffExpiresAt) > now) {
        return character.flameFanDebuff.cultivationReduction
      }
    }

    return 0
  }

  /**
   * 清理过期的debuff
   */
  private async cleanupExpiredDebuffs(character: Character): Promise<void> {
    const now = Date.now()

    if (character.flameFanDebuffExpiresAt && Number(character.flameFanDebuffExpiresAt) <= now) {
      character.flameFanDebuff = null
      character.flameFanDebuffExpiresAt = null
      await characterRepository.save(character)
    }
  }

  /**
   * 检查角色是否装备了火焰扇
   */
  async isEquipped(characterId: string): Promise<'three_flame_fan' | 'seven_flame_fan' | null> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      select: ['equippedFlameFan']
    })
    return character?.equippedFlameFan || null
  }
}

export const flameFanService = new FlameFanService()
