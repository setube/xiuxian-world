import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { CaveDwelling, TreasureSlot } from '../models/CaveDwelling'
import { CaveScenery } from '../models/CaveScenery'
import { CaveGuestMessage } from '../models/CaveGuestMessage'
import { CaveVisitorLog, VisitorResult } from '../models/CaveVisitorLog'
import { InventoryItem } from '../models/InventoryItem'
import { inventoryService } from './inventory.service'
import { getIO, emitToPlayer } from '../socket/index'
import { getItemTemplate } from '../game/constants/items'
import {
  CAVE_REQUIRED_REALM,
  CAVE_OPENING_COST,
  SPIRIT_VEIN_CONFIG,
  SPIRIT_VEIN_MAX_LEVEL,
  MEDITATION_CHAMBER_CONFIG,
  MEDITATION_CHAMBER_MAX_LEVEL,
  TREASURE_DISPLAY_SLOTS,
  VISITOR_CONFIG,
  VISITOR_TYPES,
  SCENERY_CONFIG,
  MESSAGE_CONFIG,
  getSpiritVeinConfig,
  getMeditationChamberConfig,
  getSceneryConfig,
  getAllSceneryConfigs,
  selectRandomVisitor,
  selectRandomOutcome,
  type VisitorTypeConfig,
  type VisitorOutcome,
  type SceneryConfig,
} from '../game/constants/caveDwelling'

const characterRepository = AppDataSource.getRepository(Character)
const caveRepository = AppDataSource.getRepository(CaveDwelling)
const sceneryRepository = AppDataSource.getRepository(CaveScenery)
const messageRepository = AppDataSource.getRepository(CaveGuestMessage)
const visitorLogRepository = AppDataSource.getRepository(CaveVisitorLog)
const inventoryRepository = AppDataSource.getRepository(InventoryItem)

// ========== DTO 定义 ==========

export interface CaveInfoDTO {
  hasCave: boolean
  cave?: {
    id: string
    spiritVein: {
      level: number
      maxLevel: number
      currentEnergy: number
      pendingEnergy: number // 待收取的灵气
      maxStorage: number
      productionPerHour: number
      canUpgrade: boolean
      upgradeCost?: { spiritStones: number; items?: { itemId: string; quantity: number }[] }
    }
    meditationChamber: {
      level: number
      maxLevel: number
      conversionRate: number
      maxConversionPerHour: number
      pendingExp: number // 待转化的修为
      canUpgrade: boolean
      upgradeCost?: { spiritStones: number; items?: { itemId: string; quantity: number }[] }
    }
    treasureDisplay: TreasureSlot[]
    displayedSceneries: string[]
    currentVisitor?: {
      name: string
      description: string
      expiresAt: number
      remainingSeconds: number
    }
    stats: {
      totalVisitorsReceived: number
      totalVisitorsExpelled: number
      totalGuestMessages: number
      totalPlayerVisits: number
    }
    createdAt: Date
  }
}

export interface CaveVisitDTO {
  ownerName: string
  spiritVeinLevel: number
  meditationChamberLevel: number
  displayedSceneries: { id: string; name: string; description: string }[]
  treasureDisplay: { slot: number; itemName: string; itemId: string }[]
  stats: {
    totalPlayerVisits: number
    totalGuestMessages: number
  }
}

class CaveDwellingService {
  // ==================== 洞府管理 ====================

  /**
   * 检查角色是否可以开辟洞府
   */
  async canOpenCave(characterId: string): Promise<{ canOpen: boolean; reason?: string }> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm'],
    })

    if (!character) {
      return { canOpen: false, reason: '角色不存在' }
    }

    // 检查是否已有洞府
    const existingCave = await caveRepository.findOne({
      where: { characterId },
    })
    if (existingCave) {
      return { canOpen: false, reason: '你已经拥有洞府' }
    }

    // 检查境界要求
    const tier = character.realm?.tier || 1
    const subTier = character.realm?.subTier || 1
    if (tier < CAVE_REQUIRED_REALM.tier || (tier === CAVE_REQUIRED_REALM.tier && subTier < CAVE_REQUIRED_REALM.subTier)) {
      return { canOpen: false, reason: `需要达到筑基初期才能开辟洞府，当前境界不足` }
    }

    // 检查灵石
    if (Number(character.spiritStones) < CAVE_OPENING_COST.spiritStones) {
      return { canOpen: false, reason: `灵石不足，需要 ${CAVE_OPENING_COST.spiritStones} 灵石` }
    }

    // 检查材料
    for (const item of CAVE_OPENING_COST.items) {
      const quantity = await inventoryService.getItemQuantity(characterId, item.itemId)
      if (quantity < item.quantity) {
        const template = getItemTemplate(item.itemId)
        return { canOpen: false, reason: `${template?.name || item.itemId} 不足，需要 ${item.quantity} 个` }
      }
    }

    return { canOpen: true }
  }

  /**
   * 开辟洞府
   */
  async openCave(characterId: string): Promise<CaveDwelling> {
    const canOpen = await this.canOpenCave(characterId)
    if (!canOpen.canOpen) {
      throw new Error(canOpen.reason)
    }

    const character = await characterRepository.findOne({
      where: { id: characterId },
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    // 扣除灵石
    character.spiritStones = Number(character.spiritStones) - CAVE_OPENING_COST.spiritStones
    await characterRepository.save(character)

    // 扣除材料
    for (const item of CAVE_OPENING_COST.items) {
      await inventoryService.removeItemByItemId(characterId, item.itemId, item.quantity)
    }

    // 创建洞府
    const cave = caveRepository.create({
      characterId,
      spiritVeinLevel: 1,
      spiritEnergy: 0,
      lastSpiritHarvestTime: Date.now(),
      meditationChamberLevel: 1,
      lastMeditationTime: Date.now(),
      treasureDisplayJson: '[]',
      displayedSceneriesJson: '[]',
      lastVisitorCheckTime: Date.now(),
    })

    const savedCave = await caveRepository.save(cave)

    // 自动解锁筑基景观
    await this.checkAndUnlockSceneries(characterId)

    return savedCave
  }

  /**
   * 检查角色是否拥有洞府
   */
  async hasCave(characterId: string): Promise<boolean> {
    const cave = await caveRepository.findOne({
      where: { characterId },
    })
    return cave !== null
  }

  /**
   * 获取洞府信息
   */
  async getCaveInfo(characterId: string): Promise<CaveInfoDTO> {
    const cave = await caveRepository.findOne({
      where: { characterId },
    })

    if (!cave) {
      return { hasCave: false }
    }

    const spiritVeinConfig = getSpiritVeinConfig(cave.spiritVeinLevel)!
    const nextSpiritVeinConfig = getSpiritVeinConfig(cave.spiritVeinLevel + 1)
    const meditationConfig = getMeditationChamberConfig(cave.meditationChamberLevel)!
    const nextMeditationConfig = getMeditationChamberConfig(cave.meditationChamberLevel + 1)

    // 计算待收取的灵气
    const pendingEnergy = this.calculatePendingEnergy(cave)
    // 计算待转化的修为
    const pendingExp = this.calculatePendingExp(cave)

    // 处理当前访客
    let currentVisitor
    if (cave.currentVisitor && !cave.isVisitorExpired()) {
      const remaining = Math.max(0, cave.currentVisitor.expiresAt - Date.now())
      currentVisitor = {
        name: cave.currentVisitor.name,
        description: cave.currentVisitor.description,
        expiresAt: cave.currentVisitor.expiresAt,
        remainingSeconds: Math.floor(remaining / 1000),
      }
    }

    return {
      hasCave: true,
      cave: {
        id: cave.id,
        spiritVein: {
          level: cave.spiritVeinLevel,
          maxLevel: SPIRIT_VEIN_MAX_LEVEL,
          currentEnergy: Number(cave.spiritEnergy),
          pendingEnergy,
          maxStorage: spiritVeinConfig.maxStorage,
          productionPerHour: spiritVeinConfig.productionPerHour,
          canUpgrade: cave.spiritVeinLevel < SPIRIT_VEIN_MAX_LEVEL,
          upgradeCost: nextSpiritVeinConfig?.upgradeCost || undefined,
        },
        meditationChamber: {
          level: cave.meditationChamberLevel,
          maxLevel: MEDITATION_CHAMBER_MAX_LEVEL,
          conversionRate: meditationConfig.conversionRate,
          maxConversionPerHour: meditationConfig.maxConversionPerHour,
          pendingExp,
          canUpgrade: cave.meditationChamberLevel < MEDITATION_CHAMBER_MAX_LEVEL,
          upgradeCost: nextMeditationConfig?.upgradeCost || undefined,
        },
        treasureDisplay: cave.treasureDisplay,
        displayedSceneries: cave.displayedSceneries,
        currentVisitor,
        stats: {
          totalVisitorsReceived: cave.totalVisitorsReceived,
          totalVisitorsExpelled: cave.totalVisitorsExpelled,
          totalGuestMessages: cave.totalGuestMessages,
          totalPlayerVisits: cave.totalPlayerVisits,
        },
        createdAt: cave.createdAt,
      },
    }
  }

  // ==================== 灵脉系统 ====================

  /**
   * 计算待收取的灵气
   */
  calculatePendingEnergy(cave: CaveDwelling): number {
    const config = getSpiritVeinConfig(cave.spiritVeinLevel)
    if (!config) return 0

    const lastHarvest = cave.lastSpiritHarvestTime || cave.createdAt.getTime()
    const elapsed = Date.now() - lastHarvest
    const hours = elapsed / (1000 * 60 * 60)
    const produced = Math.floor(hours * config.productionPerHour)
    const currentEnergy = Number(cave.spiritEnergy)

    // 限制不超过存储上限
    return Math.min(produced, config.maxStorage - currentEnergy)
  }

  /**
   * 收取灵气
   */
  async harvestSpiritEnergy(characterId: string): Promise<{ harvested: number; current: number; maxStorage: number }> {
    const cave = await caveRepository.findOne({
      where: { characterId },
    })

    if (!cave) {
      throw new Error('你还没有开辟洞府')
    }

    const pendingEnergy = this.calculatePendingEnergy(cave)
    if (pendingEnergy <= 0) {
      throw new Error('暂无可收取的灵气')
    }

    const config = getSpiritVeinConfig(cave.spiritVeinLevel)!
    cave.spiritEnergy = Number(cave.spiritEnergy) + pendingEnergy
    cave.lastSpiritHarvestTime = Date.now()
    await caveRepository.save(cave)

    return {
      harvested: pendingEnergy,
      current: Number(cave.spiritEnergy),
      maxStorage: config.maxStorage,
    }
  }

  /**
   * 升级灵脉
   */
  async upgradeSpiritVein(characterId: string): Promise<{ newLevel: number; cost: { spiritStones: number } }> {
    const cave = await caveRepository.findOne({
      where: { characterId },
    })

    if (!cave) {
      throw new Error('你还没有开辟洞府')
    }

    if (cave.spiritVeinLevel >= SPIRIT_VEIN_MAX_LEVEL) {
      throw new Error('灵脉已达满级')
    }

    const nextConfig = getSpiritVeinConfig(cave.spiritVeinLevel + 1)
    const currentConfig = getSpiritVeinConfig(cave.spiritVeinLevel)
    if (!nextConfig || !currentConfig?.upgradeCost) {
      throw new Error('无法升级')
    }

    const upgradeCost = currentConfig.upgradeCost

    // 检查灵石
    const character = await characterRepository.findOne({
      where: { id: characterId },
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (Number(character.spiritStones) < upgradeCost.spiritStones) {
      throw new Error(`灵石不足，需要 ${upgradeCost.spiritStones} 灵石`)
    }

    // 检查材料
    if (upgradeCost.items) {
      for (const item of upgradeCost.items) {
        const quantity = await inventoryService.getItemQuantity(characterId, item.itemId)
        if (quantity < item.quantity) {
          const template = getItemTemplate(item.itemId)
          throw new Error(`${template?.name || item.itemId} 不足，需要 ${item.quantity} 个`)
        }
      }
    }

    // 扣除灵石
    character.spiritStones = Number(character.spiritStones) - upgradeCost.spiritStones
    await characterRepository.save(character)

    // 扣除材料
    if (upgradeCost.items) {
      for (const item of upgradeCost.items) {
        await inventoryService.removeItemByItemId(characterId, item.itemId, item.quantity)
      }
    }

    // 升级
    cave.spiritVeinLevel += 1
    await caveRepository.save(cave)

    // 检查景观解锁
    await this.checkAndUnlockSceneries(characterId)

    return {
      newLevel: cave.spiritVeinLevel,
      cost: { spiritStones: upgradeCost.spiritStones },
    }
  }

  // ==================== 静室系统 ====================

  /**
   * 计算待转化的修为
   */
  calculatePendingExp(cave: CaveDwelling): number {
    const config = getMeditationChamberConfig(cave.meditationChamberLevel)
    if (!config) return 0

    const currentEnergy = Number(cave.spiritEnergy)
    if (currentEnergy <= 0) return 0

    const lastMeditation = cave.lastMeditationTime || cave.createdAt.getTime()
    const elapsed = Date.now() - lastMeditation
    const hours = elapsed / (1000 * 60 * 60)

    // 计算可转化的灵气量
    const maxConvertible = Math.floor(hours * config.maxConversionPerHour)
    const actualConvert = Math.min(maxConvertible, currentEnergy)

    // 计算修为
    return Math.floor(actualConvert * config.conversionRate)
  }

  /**
   * 转化灵气为修为
   */
  async convertSpiritToExp(
    characterId: string
  ): Promise<{ converted: number; expGained: number; remainingEnergy: number }> {
    const cave = await caveRepository.findOne({
      where: { characterId },
    })

    if (!cave) {
      throw new Error('你还没有开辟洞府')
    }

    const config = getMeditationChamberConfig(cave.meditationChamberLevel)
    if (!config) {
      throw new Error('静室配置错误')
    }

    const currentEnergy = Number(cave.spiritEnergy)
    if (currentEnergy <= 0) {
      throw new Error('灵气不足，请先收取灵气')
    }

    const lastMeditation = cave.lastMeditationTime || cave.createdAt.getTime()
    const elapsed = Date.now() - lastMeditation
    const hours = elapsed / (1000 * 60 * 60)

    // 计算可转化的灵气量
    const maxConvertible = Math.floor(hours * config.maxConversionPerHour)
    const actualConvert = Math.min(maxConvertible, currentEnergy)

    if (actualConvert <= 0) {
      throw new Error('转化冷却中，请稍后再试')
    }

    // 计算修为
    const expGained = Math.floor(actualConvert * config.conversionRate)

    // 更新洞府
    cave.spiritEnergy = currentEnergy - actualConvert
    cave.lastMeditationTime = Date.now()
    await caveRepository.save(cave)

    // 更新角色修为
    const character = await characterRepository.findOne({
      where: { id: characterId },
    })
    if (character) {
      character.experience = Number(character.experience) + expGained
      await characterRepository.save(character)
    }

    return {
      converted: actualConvert,
      expGained,
      remainingEnergy: Number(cave.spiritEnergy),
    }
  }

  /**
   * 升级静室
   */
  async upgradeMeditationChamber(characterId: string): Promise<{ newLevel: number; cost: { spiritStones: number } }> {
    const cave = await caveRepository.findOne({
      where: { characterId },
    })

    if (!cave) {
      throw new Error('你还没有开辟洞府')
    }

    if (cave.meditationChamberLevel >= MEDITATION_CHAMBER_MAX_LEVEL) {
      throw new Error('静室已达满级')
    }

    const nextConfig = getMeditationChamberConfig(cave.meditationChamberLevel + 1)
    const currentConfig = getMeditationChamberConfig(cave.meditationChamberLevel)
    if (!nextConfig || !currentConfig?.upgradeCost) {
      throw new Error('无法升级')
    }

    const upgradeCost = currentConfig.upgradeCost

    // 检查灵石
    const character = await characterRepository.findOne({
      where: { id: characterId },
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (Number(character.spiritStones) < upgradeCost.spiritStones) {
      throw new Error(`灵石不足，需要 ${upgradeCost.spiritStones} 灵石`)
    }

    // 检查材料
    if (upgradeCost.items) {
      for (const item of upgradeCost.items) {
        const quantity = await inventoryService.getItemQuantity(characterId, item.itemId)
        if (quantity < item.quantity) {
          const template = getItemTemplate(item.itemId)
          throw new Error(`${template?.name || item.itemId} 不足，需要 ${item.quantity} 个`)
        }
      }
    }

    // 扣除灵石
    character.spiritStones = Number(character.spiritStones) - upgradeCost.spiritStones
    await characterRepository.save(character)

    // 扣除材料
    if (upgradeCost.items) {
      for (const item of upgradeCost.items) {
        await inventoryService.removeItemByItemId(characterId, item.itemId, item.quantity)
      }
    }

    // 升级
    cave.meditationChamberLevel += 1
    await caveRepository.save(cave)

    // 检查景观解锁
    await this.checkAndUnlockSceneries(characterId)

    return {
      newLevel: cave.meditationChamberLevel,
      cost: { spiritStones: upgradeCost.spiritStones },
    }
  }

  // ==================== 万宝阁 ====================

  /**
   * 获取万宝阁展示
   */
  async getTreasureDisplay(characterId: string): Promise<TreasureSlot[]> {
    const cave = await caveRepository.findOne({
      where: { characterId },
    })

    if (!cave) {
      throw new Error('你还没有开辟洞府')
    }

    return cave.treasureDisplay
  }

  /**
   * 上架物品到万宝阁
   */
  async displayTreasure(
    characterId: string,
    inventoryItemId: string,
    slot: number
  ): Promise<{ success: boolean; itemName: string }> {
    if (slot < 0 || slot >= TREASURE_DISPLAY_SLOTS) {
      throw new Error(`展台槽位必须在 0-${TREASURE_DISPLAY_SLOTS - 1} 之间`)
    }

    const cave = await caveRepository.findOne({
      where: { characterId },
    })

    if (!cave) {
      throw new Error('你还没有开辟洞府')
    }

    // 获取物品
    const item = await inventoryRepository.findOne({
      where: { id: inventoryItemId, characterId },
    })

    if (!item) {
      throw new Error('物品不存在')
    }

    const template = getItemTemplate(item.itemId)
    if (!template) {
      throw new Error('物品配置不存在')
    }

    // 检查物品是否已在展示
    const display = cave.treasureDisplay
    const existingSlot = display.find((t) => t.inventoryItemId === inventoryItemId)
    if (existingSlot) {
      throw new Error('该物品已在展示中')
    }

    // 移除旧的展示物品（如果有）
    const newDisplay = display.filter((t) => t.slot !== slot)

    // 添加新展示
    newDisplay.push({
      slot,
      inventoryItemId,
      itemId: item.itemId,
      itemName: template.name,
      displayedAt: Date.now(),
    })

    cave.treasureDisplay = newDisplay
    await caveRepository.save(cave)

    return { success: true, itemName: template.name }
  }

  /**
   * 从万宝阁取下物品
   */
  async removeTreasure(characterId: string, slot: number): Promise<{ success: boolean; itemName?: string }> {
    const cave = await caveRepository.findOne({
      where: { characterId },
    })

    if (!cave) {
      throw new Error('你还没有开辟洞府')
    }

    const display = cave.treasureDisplay
    const existingItem = display.find((t) => t.slot === slot)

    if (!existingItem) {
      throw new Error('该展台没有物品')
    }

    cave.treasureDisplay = display.filter((t) => t.slot !== slot)
    await caveRepository.save(cave)

    return { success: true, itemName: existingItem.itemName }
  }

  // ==================== 景观系统 ====================

  /**
   * 获取景观列表
   */
  async getSceneryGallery(
    characterId: string
  ): Promise<{ unlocked: (SceneryConfig & { isDisplayed: boolean })[]; locked: SceneryConfig[] }> {
    const cave = await caveRepository.findOne({
      where: { characterId },
    })

    if (!cave) {
      throw new Error('你还没有开辟洞府')
    }

    // 获取已解锁的景观
    const unlockedSceneries = await sceneryRepository.find({
      where: { characterId },
    })
    const unlockedIds = unlockedSceneries.map((s) => s.sceneryId)
    const displayedIds = cave.displayedSceneries

    const allConfigs = getAllSceneryConfigs()
    const unlocked = allConfigs
      .filter((c) => unlockedIds.includes(c.id))
      .map((c) => ({
        ...c,
        isDisplayed: displayedIds.includes(c.id),
      }))

    const locked = allConfigs.filter((c) => !unlockedIds.includes(c.id))

    return { unlocked, locked }
  }

  /**
   * 布置景观
   */
  async displayScenery(characterId: string, sceneryId: string): Promise<{ success: boolean }> {
    const cave = await caveRepository.findOne({
      where: { characterId },
    })

    if (!cave) {
      throw new Error('你还没有开辟洞府')
    }

    // 检查是否已解锁
    const scenery = await sceneryRepository.findOne({
      where: { characterId, sceneryId },
    })

    if (!scenery) {
      throw new Error('该景观尚未解锁')
    }

    const displayedSceneries = cave.displayedSceneries
    if (displayedSceneries.includes(sceneryId)) {
      // 如果已布置，则取消布置
      cave.displayedSceneries = displayedSceneries.filter((id) => id !== sceneryId)
      scenery.isDisplayed = false
    } else {
      // 布置景观
      displayedSceneries.push(sceneryId)
      cave.displayedSceneries = displayedSceneries
      scenery.isDisplayed = true
    }

    await caveRepository.save(cave)
    await sceneryRepository.save(scenery)

    return { success: true }
  }

  /**
   * 检查并解锁景观
   */
  async checkAndUnlockSceneries(characterId: string): Promise<SceneryConfig[]> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm'],
    })

    if (!character) return []

    const cave = await caveRepository.findOne({
      where: { characterId },
    })

    if (!cave) return []

    const newlyUnlocked: SceneryConfig[] = []

    for (const config of getAllSceneryConfigs()) {
      // 检查是否已解锁
      const existing = await sceneryRepository.findOne({
        where: { characterId, sceneryId: config.id },
      })

      if (existing) continue

      // 检查解锁条件
      let conditionMet = false
      const condition = config.condition

      switch (condition.type) {
        case 'realm_reached':
          const tier = character.realm?.tier || 1
          const subTier = character.realm?.subTier || 1
          conditionMet =
            tier > (condition.tier || 0) || (tier === condition.tier && subTier >= (condition.subTier || 1))
          break

        case 'cave_level':
          const totalLevel = cave.spiritVeinLevel + cave.meditationChamberLevel
          conditionMet = totalLevel >= (condition.minLevel || 0)
          break

        case 'visitor_count':
          conditionMet = cave.totalVisitorsReceived >= (condition.minCount || 0)
          break

        case 'total_exp':
          conditionMet = Number(character.experience) >= (condition.minExp || 0)
          break

        case 'pvp_kills':
          conditionMet = character.pvpKills >= (condition.minCount || 0)
          break

        // ranking_position 和 craft_count 需要额外查询，暂时跳过
        default:
          break
      }

      if (conditionMet) {
        const scenery = sceneryRepository.create({
          characterId,
          sceneryId: config.id,
          isDisplayed: false,
          unlockedAt: Date.now(),
        })
        await sceneryRepository.save(scenery)
        newlyUnlocked.push(config)
      }
    }

    return newlyUnlocked
  }

  // ==================== 访客系统 ====================

  /**
   * 触发随机访客 (定时任务调用)
   */
  async triggerRandomVisitor(characterId: string): Promise<VisitorTypeConfig | null> {
    const cave = await caveRepository.findOne({
      where: { characterId },
    })

    if (!cave) return null

    // 检查是否已有访客
    if (cave.currentVisitor && !cave.isVisitorExpired()) {
      return null
    }

    // 清理过期访客
    if (cave.currentVisitor && cave.isVisitorExpired()) {
      await this.handleExpiredVisitor(cave)
    }

    // 检查触发间隔
    const lastCheck = cave.lastVisitorCheckTime || 0
    if (Date.now() - lastCheck < VISITOR_CONFIG.checkInterval) {
      return null
    }

    cave.lastVisitorCheckTime = Date.now()

    // 随机触发
    if (Math.random() >= VISITOR_CONFIG.triggerChance) {
      await caveRepository.save(cave)
      return null
    }

    // 选择访客
    const visitorType = selectRandomVisitor()
    const expiresAt = Date.now() + VISITOR_CONFIG.decisionTimeout

    cave.currentVisitor = {
      visitorTypeId: visitorType.id,
      name: visitorType.name,
      description: visitorType.description,
      arrivalTime: Date.now(),
      expiresAt,
    }

    await caveRepository.save(cave)

    // 发送Socket通知
    const io = getIO()
    if (io) {
      emitToPlayer(io, characterId, 'cave:visitor:arrived', {
        visitor: {
          name: visitorType.name,
          description: visitorType.description,
          expiresAt,
        },
      })
    }

    return visitorType
  }

  /**
   * 处理过期访客
   */
  private async handleExpiredVisitor(cave: CaveDwelling): Promise<void> {
    if (!cave.currentVisitor) return

    // 记录访客日志
    const log = visitorLogRepository.create({
      caveOwnerId: cave.characterId,
      visitorType: 'npc',
      visitorTypeId: cave.currentVisitor.visitorTypeId,
      visitorName: cave.currentVisitor.name,
      action: 'expired',
      visitedAt: cave.currentVisitor.arrivalTime,
    })
    await visitorLogRepository.save(log)

    cave.currentVisitor = null
    await caveRepository.save(cave)
  }

  /**
   * 获取当前访客
   */
  async getCurrentVisitor(characterId: string): Promise<{
    hasVisitor: boolean
    visitor?: {
      name: string
      description: string
      expiresAt: number
      remainingSeconds: number
    }
  }> {
    const cave = await caveRepository.findOne({
      where: { characterId },
    })

    if (!cave) {
      throw new Error('你还没有开辟洞府')
    }

    if (!cave.currentVisitor || cave.isVisitorExpired()) {
      if (cave.currentVisitor) {
        await this.handleExpiredVisitor(cave)
      }
      return { hasVisitor: false }
    }

    const remaining = Math.max(0, cave.currentVisitor.expiresAt - Date.now())
    return {
      hasVisitor: true,
      visitor: {
        name: cave.currentVisitor.name,
        description: cave.currentVisitor.description,
        expiresAt: cave.currentVisitor.expiresAt,
        remainingSeconds: Math.floor(remaining / 1000),
      },
    }
  }

  /**
   * 接待访客
   */
  async receiveVisitor(characterId: string): Promise<VisitorResult> {
    const cave = await caveRepository.findOne({
      where: { characterId },
    })

    if (!cave) {
      throw new Error('你还没有开辟洞府')
    }

    if (!cave.currentVisitor || cave.isVisitorExpired()) {
      throw new Error('当前没有访客')
    }

    const visitorConfig = VISITOR_TYPES.find((v) => v.id === cave.currentVisitor!.visitorTypeId)
    if (!visitorConfig) {
      throw new Error('访客配置错误')
    }

    // 选择结果
    const outcome = selectRandomOutcome(visitorConfig.receiveOutcomes)
    const result = await this.applyVisitorOutcome(characterId, outcome)

    // 记录日志
    const log = visitorLogRepository.create({
      caveOwnerId: characterId,
      visitorType: 'npc',
      visitorTypeId: cave.currentVisitor.visitorTypeId,
      visitorName: cave.currentVisitor.name,
      action: 'received',
      result,
      visitedAt: cave.currentVisitor.arrivalTime,
    })
    await visitorLogRepository.save(log)

    // 更新统计
    cave.totalVisitorsReceived += 1
    cave.currentVisitor = null
    await caveRepository.save(cave)

    // 检查景观解锁
    await this.checkAndUnlockSceneries(characterId)

    // Socket通知
    const io = getIO()
    if (io) {
      emitToPlayer(io, characterId, 'cave:visitor:left', {
        reason: 'received',
        outcome: result,
      })
    }

    return result
  }

  /**
   * 驱逐访客
   */
  async expelVisitor(characterId: string): Promise<VisitorResult> {
    const cave = await caveRepository.findOne({
      where: { characterId },
    })

    if (!cave) {
      throw new Error('你还没有开辟洞府')
    }

    if (!cave.currentVisitor || cave.isVisitorExpired()) {
      throw new Error('当前没有访客')
    }

    const visitorConfig = VISITOR_TYPES.find((v) => v.id === cave.currentVisitor!.visitorTypeId)
    if (!visitorConfig) {
      throw new Error('访客配置错误')
    }

    // 选择结果
    const outcome = selectRandomOutcome(visitorConfig.expelOutcomes)
    const result = await this.applyVisitorOutcome(characterId, outcome)

    // 记录日志
    const log = visitorLogRepository.create({
      caveOwnerId: characterId,
      visitorType: 'npc',
      visitorTypeId: cave.currentVisitor.visitorTypeId,
      visitorName: cave.currentVisitor.name,
      action: 'expelled',
      result,
      visitedAt: cave.currentVisitor.arrivalTime,
    })
    await visitorLogRepository.save(log)

    // 更新统计
    cave.totalVisitorsExpelled += 1
    cave.currentVisitor = null
    await caveRepository.save(cave)

    // Socket通知
    const io = getIO()
    if (io) {
      emitToPlayer(io, characterId, 'cave:visitor:left', {
        reason: 'expelled',
        outcome: result,
      })
    }

    return result
  }

  /**
   * 应用访客结果
   */
  private async applyVisitorOutcome(characterId: string, outcome: VisitorOutcome): Promise<VisitorResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    const result: VisitorResult = {
      outcomeType: outcome.type,
      description: outcome.description,
    }

    switch (outcome.type) {
      case 'gift_spirit_stones': {
        const value = (outcome.minValue || 0) + Math.floor(Math.random() * ((outcome.maxValue || 0) - (outcome.minValue || 0)))
        character.spiritStones = Number(character.spiritStones) + value
        await characterRepository.save(character)
        result.rewards = { spiritStones: value }
        result.description = outcome.description.replace('{value}', String(value))
        break
      }

      case 'gift_exp': {
        const value = (outcome.minValue || 0) + Math.floor(Math.random() * ((outcome.maxValue || 0) - (outcome.minValue || 0)))
        character.experience = Number(character.experience) + value
        await characterRepository.save(character)
        result.rewards = { exp: value }
        result.description = outcome.description.replace('{value}', String(value))
        break
      }

      case 'gift_item': {
        if (outcome.items && outcome.items.length > 0) {
          const totalWeight = outcome.items.reduce((sum, i) => sum + i.weight, 0)
          let random = Math.random() * totalWeight
          let selectedItemId = outcome.items[0].itemId
          for (const item of outcome.items) {
            random -= item.weight
            if (random <= 0) {
              selectedItemId = item.itemId
              break
            }
          }
          const template = getItemTemplate(selectedItemId)
          await inventoryService.addItem(characterId, selectedItemId, 1)
          result.rewards = { items: [{ itemId: selectedItemId, quantity: 1, itemName: template?.name || selectedItemId }] }
        }
        break
      }

      case 'curse': {
        // 添加debuff到角色
        const buffs = character.worldEventBuffs
        buffs.push({
          type: 'visitor_curse',
          effectType: outcome.debuffType || 'cultivation_debuff',
          value: 10, // 10%效率降低
          expiresAt: Date.now() + (outcome.debuffDuration || 3600000),
        })
        character.worldEventBuffs = buffs
        await characterRepository.save(character)
        result.penalties = { debuff: { type: outcome.debuffType || 'cultivation_debuff', duration: outcome.debuffDuration || 3600000 } }
        break
      }

      case 'fight': {
        // 战斗伤害
        const damage = Math.floor(character.maxHp * 0.1) // 10%最大生命
        character.hp = Math.max(1, character.hp - damage)
        await characterRepository.save(character)
        result.description += ` 你受到了 ${damage} 点伤害！`
        break
      }

      case 'trade_offer':
      case 'nothing':
      default:
        break
    }

    return result
  }

  // ==================== 社交系统 ====================

  /**
   * 拜访他人洞府
   */
  async visitOtherCave(visitorId: string, targetName: string): Promise<CaveVisitDTO> {
    // 查找目标角色
    const targetCharacter = await characterRepository.findOne({
      where: { name: targetName },
    })

    if (!targetCharacter) {
      throw new Error('找不到该修士')
    }

    if (targetCharacter.id === visitorId) {
      throw new Error('不能拜访自己的洞府')
    }

    // 查找目标洞府
    const targetCave = await caveRepository.findOne({
      where: { characterId: targetCharacter.id },
    })

    if (!targetCave) {
      throw new Error('该修士尚未开辟洞府')
    }

    // 获取已展示的景观
    const displayedSceneryIds = targetCave.displayedSceneries
    const sceneryConfigs = displayedSceneryIds
      .map((id) => getSceneryConfig(id))
      .filter((c): c is SceneryConfig => c !== undefined)
      .map((c) => ({ id: c.id, name: c.name, description: c.description }))

    // 记录访问
    const log = visitorLogRepository.create({
      caveOwnerId: targetCharacter.id,
      visitorType: 'player',
      visitorCharacterId: visitorId,
      visitorName: (await characterRepository.findOne({ where: { id: visitorId } }))?.name || '未知',
      action: 'received', // 玩家访问自动算接待
      visitedAt: Date.now(),
    })
    await visitorLogRepository.save(log)

    // 更新统计
    targetCave.totalPlayerVisits += 1
    await caveRepository.save(targetCave)

    return {
      ownerName: targetCharacter.name,
      spiritVeinLevel: targetCave.spiritVeinLevel,
      meditationChamberLevel: targetCave.meditationChamberLevel,
      displayedSceneries: sceneryConfigs,
      treasureDisplay: targetCave.treasureDisplay.map((t) => ({
        slot: t.slot,
        itemName: t.itemName,
        itemId: t.itemId,
      })),
      stats: {
        totalPlayerVisits: targetCave.totalPlayerVisits,
        totalGuestMessages: targetCave.totalGuestMessages,
      },
    }
  }

  /**
   * 留言
   */
  async leaveMessage(visitorId: string, targetName: string, content: string): Promise<{ success: boolean }> {
    // 验证内容
    if (!content || content.trim().length === 0) {
      throw new Error('留言内容不能为空')
    }

    if (content.length > MESSAGE_CONFIG.maxLength) {
      throw new Error(`留言内容不能超过 ${MESSAGE_CONFIG.maxLength} 字`)
    }

    // 查找目标
    const targetCharacter = await characterRepository.findOne({
      where: { name: targetName },
    })

    if (!targetCharacter) {
      throw new Error('找不到该修士')
    }

    if (targetCharacter.id === visitorId) {
      throw new Error('不能给自己留言')
    }

    // 查找目标洞府
    const targetCave = await caveRepository.findOne({
      where: { characterId: targetCharacter.id },
    })

    if (!targetCave) {
      throw new Error('该修士尚未开辟洞府')
    }

    // 获取访客信息
    const visitor = await characterRepository.findOne({
      where: { id: visitorId },
    })

    if (!visitor) {
      throw new Error('访客不存在')
    }

    // 创建留言
    const message = messageRepository.create({
      caveOwnerId: targetCharacter.id,
      visitorId,
      visitorName: visitor.name,
      content: content.trim(),
      createdAtTimestamp: Date.now(),
    })
    await messageRepository.save(message)

    // 更新统计
    targetCave.totalGuestMessages += 1
    await caveRepository.save(targetCave)

    // Socket通知
    const io = getIO()
    if (io) {
      emitToPlayer(io, targetCharacter.id, 'cave:message:new', {
        from: visitor.name,
        content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      })
    }

    return { success: true }
  }

  /**
   * 获取留言列表
   */
  async getMessages(
    characterId: string,
    page: number = 1
  ): Promise<{
    messages: { id: string; visitorName: string; content: string; createdAt: number; isRead: boolean }[]
    total: number
    page: number
    pageSize: number
  }> {
    const pageSize = MESSAGE_CONFIG.pageSize

    const [messages, total] = await messageRepository.findAndCount({
      where: { caveOwnerId: characterId },
      order: { createdAtTimestamp: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return {
      messages: messages.map((m) => ({
        id: m.id,
        visitorName: m.visitorName,
        content: m.content,
        createdAt: Number(m.createdAtTimestamp),
        isRead: m.isRead,
      })),
      total,
      page,
      pageSize,
    }
  }

  /**
   * 标记留言已读
   */
  async markMessageRead(characterId: string, messageId: string): Promise<{ success: boolean }> {
    const message = await messageRepository.findOne({
      where: { id: messageId, caveOwnerId: characterId },
    })

    if (!message) {
      throw new Error('留言不存在')
    }

    message.isRead = true
    await messageRepository.save(message)

    return { success: true }
  }

  /**
   * 获取访客记录
   */
  async getVisitorLogs(
    characterId: string,
    page: number = 1
  ): Promise<{
    logs: {
      id: string
      visitorType: string
      visitorName: string
      action: string
      result?: VisitorResult
      visitedAt: number
    }[]
    total: number
    page: number
    pageSize: number
  }> {
    const pageSize = 20

    const [logs, total] = await visitorLogRepository.findAndCount({
      where: { caveOwnerId: characterId },
      order: { visitedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return {
      logs: logs.map((l) => ({
        id: l.id,
        visitorType: l.visitorType,
        visitorName: l.visitorName,
        action: l.action,
        result: l.result || undefined,
        visitedAt: Number(l.visitedAt),
      })),
      total,
      page,
      pageSize,
    }
  }

  // ==================== 定时任务 ====================

  /**
   * 批量检查并触发访客 (定时任务调用)
   * 遍历所有洞府，为符合条件的洞府触发随机访客
   */
  async triggerVisitorsForAllCaves(): Promise<number> {
    // 获取最近活跃的角色的洞府
    const now = Date.now()
    const tenMinutesAgo = now - 10 * 60 * 1000

    // 查询最近活跃用户的洞府
    const activeCaves = await caveRepository
      .createQueryBuilder('cave')
      .innerJoin(Character, 'character', 'character.id = cave.characterId')
      .where('character.lastActiveAt > :time', { time: tenMinutesAgo })
      .getMany()

    let triggeredCount = 0

    for (const cave of activeCaves) {
      try {
        const visitor = await this.triggerRandomVisitor(cave.characterId)
        if (visitor) {
          triggeredCount++
        }
      } catch (error) {
        // 单个洞府失败不影响其他洞府
        console.error(`[Cave] 触发访客失败 (characterId: ${cave.characterId}):`, error)
      }
    }

    return triggeredCount
  }

  /**
   * 清理过期访客 (定时任务调用)
   */
  async cleanupExpiredVisitors(): Promise<number> {
    const now = Date.now()

    // 查找有过期访客的洞府
    const cavesWithExpiredVisitors = await caveRepository
      .createQueryBuilder('cave')
      .where('cave.currentVisitorJson IS NOT NULL')
      .getMany()

    let cleanedCount = 0

    for (const cave of cavesWithExpiredVisitors) {
      if (cave.currentVisitor && cave.isVisitorExpired()) {
        // 记录访客日志
        const log = visitorLogRepository.create({
          caveOwnerId: cave.characterId,
          visitorType: 'npc',
          visitorTypeId: cave.currentVisitor.visitorTypeId,
          visitorName: cave.currentVisitor.name,
          action: 'expired',
          visitedAt: cave.currentVisitor.arrivalTime,
        })
        await visitorLogRepository.save(log)

        // 清理访客
        cave.currentVisitor = null
        await caveRepository.save(cave)
        cleanedCount++
      }
    }

    return cleanedCount
  }
}

export const caveDwellingService = new CaveDwellingService()
