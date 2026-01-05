import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { TribulationRecord } from '../models/TribulationRecord'
import { Realm } from '../models/Realm'
import { InventoryItem } from '../models/InventoryItem'
import { HerbGardenPlot } from '../models/HerbGardenPlot'
import { StarDisk } from '../models/StarDisk'
import { Consort } from '../models/Consort'
import { SpiritBeast } from '../models/SpiritBeast'
import { LingyanContribution } from '../models/LingyanContribution'
import { NascentSoul } from '../models/NascentSoul'
import { WoodenDummyRecord } from '../models/WoodenDummyRecord'
import { TowerRecord } from '../models/TowerRecord'
import { inventoryService } from './inventory.service'
import { getIO, broadcastToWorld, emitToPlayer } from '../socket/index'
import { getItemTemplate } from '../game/constants/items'
import { TRIBULATION_CONFIG, TRIBULATION_TYPES, ROLLBACK_CONFIG } from '../game/constants/worldEvents'

const characterRepository = AppDataSource.getRepository(Character)
const tribulationRepository = AppDataSource.getRepository(TribulationRecord)
const realmRepository = AppDataSource.getRepository(Realm)
const inventoryItemRepository = AppDataSource.getRepository(InventoryItem)
const herbGardenPlotRepository = AppDataSource.getRepository(HerbGardenPlot)
const starDiskRepository = AppDataSource.getRepository(StarDisk)
const consortRepository = AppDataSource.getRepository(Consort)
const spiritBeastRepository = AppDataSource.getRepository(SpiritBeast)
const lingyanContributionRepository = AppDataSource.getRepository(LingyanContribution)
const nascentSoulRepository = AppDataSource.getRepository(NascentSoul)
const woodenDummyRecordRepository = AppDataSource.getRepository(WoodenDummyRecord)
const towerRecordRepository = AppDataSource.getRepository(TowerRecord)

export interface TribulationStatus {
  // 筑基之劫
  foundation: {
    canAttempt: boolean
    hasRequiredItems: boolean
    requiredItems: { itemId: string; name: string; required: number; owned: number }[]
    reason?: string
  }
  // 结丹之劫
  coreFormation: {
    canAttempt: boolean
    hasRequiredItems: boolean
    requiredItems: { itemId: string; name: string; required: number; owned: number }[]
    successRate: number
    reason?: string
  }
  // 元婴之劫
  nascentSoul: {
    canAttempt: boolean
    hasRequiredItems: boolean
    requiredItems: { itemId: string; name: string; required: number; owned: number }[]
    successRate: number
    reason?: string
  }
}

export interface TribulationResult {
  success: boolean
  type: string
  message: string
  newRealm?: { id: number; name: string; tier: number; subTier: number }
  characterDied?: boolean
}

export class TribulationService {
  /**
   * 获取渡劫状态
   */
  async getTribulationStatus(characterId: string): Promise<TribulationStatus> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm'],
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    const tier = character.realm?.tier || 1
    const subTier = character.realm?.subTier || 1

    // 筑基之劫状态
    const foundationStatus = await this.checkFoundationTribulation(character, tier, subTier)

    // 结丹之劫状态
    const coreFormationStatus = await this.checkCoreFormationTribulation(character, tier, subTier)

    // 元婴之劫状态
    const nascentSoulStatus = await this.checkNascentSoulTribulation(character, tier, subTier)

    return {
      foundation: foundationStatus,
      coreFormation: coreFormationStatus,
      nascentSoul: nascentSoulStatus,
    }
  }

  /**
   * 检查筑基之劫条件
   */
  private async checkFoundationTribulation(
    character: Character,
    tier: number,
    subTier: number
  ): Promise<TribulationStatus['foundation']> {
    const config = TRIBULATION_CONFIG.FOUNDATION
    const requiredItems: { itemId: string; name: string; required: number; owned: number }[] = []

    for (const item of config.REQUIRED_ITEMS) {
      const owned = await inventoryService.getItemQuantity(character.id, item.itemId)
      requiredItems.push({
        itemId: item.itemId,
        name: item.name,
        required: item.quantity,
        owned,
      })
    }

    const hasRequiredItems = requiredItems.every((item) => item.owned >= item.required)
    const isCorrectRealm = tier === config.REQUIRED_TIER && subTier === config.REQUIRED_SUB_TIER

    let reason: string | undefined
    if (!isCorrectRealm) {
      reason = `需要炼气圆满才能渡筑基之劫`
    } else if (!hasRequiredItems) {
      reason = '缺少筑基丹'
    }

    return {
      canAttempt: isCorrectRealm && hasRequiredItems,
      hasRequiredItems,
      requiredItems,
      reason,
    }
  }

  /**
   * 检查结丹之劫条件
   */
  private async checkCoreFormationTribulation(
    character: Character,
    tier: number,
    subTier: number
  ): Promise<TribulationStatus['coreFormation']> {
    const config = TRIBULATION_CONFIG.CORE_FORMATION
    const requiredItems: { itemId: string; name: string; required: number; owned: number }[] = []

    for (const item of config.REQUIRED_ITEMS) {
      const owned = await inventoryService.getItemQuantity(character.id, item.itemId)
      requiredItems.push({
        itemId: item.itemId,
        name: item.name,
        required: item.quantity,
        owned,
      })
    }

    const hasRequiredItems = requiredItems.every((item) => item.owned >= item.required)
    const isCorrectRealm = tier === config.REQUIRED_TIER && subTier === config.REQUIRED_SUB_TIER

    let reason: string | undefined
    if (!isCorrectRealm) {
      reason = `需要筑基圆满才能渡结丹之劫`
    } else if (!hasRequiredItems) {
      const missing = requiredItems.filter((i) => i.owned < i.required).map((i) => i.name)
      reason = `缺少: ${missing.join('、')}`
    }

    return {
      canAttempt: isCorrectRealm && hasRequiredItems,
      hasRequiredItems,
      requiredItems,
      successRate: config.BASE_SUCCESS_RATE * 100,
      reason,
    }
  }

  /**
   * 检查元婴之劫条件
   */
  private async checkNascentSoulTribulation(
    character: Character,
    tier: number,
    subTier: number
  ): Promise<TribulationStatus['nascentSoul']> {
    const config = TRIBULATION_CONFIG.NASCENT_SOUL
    const requiredItems: { itemId: string; name: string; required: number; owned: number }[] = []

    for (const item of config.REQUIRED_ITEMS) {
      const owned = await inventoryService.getItemQuantity(character.id, item.itemId)
      requiredItems.push({
        itemId: item.itemId,
        name: item.name,
        required: item.quantity,
        owned,
      })
    }

    const hasRequiredItems = requiredItems.every((item) => item.owned >= item.required)
    const isCorrectRealm = tier === config.REQUIRED_TIER && subTier === config.REQUIRED_SUB_TIER

    let reason: string | undefined
    if (!isCorrectRealm) {
      reason = `需要结丹圆满才能渡元婴之劫`
    } else if (!hasRequiredItems) {
      const missing = requiredItems.filter((i) => i.owned < i.required).map((i) => i.name)
      reason = `缺少: ${missing.join('、')}`
    }

    return {
      canAttempt: isCorrectRealm && hasRequiredItems,
      hasRequiredItems,
      requiredItems,
      successRate: config.BASE_SUCCESS_RATE * 100,
      reason,
    }
  }

  /**
   * 尝试筑基之劫
   * 有筑基丹时100%成功，无筑基丹无法尝试
   */
  async attemptFoundationTribulation(characterId: string): Promise<TribulationResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm'],
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    const config = TRIBULATION_CONFIG.FOUNDATION
    const tier = character.realm?.tier || 1
    const subTier = character.realm?.subTier || 1

    // 检查境界
    if (tier !== config.REQUIRED_TIER || subTier !== config.REQUIRED_SUB_TIER) {
      throw new Error('需要炼气圆满才能渡筑基之劫')
    }

    // 检查物品
    const hasItems = await inventoryService.hasItems(
      characterId,
      config.REQUIRED_ITEMS.map((i) => ({ itemId: i.itemId, quantity: i.quantity }))
    )

    if (!hasItems) {
      throw new Error('缺少筑基丹')
    }

    // 消耗物品
    await inventoryService.removeItems(
      characterId,
      config.REQUIRED_ITEMS.map((i) => ({ itemId: i.itemId, quantity: i.quantity }))
    )

    // 筑基丹100%成功
    const success = true

    // 获取新境界（筑基初期）
    const newRealm = await realmRepository.findOne({
      where: { tier: 2, subTier: 1 },
    })

    if (!newRealm) {
      throw new Error('境界配置错误')
    }

    // 创建渡劫记录
    const record = tribulationRepository.create({
      characterId: character.id,
      characterName: character.name,
      userId: character.userId,
      tribulationType: TRIBULATION_TYPES.FOUNDATION,
      success,
      consumedItems: config.REQUIRED_ITEMS.map((i) => ({
        itemId: i.itemId,
        quantity: i.quantity,
        name: i.name,
      })),
      originalTier: tier,
      originalSubTier: subTier,
      originalRealmId: character.realmId,
      originalRealmName: character.realm?.name || '未知',
      attemptedAt: Date.now(),
    })

    await tribulationRepository.save(record)

    // 更新角色境界
    character.realmId = newRealm.id
    character.realmProgress = 0
    await characterRepository.save(character)

    // 广播消息
    const io = getIO()
    if (io) {
      broadcastToWorld(io, 'tribulation:result', {
        characterName: character.name,
        type: '筑基之劫',
        success: true,
        newRealm: newRealm.name,
      })
    }

    return {
      success: true,
      type: TRIBULATION_TYPES.FOUNDATION,
      message: `恭喜！${character.name}成功渡过筑基之劫，踏入${newRealm.name}！`,
      newRealm: {
        id: newRealm.id,
        name: newRealm.name,
        tier: newRealm.tier,
        subTier: newRealm.subTier,
      },
    }
  }

  /**
   * 尝试结丹之劫
   * 失败会导致角色死亡
   */
  async attemptCoreFormationTribulation(characterId: string): Promise<TribulationResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm'],
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    const config = TRIBULATION_CONFIG.CORE_FORMATION
    const tier = character.realm?.tier || 1
    const subTier = character.realm?.subTier || 1

    // 检查境界
    if (tier !== config.REQUIRED_TIER || subTier !== config.REQUIRED_SUB_TIER) {
      throw new Error('需要筑基圆满才能渡结丹之劫')
    }

    // 检查物品
    const hasItems = await inventoryService.hasItems(
      characterId,
      config.REQUIRED_ITEMS.map((i) => ({ itemId: i.itemId, quantity: i.quantity }))
    )

    if (!hasItems) {
      const missing = []
      for (const item of config.REQUIRED_ITEMS) {
        const owned = await inventoryService.getItemQuantity(characterId, item.itemId)
        if (owned < item.quantity) {
          missing.push(item.name)
        }
      }
      throw new Error(`缺少: ${missing.join('、')}`)
    }

    // 保存背包快照（在消耗物品前）
    const inventorySnapshot = await inventoryItemRepository.find({
      where: { characterId },
      select: ['itemId', 'quantity'],
    })

    // 消耗物品
    await inventoryService.removeItems(
      characterId,
      config.REQUIRED_ITEMS.map((i) => ({ itemId: i.itemId, quantity: i.quantity }))
    )

    // 判定成功率
    const success = Math.random() < config.BASE_SUCCESS_RATE

    // 创建角色快照（用于回溯，包含背包）
    const characterSnapshot = JSON.stringify({
      name: character.name,
      spiritRootId: character.spiritRootId,
      level: character.level,
      experience: Number(character.experience),
      spiritStones: Number(character.spiritStones),
      realmId: character.realmId,
      realmProgress: character.realmProgress,
      attack: character.attack,
      defense: character.defense,
      speed: character.speed,
      luck: character.luck,
      maxHp: character.maxHp,
      maxMp: character.maxMp,
      sectId: character.sectId,
      sectRank: character.sectRank,
      sectContribution: character.sectContribution,
      inventoryCapacity: character.inventoryCapacity,
      learnedRecipesJson: character.learnedRecipesJson,
      learnedFormationsJson: character.learnedFormationsJson,
      // 背包快照（渡劫物品消耗前的状态）
      inventory: inventorySnapshot.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
      })),
    })

    // 创建渡劫记录
    const record = tribulationRepository.create({
      characterId: character.id,
      characterName: character.name,
      userId: character.userId,
      tribulationType: TRIBULATION_TYPES.CORE_FORMATION,
      success,
      consumedItems: config.REQUIRED_ITEMS.map((i) => ({
        itemId: i.itemId,
        quantity: i.quantity,
        name: i.name,
      })),
      originalTier: tier,
      originalSubTier: subTier,
      originalRealmId: character.realmId,
      originalRealmName: character.realm?.name || '未知',
      characterSnapshotJson: success ? null : characterSnapshot,
      attemptedAt: Date.now(),
    })

    await tribulationRepository.save(record)

    const io = getIO()

    if (success) {
      // 获取新境界（结丹初期）
      const newRealm = await realmRepository.findOne({
        where: { tier: 3, subTier: 1 },
      })

      if (!newRealm) {
        throw new Error('境界配置错误')
      }

      // 更新角色境界
      character.realmId = newRealm.id
      character.realmProgress = 0
      await characterRepository.save(character)

      // 广播消息
      if (io) {
        broadcastToWorld(io, 'tribulation:result', {
          characterName: character.name,
          type: '结丹之劫',
          success: true,
          newRealm: newRealm.name,
        })
      }

      return {
        success: true,
        type: TRIBULATION_TYPES.CORE_FORMATION,
        message: `恭喜！${character.name}成功渡过结丹之劫，结成金丹，踏入${newRealm.name}！`,
        newRealm: {
          id: newRealm.id,
          name: newRealm.name,
          tier: newRealm.tier,
          subTier: newRealm.subTier,
        },
      }
    } else {
      // 渡劫失败，角色死亡
      await this.deleteCharacter(character)

      // 广播消息
      if (io) {
        broadcastToWorld(io, 'tribulation:result', {
          characterName: character.name,
          type: '结丹之劫',
          success: false,
        })
      }

      return {
        success: false,
        type: TRIBULATION_TYPES.CORE_FORMATION,
        message: `${character.name}渡结丹之劫失败，形神俱灭...`,
        characterDied: true,
      }
    }
  }

  /**
   * 尝试元婴之劫
   * 失败会导致角色死亡
   */
  async attemptNascentSoulTribulation(characterId: string): Promise<TribulationResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm'],
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    const config = TRIBULATION_CONFIG.NASCENT_SOUL
    const tier = character.realm?.tier || 1
    const subTier = character.realm?.subTier || 1

    // 检查境界
    if (tier !== config.REQUIRED_TIER || subTier !== config.REQUIRED_SUB_TIER) {
      throw new Error('需要结丹圆满才能渡元婴之劫')
    }

    // 检查物品
    const hasItems = await inventoryService.hasItems(
      characterId,
      config.REQUIRED_ITEMS.map((i) => ({ itemId: i.itemId, quantity: i.quantity }))
    )

    if (!hasItems) {
      const missing = []
      for (const item of config.REQUIRED_ITEMS) {
        const owned = await inventoryService.getItemQuantity(characterId, item.itemId)
        if (owned < item.quantity) {
          missing.push(item.name)
        }
      }
      throw new Error(`缺少: ${missing.join('、')}`)
    }

    // 保存背包快照（在消耗物品前）
    const inventorySnapshot = await inventoryItemRepository.find({
      where: { characterId },
      select: ['itemId', 'quantity'],
    })

    // 消耗物品
    await inventoryService.removeItems(
      characterId,
      config.REQUIRED_ITEMS.map((i) => ({ itemId: i.itemId, quantity: i.quantity }))
    )

    // 判定成功率
    const success = Math.random() < config.BASE_SUCCESS_RATE

    // 创建角色快照（用于回溯，包含背包）
    const characterSnapshot = JSON.stringify({
      name: character.name,
      spiritRootId: character.spiritRootId,
      level: character.level,
      experience: Number(character.experience),
      spiritStones: Number(character.spiritStones),
      realmId: character.realmId,
      realmProgress: character.realmProgress,
      attack: character.attack,
      defense: character.defense,
      speed: character.speed,
      luck: character.luck,
      maxHp: character.maxHp,
      maxMp: character.maxMp,
      sectId: character.sectId,
      sectRank: character.sectRank,
      sectContribution: character.sectContribution,
      inventoryCapacity: character.inventoryCapacity,
      learnedRecipesJson: character.learnedRecipesJson,
      learnedFormationsJson: character.learnedFormationsJson,
      // 背包快照（渡劫物品消耗前的状态）
      inventory: inventorySnapshot.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
      })),
    })

    // 创建渡劫记录
    const record = tribulationRepository.create({
      characterId: character.id,
      characterName: character.name,
      userId: character.userId,
      tribulationType: TRIBULATION_TYPES.NASCENT_SOUL,
      success,
      consumedItems: config.REQUIRED_ITEMS.map((i) => ({
        itemId: i.itemId,
        quantity: i.quantity,
        name: i.name,
      })),
      originalTier: tier,
      originalSubTier: subTier,
      originalRealmId: character.realmId,
      originalRealmName: character.realm?.name || '未知',
      characterSnapshotJson: success ? null : characterSnapshot,
      attemptedAt: Date.now(),
    })

    await tribulationRepository.save(record)

    const io = getIO()

    if (success) {
      // 获取新境界（元婴初期）
      const newRealm = await realmRepository.findOne({
        where: { tier: 4, subTier: 1 },
      })

      if (!newRealm) {
        throw new Error('境界配置错误')
      }

      // 更新角色境界
      character.realmId = newRealm.id
      character.realmProgress = 0
      await characterRepository.save(character)

      // 广播消息
      if (io) {
        broadcastToWorld(io, 'tribulation:result', {
          characterName: character.name,
          type: '元婴之劫',
          success: true,
          newRealm: newRealm.name,
        })
      }

      return {
        success: true,
        type: TRIBULATION_TYPES.NASCENT_SOUL,
        message: `恭喜！${character.name}成功渡过元婴之劫，元婴出窍，踏入${newRealm.name}！`,
        newRealm: {
          id: newRealm.id,
          name: newRealm.name,
          tier: newRealm.tier,
          subTier: newRealm.subTier,
        },
      }
    } else {
      // 渡劫失败，角色死亡
      await this.deleteCharacter(character)

      // 广播消息
      if (io) {
        broadcastToWorld(io, 'tribulation:result', {
          characterName: character.name,
          type: '元婴之劫',
          success: false,
        })
      }

      return {
        success: false,
        type: TRIBULATION_TYPES.NASCENT_SOUL,
        message: `${character.name}渡元婴之劫失败，形神俱灭...`,
        characterDied: true,
      }
    }
  }

  /**
   * 删除角色（渡劫失败）
   * 清理所有关联数据，保留历史记录（TribulationRecord、WorldEvent）
   */
  private async deleteCharacter(character: Character): Promise<void> {
    const characterId = character.id

    // 并行删除所有关联数据
    await Promise.all([
      // 背包物品
      inventoryItemRepository.delete({ characterId }),
      // 药园
      herbGardenPlotRepository.delete({ characterId }),
      // 星盘
      starDiskRepository.delete({ characterId }),
      // 道侣
      consortRepository.delete({ characterId }),
      // 灵兽
      spiritBeastRepository.delete({ characterId }),
      // 灵烟贡献
      lingyanContributionRepository.delete({ characterId }),
      // 元婴
      nascentSoulRepository.delete({ characterId }),
      // 木人桩记录
      woodenDummyRecordRepository.delete({ characterId }),
      // 封魔塔记录
      towerRecordRepository.delete({ characterId }),
    ])

    // 删除角色本身
    await characterRepository.remove(character)

    console.log(`[Tribulation] 角色 ${character.name} 渡劫失败，已删除角色及所有关联数据`)
  }

  /**
   * 管理员天机回溯
   */
  async rollbackTribulation(recordId: string, adminId: string): Promise<{ success: boolean; message: string }> {
    const record = await tribulationRepository.findOne({
      where: { id: recordId },
    })

    if (!record) {
      throw new Error('渡劫记录不存在')
    }

    if (record.success) {
      throw new Error('渡劫成功的记录无法回溯')
    }

    if (record.rolledBack) {
      throw new Error('该记录已经回溯过')
    }

    // 检查时限
    const now = Date.now()
    if (now - record.attemptedAt > ROLLBACK_CONFIG.TIME_LIMIT) {
      throw new Error('已超过回溯时限（7天）')
    }

    // 检查角色快照
    if (!record.characterSnapshotJson) {
      throw new Error('没有角色快照，无法回溯')
    }

    const snapshot = JSON.parse(record.characterSnapshotJson)

    // 检查用户是否已有角色
    const existingCharacter = await characterRepository.findOne({
      where: { userId: record.userId },
    })

    if (existingCharacter) {
      throw new Error('该用户已有新角色，无法回溯')
    }

    // 检查角色名是否被占用
    const nameExists = await characterRepository.findOne({
      where: { name: snapshot.name },
    })

    if (nameExists) {
      throw new Error('角色名已被占用，无法回溯')
    }

    // 创建新角色
    const newCharacter = characterRepository.create({
      userId: record.userId,
      name: snapshot.name,
      spiritRootId: snapshot.spiritRootId,
      level: snapshot.level,
      experience: snapshot.experience,
      spiritStones: snapshot.spiritStones,
      realmId: snapshot.realmId,
      realmProgress: snapshot.realmProgress,
      attack: snapshot.attack,
      defense: snapshot.defense,
      speed: snapshot.speed,
      luck: snapshot.luck,
      hp: snapshot.maxHp,
      maxHp: snapshot.maxHp,
      mp: snapshot.maxMp,
      maxMp: snapshot.maxMp,
      sectId: snapshot.sectId,
      sectRank: snapshot.sectRank,
      sectContribution: snapshot.sectContribution,
      inventoryCapacity: snapshot.inventoryCapacity,
      learnedRecipesJson: snapshot.learnedRecipesJson,
      learnedFormationsJson: snapshot.learnedFormationsJson,
    })

    await characterRepository.save(newCharacter)

    // 恢复背包（如果快照中有背包数据）
    if (snapshot.inventory && Array.isArray(snapshot.inventory)) {
      // 恢复完整背包
      for (const item of snapshot.inventory) {
        if (item.itemId && item.quantity > 0) {
          await inventoryService.addItem(newCharacter.id, item.itemId, item.quantity)
        }
      }
      console.log(`[Tribulation] 已恢复 ${snapshot.inventory.length} 种物品到背包`)
    } else {
      // 兼容旧记录：只返还消耗的物品
      for (const item of record.consumedItems) {
        await inventoryService.addItem(newCharacter.id, item.itemId, item.quantity)
      }
      console.log(`[Tribulation] 旧记录格式，仅返还渡劫消耗物品`)
    }

    // 更新回溯记录
    record.rolledBack = true
    record.rolledBackBy = adminId
    record.rolledBackAt = now
    await tribulationRepository.save(record)

    console.log(`[Tribulation] 管理员 ${adminId} 对角色 ${snapshot.name} 执行了天机回溯`)

    return {
      success: true,
      message: `天机回溯成功！角色 ${snapshot.name} 已恢复，背包物品已还原`,
    }
  }

  /**
   * 获取渡劫记录
   */
  async getRecords(options?: {
    characterId?: string
    userId?: string
    success?: boolean
    limit?: number
  }): Promise<TribulationRecord[]> {
    const { characterId, userId, success, limit = 50 } = options || {}

    const query = tribulationRepository.createQueryBuilder('record')

    if (characterId) {
      query.andWhere('record.characterId = :characterId', { characterId })
    }

    if (userId) {
      query.andWhere('record.userId = :userId', { userId })
    }

    if (success !== undefined) {
      query.andWhere('record.success = :success', { success })
    }

    return await query.orderBy('record.attemptedAt', 'DESC').take(limit).getMany()
  }

  /**
   * 获取可回溯的失败记录（管理员用）
   */
  async getFailedRecordsForRollback(limit: number = 50): Promise<TribulationRecord[]> {
    const timeLimit = Date.now() - ROLLBACK_CONFIG.TIME_LIMIT

    return await tribulationRepository
      .createQueryBuilder('record')
      .where('record.success = false')
      .andWhere('record.rolledBack = false')
      .andWhere('record.attemptedAt > :timeLimit', { timeLimit })
      .orderBy('record.attemptedAt', 'DESC')
      .take(limit)
      .getMany()
  }
}

export const tribulationService = new TribulationService()
