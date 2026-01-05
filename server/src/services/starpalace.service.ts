/**
 * 星宫宗门专属系统服务 - 道心侍妾、周天星斗大阵、星衍天机、牵星引灵之术
 */
import { AppDataSource } from '../config/database'
import { windThunderWingsService } from './fengxi.service'
import { EntityManager } from 'typeorm'
import { Character } from '../models/Character'
import { Consort } from '../models/Consort'
import { StarDisk } from '../models/StarDisk'
import { StarArray } from '../models/StarArray'
import {
  STAR_PALACE_SECT_ID,
  isStarPalaceMember,
  CONSORT_TEMPLATES,
  CONSORT_CONFIG,
  AFFECTION_LEVELS,
  getAffectionLevel,
  getRandomConsortTemplateId,
  STAR_TYPES,
  STAR_DISK_EVENTS,
  STAR_DISK_EXPANSION,
  calculateDiskExpansionCost,
  STAR_ARRAY_CONFIG,
  checkArrayCooldown,
  STARGAZE_RESULTS,
  STARGAZE_CONFIG,
  generateStargazeResult,
  checkStargazeCooldown,
  checkChangeFateCooldown,
  formatTimeRemaining,
  THUNDER_STAR_DROP_CONFIG,
  type ConsortTemplate,
  type StarType,
  type StarDiskEventType,
  type StargazeResultType
} from '../game/constants/starpalace'
import { inventoryService } from './inventory.service'
import { ERROR_CODES } from '../utils/errorCodes'

const characterRepository = AppDataSource.getRepository(Character)
const consortRepository = AppDataSource.getRepository(Consort)
const starDiskRepository = AppDataSource.getRepository(StarDisk)
const starArrayRepository = AppDataSource.getRepository(StarArray)

// ==================== 接口定义 ====================

export interface StarPalaceStatus {
  isStarPalaceMember: boolean
  consort: ConsortStatus | null
  observatory: ObservatoryStatus | null
  array: ArrayStatus | null
  stargaze: StargazeStatus | null
}

export interface ConsortStatus {
  id: string
  consortId: string
  name: string
  title: string
  personality: string
  affection: number
  affectionLevel: { level: number; name: string; bonus: number }
  level: number
  specialSkill: ConsortTemplate['specialSkill']
  assignedDiskIndex: number | null
  canGreet: boolean
  greetCooldownRemaining: number
  spiritFeedbackActive: boolean
  spiritFeedbackExpiresAt: number | null
}

export interface ObservatoryStatus {
  disksUnlocked: number
  maxDisks: number
  expansionCost: number
  disks: DiskStatus[]
}

export interface DiskStatus {
  id: string
  diskIndex: number
  status: 'idle' | 'gathering' | 'ready' | 'event'
  starType: string | null
  starTypeName: string | null
  startedAt: number | null
  readyAt: number | null
  remainingTime: number
  progress: number
  eventType: StarDiskEventType
  eventName: string | null
  hasConsortBonus: boolean
}

export interface ArrayStatus {
  canInitiate: boolean
  cooldownRemaining: number
  hasActiveBuff: boolean
  buffExpiresAt: number | null
  buffRemaining: number
  isInitiator: boolean
  activeArrays: ActiveArrayInfo[]
}

export interface ActiveArrayInfo {
  id: string
  initiatorId: string
  initiatorName: string
  startedAt: number
  expiresAt: number
  remainingTime: number
  participantCount: number
  maxParticipants: number
  canJoin: boolean
  alreadyJoined: boolean
}

export interface StargazeStatus {
  canStargaze: boolean
  cooldownRemaining: number
  todayResult: {
    type: StargazeResultType
    name: string
    description: string
    bonus?: { cultivation?: number; dropRate?: number }
    penalty?: { cultivation?: number; eventChance?: number }
  } | null
  canChangeFate: boolean
  changeFateCost: number
  changeFateCooldownRemaining: number
}

// ==================== 服务类 ====================

class StarPalaceService {
  /**
   * 验证是否为星宫弟子
   */
  private async validateMember(characterId: string): Promise<Character> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    if (!isStarPalaceMember(character.sectId)) {
      throw { code: ERROR_CODES.STAR_NOT_STAR_PALACE, message: '只有星宫弟子才能使用此功能' }
    }

    return character
  }

  /**
   * 获取星宫系统完整状态
   */
  async getStatus(characterId: string): Promise<StarPalaceStatus> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    if (!isStarPalaceMember(character.sectId)) {
      return {
        isStarPalaceMember: false,
        consort: null,
        observatory: null,
        array: null,
        stargaze: null
      }
    }

    // 获取各个子系统状态
    const [consort, observatory, array, stargaze] = await Promise.all([
      this.getConsortStatus(characterId),
      this.getObservatoryStatus(characterId),
      this.getArrayStatus(characterId),
      this.getStargazeStatus(characterId)
    ])

    return {
      isStarPalaceMember: true,
      consort,
      observatory,
      array,
      stargaze
    }
  }

  // ==================== 侍妾系统 ====================

  /**
   * 获取侍妾状态
   */
  async getConsortStatus(characterId: string): Promise<ConsortStatus | null> {
    let consort = await consortRepository.findOne({
      where: { characterId }
    })

    // 如果没有侍妾，自动分配一个（入门时）
    if (!consort) {
      consort = await this.initializeConsort(characterId)
    }

    if (!consort) return null

    const template = CONSORT_TEMPLATES[consort.consortId]
    if (!template) return null

    const now = Date.now()
    const lastGreetingTime = consort.lastGreetingTime ? Number(consort.lastGreetingTime) : null
    const greetCooldownMs = CONSORT_CONFIG.greetingCooldownHours * 60 * 60 * 1000
    const canGreet = !lastGreetingTime || now - lastGreetingTime >= greetCooldownMs
    const greetCooldownRemaining = lastGreetingTime ? Math.max(0, greetCooldownMs - (now - lastGreetingTime)) : 0

    const spiritFeedbackExpiresAt = consort.spiritFeedbackExpiresAt ? Number(consort.spiritFeedbackExpiresAt) : null
    const spiritFeedbackActive = spiritFeedbackExpiresAt ? now < spiritFeedbackExpiresAt : false

    return {
      id: consort.id,
      consortId: consort.consortId,
      name: consort.name,
      title: template.title,
      personality: template.personality,
      affection: consort.affection,
      affectionLevel: getAffectionLevel(consort.affection),
      level: consort.level,
      specialSkill: template.specialSkill,
      assignedDiskIndex: consort.assignedDiskIndex,
      canGreet,
      greetCooldownRemaining,
      spiritFeedbackActive,
      spiritFeedbackExpiresAt
    }
  }

  /**
   * 初始化侍妾（入门时自动分配）
   */
  private async initializeConsort(characterId: string): Promise<Consort | null> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character || !isStarPalaceMember(character.sectId)) {
      return null
    }

    // 随机选择一个侍妾模板
    const consortId = getRandomConsortTemplateId()
    const template = CONSORT_TEMPLATES[consortId]
    if (!template) return null

    const consort = consortRepository.create({
      characterId,
      consortId,
      name: template.name,
      affection: 0,
      level: 1,
      assignedDiskIndex: null,
      lastGreetingTime: null
    })

    return await consortRepository.save(consort)
  }

  /**
   * 每日问安
   */
  async greetConsort(characterId: string): Promise<{ success: boolean; affectionGained: number; newAffection: number; message: string }> {
    await this.validateMember(characterId)

    const consort = await consortRepository.findOne({ where: { characterId } })
    if (!consort) {
      throw { code: ERROR_CODES.STAR_CONSORT_NOT_FOUND, message: '侍妾不存在' }
    }

    const now = Date.now()
    const lastGreetingTime = consort.lastGreetingTime ? Number(consort.lastGreetingTime) : null
    const cooldownMs = CONSORT_CONFIG.greetingCooldownHours * 60 * 60 * 1000

    if (lastGreetingTime && now - lastGreetingTime < cooldownMs) {
      const remaining = formatTimeRemaining(cooldownMs - (now - lastGreetingTime))
      throw { code: ERROR_CODES.STAR_GREETING_COOLDOWN, message: `问安冷却中，${remaining}后可再次问安` }
    }

    const template = CONSORT_TEMPLATES[consort.consortId]
    const baseGain = template?.baseAffectionGain || CONSORT_CONFIG.greetingAffectionGain
    const newAffection = Math.min(CONSORT_CONFIG.maxAffection, consort.affection + baseGain)

    consort.affection = newAffection
    consort.lastGreetingTime = now
    await consortRepository.save(consort)

    return {
      success: true,
      affectionGained: baseGain,
      newAffection,
      message: `${consort.name}对你嫣然一笑，好感度+${baseGain}`
    }
  }

  /**
   * 赠予侍妾（使用事务保护）
   */
  async giftConsort(
    characterId: string,
    amount: number
  ): Promise<{ success: boolean; costSpent: number; affectionGained: number; newAffection: number }> {
    // 先验证是否为星宫成员
    await this.validateMember(characterId)

    const cost = CONSORT_CONFIG.giftCostBase * amount
    const affectionGain = CONSORT_CONFIG.giftAffectionGain * amount

    // 使用事务确保赠予操作的原子性
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 获取角色（使用悲观锁）
      const character = await manager.findOne(Character, {
        where: { id: characterId },
        lock: { mode: 'pessimistic_write' }
      })
      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      // 获取侍妾（使用悲观锁）
      const consort = await manager.findOne(Consort, {
        where: { characterId },
        lock: { mode: 'pessimistic_write' }
      })
      if (!consort) {
        throw { code: ERROR_CODES.STAR_CONSORT_NOT_FOUND, message: '侍妾不存在' }
      }

      if (Number(character.spiritStones) < cost) {
        throw { code: ERROR_CODES.STAR_GIFT_NOT_ENOUGH, message: `灵石不足，需要${cost}灵石` }
      }

      const newAffection = Math.min(CONSORT_CONFIG.maxAffection, consort.affection + affectionGain)

      character.spiritStones = Number(character.spiritStones) - cost
      consort.affection = newAffection

      // 在事务中同时保存角色和侍妾
      await manager.save(Character, character)
      await manager.save(Consort, consort)

      return {
        success: true,
        costSpent: cost,
        affectionGained: affectionGain,
        newAffection
      }
    })
  }

  /**
   * 灵力反哺（使用事务保护）
   */
  async spiritFeedback(characterId: string): Promise<{ success: boolean; bonus: number; duration: number; expiresAt: number }> {
    // 先验证是否为星宫成员
    await this.validateMember(characterId)

    const cost = CONSORT_CONFIG.spiritFeedbackCost

    // 使用事务确保灵力反哺操作的原子性
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 获取角色（使用悲观锁）
      const character = await manager.findOne(Character, {
        where: { id: characterId },
        lock: { mode: 'pessimistic_write' }
      })
      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      // 获取侍妾（使用悲观锁）
      const consort = await manager.findOne(Consort, {
        where: { characterId },
        lock: { mode: 'pessimistic_write' }
      })
      if (!consort) {
        throw { code: ERROR_CODES.STAR_CONSORT_NOT_FOUND, message: '侍妾不存在' }
      }

      // 检查是否已有灵力反哺buff
      const now = Date.now()
      if (consort.spiritFeedbackExpiresAt && now < Number(consort.spiritFeedbackExpiresAt)) {
        throw { code: ERROR_CODES.STAR_SPIRIT_FEEDBACK_ACTIVE, message: '灵力反哺效果尚未结束' }
      }

      // 检查灵石
      if (Number(character.spiritStones) < cost) {
        throw { code: ERROR_CODES.STAR_GIFT_NOT_ENOUGH, message: `灵石不足，需要${cost}灵石` }
      }

      const expiresAt = now + CONSORT_CONFIG.spiritFeedbackDurationMs
      character.spiritStones = Number(character.spiritStones) - cost
      consort.spiritFeedbackExpiresAt = expiresAt

      // 在事务中同时保存角色和侍妾
      await manager.save(Character, character)
      await manager.save(Consort, consort)

      return {
        success: true,
        bonus: CONSORT_CONFIG.spiritFeedbackBonus,
        duration: CONSORT_CONFIG.spiritFeedbackDurationMs,
        expiresAt
      }
    })
  }

  /**
   * 派遣侍妾到引星盘（使用事务保护）
   */
  async assignConsortToDisk(characterId: string, diskIndex: number): Promise<void> {
    // 先验证是否为星宫成员
    await this.validateMember(characterId)

    // 使用事务确保派遣操作的原子性
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 获取侍妾（使用悲观锁）
      const consort = await manager.findOne(Consort, {
        where: { characterId },
        lock: { mode: 'pessimistic_write' }
      })
      if (!consort) {
        throw { code: ERROR_CODES.STAR_CONSORT_NOT_FOUND, message: '侍妾不存在' }
      }

      if (consort.assignedDiskIndex !== null) {
        throw { code: ERROR_CODES.STAR_CONSORT_ASSIGNED, message: '侍妾已被派遣，请先召回' }
      }

      // 获取引星盘（使用悲观锁）
      const disk = await manager.findOne(StarDisk, {
        where: { characterId, diskIndex },
        lock: { mode: 'pessimistic_write' }
      })
      if (!disk) {
        throw { code: ERROR_CODES.STAR_DISK_NOT_FOUND, message: '引星盘不存在' }
      }

      consort.assignedDiskIndex = diskIndex
      disk.assignedConsortId = consort.id

      // 在事务中同时保存侍妾和引星盘
      await manager.save(Consort, consort)
      await manager.save(StarDisk, disk)
    })
  }

  /**
   * 召回侍妾（使用事务保护）
   */
  async recallConsort(characterId: string): Promise<void> {
    // 先验证是否为星宫成员
    await this.validateMember(characterId)

    // 使用事务确保召回操作的原子性
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 获取侍妾（使用悲观锁）
      const consort = await manager.findOne(Consort, {
        where: { characterId },
        lock: { mode: 'pessimistic_write' }
      })
      if (!consort) {
        throw { code: ERROR_CODES.STAR_CONSORT_NOT_FOUND, message: '侍妾不存在' }
      }

      if (consort.assignedDiskIndex === null) {
        throw { code: ERROR_CODES.STAR_CONSORT_NOT_ASSIGNED, message: '侍妾未被派遣' }
      }

      // 获取引星盘（使用悲观锁）
      const disk = await manager.findOne(StarDisk, {
        where: { characterId, diskIndex: consort.assignedDiskIndex },
        lock: { mode: 'pessimistic_write' }
      })

      if (disk) {
        disk.assignedConsortId = null
        await manager.save(StarDisk, disk)
      }

      consort.assignedDiskIndex = null
      await manager.save(Consort, consort)
    })
  }

  // ==================== 观星台系统 ====================

  /**
   * 获取观星台状态
   */
  async getObservatoryStatus(characterId: string): Promise<ObservatoryStatus> {
    const character = await characterRepository.findOne({ where: { id: characterId } })
    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    // 确保引星盘已初始化
    let disks = await starDiskRepository.find({
      where: { characterId },
      order: { diskIndex: 'ASC' }
    })

    if (disks.length === 0) {
      disks = await this.initializeDisks(characterId)
    }

    const disksUnlocked = character.starDisksUnlocked || STAR_DISK_EXPANSION.initialDisks
    const now = Date.now()

    // 收集需要保存的盘位
    const disksToSave: StarDisk[] = []

    const diskStatuses: DiskStatus[] = disks
      .filter(d => d.diskIndex < disksUnlocked)
      .map(disk => {
        const starTypeInfo = disk.starType ? STAR_TYPES[disk.starType] : null
        const readyAt = disk.readyAt ? Number(disk.readyAt) : null
        const startedAt = disk.startedAt ? Number(disk.startedAt) : null

        let remainingTime = 0
        let progress = 0

        if (disk.status === 'gathering' && readyAt && startedAt) {
          remainingTime = Math.max(0, readyAt - now)
          const totalTime = readyAt - startedAt
          progress = totalTime > 0 ? Math.min(100, ((now - startedAt) / totalTime) * 100) : 0

          // 自动转换状态
          if (remainingTime === 0) {
            disk.status = 'ready'
            disksToSave.push(disk)
          }
        }

        return {
          id: disk.id,
          diskIndex: disk.diskIndex,
          status: disk.status,
          starType: disk.starType,
          starTypeName: starTypeInfo?.name || null,
          startedAt,
          readyAt,
          remainingTime,
          progress,
          eventType: disk.eventType,
          eventName: disk.eventType !== 'none' ? STAR_DISK_EVENTS[disk.eventType].name : null,
          hasConsortBonus: disk.hasConsortBonus
        }
      })

    // 批量保存需要更新的盘位
    if (disksToSave.length > 0) {
      await starDiskRepository.save(disksToSave)
    }

    return {
      disksUnlocked,
      maxDisks: STAR_DISK_EXPANSION.maxDisks,
      expansionCost: calculateDiskExpansionCost(disksUnlocked),
      disks: diskStatuses
    }
  }

  /**
   * 初始化引星盘
   */
  private async initializeDisks(characterId: string): Promise<StarDisk[]> {
    const disks: StarDisk[] = []

    for (let i = 0; i < STAR_DISK_EXPANSION.maxDisks; i++) {
      const disk = starDiskRepository.create({
        characterId,
        diskIndex: i,
        status: 'idle',
        starType: null,
        startedAt: null,
        readyAt: null,
        eventType: 'none',
        eventStartAt: null,
        assignedConsortId: null,
        hasConsortBonus: false
      })
      disks.push(disk)
    }

    return await starDiskRepository.save(disks)
  }

  /**
   * 开始凝聚星辰
   */
  async startGathering(characterId: string, diskIndex: number, starType: string): Promise<{ success: boolean; readyAt: number }> {
    const character = await this.validateMember(characterId)

    // 验证星辰类型
    const starTypeInfo = STAR_TYPES[starType]
    if (!starTypeInfo) {
      throw { code: ERROR_CODES.STAR_INVALID_STAR_TYPE, message: '无效的星辰类型' }
    }

    // 验证引星盘
    const disk = await starDiskRepository.findOne({
      where: { characterId, diskIndex }
    })

    if (!disk) {
      throw { code: ERROR_CODES.STAR_DISK_NOT_FOUND, message: '引星盘不存在' }
    }

    if (diskIndex >= (character.starDisksUnlocked || STAR_DISK_EXPANSION.initialDisks)) {
      throw { code: ERROR_CODES.STAR_DISK_LOCKED, message: '引星盘未解锁' }
    }

    if (disk.status !== 'idle') {
      throw { code: ERROR_CODES.STAR_DISK_NOT_IDLE, message: '引星盘非空闲状态' }
    }

    if (disk.eventType !== 'none') {
      throw { code: ERROR_CODES.STAR_DISK_HAS_EVENT, message: '请先处理引星盘事件' }
    }

    // 检查是否有侍妾派遣
    const consort = await consortRepository.findOne({ where: { characterId } })
    const hasConsortBonus = consort?.assignedDiskIndex === diskIndex

    const now = Date.now()
    const baseDurationMs = starTypeInfo.durationHours * 60 * 60 * 1000
    // 风雷翅效率提升：减少凝聚时间
    const efficiencyBoost = await windThunderWingsService.getEfficiencyBoost(characterId, 'starPlatform')
    const durationMs = Math.floor(baseDurationMs * (1 - efficiencyBoost))
    const readyAt = now + durationMs

    disk.status = 'gathering'
    disk.starType = starType
    disk.startedAt = now
    disk.readyAt = readyAt
    disk.hasConsortBonus = hasConsortBonus

    // 随机触发事件
    if (Math.random() < starTypeInfo.eventChance) {
      disk.eventType = Math.random() < 0.5 ? 'dim' : 'chaos'
      disk.eventStartAt = now
      disk.status = 'event'
    }

    await starDiskRepository.save(disk)

    return { success: true, readyAt }
  }

  /**
   * 收集引星盘产出
   */
  async collectDisk(
    characterId: string,
    diskIndex: number
  ): Promise<{ success: boolean; itemId: string; quantity: number; specialDrop?: { itemId: string; quantity: number } | null }> {
    await this.validateMember(characterId)

    const disk = await starDiskRepository.findOne({
      where: { characterId, diskIndex }
    })

    if (!disk) {
      throw { code: ERROR_CODES.STAR_DISK_NOT_FOUND, message: '引星盘不存在' }
    }

    // 检查是否有事件未处理
    if (disk.eventType !== 'none') {
      throw { code: ERROR_CODES.STAR_DISK_HAS_EVENT, message: '请先处理引星盘事件' }
    }

    // 检查是否已完成
    const now = Date.now()
    const readyAt = disk.readyAt ? Number(disk.readyAt) : 0

    if (disk.status === 'gathering' && now >= readyAt) {
      disk.status = 'ready'
    }

    if (disk.status !== 'ready') {
      throw { code: ERROR_CODES.STAR_DISK_NOT_READY, message: '引星盘尚未完成凝聚' }
    }

    const starTypeInfo = disk.starType ? STAR_TYPES[disk.starType] : null
    if (!starTypeInfo) {
      throw { code: ERROR_CODES.STAR_INVALID_STAR_TYPE, message: '无效的星辰类型' }
    }

    // 计算产出
    let quantity = Math.floor(Math.random() * (starTypeInfo.yieldMax - starTypeInfo.yieldMin + 1)) + starTypeInfo.yieldMin

    // 侍妾加成
    if (disk.hasConsortBonus) {
      quantity = Math.ceil(quantity * (1 + STAR_DISK_EXPANSION.consortBonus))
    }

    // 保存星辰类型用于特殊掉落判断
    const collectedStarType = disk.starType

    // 重置引星盘
    disk.status = 'idle'
    disk.starType = null
    disk.startedAt = null
    disk.readyAt = null
    disk.hasConsortBonus = false

    await starDiskRepository.save(disk)

    // 添加基础产出物品到背包
    await inventoryService.addItem(characterId, starTypeInfo.yieldItemId, quantity)

    // 天雷星特殊掉落：雷鹏之羽
    let specialDrop: { itemId: string; quantity: number } | null = null
    if (collectedStarType === 'thunder_star') {
      // 获取角色境界检查
      const character = await characterRepository.findOne({
        where: { id: characterId },
        relations: ['realm']
      })
      const realmTier = character?.realm?.tier || 1

      if (realmTier >= THUNDER_STAR_DROP_CONFIG.minRealm && Math.random() < THUNDER_STAR_DROP_CONFIG.chance) {
        await inventoryService.addItem(characterId, THUNDER_STAR_DROP_CONFIG.itemId, 1)
        specialDrop = { itemId: THUNDER_STAR_DROP_CONFIG.itemId, quantity: 1 }
      }
    }

    return {
      success: true,
      itemId: starTypeInfo.yieldItemId,
      quantity,
      specialDrop
    }
  }

  /**
   * 处理引星盘事件（安抚星辰）
   */
  async handleDiskEvent(characterId: string, diskIndex: number): Promise<{ success: boolean; eventType: string }> {
    await this.validateMember(characterId)

    const disk = await starDiskRepository.findOne({
      where: { characterId, diskIndex }
    })

    if (!disk) {
      throw { code: ERROR_CODES.STAR_DISK_NOT_FOUND, message: '引星盘不存在' }
    }

    if (disk.eventType === 'none') {
      throw { code: ERROR_CODES.STAR_DISK_NO_EVENT, message: '无事件需处理' }
    }

    const eventType = disk.eventType

    // 清除事件，恢复凝聚状态
    disk.eventType = 'none'
    disk.eventStartAt = null
    disk.status = 'gathering'

    await starDiskRepository.save(disk)

    return { success: true, eventType }
  }

  /**
   * 扩展引星盘
   */
  async expandDisks(characterId: string): Promise<{ success: boolean; newCount: number; cost: number }> {
    const character = await this.validateMember(characterId)

    const currentCount = character.starDisksUnlocked || STAR_DISK_EXPANSION.initialDisks
    if (currentCount >= STAR_DISK_EXPANSION.maxDisks) {
      throw { code: ERROR_CODES.STAR_DISK_MAX, message: '已达最大引星盘数量' }
    }

    const cost = calculateDiskExpansionCost(currentCount)
    if (character.sectContribution < cost) {
      throw { code: ERROR_CODES.SECT_CONTRIBUTION_NOT_ENOUGH, message: `宗门贡献不足，需要${cost}贡献` }
    }

    character.sectContribution -= cost
    character.starDisksUnlocked = currentCount + 1

    await characterRepository.save(character)

    return {
      success: true,
      newCount: character.starDisksUnlocked,
      cost
    }
  }

  // ==================== 周天星斗大阵 ====================

  /**
   * 获取大阵状态
   */
  async getArrayStatus(characterId: string): Promise<ArrayStatus> {
    const character = await characterRepository.findOne({ where: { id: characterId } })
    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    const now = Date.now()
    const cooldown = checkArrayCooldown(character.lastStarArrayTime ? Number(character.lastStarArrayTime) : null)

    // 检查buff状态
    const buffExpiresAt = character.starArrayBuffExpiresAt ? Number(character.starArrayBuffExpiresAt) : null
    const hasActiveBuff = buffExpiresAt ? now < buffExpiresAt : false
    const buffRemaining = hasActiveBuff ? buffExpiresAt! - now : 0

    // 获取当前活跃的大阵
    const activeArrays = await starArrayRepository.find({
      where: { status: 'active' }
    })

    const activeArrayInfos: ActiveArrayInfo[] = activeArrays
      .filter(arr => Number(arr.expiresAt) > now)
      .map(arr => {
        const participants = arr.participants
        const alreadyJoined = participants.includes(characterId) || arr.initiatorId === characterId

        return {
          id: arr.id,
          initiatorId: arr.initiatorId,
          initiatorName: arr.initiatorName,
          startedAt: Number(arr.startedAt),
          expiresAt: Number(arr.expiresAt),
          remainingTime: Number(arr.expiresAt) - now,
          participantCount: participants.length + 1, // +1 for initiator
          maxParticipants: STAR_ARRAY_CONFIG.maxParticipants,
          canJoin: !alreadyJoined && participants.length < STAR_ARRAY_CONFIG.maxParticipants - 1,
          alreadyJoined
        }
      })

    return {
      canInitiate: cooldown.canUse,
      cooldownRemaining: cooldown.remainingMs,
      hasActiveBuff,
      buffExpiresAt,
      buffRemaining,
      isInitiator: character.isArrayInitiator,
      activeArrays: activeArrayInfos
    }
  }

  /**
   * 发起大阵（使用事务保护）
   */
  async initiateArray(characterId: string): Promise<{ success: boolean; arrayId: string; expiresAt: number }> {
    // 先验证是否为星宫成员
    await this.validateMember(characterId)

    // 使用事务确保发起大阵操作的原子性
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 获取角色（使用悲观锁）
      const character = await manager.findOne(Character, {
        where: { id: characterId },
        relations: ['realm'],
        lock: { mode: 'pessimistic_write' }
      })
      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      // 检查境界
      const realmTier = character.realm?.tier || 1
      if (realmTier < STAR_ARRAY_CONFIG.minRealm) {
        throw { code: ERROR_CODES.STAR_ARRAY_REALM_NOT_MET, message: '境界不足，需要筑基期以上' }
      }

      // 检查冷却
      const cooldown = checkArrayCooldown(character.lastStarArrayTime ? Number(character.lastStarArrayTime) : null)
      if (!cooldown.canUse) {
        throw { code: ERROR_CODES.STAR_ARRAY_COOLDOWN, message: `大阵冷却中，${formatTimeRemaining(cooldown.remainingMs)}后可用` }
      }

      const now = Date.now()
      const expiresAt = now + STAR_ARRAY_CONFIG.durationHours * 60 * 60 * 1000

      // 创建大阵
      const array = manager.create(StarArray, {
        initiatorId: characterId,
        initiatorName: character.name,
        status: 'active',
        startedAt: now,
        expiresAt,
        participantsJson: '[]',
        participantDetailsJson: '[]'
      })

      await manager.save(StarArray, array)

      // 更新角色状态
      character.lastStarArrayTime = now
      character.starArrayBuffExpiresAt = expiresAt
      character.isArrayInitiator = true

      await manager.save(Character, character)

      return {
        success: true,
        arrayId: array.id,
        expiresAt
      }
    })
  }

  /**
   * 加入大阵（使用事务保护）
   */
  async joinArray(characterId: string, arrayId: string): Promise<{ success: boolean; expiresAt: number }> {
    // 先验证是否为星宫成员
    await this.validateMember(characterId)

    // 使用事务确保加入大阵操作的原子性（包含悲观锁防止竞争条件）
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 获取角色（使用悲观锁）
      const character = await manager.findOne(Character, {
        where: { id: characterId },
        relations: ['realm'],
        lock: { mode: 'pessimistic_write' }
      })
      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      // 检查境界
      const realmTier = character.realm?.tier || 1
      if (realmTier < STAR_ARRAY_CONFIG.minRealm) {
        throw { code: ERROR_CODES.STAR_ARRAY_REALM_NOT_MET, message: '境界不足，需要筑基期以上' }
      }

      // 获取大阵（使用悲观锁防止并发加入超过人数上限）
      const array = await manager.findOne(StarArray, {
        where: { id: arrayId },
        lock: { mode: 'pessimistic_write' }
      })
      if (!array) {
        throw { code: ERROR_CODES.STAR_ARRAY_NOT_FOUND, message: '大阵不存在' }
      }

      const now = Date.now()
      if (array.status !== 'active' || Number(array.expiresAt) <= now) {
        throw { code: ERROR_CODES.STAR_ARRAY_EXPIRED, message: '大阵已结束' }
      }

      // 检查是否已加入
      const participants = array.participants
      if (array.initiatorId === characterId || participants.includes(characterId)) {
        throw { code: ERROR_CODES.STAR_ARRAY_ALREADY_JOINED, message: '已加入此大阵' }
      }

      // 检查人数（在悲观锁保护下检查，防止竞争条件）
      if (participants.length >= STAR_ARRAY_CONFIG.maxParticipants - 1) {
        throw { code: ERROR_CODES.STAR_ARRAY_FULL, message: '大阵人数已满' }
      }

      // 加入大阵
      array.participants = [...participants, characterId]
      array.participantDetails = [...array.participantDetails, { id: characterId, name: character.name, joinedAt: now }]

      await manager.save(StarArray, array)

      // 给予buff
      character.starArrayBuffExpiresAt = Number(array.expiresAt)
      character.isArrayInitiator = false

      await manager.save(Character, character)

      return {
        success: true,
        expiresAt: Number(array.expiresAt)
      }
    })
  }

  // ==================== 星衍天机 ====================

  /**
   * 获取观星状态
   */
  async getStargazeStatus(characterId: string): Promise<StargazeStatus> {
    const character = await characterRepository.findOne({ where: { id: characterId } })
    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    const now = Date.now()
    const stargazeCooldown = checkStargazeCooldown(character.lastStargazeTime ? Number(character.lastStargazeTime) : null)
    const changeFateCooldown = checkChangeFateCooldown(character.lastChangeFateTime ? Number(character.lastChangeFateTime) : null)

    // 检查今日是否已观星（同一天）
    const todayResult = character.stargazeResult
    let canStargaze = stargazeCooldown.canUse

    // 如果今天已经观星过，不能再观星
    if (todayResult && new Date(todayResult.generatedAt).toDateString() === new Date().toDateString()) {
      canStargaze = false
    }

    return {
      canStargaze,
      cooldownRemaining: stargazeCooldown.remainingMs,
      todayResult: todayResult
        ? {
            type: todayResult.type as StargazeResultType,
            name: todayResult.name,
            description: todayResult.description,
            bonus: todayResult.bonus,
            penalty: todayResult.penalty
          }
        : null,
      canChangeFate: changeFateCooldown.canUse && todayResult !== null,
      changeFateCost: STARGAZE_CONFIG.changeFateCost,
      changeFateCooldownRemaining: changeFateCooldown.remainingMs
    }
  }

  /**
   * 进行观星
   */
  async stargaze(characterId: string): Promise<{ success: boolean; result: (typeof STARGAZE_RESULTS)[StargazeResultType] }> {
    const character = await this.validateMember(characterId)

    // 检查冷却
    const cooldown = checkStargazeCooldown(character.lastStargazeTime ? Number(character.lastStargazeTime) : null)
    if (!cooldown.canUse) {
      throw { code: ERROR_CODES.STAR_GAZE_COOLDOWN, message: '今日已观星' }
    }

    // 检查是否今天已观星
    const todayResult = character.stargazeResult
    if (todayResult && new Date(todayResult.generatedAt).toDateString() === new Date().toDateString()) {
      throw { code: ERROR_CODES.STAR_GAZE_COOLDOWN, message: '今日已观星' }
    }

    const now = Date.now()
    const resultType = generateStargazeResult()
    const result = STARGAZE_RESULTS[resultType]

    character.lastStargazeTime = now
    character.stargazeResult = {
      type: resultType,
      name: result.name,
      description: result.description,
      bonus: result.bonus,
      penalty: result.penalty,
      generatedAt: now
    }

    await characterRepository.save(character)

    return { success: true, result }
  }

  /**
   * 改换星移（改变观星结果）
   */
  async changeFate(
    characterId: string
  ): Promise<{ success: boolean; oldResult: string; newResult: (typeof STARGAZE_RESULTS)[StargazeResultType] }> {
    const character = await this.validateMember(characterId)

    // 检查是否有观星结果
    const oldResult = character.stargazeResult
    if (!oldResult) {
      throw { code: ERROR_CODES.STAR_GAZE_COOLDOWN, message: '请先进行观星' }
    }

    // 检查改命冷却
    const cooldown = checkChangeFateCooldown(character.lastChangeFateTime ? Number(character.lastChangeFateTime) : null)
    if (!cooldown.canUse) {
      throw { code: ERROR_CODES.STAR_CHANGE_FATE_COOLDOWN, message: `改命冷却中，${formatTimeRemaining(cooldown.remainingMs)}后可用` }
    }

    // 检查灵石
    const cost = STARGAZE_CONFIG.changeFateCost
    if (Number(character.spiritStones) < cost) {
      throw { code: ERROR_CODES.STAR_GIFT_NOT_ENOUGH, message: `灵石不足，需要${cost}灵石` }
    }

    const now = Date.now()

    // 生成新结果（确保与旧结果不同）
    let newResultType = generateStargazeResult()
    while (newResultType === oldResult.type) {
      newResultType = generateStargazeResult()
    }
    const newResult = STARGAZE_RESULTS[newResultType]

    character.spiritStones = Number(character.spiritStones) - cost
    character.lastChangeFateTime = now
    character.stargazeResult = {
      type: newResultType,
      name: newResult.name,
      description: newResult.description,
      bonus: newResult.bonus,
      penalty: newResult.penalty,
      generatedAt: now
    }

    await characterRepository.save(character)

    return {
      success: true,
      oldResult: oldResult.name,
      newResult
    }
  }

  // ==================== 修炼系统集成 ====================

  /**
   * 获取星宫修炼加成（用于修炼系统）
   */
  async getCultivationBonus(characterId: string): Promise<{
    consortBonus: number
    spiritFeedbackBonus: number
    arrayBonus: { successRate: number; yieldBonus: number } | null
    stargazeBonus: { cultivation?: number; dropRate?: number } | null
  }> {
    const character = await characterRepository.findOne({ where: { id: characterId } })

    if (!character || !isStarPalaceMember(character.sectId)) {
      return {
        consortBonus: 0,
        spiritFeedbackBonus: 0,
        arrayBonus: null,
        stargazeBonus: null
      }
    }

    const now = Date.now()

    // 侍妾加成（红袖添香）
    const consort = await consortRepository.findOne({ where: { characterId } })
    const affectionLevel = consort ? getAffectionLevel(consort.affection) : null
    const consortBonus = affectionLevel ? affectionLevel.bonus : 0

    // 灵力反哺加成
    let spiritFeedbackBonus = 0
    if (consort?.spiritFeedbackExpiresAt && now < Number(consort.spiritFeedbackExpiresAt)) {
      spiritFeedbackBonus = CONSORT_CONFIG.spiritFeedbackBonus
    }

    // 大阵加成
    let arrayBonus: { successRate: number; yieldBonus: number } | null = null
    if (character.starArrayBuffExpiresAt && now < Number(character.starArrayBuffExpiresAt)) {
      if (character.isArrayInitiator) {
        arrayBonus = STAR_ARRAY_CONFIG.initiatorBonus
      } else {
        arrayBonus = STAR_ARRAY_CONFIG.participantBonus
      }
    }

    // 观星加成
    let stargazeBonus: { cultivation?: number; dropRate?: number } | null = null
    const todayResult = character.stargazeResult
    if (todayResult && new Date(todayResult.generatedAt).toDateString() === new Date().toDateString()) {
      stargazeBonus = todayResult.bonus || null
    }

    return {
      consortBonus,
      spiritFeedbackBonus,
      arrayBonus,
      stargazeBonus
    }
  }
}

export const starPalaceService = new StarPalaceService()
