/**
 * 神魂陨落服务
 * 高风险PvP死亡机制核心逻辑
 */
import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { Realm } from '../models/Realm'
import { InventoryItem } from '../models/InventoryItem'
import { SectMaster } from '../models/SectMaster'
import {
  SOUL_TURBULENT_CONFIG,
  SOUL_COLLAPSE_CONFIG,
  ENEMY_CONFIG,
  SOUL_PROTECTION_PILL_CONFIG,
  SOUL_COLLAPSE_MESSAGES,
  getFullRealmName
} from '../game/constants/soulCollapse'
import { getItemTemplate } from '../game/constants/items'
import { inventoryService } from './inventory.service'

const characterRepository = AppDataSource.getRepository(Character)
const realmRepository = AppDataSource.getRepository(Realm)
const inventoryRepository = AppDataSource.getRepository(InventoryItem)
const sectMasterRepository = AppDataSource.getRepository(SectMaster)

// ==================== 接口定义 ====================

/** 神魂动荡状态 */
export interface SoulTurbulentStatus {
  isActive: boolean
  expiresAt: number | null
  remainingMs: number
  powerReduction: number
}

/** 道心破碎状态 */
export interface SoulShatteredStatus {
  isActive: boolean
  expiresAt: number | null
  remainingMs: number
  cultivationPenalty: number
}

/** 仇敌信息 */
export interface EnemyInfo {
  killerId: string
  killerName: string
  killedAt: number
}

/** PvP落败处理结果 */
export interface PvpDefeatResult {
  turbulentTriggered: boolean // 是否触发神魂动荡
  collapseTriggered: boolean // 是否触发神魂陨落
  protectionUsed: boolean // 是否消耗护道丹
  shatteredApplied: boolean // 是否进入道心破碎
  realmDropped: boolean // 是否境界跌落
  oldRealm?: { tier: number; subTier: number; name: string }
  newRealm?: { tier: number; subTier: number; name: string }
  droppedMaterials: { itemId: string; name: string; quantity: number }[]
  droppedEquipment: { itemId: string; name: string } | null
  winnerExpGain: number // 胜者获得的修为
  announcements: string[] // 全服公告
  masterAlerts: { sectId: string; message: string }[] // 掌门急报
}

// ==================== 服务类 ====================

class SoulCollapseService {
  /**
   * 获取神魂动荡状态
   */
  async getSoulTurbulentStatus(characterId: string): Promise<SoulTurbulentStatus> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      select: ['soulTurbulent', 'soulTurbulentExpiresAt']
    })

    if (!character) {
      return { isActive: false, expiresAt: null, remainingMs: 0, powerReduction: 0 }
    }

    const now = Date.now()
    const expiresAt = character.soulTurbulentExpiresAt ? Number(character.soulTurbulentExpiresAt) : null

    // 检查是否过期
    if (!character.soulTurbulent || !expiresAt || expiresAt <= now) {
      // 如果已过期，清理状态
      if (character.soulTurbulent) {
        await this.clearSoulTurbulent(characterId)
      }
      return { isActive: false, expiresAt: null, remainingMs: 0, powerReduction: 0 }
    }

    return {
      isActive: true,
      expiresAt,
      remainingMs: expiresAt - now,
      powerReduction: SOUL_TURBULENT_CONFIG.powerReduction
    }
  }

  /**
   * 获取道心破碎状态
   */
  async getSoulShatteredStatus(characterId: string): Promise<SoulShatteredStatus> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      select: ['soulShattered', 'soulShatteredExpiresAt']
    })

    if (!character) {
      return { isActive: false, expiresAt: null, remainingMs: 0, cultivationPenalty: 0 }
    }

    const now = Date.now()
    const expiresAt = character.soulShatteredExpiresAt ? Number(character.soulShatteredExpiresAt) : null

    // 检查是否过期
    if (!character.soulShattered || !expiresAt || expiresAt <= now) {
      // 如果已过期，清理状态
      if (character.soulShattered) {
        await this.clearSoulShattered(characterId)
      }
      return { isActive: false, expiresAt: null, remainingMs: 0, cultivationPenalty: 0 }
    }

    return {
      isActive: true,
      expiresAt,
      remainingMs: expiresAt - now,
      cultivationPenalty: SOUL_COLLAPSE_CONFIG.shatteredCultivationPenalty
    }
  }

  /**
   * PvP落败处理入口
   * @param loserId 败者ID
   * @param winnerId 胜者ID
   * @param winnerRealmTier 胜者境界大阶
   * @param loserRealmTier 败者境界大阶
   */
  async handlePvpDefeat(loserId: string, winnerId: string, winnerRealmTier: number, loserRealmTier: number): Promise<PvpDefeatResult> {
    const result: PvpDefeatResult = {
      turbulentTriggered: false,
      collapseTriggered: false,
      protectionUsed: false,
      shatteredApplied: false,
      realmDropped: false,
      droppedMaterials: [],
      droppedEquipment: null,
      winnerExpGain: 0,
      announcements: [],
      masterAlerts: []
    }

    const loser = await characterRepository.findOne({
      where: { id: loserId },
      relations: ['realm']
    })
    const winner = await characterRepository.findOne({
      where: { id: winnerId }
    })

    if (!loser || !winner) return result

    // 检查败者当前是否处于神魂动荡状态
    const turbulentStatus = await this.getSoulTurbulentStatus(loserId)

    if (turbulentStatus.isActive) {
      // 处于神魂动荡状态下落败 -> 触发神魂陨落
      result.collapseTriggered = true
      await this.triggerSoulCollapse(loser, winner, result)
    } else {
      // 检查是否触发神魂动荡
      // 条件：胜者境界 >= 败者境界
      if (winnerRealmTier >= loserRealmTier) {
        const triggered = await this.checkAndTriggerTurbulent(loser, winner, winnerRealmTier, loserRealmTier, result)
        result.turbulentTriggered = triggered
      }
    }

    return result
  }

  /**
   * 检查并触发神魂动荡
   */
  private async checkAndTriggerTurbulent(
    loser: Character,
    winner: Character,
    winnerRealmTier: number,
    loserRealmTier: number,
    result: PvpDefeatResult
  ): Promise<boolean> {
    // 计算触发几率
    let triggerChance: number
    if (winnerRealmTier > loserRealmTier) {
      // 被高阶击败：50%
      triggerChance = SOUL_TURBULENT_CONFIG.higherRealmChance
    } else {
      // 同阶击败：20%
      triggerChance = SOUL_TURBULENT_CONFIG.sameRealmChance
    }

    // 随机判定
    if (Math.random() >= triggerChance) {
      return false
    }

    // 触发神魂动荡
    const now = Date.now()
    const expiresAt = now + SOUL_TURBULENT_CONFIG.durationMs

    loser.soulTurbulent = true
    loser.soulTurbulentExpiresAt = expiresAt
    await characterRepository.save(loser)

    // 全服公告
    const announcement = SOUL_COLLAPSE_MESSAGES.turbulentAnnouncement(loser.name, winner.name)
    result.announcements.push(announcement)

    // 掌门急报
    if (loser.sectId) {
      const masterAlert = {
        sectId: loser.sectId,
        message: SOUL_COLLAPSE_MESSAGES.masterAlertTurbulent(loser.name)
      }
      result.masterAlerts.push(masterAlert)
    }

    return true
  }

  /**
   * 触发神魂陨落
   */
  private async triggerSoulCollapse(loser: Character, winner: Character, result: PvpDefeatResult): Promise<void> {
    const oldTier = loser.realm?.tier || 1
    const oldSubTier = loser.realm?.subTier || 1
    const oldRealmName = getFullRealmName(oldTier, oldSubTier)

    result.oldRealm = { tier: oldTier, subTier: oldSubTier, name: oldRealmName }

    // 检查是否有护道丹
    const protectionPillCount = await inventoryService.getItemQuantity(loser.id, SOUL_PROTECTION_PILL_CONFIG.itemId)

    if (protectionPillCount > 0) {
      // 消耗护道丹
      await inventoryService.removeItemByItemId(loser.id, SOUL_PROTECTION_PILL_CONFIG.itemId, 1)
      result.protectionUsed = true

      // 护道丹保护，但仍进入道心破碎
      await this.applySoulShattered(loser)
      result.shatteredApplied = true

      // 公告
      const announcement = SOUL_COLLAPSE_MESSAGES.protectedAnnouncement(loser.name)
      result.announcements.push(announcement)
    } else {
      // 无护道丹，执行完整惩罚

      // 1. 境界跌落 (tier-1, subTier不变)
      const newTier = Math.max(oldTier - SOUL_COLLAPSE_CONFIG.tierDrop, SOUL_COLLAPSE_CONFIG.minTier)
      const newSubTier =
        newTier === SOUL_COLLAPSE_CONFIG.minTier && oldSubTier < SOUL_COLLAPSE_CONFIG.minSubTier
          ? SOUL_COLLAPSE_CONFIG.minSubTier
          : oldSubTier

      if (newTier !== oldTier) {
        await this.applyRealmDrop(loser, newTier, newSubTier)
        result.realmDropped = true
        const newRealmName = getFullRealmName(newTier, newSubTier)
        result.newRealm = { tier: newTier, subTier: newSubTier, name: newRealmName }

        // 计算胜者获得的修为（败者原境界升级所需修为的10%）
        const oldRealm = await realmRepository.findOne({
          where: { tier: oldTier, subTier: oldSubTier }
        })
        if (oldRealm) {
          result.winnerExpGain = Math.floor(Number(oldRealm.requiredExperience) * SOUL_COLLAPSE_CONFIG.winnerExpMultiplier)
        }
      }

      // 2. 修为清零
      loser.experience = 0

      // 3. 材料掉落 (50%每种)
      const droppedMaterials = await this.dropMaterials(loser.id)
      result.droppedMaterials = droppedMaterials

      // 4. 装备掉落 (1件未绑定)
      const droppedEquipment = await this.dropEquipment(loser.id)
      result.droppedEquipment = droppedEquipment

      // 5. 道心破碎状态
      await this.applySoulShattered(loser)
      result.shatteredApplied = true

      // 6. 胜者获得掉落物品
      if (droppedMaterials.length > 0 || droppedEquipment) {
        await this.transferDropsToWinner(winner.id, droppedMaterials, droppedEquipment)
      }

      // 7. 胜者获得修为
      if (result.winnerExpGain > 0) {
        winner.experience = Number(winner.experience) + result.winnerExpGain
        await characterRepository.save(winner)
      }

      // 清除神魂动荡状态（同时更新内存对象，避免save时覆盖）
      loser.soulTurbulent = false
      loser.soulTurbulentExpiresAt = null

      // 保存败者状态（包含境界、修为、道心破碎、神魂动荡清除）
      await characterRepository.save(loser)

      // 公告
      const newRealmName = result.newRealm?.name || oldRealmName
      const announcement = SOUL_COLLAPSE_MESSAGES.collapseAnnouncement(loser.name, winner.name, oldRealmName, newRealmName)
      result.announcements.push(announcement)
    }

    // 掌门急报
    if (loser.sectId) {
      const masterAlert = {
        sectId: loser.sectId,
        message: SOUL_COLLAPSE_MESSAGES.masterAlertCollapse(loser.name)
      }
      result.masterAlerts.push(masterAlert)
    }

    // 记录击杀和仇敌
    await this.recordKill(winner, loser)
  }

  /**
   * 应用境界跌落
   */
  private async applyRealmDrop(character: Character, newTier: number, newSubTier: number): Promise<void> {
    // 找到新境界
    const newRealm = await realmRepository.findOne({
      where: { tier: newTier, subTier: newSubTier }
    })

    if (newRealm) {
      character.realmId = newRealm.id
    }
  }

  /**
   * 应用道心破碎状态
   */
  private async applySoulShattered(character: Character): Promise<void> {
    const now = Date.now()
    const expiresAt = now + SOUL_COLLAPSE_CONFIG.shatteredDurationMs

    character.soulShattered = true
    character.soulShatteredExpiresAt = expiresAt
    await characterRepository.save(character)
  }

  /**
   * 掉落材料 (每种50%，向下取整)
   */
  private async dropMaterials(characterId: string): Promise<{ itemId: string; name: string; quantity: number }[]> {
    const droppedItems: { itemId: string; name: string; quantity: number }[] = []

    // 获取所有材料类型的物品
    const materialItems = await inventoryRepository.find({
      where: { characterId }
    })

    for (const item of materialItems) {
      const template = getItemTemplate(item.itemId)
      if (!template || template.type !== 'material') continue

      // 计算掉落数量 (50%向下取整)
      const dropQuantity = Math.floor(item.quantity * SOUL_COLLAPSE_CONFIG.materialDropRate)
      if (dropQuantity <= 0) continue

      // 移除物品
      item.quantity -= dropQuantity
      if (item.quantity <= 0) {
        await inventoryRepository.remove(item)
      } else {
        await inventoryRepository.save(item)
      }

      droppedItems.push({
        itemId: item.itemId,
        name: template.name,
        quantity: dropQuantity
      })
    }

    return droppedItems
  }

  /**
   * 掉落装备 (随机1件未绑定装备)
   */
  private async dropEquipment(characterId: string): Promise<{ itemId: string; name: string } | null> {
    // 获取所有未绑定的装备
    const equipmentItems = await inventoryRepository.find({
      where: { characterId, isBound: false }
    })

    // 筛选出装备类型
    const unBoundEquipments = equipmentItems.filter(item => {
      const template = getItemTemplate(item.itemId)
      return template && template.type === 'equipment'
    })

    if (unBoundEquipments.length === 0) return null

    // 随机选择1件
    const randomIndex = Math.floor(Math.random() * unBoundEquipments.length)
    const droppedItem = unBoundEquipments[randomIndex]
    const template = getItemTemplate(droppedItem.itemId)!

    // 移除物品 (装备通常不堆叠，移除整个)
    await inventoryRepository.remove(droppedItem)

    return {
      itemId: droppedItem.itemId,
      name: template.name
    }
  }

  /**
   * 将掉落物品转移给胜者
   */
  private async transferDropsToWinner(
    winnerId: string,
    materials: { itemId: string; name: string; quantity: number }[],
    equipment: { itemId: string; name: string } | null
  ): Promise<void> {
    // 转移材料
    for (const mat of materials) {
      try {
        await inventoryService.addItem(winnerId, mat.itemId, mat.quantity)
      } catch {
        // 背包满了，跳过
        console.warn(`Failed to transfer material ${mat.itemId} to winner ${winnerId}`)
      }
    }

    // 转移装备
    if (equipment) {
      try {
        await inventoryService.addItem(winnerId, equipment.itemId, 1)
      } catch {
        console.warn(`Failed to transfer equipment ${equipment.itemId} to winner ${winnerId}`)
      }
    }
  }

  /**
   * 记录击杀（更新击杀者killCount和败者仇敌名录）
   */
  private async recordKill(winner: Character, loser: Character): Promise<void> {
    // 胜者杀戮值+1
    winner.killCount = (winner.killCount || 0) + 1
    await characterRepository.save(winner)

    // 败者添加仇敌记录
    const enemies = loser.enemies || []
    const newEnemy: EnemyInfo = {
      killerId: winner.id,
      killerName: winner.name,
      killedAt: Date.now()
    }

    // 检查是否已存在（更新时间）
    const existingIndex = enemies.findIndex(e => e.killerId === winner.id)
    if (existingIndex >= 0) {
      enemies[existingIndex] = newEnemy
    } else {
      // 添加新仇敌，如果超过上限则移除最旧的
      if (enemies.length >= ENEMY_CONFIG.maxEnemies) {
        enemies.sort((a, b) => a.killedAt - b.killedAt)
        enemies.shift() // 移除最旧的
      }
      enemies.push(newEnemy)
    }

    loser.enemies = enemies
    await characterRepository.save(loser)
  }

  /**
   * 获取仇敌列表
   */
  async getEnemies(characterId: string): Promise<EnemyInfo[]> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      select: ['enemiesJson']
    })

    if (!character) return []

    return character.enemies || []
  }

  /**
   * 检查某人是否是仇敌
   */
  async isEnemy(characterId: string, targetId: string): Promise<boolean> {
    const enemies = await this.getEnemies(characterId)
    return enemies.some(e => e.killerId === targetId)
  }

  /**
   * 获取对仇敌的战力加成
   */
  async getEnemyCombatBonus(characterId: string, targetId: string): Promise<number> {
    const isEnemyTarget = await this.isEnemy(characterId, targetId)
    return isEnemyTarget ? ENEMY_CONFIG.combatBonus : 0
  }

  /**
   * 获取杀戮值
   */
  async getKillCount(characterId: string): Promise<number> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      select: ['killCount']
    })

    return character?.killCount || 0
  }

  /**
   * 获取完整的神魂状态
   */
  async getSoulStatus(characterId: string): Promise<{
    turbulent: SoulTurbulentStatus
    shattered: SoulShatteredStatus
    killCount: number
    enemies: EnemyInfo[]
  }> {
    const [turbulent, shattered, killCount, enemies] = await Promise.all([
      this.getSoulTurbulentStatus(characterId),
      this.getSoulShatteredStatus(characterId),
      this.getKillCount(characterId),
      this.getEnemies(characterId)
    ])

    return { turbulent, shattered, killCount, enemies }
  }

  // ==================== 私有工具方法 ====================

  /**
   * 清除神魂动荡状态
   */
  private async clearSoulTurbulent(characterId: string): Promise<void> {
    await characterRepository.update(characterId, {
      soulTurbulent: false,
      soulTurbulentExpiresAt: null
    })
  }

  /**
   * 清除道心破碎状态
   */
  private async clearSoulShattered(characterId: string): Promise<void> {
    await characterRepository.update(characterId, {
      soulShattered: false,
      soulShatteredExpiresAt: null
    })
  }

  /**
   * 获取宗门掌门ID
   */
  async getSectMasterId(sectId: string): Promise<string | null> {
    const sectMaster = await sectMasterRepository.findOne({
      where: { sectId }
    })
    return sectMaster?.masterId || null
  }
}

export const soulCollapseService = new SoulCollapseService()
