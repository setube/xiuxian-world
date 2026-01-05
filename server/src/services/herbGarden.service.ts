import { AppDataSource } from '../config/database'
import { windThunderWingsService } from './fengxi.service'
import { EntityManager } from 'typeorm'
import { Character } from '../models/Character'
import { HerbGardenPlot, type PlotStatus, type GardenEventType } from '../models/HerbGardenPlot'
import { InventoryService } from './inventory.service'
import {
  HERB_SEEDS,
  GARDEN_EVENTS,
  GARDEN_EXPANSION,
  ALCHEMY_ELDER_REQUIREMENT,
  SECRET_REALM_CONFIG,
  COMBAT_CONFIG,
  getSeed,
  rollRandomEvent,
  shouldTriggerEvent,
  rollExploreEvent,
  rollRandomMonster,
  rollRandomChest,
  rollSeedDrop,
  randomInRange,
  calculateGrowthProgress,
  isMature,
  getRemainingGrowthTime,
  formatRemainingTime,
  calculateDamage,
  calculateExpansionCost,
  type HerbSeed,
  type RealmMonster,
  type TreasureChest,
  type ExploreEventType
} from '../game/constants/herbGarden'
import { getItemTemplate, type ItemQuality } from '../game/constants/items'
import { ERROR_CODES } from '../utils/errorCodes'

const characterRepository = AppDataSource.getRepository(Character)
const plotRepository = AppDataSource.getRepository(HerbGardenPlot)
const inventoryService = new InventoryService()

// 地块状态（带详细信息）
export interface PlotInfo {
  plotIndex: number
  plotType: 'normal' | 'elder'
  status: PlotStatus
  seedId: string | null
  seedName: string | null
  plantedAt: number | null
  matureAt: number | null
  growthProgress: number
  remainingTime: string
  eventType: GardenEventType
  eventName: string | null
  eventAction: string | null
  isLocked: boolean
}

// 药园状态
export interface GardenStatus {
  plots: PlotInfo[]
  unlockedNormalPlots: number
  maxNormalPlots: number
  isAlchemyElder: boolean
  canExpand: boolean
  expansionCost: number
  canBecomeElder: { can: boolean; reason?: string }
}

// 采收结果
export interface HarvestResult {
  success: boolean
  items: { itemId: string; itemName: string; quantity: number }[]
  seedDrop: { seedId: string; seedName: string; quantity: number } | null
  message: string
}

// 探索结果
export interface ExploreResult {
  eventType: ExploreEventType
  message: string
  combat?: {
    inCombat: boolean
    monster: RealmMonster
    playerHp: number
    monsterHp: number
    round: number
  }
  rewards?: {
    spiritStones: number
    items: { itemId: string; itemName: string; quantity: number }[]
  }
}

// 战斗结果
export interface CombatResult {
  success: boolean
  action: 'attack' | 'flee'
  message: string
  combatEnded: boolean
  victory?: boolean
  playerHp: number
  monsterHp: number
  playerDamage?: number
  monsterDamage?: number
  round: number
  rewards?: {
    spiritStones: number
    items: { itemId: string; itemName: string; quantity: number }[]
  }
}

export class HerbGardenService {
  // ==================== 验证方法 ====================

  /**
   * 验证是否为黄枫谷弟子
   */
  private async validateHuangFengMember(characterId: string): Promise<Character> {
    const character = await characterRepository.findOne({ where: { id: characterId } })
    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }
    if (character.sectId !== 'huangfeng') {
      throw { code: ERROR_CODES.GARDEN_NOT_HUANG_FENG, message: '只有黄枫谷弟子才能使用药园' }
    }
    return character
  }

  /**
   * 检查地块是否解锁
   */
  private isPlotUnlocked(plotIndex: number, character: Character): boolean {
    // 普通地块 (0-7)
    if (plotIndex < GARDEN_EXPANSION.elderPlotStart) {
      return plotIndex < character.herbGardenUnlocked
    }
    // 长老地块 (8-10)
    return character.isAlchemyElder
  }

  // ==================== 初始化方法 ====================

  /**
   * 初始化药园（首次访问时创建地块）
   */
  private async initializeGarden(character: Character): Promise<void> {
    // 检查是否已有地块
    const existingPlots = await plotRepository.count({ where: { characterId: character.id } })
    if (existingPlots > 0) return

    // 创建所有11块地块（0-10）
    const plots: Partial<HerbGardenPlot>[] = []
    for (let i = 0; i <= 10; i++) {
      plots.push({
        characterId: character.id,
        plotIndex: i,
        plotType: i >= GARDEN_EXPANSION.elderPlotStart ? 'elder' : 'normal',
        status: 'empty',
        seedId: null,
        plantedAt: null,
        matureAt: null,
        eventType: 'none',
        eventStartAt: null
      })
    }

    await plotRepository.save(plots)
  }

  // ==================== 查询方法 ====================

  /**
   * 获取药园状态
   */
  async getGarden(characterId: string): Promise<GardenStatus> {
    const character = await this.validateHuangFengMember(characterId)

    // 初始化药园
    await this.initializeGarden(character)

    // 尝试触发随机事件
    await this.tryTriggerEvent(character)

    // 获取所有地块
    const plots = await plotRepository.find({
      where: { characterId },
      order: { plotIndex: 'ASC' }
    })

    // 更新地块状态（检查成熟）
    for (const plot of plots) {
      await this.updatePlotStatus(plot)
    }

    // 构建地块信息
    const plotInfos: PlotInfo[] = plots.map(plot => {
      const seed = plot.seedId ? getSeed(plot.seedId) : null
      const event = plot.eventType !== 'none' ? GARDEN_EVENTS[plot.eventType] : null
      const isLocked = !this.isPlotUnlocked(plot.plotIndex, character)

      return {
        plotIndex: plot.plotIndex,
        plotType: plot.plotType,
        status: plot.status,
        seedId: plot.seedId,
        seedName: seed?.name || null,
        plantedAt: plot.plantedAt,
        matureAt: plot.matureAt,
        growthProgress: plot.status === 'growing' ? plot.getGrowthProgress() : 0,
        remainingTime: plot.status === 'growing' ? formatRemainingTime(plot.getRemainingTime()) : '',
        eventType: plot.eventType,
        eventName: event?.name || null,
        eventAction: event?.actionName || null,
        isLocked
      }
    })

    // 计算扩建费用
    const expansionCost = calculateExpansionCost(character.herbGardenUnlocked)
    const canExpand = expansionCost > 0 && character.sectContribution >= expansionCost

    // 检查是否可晋升长老
    const canBecomeElder = this.checkCanBecomeElder(character)

    return {
      plots: plotInfos,
      unlockedNormalPlots: character.herbGardenUnlocked,
      maxNormalPlots: GARDEN_EXPANSION.maxNormalPlots,
      isAlchemyElder: character.isAlchemyElder,
      canExpand,
      expansionCost: expansionCost > 0 ? expansionCost : 0,
      canBecomeElder
    }
  }

  /**
   * 更新地块状态（检查是否成熟、处理事件超时、应用事件效果）
   */
  private async updatePlotStatus(plot: HerbGardenPlot): Promise<void> {
    if (plot.status !== 'growing' || !plot.matureAt) return

    const now = Date.now()
    let needSave = false

    // 检查事件超时并应用后果
    if (plot.eventType !== 'none' && plot.eventStartAt) {
      const event = GARDEN_EVENTS[plot.eventType]
      if (event) {
        const eventDurationMs = now - plot.eventStartAt
        const maxDurationMs = event.maxDuration * 60 * 60 * 1000

        if (eventDurationMs >= maxDurationMs) {
          // 事件超时，应用惩罚
          if (plot.eventType === 'drought') {
            // 干涸超时：灵草枯萎
            plot.status = 'withered'
            plot.eventType = 'none'
            plot.eventStartAt = null
            await plotRepository.save(plot)
            return // 已枯萎，无需继续检查
          } else if (plot.eventType === 'weed') {
            // 杂草超时：额外延长成熟时间（惩罚性延长）
            const penaltyExtension = 2 * 60 * 60 * 1000 // 额外延长2小时
            plot.matureAt = plot.matureAt + penaltyExtension
            plot.eventType = 'none'
            plot.eventStartAt = null
            needSave = true
          } else if (plot.eventType === 'pest') {
            // 虫害超时：清除事件（采收时仍会减产）
            // 虫害效果在采收时应用，这里只清理超时
            plot.eventType = 'none'
            plot.eventStartAt = null
            needSave = true
          }
        }
      }
    }

    // 杂草事件：延长成熟时间（生长减速效果）
    // 注意：这个效果在事件触发时应用一次，而不是每次检查
    // 已在 tryTriggerEvent 中处理

    // 检查是否成熟
    if (now >= plot.matureAt) {
      // 如果有干涸事件且未超时，有20%概率枯萎
      if (plot.eventType === 'drought') {
        const droughtEvent = GARDEN_EVENTS.drought
        if (droughtEvent && Math.random() < droughtEvent.penalty) {
          plot.status = 'withered'
          plot.eventType = 'none'
          plot.eventStartAt = null
          await plotRepository.save(plot)
          return
        }
      }
      plot.status = 'mature'
      needSave = true
    }

    if (needSave) {
      await plotRepository.save(plot)
    }
  }

  // ==================== 种植方法 ====================

  /**
   * 播种（使用事务保护）
   */
  async plant(characterId: string, plotIndex: number, seedId: string): Promise<{ success: boolean; message: string }> {
    // 先验证基本条件（不需要事务）
    const character = await this.validateHuangFengMember(characterId)

    // 检查地块是否解锁
    if (!this.isPlotUnlocked(plotIndex, character)) {
      throw { code: ERROR_CODES.GARDEN_PLOT_LOCKED, message: '该灵田尚未解锁' }
    }

    // 检查种子配置
    const seed = getSeed(seedId)
    if (!seed) {
      throw { code: ERROR_CODES.GARDEN_SEED_NOT_FOUND, message: '种子不存在' }
    }

    // 使用事务确保播种操作的原子性
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 获取地块（使用悲观锁）
      const plot = await manager.findOne(HerbGardenPlot, {
        where: { characterId, plotIndex },
        lock: { mode: 'pessimistic_write' }
      })
      if (!plot) {
        throw { code: ERROR_CODES.GARDEN_PLOT_NOT_FOUND, message: '灵田不存在' }
      }

      // 检查地块状态
      if (plot.status !== 'empty') {
        throw { code: ERROR_CODES.GARDEN_PLOT_NOT_EMPTY, message: '该灵田不是空闲状态' }
      }

      // 检查种子与地块类型是否匹配
      if (seed.requiredPlotType === 'elder' && plot.plotType !== 'elder') {
        throw { code: ERROR_CODES.GARDEN_SEED_NOT_MATCH_PLOT, message: '该种子只能种植在长老灵田' }
      }

      // 检查背包中是否有种子
      const hasEnough = await inventoryService.hasItems(characterId, [{ itemId: seedId, quantity: 1 }])
      if (!hasEnough) {
        throw { code: ERROR_CODES.GARDEN_SEED_NOT_ENOUGH, message: '种子不足' }
      }

      // 扣除种子
      await inventoryService.removeItemByItemId(characterId, seedId, 1)

      // 更新地块
      const now = Date.now()
      plot.status = 'growing'
      plot.seedId = seedId
      plot.plantedAt = now
      // 风雷翅效率提升：减少成长时间
      const baseGrowthMs = seed.growthHours * 60 * 60 * 1000
      const efficiencyBoost = await windThunderWingsService.getEfficiencyBoost(characterId, 'herbGarden')
      const actualGrowthMs = Math.floor(baseGrowthMs * (1 - efficiencyBoost))
      plot.matureAt = now + actualGrowthMs

      await manager.save(HerbGardenPlot, plot)

      const actualHours = (actualGrowthMs / (60 * 60 * 1000)).toFixed(1)
      return {
        success: true,
        message: `成功种下${seed.name}，预计${actualHours}小时后成熟`
      }
    })
  }

  // ==================== 采收方法 ====================

  /**
   * 采收（使用事务保护）
   */
  async harvest(characterId: string, plotIndex: number): Promise<HarvestResult> {
    // 先验证基本条件
    await this.validateHuangFengMember(characterId)

    // 使用事务确保采收操作的原子性
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 获取地块（使用悲观锁）
      const plot = await manager.findOne(HerbGardenPlot, {
        where: { characterId, plotIndex },
        lock: { mode: 'pessimistic_write' }
      })
      if (!plot) {
        throw { code: ERROR_CODES.GARDEN_PLOT_NOT_FOUND, message: '灵田不存在' }
      }

      // 检查地块状态
      if (plot.status === 'withered') {
        // 清理枯萎地块
        plot.status = 'empty'
        plot.seedId = null
        plot.plantedAt = null
        plot.matureAt = null
        plot.eventType = 'none'
        plot.eventStartAt = null
        await manager.save(HerbGardenPlot, plot)
        throw { code: ERROR_CODES.GARDEN_PLOT_WITHERED, message: '灵草已枯萎，已清理灵田' }
      }

      if (plot.status !== 'mature') {
        if (plot.status === 'growing') {
          throw { code: ERROR_CODES.GARDEN_PLOT_NOT_MATURE, message: '灵草尚未成熟' }
        }
        throw { code: ERROR_CODES.GARDEN_PLOT_NOT_EMPTY, message: '该灵田没有可采收的灵草' }
      }

      // 获取种子配置
      const seed = getSeed(plot.seedId!)
      if (!seed) {
        throw { code: ERROR_CODES.GARDEN_SEED_NOT_FOUND, message: '种子配置错误' }
      }

      // 计算产量（考虑事件影响）
      let yieldMultiplier = 1
      if (plot.eventType === 'pest') {
        const event = GARDEN_EVENTS.pest
        if (event) yieldMultiplier -= event.penalty
      }

      const baseYield = randomInRange(seed.yieldMin, seed.yieldMax)
      const finalYield = Math.max(1, Math.floor(baseYield * yieldMultiplier))

      // 添加物品到背包
      const items: { itemId: string; itemName: string; quantity: number }[] = []
      const itemTemplate = getItemTemplate(seed.yieldItemId)
      if (itemTemplate) {
        await inventoryService.addItem(characterId, seed.yieldItemId, finalYield)
        items.push({
          itemId: seed.yieldItemId,
          itemName: itemTemplate.name,
          quantity: finalYield
        })
      }

      // 判定种子掉落
      let seedDrop: { seedId: string; seedName: string; quantity: number } | null = null
      const droppedSeed = rollSeedDrop(seed.quality as ItemQuality, plot.plotType === 'elder')
      if (droppedSeed) {
        const seedTemplate = getItemTemplate(droppedSeed.seedId)
        if (seedTemplate) {
          await inventoryService.addItem(characterId, droppedSeed.seedId, droppedSeed.quantity)
          seedDrop = {
            seedId: droppedSeed.seedId,
            seedName: seedTemplate.name,
            quantity: droppedSeed.quantity
          }
        }
      }

      // 重置地块
      plot.status = 'empty'
      plot.seedId = null
      plot.plantedAt = null
      plot.matureAt = null
      plot.eventType = 'none'
      plot.eventStartAt = null
      await manager.save(HerbGardenPlot, plot)

      const message = seedDrop
        ? `成功采收${itemTemplate?.name || '灵草'} x${finalYield}，额外获得${seedDrop.seedName} x${seedDrop.quantity}！`
        : `成功采收${itemTemplate?.name || '灵草'} x${finalYield}`

      return {
        success: true,
        items,
        seedDrop,
        message
      }
    })
  }

  // ==================== 事件处理方法 ====================

  /**
   * 尝试触发随机事件
   */
  private async tryTriggerEvent(character: Character): Promise<void> {
    // 检查是否应该触发事件
    if (!shouldTriggerEvent(character.lastGardenEventTime)) return

    // 获取正在生长的地块
    const growingPlots = await plotRepository.find({
      where: {
        characterId: character.id,
        status: 'growing' as PlotStatus,
        eventType: 'none' as GardenEventType
      }
    })

    if (growingPlots.length === 0) return

    // 随机选择一个地块
    const targetPlot = growingPlots[Math.floor(Math.random() * growingPlots.length)]

    // 触发事件
    const eventType = rollRandomEvent()
    targetPlot.eventType = eventType
    targetPlot.eventStartAt = Date.now()

    // 杂草事件：立即应用生长减速效果（延长成熟时间）
    if (eventType === 'weed' && targetPlot.matureAt) {
      const weedEvent = GARDEN_EVENTS.weed
      if (weedEvent) {
        // penalty = 0.5 表示生长速度降低50%，即需要额外50%的时间
        // 计算剩余生长时间并延长
        const now = Date.now()
        const remainingTime = targetPlot.matureAt - now
        if (remainingTime > 0) {
          const extensionTime = Math.floor(remainingTime * weedEvent.penalty)
          targetPlot.matureAt = targetPlot.matureAt + extensionTime
        }
      }
    }

    await plotRepository.save(targetPlot)

    // 更新角色的事件时间
    character.lastGardenEventTime = Date.now()
    await characterRepository.save(character)
  }

  /**
   * 处理事件
   */
  async handleEvent(
    characterId: string,
    plotIndex: number,
    action: 'weed' | 'pesticide' | 'water'
  ): Promise<{ success: boolean; message: string }> {
    const character = await this.validateHuangFengMember(characterId)

    // 获取地块
    const plot = await plotRepository.findOne({
      where: { characterId, plotIndex }
    })
    if (!plot) {
      throw { code: ERROR_CODES.GARDEN_PLOT_NOT_FOUND, message: '灵田不存在' }
    }

    // 检查是否有事件
    if (plot.eventType === 'none') {
      throw { code: ERROR_CODES.GARDEN_NO_EVENT, message: '该灵田没有需要处理的事件' }
    }

    // 检查动作是否匹配
    const event = GARDEN_EVENTS[plot.eventType]
    if (!event || event.requiredAction !== action) {
      throw { code: ERROR_CODES.VALIDATION_ERROR, message: '处理方式不正确' }
    }

    // 清除事件
    plot.eventType = 'none'
    plot.eventStartAt = null
    await plotRepository.save(plot)

    return {
      success: true,
      message: `成功${event.actionName}，灵草恢复正常生长`
    }
  }

  // ==================== 扩建方法 ====================

  /**
   * 扩建药园（使用事务保护）
   */
  async expandGarden(characterId: string): Promise<{ success: boolean; newPlots: number; message: string }> {
    // 先验证基本条件
    await this.validateHuangFengMember(characterId)

    // 使用事务确保扩建操作的原子性
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 获取角色（使用悲观锁）
      const character = await manager.findOne(Character, {
        where: { id: characterId },
        lock: { mode: 'pessimistic_write' }
      })
      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      // 检查是否达到上限
      if (character.herbGardenUnlocked >= GARDEN_EXPANSION.maxNormalPlots) {
        throw { code: ERROR_CODES.GARDEN_MAX_PLOTS, message: '普通灵田已达最大数量' }
      }

      // 计算费用
      const cost = calculateExpansionCost(character.herbGardenUnlocked)
      if (cost < 0) {
        throw { code: ERROR_CODES.GARDEN_MAX_PLOTS, message: '无法继续扩建' }
      }

      // 检查贡献
      if (character.sectContribution < cost) {
        throw { code: ERROR_CODES.SECT_CONTRIBUTION_NOT_ENOUGH, message: `贡献不足，需要${cost}贡献` }
      }

      // 扣除贡献并解锁地块
      character.sectContribution -= cost
      character.herbGardenUnlocked += 1
      await manager.save(Character, character)

      return {
        success: true,
        newPlots: character.herbGardenUnlocked,
        message: `成功扩建药园，当前拥有${character.herbGardenUnlocked}块灵田`
      }
    })
  }

  // ==================== 丹道长老方法 ====================

  /**
   * 检查是否可以成为丹道长老
   */
  private checkCanBecomeElder(character: Character): { can: boolean; reason?: string } {
    if (character.isAlchemyElder) {
      return { can: false, reason: '已经是丹道长老' }
    }

    // 检查境界
    const realmTier = Math.floor((character.realmId - 1) / 4) + 1
    const realmStage = (character.realmId - 1) % 4
    if (realmTier < ALCHEMY_ELDER_REQUIREMENT.minRealmTier) {
      return { can: false, reason: '境界不足，需要筑基期中期' }
    }
    if (realmTier === ALCHEMY_ELDER_REQUIREMENT.minRealmTier && realmStage < ALCHEMY_ELDER_REQUIREMENT.minRealmStage) {
      return { can: false, reason: '境界不足，需要筑基期中期' }
    }

    // 检查贡献
    if (character.sectContribution < ALCHEMY_ELDER_REQUIREMENT.contributionCost) {
      return {
        can: false,
        reason: `贡献不足，需要${ALCHEMY_ELDER_REQUIREMENT.contributionCost}贡献`
      }
    }

    return { can: true }
  }

  /**
   * 晋升丹道长老（使用事务保护）
   */
  async becomeAlchemyElder(characterId: string): Promise<{ success: boolean; message: string }> {
    // 先验证基本条件
    await this.validateHuangFengMember(characterId)

    // 使用事务确保晋升操作的原子性
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 获取角色（使用悲观锁）
      const character = await manager.findOne(Character, {
        where: { id: characterId },
        lock: { mode: 'pessimistic_write' }
      })
      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      const check = this.checkCanBecomeElder(character)
      if (!check.can) {
        throw { code: ERROR_CODES.GARDEN_ELDER_REQUIREMENT, message: check.reason }
      }

      // 扣除贡献并设置长老状态
      character.sectContribution -= ALCHEMY_ELDER_REQUIREMENT.contributionCost
      character.isAlchemyElder = true
      await manager.save(Character, character)

      return {
        success: true,
        message: '恭喜晋升为丹道长老！已解锁3块长老专属灵田'
      }
    })
  }

  // ==================== 洞天寻宝方法 ====================

  /**
   * 开始探索（洞天寻宝）
   * 注意：需要丹道长老身份（isAlchemyElder），而非宗门职位（sectRank）
   */
  async startExplore(characterId: string, plotIndex: number): Promise<ExploreResult> {
    const character = await this.validateHuangFengMember(characterId)

    // 检查是否为丹道长老（拥有长老灵田的前提条件）
    if (!character.isAlchemyElder) {
      throw { code: ERROR_CODES.GARDEN_NOT_GRAND_ELDER, message: '只有丹道长老才能进行洞天寻宝' }
    }

    // 检查是否正在战斗
    if (character.currentExplore?.inCombat) {
      throw { code: ERROR_CODES.GARDEN_IN_COMBAT, message: '正在战斗中，请先完成当前战斗' }
    }

    // 检查地块是否为长老灵田
    if (!SECRET_REALM_CONFIG.plotRequired.includes(plotIndex)) {
      throw { code: ERROR_CODES.GARDEN_PLOT_LOCKED, message: '只能在长老灵田进行洞天寻宝' }
    }

    // 检查每日次数
    const today = new Date().toISOString().split('T')[0]
    if (character.lastExploreDate !== today) {
      character.dailyExploreCount = 0
      character.lastExploreDate = today
    }
    if (character.dailyExploreCount >= SECRET_REALM_CONFIG.dailyLimit) {
      throw { code: ERROR_CODES.GARDEN_EXPLORE_LIMIT, message: '今日探索次数已用完' }
    }

    // 增加探索次数
    character.dailyExploreCount += 1

    // 随机事件
    const eventType = rollExploreEvent()

    if (eventType === 'monster') {
      // 妖兽遭遇 - 进入战斗
      const monster = rollRandomMonster()
      character.currentExplore = {
        inCombat: true,
        monster: {
          id: monster.id,
          name: monster.name,
          currentHp: monster.hp,
          maxHp: monster.hp,
          attack: monster.attack,
          defense: monster.defense
        },
        playerHp: character.hp,
        round: 1,
        plotIndex
      }
      await characterRepository.save(character)

      return {
        eventType: 'monster',
        message: `遭遇${monster.name}！${monster.description}`,
        combat: {
          inCombat: true,
          monster,
          playerHp: character.hp,
          monsterHp: monster.hp,
          round: 1
        }
      }
    }

    // 非战斗事件 - 直接结算
    await characterRepository.save(character)

    if (eventType === 'treasure') {
      // 发现宝箱
      const chest = rollRandomChest()
      const rewards = await this.processTreasureRewards(characterId, chest)

      return {
        eventType: 'treasure',
        message: `发现${chest.name}！`,
        rewards
      }
    }

    if (eventType === 'gather') {
      // 采集灵材
      const rewards = await this.processGatherRewards(characterId)

      return {
        eventType: 'gather',
        message: '发现一处灵材生长地！',
        rewards
      }
    }

    // 无事发生
    const spiritStones = randomInRange(10, 30)
    character.spiritStones = Number(character.spiritStones) + spiritStones
    await characterRepository.save(character)

    return {
      eventType: 'nothing',
      message: '四处探索，只发现了一些散落的灵石。',
      rewards: {
        spiritStones,
        items: []
      }
    }
  }

  /**
   * 战斗行动
   */
  async combat(characterId: string, action: 'attack' | 'flee'): Promise<CombatResult> {
    const character = await this.validateHuangFengMember(characterId)

    // 检查是否在战斗中
    const explore = character.currentExplore
    if (!explore?.inCombat || !explore.monster) {
      throw { code: ERROR_CODES.GARDEN_NOT_IN_COMBAT, message: '当前没有进行中的战斗' }
    }

    if (action === 'flee') {
      // 尝试逃跑
      if (Math.random() < COMBAT_CONFIG.fleeSuccessRate) {
        // 逃跑成功
        character.currentExplore = null
        await characterRepository.save(character)

        return {
          success: true,
          action: 'flee',
          message: '成功逃离战斗！',
          combatEnded: true,
          playerHp: explore.playerHp!,
          monsterHp: explore.monster.currentHp,
          round: explore.round!
        }
      } else {
        // 逃跑失败，受到伤害
        const damage = Math.floor(character.maxHp * COMBAT_CONFIG.fleeFailDamagePercent)
        explore.playerHp = Math.max(0, explore.playerHp! - damage)
        explore.round = (explore.round || 1) + 1

        if (explore.playerHp <= 0) {
          // 战败
          character.currentExplore = null
          await characterRepository.save(character)

          return {
            success: false,
            action: 'flee',
            message: `逃跑失败！受到${damage}点伤害，力竭败退...`,
            combatEnded: true,
            victory: false,
            playerHp: 0,
            monsterHp: explore.monster.currentHp,
            monsterDamage: damage,
            round: explore.round
          }
        }

        character.currentExplore = explore
        await characterRepository.save(character)

        return {
          success: false,
          action: 'flee',
          message: `逃跑失败！受到${damage}点伤害`,
          combatEnded: false,
          playerHp: explore.playerHp,
          monsterHp: explore.monster.currentHp,
          monsterDamage: damage,
          round: explore.round
        }
      }
    }

    // 攻击
    // 玩家攻击
    const playerDamage = calculateDamage(character.attack, explore.monster.defense)
    explore.monster.currentHp = Math.max(0, explore.monster.currentHp - playerDamage)

    if (explore.monster.currentHp <= 0) {
      // 胜利
      const rewards = await this.processMonsterRewards(characterId, explore.monster.id)
      character.currentExplore = null
      await characterRepository.save(character)

      return {
        success: true,
        action: 'attack',
        message: `对${explore.monster.name}造成${playerDamage}点伤害，成功击败！`,
        combatEnded: true,
        victory: true,
        playerHp: explore.playerHp!,
        monsterHp: 0,
        playerDamage,
        round: explore.round!,
        rewards
      }
    }

    // 妖兽反击
    const monsterDamage = calculateDamage(explore.monster.attack, character.defense)
    explore.playerHp = Math.max(0, explore.playerHp! - monsterDamage)
    explore.round = (explore.round || 1) + 1

    if (explore.playerHp <= 0) {
      // 战败
      character.currentExplore = null
      await characterRepository.save(character)

      return {
        success: false,
        action: 'attack',
        message: `对${explore.monster.name}造成${playerDamage}点伤害，但被反击${monsterDamage}点，力竭败退...`,
        combatEnded: true,
        victory: false,
        playerHp: 0,
        monsterHp: explore.monster.currentHp,
        playerDamage,
        monsterDamage,
        round: explore.round
      }
    }

    // 战斗继续
    character.currentExplore = explore
    await characterRepository.save(character)

    return {
      success: true,
      action: 'attack',
      message: `对${explore.monster.name}造成${playerDamage}点伤害，被反击${monsterDamage}点`,
      combatEnded: false,
      playerHp: explore.playerHp,
      monsterHp: explore.monster.currentHp,
      playerDamage,
      monsterDamage,
      round: explore.round
    }
  }

  /**
   * 获取当前探索状态
   */
  async getExploreStatus(characterId: string): Promise<{
    inCombat: boolean
    combat?: {
      monster: { name: string; currentHp: number; maxHp: number }
      playerHp: number
      round: number
    }
    remainingToday: number
  }> {
    const character = await this.validateHuangFengMember(characterId)

    const today = new Date().toISOString().split('T')[0]
    const usedToday = character.lastExploreDate === today ? character.dailyExploreCount : 0
    const remainingToday = SECRET_REALM_CONFIG.dailyLimit - usedToday

    const explore = character.currentExplore
    if (!explore?.inCombat || !explore.monster) {
      return { inCombat: false, remainingToday }
    }

    return {
      inCombat: true,
      combat: {
        monster: {
          name: explore.monster.name,
          currentHp: explore.monster.currentHp,
          maxHp: explore.monster.maxHp
        },
        playerHp: explore.playerHp!,
        round: explore.round!
      },
      remainingToday
    }
  }

  // ==================== 奖励处理方法 ====================

  /**
   * 处理宝箱奖励
   */
  private async processTreasureRewards(
    characterId: string,
    chest: TreasureChest
  ): Promise<{ spiritStones: number; items: { itemId: string; itemName: string; quantity: number }[] }> {
    const character = await characterRepository.findOne({ where: { id: characterId } })
    if (!character) throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND }

    // 灵石奖励
    const spiritStones = randomInRange(chest.rewards.spiritStones.min, chest.rewards.spiritStones.max)
    character.spiritStones = Number(character.spiritStones) + spiritStones
    await characterRepository.save(character)

    // 物品奖励
    const items: { itemId: string; itemName: string; quantity: number }[] = []
    for (const drop of chest.rewards.items) {
      if (Math.random() * 100 < drop.chance) {
        const quantity = randomInRange(drop.quantityMin, drop.quantityMax)
        await inventoryService.addItem(characterId, drop.itemId, quantity)
        const template = getItemTemplate(drop.itemId)
        items.push({
          itemId: drop.itemId,
          itemName: template?.name || drop.itemId,
          quantity
        })
      }
    }

    return { spiritStones, items }
  }

  /**
   * 处理采集奖励
   */
  private async processGatherRewards(
    characterId: string
  ): Promise<{ spiritStones: number; items: { itemId: string; itemName: string; quantity: number }[] }> {
    const { GATHER_REWARDS } = await import('../game/constants/herbGarden')

    const character = await characterRepository.findOne({ where: { id: characterId } })
    if (!character) throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND }

    // 灵石奖励
    const spiritStones = randomInRange(GATHER_REWARDS.spiritStones.min, GATHER_REWARDS.spiritStones.max)
    character.spiritStones = Number(character.spiritStones) + spiritStones
    await characterRepository.save(character)

    // 物品奖励
    const items: { itemId: string; itemName: string; quantity: number }[] = []
    for (const drop of GATHER_REWARDS.items) {
      if (Math.random() * 100 < drop.chance) {
        const quantity = randomInRange(drop.quantityMin, drop.quantityMax)
        await inventoryService.addItem(characterId, drop.itemId, quantity)
        const template = getItemTemplate(drop.itemId)
        items.push({
          itemId: drop.itemId,
          itemName: template?.name || drop.itemId,
          quantity
        })
      }
    }

    return { spiritStones, items }
  }

  /**
   * 处理妖兽掉落
   */
  private async processMonsterRewards(
    characterId: string,
    monsterId: string
  ): Promise<{ spiritStones: number; items: { itemId: string; itemName: string; quantity: number }[] }> {
    const { REALM_MONSTERS } = await import('../game/constants/herbGarden')

    const monster = REALM_MONSTERS[monsterId]
    if (!monster) return { spiritStones: 0, items: [] }

    const character = await characterRepository.findOne({ where: { id: characterId } })
    if (!character) throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND }

    // 基于妖兽等级的灵石奖励
    const spiritStones = randomInRange(30 * monster.level, 80 * monster.level)
    character.spiritStones = Number(character.spiritStones) + spiritStones
    await characterRepository.save(character)

    // 物品掉落
    const items: { itemId: string; itemName: string; quantity: number }[] = []
    for (const drop of monster.dropTable) {
      if (Math.random() * 100 < drop.chance) {
        const quantity = randomInRange(drop.quantityMin, drop.quantityMax)
        await inventoryService.addItem(characterId, drop.itemId, quantity)
        const template = getItemTemplate(drop.itemId)
        items.push({
          itemId: drop.itemId,
          itemName: template?.name || drop.itemId,
          quantity
        })
      }
    }

    return { spiritStones, items }
  }

  // ==================== 获取可用种子列表 ====================

  /**
   * 获取可用种子列表
   */
  async getAvailableSeeds(characterId: string): Promise<{ seeds: (HerbSeed & { owned: number })[] }> {
    const character = await this.validateHuangFengMember(characterId)

    const seeds: (HerbSeed & { owned: number })[] = []

    for (const seed of Object.values(HERB_SEEDS)) {
      // 检查是否有权限使用
      if (seed.requiredPlotType === 'elder' && !character.isAlchemyElder) {
        continue
      }

      // 获取拥有数量
      const owned = await inventoryService.getItemQuantity(characterId, seed.id)

      seeds.push({
        ...seed,
        owned
      })
    }

    return { seeds }
  }
}

export const herbGardenService = new HerbGardenService()
