/**
 * 虚空裂缝探索服务
 */
import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { windThunderWingsService } from './fengxi.service'
import { InventoryService } from './inventory.service'
import {
  RIFT_EXPLORE_CONFIG,
  RIFT_EXPLORE_RESULTS,
  REALM_BONUS,
  rollExploreResult,
  calculateRewardValue,
  checkItemDrop,
  formatRemainingTime,
  type RiftExploreResultType
} from '../game/constants/riftExplore'

const characterRepository = AppDataSource.getRepository(Character)
const inventoryService = new InventoryService()

// ==================== 接口定义 ====================

export interface RiftExploreStatus {
  canExplore: boolean
  cooldownRemaining: number
  cooldownFormatted: string
  lastExploreTime: number | null
  totalExplores: number
  cost: number
  minRealmRequired: number
  hasWindThunderBonus: boolean
}

export interface ExploreResult {
  success: boolean
  resultType: RiftExploreResultType
  resultName: string
  message: string
  rewards: {
    spiritStones: number
    cultivation: number
    items: { itemId: string; name: string }[]
    damage: number
  }
  nextExploreTime: number
}

// ==================== 服务类 ====================

class RiftExploreService {
  /**
   * 获取裂缝探索状态
   */
  async getStatus(characterId: string): Promise<RiftExploreStatus> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    const now = Date.now()
    const lastExploreTime = character.lastRiftExploreTime || 0

    // 计算冷却时间（含风雷翅加成）
    const cooldownReduction = await windThunderWingsService.getCooldownReduction(characterId, 'riftExplore')
    const actualCooldown = Math.floor(RIFT_EXPLORE_CONFIG.baseCooldownMs * (1 - cooldownReduction))
    const cooldownRemaining = Math.max(0, lastExploreTime + actualCooldown - now)

    return {
      canExplore: cooldownRemaining === 0 && character.realmId >= RIFT_EXPLORE_CONFIG.minRealmId,
      cooldownRemaining,
      cooldownFormatted: formatRemainingTime(cooldownRemaining),
      lastExploreTime: lastExploreTime || null,
      totalExplores: character.totalRiftExplores || 0,
      cost: RIFT_EXPLORE_CONFIG.spiritStoneCost,
      minRealmRequired: RIFT_EXPLORE_CONFIG.minRealmId,
      hasWindThunderBonus: cooldownReduction > 0
    }
  }

  /**
   * 进行裂缝探索
   */
  async explore(characterId: string): Promise<ExploreResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    // 检查境界
    if (character.realmId < RIFT_EXPLORE_CONFIG.minRealmId) {
      throw new Error(`需要达到筑基后期（境界${RIFT_EXPLORE_CONFIG.minRealmId}）才能探索裂缝`)
    }

    // 检查冷却
    const now = Date.now()
    const lastExploreTime = character.lastRiftExploreTime || 0
    const cooldownReduction = await windThunderWingsService.getCooldownReduction(characterId, 'riftExplore')
    const actualCooldown = Math.floor(RIFT_EXPLORE_CONFIG.baseCooldownMs * (1 - cooldownReduction))

    if (now - lastExploreTime < actualCooldown) {
      const remaining = formatRemainingTime(lastExploreTime + actualCooldown - now)
      throw new Error(`裂缝探索冷却中，请等待 ${remaining}`)
    }

    // 检查灵石
    const cost = RIFT_EXPLORE_CONFIG.spiritStoneCost
    if (Number(character.spiritStones) < cost) {
      throw new Error(`灵石不足，需要 ${cost} 灵石`)
    }

    // 扣除灵石
    character.spiritStones = Number(character.spiritStones) - cost

    // 随机探索结果
    const resultType = rollExploreResult()
    const resultConfig = RIFT_EXPLORE_RESULTS[resultType]
    const realmBonus = REALM_BONUS[character.realmId] || 1.0

    // 计算奖励
    const rewards = {
      spiritStones: 0,
      cultivation: 0,
      items: [] as { itemId: string; name: string }[],
      damage: 0
    }

    // 灵石奖励
    if (resultConfig.rewards.spiritStones) {
      rewards.spiritStones = calculateRewardValue(resultConfig.rewards.spiritStones.min, resultConfig.rewards.spiritStones.max, realmBonus)
      character.spiritStones = Number(character.spiritStones) + rewards.spiritStones
    }

    // 修为奖励
    if (resultConfig.rewards.cultivation) {
      rewards.cultivation = calculateRewardValue(resultConfig.rewards.cultivation.min, resultConfig.rewards.cultivation.max, realmBonus)
      character.experience = Number(character.experience) + rewards.cultivation
    }

    // 物品奖励
    if (resultConfig.rewards.items) {
      for (const item of resultConfig.rewards.items) {
        if (checkItemDrop(item.chance)) {
          rewards.items.push({ itemId: item.itemId, name: item.name })
          // 添加到背包
          await inventoryService.addItem(characterId, item.itemId, 1)
        }
      }
    }

    // 危险伤害
    if (resultConfig.rewards.damage) {
      rewards.damage = calculateRewardValue(
        resultConfig.rewards.damage.min,
        resultConfig.rewards.damage.max,
        1 // 伤害不受境界加成
      )
      character.experience = Math.max(0, Number(character.experience) - rewards.damage)
    }

    // 更新探索记录
    character.lastRiftExploreTime = now
    character.totalRiftExplores = (character.totalRiftExplores || 0) + 1

    await characterRepository.save(character)

    // 生成结果消息
    let message = resultConfig.description
    if (rewards.spiritStones > 0) {
      message += `\n获得灵石 +${rewards.spiritStones}`
    }
    if (rewards.cultivation > 0) {
      message += `\n获得修为 +${rewards.cultivation}`
    }
    if (rewards.items.length > 0) {
      message += `\n获得物品：${rewards.items.map(i => i.name).join('、')}`
    }
    if (rewards.damage > 0) {
      message += `\n损失修为 -${rewards.damage}`
    }

    return {
      success: true,
      resultType,
      resultName: resultConfig.name,
      message,
      rewards,
      nextExploreTime: now + actualCooldown
    }
  }
}

export const riftExploreService = new RiftExploreService()
