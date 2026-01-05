/**
 * 血魂幡系统服务 - 黑煞教本命魔宝
 * 包含：血魂幡管理、煞气池、魂魄储备、炼化槽、PvE系统
 */
import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { BloodSoulBanner } from '../models/BloodSoulBanner'
import { RefinementSlot } from '../models/RefinementSlot'
import {
  BANNER_LEVEL_CONFIG,
  BANNER_MAX_LEVEL,
  BANNER_UPGRADE_MATERIAL,
  SOUL_TYPES,
  SHA_POOL_CONFIG,
  STABILITY_CONFIG,
  BLOOD_FOREST_CONFIG,
  SHADOW_SUMMON_CONFIG,
  PVP_SOUL_DROP_CONFIG,
  BLOOD_SOUL_BANNER_UNLOCK
} from '../game/constants/bloodSoulBanner'
import { HEISHA_SECT_ID, SHA_ENERGY_CONFIG } from '../game/constants/heisha'
import { ERROR_CODES } from '../utils/errorCodes'
import { inventoryService } from './inventory.service'

const characterRepository = AppDataSource.getRepository(Character)
const bannerRepository = AppDataSource.getRepository(BloodSoulBanner)
const slotRepository = AppDataSource.getRepository(RefinementSlot)

// ==================== 接口定义 ====================

export interface BannerStatus {
  level: number
  slots: number
  maxSoulGrade: number
  nextUpgradeCost: number | null
  canUpgrade: boolean
  upgradeProgress?: {
    current: number
    required: number
  }
}

export interface ShaPoolStatus {
  current: number
  max: number
  bonusPercent: number
  canSacrifice: boolean
  sacrificeCooldown: number
  dailyConverted: number
  dailyConvertLimit: number
}

export interface SoulStorageStatus {
  souls: Record<string, { count: number; name: string; grade: number }>
}

export interface RefinementSlotInfo {
  slotIndex: number
  status: 'empty' | 'refining' | 'complete'
  soulType: string | null
  soulName: string | null
  stability: number
  progress: number
  remainingMs: number
  canCollect: boolean
  needsMaintenance: boolean
}

export interface RefinementResult {
  success: boolean
  outputs: { itemId: string; itemName: string; quantity: number }[]
  message: string
}

export interface BloodForestStatus {
  canRaid: boolean
  dailyRemaining: number
  dailyLimit: number
  shaCost: number
  minRealm: number
}

export interface RaidResult {
  success: boolean
  victory: boolean
  enemy: { name: string; power: number }
  rewards: {
    spiritStones: number
    souls: { type: string; name: string; count: number }[]
    materials: { itemId: string; name: string; count: number }[]
  }
  message: string
}

export interface ShadowSummonStatus {
  canSummon: boolean
  dailyRemaining: number
  dailyLimit: number
  sacrificeRequired: { itemId: string; itemName: string; quantity: number }
  hasSacrifice: boolean
  minRealm: number
}

export interface SummonResult {
  success: boolean
  victory: boolean
  boss: { name: string; power: number }
  rewards: {
    spiritStones: number
    souls: { type: string; name: string; count: number }[]
    materials: { itemId: string; name: string; count: number }[]
  }
  message: string
}

// ==================== 服务类 ====================

class BloodSoulBannerService {
  // ==================== 验证方法 ====================

  /**
   * 验证是否为黑煞教弟子
   */
  private async validateHeishaMember(characterId: string): Promise<Character> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    if (character.sectId !== HEISHA_SECT_ID) {
      throw { code: ERROR_CODES.HEISHA_NOT_MEMBER, message: '只有黑煞教弟子才能使用血魂幡' }
    }

    return character
  }

  /**
   * 获取或创建血魂幡
   */
  private async getBanner(characterId: string): Promise<BloodSoulBanner | null> {
    return bannerRepository.findOne({ where: { characterId } })
  }

  /**
   * 获取炼化槽列表
   */
  private async getSlots(bannerId: string): Promise<RefinementSlot[]> {
    return slotRepository.find({
      where: { bannerId },
      order: { slotIndex: 'ASC' }
    })
  }

  // ==================== 血魂幡管理 ====================

  /**
   * 解锁血魂幡（筑基期自动调用）
   */
  async unlockBanner(characterId: string): Promise<void> {
    const character = await this.validateHeishaMember(characterId)

    if (character.hasBloodSoulBanner) {
      return // 已解锁
    }

    const realmTier = character.realm?.tier || 1
    if (realmTier < BLOOD_SOUL_BANNER_UNLOCK.minRealm) {
      throw { code: ERROR_CODES.PVP_REALM_TOO_LOW, message: '需要筑基期才能获得血魂幡' }
    }

    // 创建血魂幡
    const banner = bannerRepository.create({
      characterId,
      level: 1
    })
    await bannerRepository.save(banner)

    // 创建初始炼化槽
    const slot = slotRepository.create({
      bannerId: banner.id,
      slotIndex: 0,
      status: 'empty'
    })
    await slotRepository.save(slot)

    // 更新角色状态
    character.hasBloodSoulBanner = true
    await characterRepository.save(character)
  }

  /**
   * 获取血魂幡状态
   */
  async getBannerStatus(characterId: string): Promise<BannerStatus> {
    const character = await this.validateHeishaMember(characterId)

    if (!character.hasBloodSoulBanner) {
      throw { code: ERROR_CODES.HEISHA_BANNER_NOT_UNLOCKED, message: '尚未获得血魂幡' }
    }

    const banner = await this.getBanner(characterId)
    if (!banner) {
      throw { code: ERROR_CODES.HEISHA_BANNER_NOT_UNLOCKED, message: '血魂幡数据异常' }
    }

    const currentConfig = BANNER_LEVEL_CONFIG[banner.level]
    const nextConfig = banner.level < BANNER_MAX_LEVEL ? BANNER_LEVEL_CONFIG[banner.level + 1] : null

    // 检查升级材料
    const materialCount = await inventoryService.getItemQuantity(characterId, BANNER_UPGRADE_MATERIAL)

    return {
      level: banner.level,
      slots: currentConfig.slots,
      maxSoulGrade: currentConfig.maxSoulGrade,
      nextUpgradeCost: nextConfig?.upgradeCost || null,
      canUpgrade: nextConfig !== null && materialCount >= nextConfig.upgradeCost,
      upgradeProgress: nextConfig
        ? {
            current: materialCount,
            required: nextConfig.upgradeCost
          }
        : undefined
    }
  }

  /**
   * 升级血魂幡
   */
  async upgradeBanner(characterId: string): Promise<{ success: boolean; newLevel: number; message: string }> {
    const character = await this.validateHeishaMember(characterId)

    if (!character.hasBloodSoulBanner) {
      throw { code: ERROR_CODES.HEISHA_BANNER_NOT_UNLOCKED, message: '尚未获得血魂幡' }
    }

    const banner = await this.getBanner(characterId)
    if (!banner) {
      throw { code: ERROR_CODES.HEISHA_BANNER_NOT_UNLOCKED, message: '血魂幡数据异常' }
    }

    if (banner.level >= BANNER_MAX_LEVEL) {
      throw { code: ERROR_CODES.HEISHA_BANNER_MAX_LEVEL, message: '血魂幡已达最高等阶' }
    }

    const nextConfig = BANNER_LEVEL_CONFIG[banner.level + 1]
    const materialCount = await inventoryService.getItemQuantity(characterId, BANNER_UPGRADE_MATERIAL)

    if (materialCount < nextConfig.upgradeCost) {
      throw { code: ERROR_CODES.ITEM_NOT_ENOUGH, message: `阴魂丝不足，需要${nextConfig.upgradeCost}个` }
    }

    // 消耗材料
    await inventoryService.removeItemByItemId(characterId, BANNER_UPGRADE_MATERIAL, nextConfig.upgradeCost)

    // 升级血魂幡
    const oldLevel = banner.level
    banner.level += 1
    await bannerRepository.save(banner)

    // 检查是否需要创建新槽位
    const oldSlots = BANNER_LEVEL_CONFIG[oldLevel].slots
    const newSlots = BANNER_LEVEL_CONFIG[banner.level].slots
    if (newSlots > oldSlots) {
      for (let i = oldSlots; i < newSlots; i++) {
        const slot = slotRepository.create({
          bannerId: banner.id,
          slotIndex: i,
          status: 'empty'
        })
        await slotRepository.save(slot)
      }
    }

    return {
      success: true,
      newLevel: banner.level,
      message: `血魂幡升至${banner.level}阶！槽位数：${newSlots}`
    }
  }

  // ==================== 煞气池 ====================

  /**
   * 获取煞气池状态
   */
  async getShaPoolStatus(characterId: string): Promise<ShaPoolStatus> {
    const character = await this.validateHeishaMember(characterId)
    const banner = await this.getBanner(characterId)

    const now = Date.now()
    const today = new Date().toISOString().split('T')[0]

    // 检查每日献祭冷却
    let canSacrifice = true
    let sacrificeCooldown = 0
    if (banner?.lastDailySacrificeTime) {
      const lastDate = new Date(Number(banner.lastDailySacrificeTime)).toISOString().split('T')[0]
      if (lastDate === today) {
        canSacrifice = false
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        sacrificeCooldown = tomorrow.getTime() - now
      }
    }

    // 今日化功为煞量
    let dailyConverted = 0
    if (banner?.lastConvertDate === today) {
      dailyConverted = banner.dailyConvertedSha
    }

    return {
      current: character.shaEnergy,
      max: SHA_ENERGY_CONFIG.maxShaEnergy,
      bonusPercent: Math.min(character.shaEnergy * SHA_ENERGY_CONFIG.bonusPerPoint, SHA_ENERGY_CONFIG.maxBonusPercent),
      canSacrifice,
      sacrificeCooldown,
      dailyConverted,
      dailyConvertLimit: SHA_POOL_CONFIG.cultivationToSha.dailyLimit
    }
  }

  /**
   * 每日献祭
   */
  async dailySacrifice(characterId: string): Promise<{ shaGained: number; totalSha: number; message: string }> {
    const character = await this.validateHeishaMember(characterId)

    if (!character.hasBloodSoulBanner) {
      throw { code: ERROR_CODES.HEISHA_BANNER_NOT_UNLOCKED, message: '尚未获得血魂幡' }
    }

    const banner = await this.getBanner(characterId)
    if (!banner) {
      throw { code: ERROR_CODES.HEISHA_BANNER_NOT_UNLOCKED, message: '血魂幡数据异常' }
    }

    const now = Date.now()
    const today = new Date().toISOString().split('T')[0]

    // 检查今日是否已献祭
    if (banner.lastDailySacrificeTime) {
      const lastDate = new Date(Number(banner.lastDailySacrificeTime)).toISOString().split('T')[0]
      if (lastDate === today) {
        throw { code: ERROR_CODES.HEISHA_SACRIFICE_COOLDOWN, message: '今日已完成献祭' }
      }
    }

    // 计算煞气获取量
    const { baseSha, killCountBonus, maxBonus } = SHA_POOL_CONFIG.dailySacrifice
    const killBonus = Math.min(character.killCount * killCountBonus, maxBonus)
    const shaGained = Math.floor(baseSha + killBonus)

    // 增加煞气
    character.shaEnergy = Math.min(character.shaEnergy + shaGained, SHA_ENERGY_CONFIG.maxShaEnergy)
    await characterRepository.save(character)

    // 更新献祭时间
    banner.lastDailySacrificeTime = now
    await bannerRepository.save(banner)

    return {
      shaGained,
      totalSha: character.shaEnergy,
      message: `献祭完成，获得${shaGained}点煞气${killBonus > 0 ? `（含杀戮加成${Math.floor(killBonus)}）` : ''}`
    }
  }

  /**
   * 化功为煞
   */
  async convertCultivation(
    characterId: string,
    cultivationAmount: number
  ): Promise<{ shaGained: number; cultivationUsed: number; message: string }> {
    const character = await this.validateHeishaMember(characterId)

    if (!character.hasBloodSoulBanner) {
      throw { code: ERROR_CODES.HEISHA_BANNER_NOT_UNLOCKED, message: '尚未获得血魂幡' }
    }

    const banner = await this.getBanner(characterId)
    if (!banner) {
      throw { code: ERROR_CODES.HEISHA_BANNER_NOT_UNLOCKED, message: '血魂幡数据异常' }
    }

    const today = new Date().toISOString().split('T')[0]
    const { ratio, dailyLimit } = SHA_POOL_CONFIG.cultivationToSha

    // 检查每日限制
    let dailyConverted = 0
    if (banner.lastConvertDate === today) {
      dailyConverted = banner.dailyConvertedSha
    } else {
      // 新的一天，重置
      banner.lastConvertDate = today
      banner.dailyConvertedSha = 0
    }

    const remainingLimit = dailyLimit - dailyConverted
    if (remainingLimit <= 0) {
      throw { code: ERROR_CODES.HEISHA_CONVERT_LIMIT, message: '今日化功为煞次数已用尽' }
    }

    // 计算可转换量
    const maxShaFromCultivation = Math.floor(cultivationAmount / ratio)
    const shaGained = Math.min(maxShaFromCultivation, remainingLimit)
    const cultivationUsed = shaGained * ratio

    if (cultivationUsed <= 0) {
      throw { code: ERROR_CODES.CURSE_NOT_ENOUGH_CULTIVATION, message: '修为不足' }
    }

    if (character.experience < cultivationUsed) {
      throw { code: ERROR_CODES.CURSE_NOT_ENOUGH_CULTIVATION, message: '修为不足' }
    }

    // 扣除修为
    character.experience = Number(character.experience) - cultivationUsed
    character.shaEnergy = Math.min(character.shaEnergy + shaGained, SHA_ENERGY_CONFIG.maxShaEnergy)
    await characterRepository.save(character)

    // 更新今日转换量
    banner.dailyConvertedSha = dailyConverted + shaGained
    await bannerRepository.save(banner)

    return {
      shaGained,
      cultivationUsed,
      message: `消耗${cultivationUsed}修为，获得${shaGained}点煞气`
    }
  }

  // ==================== 魂魄储备 ====================

  /**
   * 获取魂魄储备
   */
  async getSoulStorage(characterId: string): Promise<SoulStorageStatus> {
    const character = await this.validateHeishaMember(characterId)

    const storage = character.soulStorage
    const souls: Record<string, { count: number; name: string; grade: number }> = {}

    for (const [soulType, count] of Object.entries(storage)) {
      const config = SOUL_TYPES[soulType]
      if (config && count > 0) {
        souls[soulType] = {
          count,
          name: config.name,
          grade: config.grade
        }
      }
    }

    return { souls }
  }

  /**
   * 添加魂魄
   */
  async addSoul(characterId: string, soulType: string, quantity: number): Promise<void> {
    const character = await characterRepository.findOne({ where: { id: characterId } })
    if (!character) return

    const storage = character.soulStorage
    storage[soulType] = (storage[soulType] || 0) + quantity
    character.soulStorage = storage
    await characterRepository.save(character)
  }

  /**
   * 移除魂魄
   */
  async removeSoul(characterId: string, soulType: string, quantity: number): Promise<boolean> {
    const character = await characterRepository.findOne({ where: { id: characterId } })
    if (!character) return false

    const storage = character.soulStorage
    if (!storage[soulType] || storage[soulType] < quantity) {
      return false
    }

    storage[soulType] -= quantity
    if (storage[soulType] <= 0) {
      delete storage[soulType]
    }
    character.soulStorage = storage
    await characterRepository.save(character)
    return true
  }

  // ==================== 炼化槽 ====================

  /**
   * 获取炼化槽列表
   */
  async getRefinementSlots(characterId: string): Promise<RefinementSlotInfo[]> {
    const character = await this.validateHeishaMember(characterId)

    if (!character.hasBloodSoulBanner) {
      throw { code: ERROR_CODES.HEISHA_BANNER_NOT_UNLOCKED, message: '尚未获得血魂幡' }
    }

    const banner = await this.getBanner(characterId)
    if (!banner) {
      throw { code: ERROR_CODES.HEISHA_BANNER_NOT_UNLOCKED, message: '血魂幡数据异常' }
    }

    const slots = await this.getSlots(banner.id)
    const now = Date.now()

    return slots.map(slot => {
      const soulConfig = slot.soulType ? SOUL_TYPES[slot.soulType] : null

      let progress = 0
      let remainingMs = 0
      let status = slot.status as 'empty' | 'refining' | 'complete'

      if (slot.status === 'refining' && slot.startTime && slot.endTime) {
        const totalTime = Number(slot.endTime) - Number(slot.startTime)
        const elapsed = now - Number(slot.startTime)
        progress = Math.min(100, Math.floor((elapsed / totalTime) * 100))
        remainingMs = Math.max(0, Number(slot.endTime) - now)

        if (remainingMs <= 0) {
          status = 'complete'
        }
      }

      // 检查是否需要维护
      const needsMaintenance = slot.status === 'refining' && slot.stability < 50

      return {
        slotIndex: slot.slotIndex,
        status,
        soulType: slot.soulType,
        soulName: soulConfig?.name || null,
        stability: slot.stability,
        progress,
        remainingMs,
        canCollect: status === 'complete',
        needsMaintenance
      }
    })
  }

  /**
   * 开始炼化（囚禁魂魄）
   */
  async startRefinement(characterId: string, slotIndex: number, soulType: string): Promise<{ success: boolean; message: string }> {
    const character = await this.validateHeishaMember(characterId)

    if (!character.hasBloodSoulBanner) {
      throw { code: ERROR_CODES.HEISHA_BANNER_NOT_UNLOCKED, message: '尚未获得血魂幡' }
    }

    const banner = await this.getBanner(characterId)
    if (!banner) {
      throw { code: ERROR_CODES.HEISHA_BANNER_NOT_UNLOCKED, message: '血魂幡数据异常' }
    }

    // 验证魂魄类型
    const soulConfig = SOUL_TYPES[soulType]
    if (!soulConfig) {
      throw { code: ERROR_CODES.VALIDATION_ERROR, message: '未知的魂魄类型' }
    }

    // 验证血魂幡等级
    const bannerConfig = BANNER_LEVEL_CONFIG[banner.level]
    if (soulConfig.grade > bannerConfig.maxSoulGrade) {
      throw { code: ERROR_CODES.HEISHA_BANNER_LEVEL_LOW, message: `血魂幡等阶不足，无法炼化${soulConfig.name}` }
    }

    // 验证槽位
    const slots = await this.getSlots(banner.id)
    const slot = slots.find(s => s.slotIndex === slotIndex)
    if (!slot) {
      throw { code: ERROR_CODES.VALIDATION_ERROR, message: '无效的槽位' }
    }

    if (slot.status !== 'empty') {
      throw { code: ERROR_CODES.HEISHA_SLOT_NOT_EMPTY, message: '该槽位正在炼化中' }
    }

    // 验证魂魄储备
    const storage = character.soulStorage
    if (!storage[soulType] || storage[soulType] < 1) {
      throw { code: ERROR_CODES.HEISHA_SOUL_NOT_ENOUGH, message: `${soulConfig.name}数量不足` }
    }

    // 验证煞气
    if (character.shaEnergy < soulConfig.shaCost) {
      throw { code: ERROR_CODES.HEISHA_SHA_NOT_ENOUGH, message: `煞气不足，需要${soulConfig.shaCost}点` }
    }

    // 扣除魂魄
    storage[soulType] -= 1
    if (storage[soulType] <= 0) delete storage[soulType]
    character.soulStorage = storage

    // 扣除煞气
    character.shaEnergy -= soulConfig.shaCost
    await characterRepository.save(character)

    // 开始炼化
    const now = Date.now()
    slot.soulType = soulType
    slot.status = 'refining'
    slot.startTime = now
    slot.endTime = now + soulConfig.refineTimeMs
    slot.stability = 100
    slot.lastMaintenanceTime = now
    await slotRepository.save(slot)

    return {
      success: true,
      message: `开始炼化${soulConfig.name}，预计${Math.floor(soulConfig.refineTimeMs / 60000)}分钟完成`
    }
  }

  /**
   * 安抚幡灵（维护槽位）
   */
  async maintainSlot(characterId: string, slotIndex: number): Promise<{ success: boolean; newStability: number; message: string }> {
    const character = await this.validateHeishaMember(characterId)

    if (!character.hasBloodSoulBanner) {
      throw { code: ERROR_CODES.HEISHA_BANNER_NOT_UNLOCKED, message: '尚未获得血魂幡' }
    }

    const banner = await this.getBanner(characterId)
    if (!banner) {
      throw { code: ERROR_CODES.HEISHA_BANNER_NOT_UNLOCKED, message: '血魂幡数据异常' }
    }

    const slots = await this.getSlots(banner.id)
    const slot = slots.find(s => s.slotIndex === slotIndex)
    if (!slot) {
      throw { code: ERROR_CODES.VALIDATION_ERROR, message: '无效的槽位' }
    }

    if (slot.status !== 'refining') {
      throw { code: ERROR_CODES.HEISHA_SLOT_NOT_REFINING, message: '该槽位未在炼化中' }
    }

    // 消耗煞气
    if (character.shaEnergy < STABILITY_CONFIG.maintenanceCost) {
      throw { code: ERROR_CODES.HEISHA_SHA_NOT_ENOUGH, message: `煞气不足，需要${STABILITY_CONFIG.maintenanceCost}点` }
    }

    character.shaEnergy -= STABILITY_CONFIG.maintenanceCost
    await characterRepository.save(character)

    // 恢复稳定度
    slot.stability = Math.min(100, slot.stability + STABILITY_CONFIG.maintenanceRestore)
    slot.lastMaintenanceTime = Date.now()
    await slotRepository.save(slot)

    return {
      success: true,
      newStability: slot.stability,
      message: `安抚幡灵成功，稳定度恢复至${slot.stability}%`
    }
  }

  /**
   * 收取精华（收取炼化产物）
   */
  async collectRefinement(characterId: string, slotIndex: number): Promise<RefinementResult> {
    const character = await this.validateHeishaMember(characterId)

    if (!character.hasBloodSoulBanner) {
      throw { code: ERROR_CODES.HEISHA_BANNER_NOT_UNLOCKED, message: '尚未获得血魂幡' }
    }

    const banner = await this.getBanner(characterId)
    if (!banner) {
      throw { code: ERROR_CODES.HEISHA_BANNER_NOT_UNLOCKED, message: '血魂幡数据异常' }
    }

    const slots = await this.getSlots(banner.id)
    const slot = slots.find(s => s.slotIndex === slotIndex)
    if (!slot) {
      throw { code: ERROR_CODES.VALIDATION_ERROR, message: '无效的槽位' }
    }

    // 检查是否完成
    const now = Date.now()
    if (slot.status === 'refining' && slot.endTime && Number(slot.endTime) <= now) {
      slot.status = 'complete'
    }

    if (slot.status !== 'complete') {
      throw { code: ERROR_CODES.HEISHA_SLOT_NOT_COMPLETE, message: '炼化尚未完成' }
    }

    const soulConfig = SOUL_TYPES[slot.soulType!]
    if (!soulConfig) {
      throw { code: ERROR_CODES.VALIDATION_ERROR, message: '魂魄类型异常' }
    }

    // 计算产出
    const outputs: { itemId: string; itemName: string; quantity: number }[] = []

    // 稳定度惩罚
    const stabilityMultiplier = slot.stability < STABILITY_CONFIG.failureThreshold ? STABILITY_CONFIG.failurePenalty : 1

    // 核心产出
    const { primary, rare } = soulConfig.outputs
    const primaryQuantity = Math.floor((Math.floor(Math.random() * (primary.max - primary.min + 1)) + primary.min) * stabilityMultiplier)
    if (primaryQuantity > 0) {
      await inventoryService.addItem(characterId, primary.itemId, primaryQuantity)
      const itemName = await this.getItemName(primary.itemId)
      outputs.push({ itemId: primary.itemId, itemName, quantity: primaryQuantity })
    }

    // 稀有产出
    if (Math.random() * 100 < rare.chance * stabilityMultiplier) {
      const rareQuantity = Math.floor(Math.random() * (rare.max - rare.min + 1)) + rare.min
      if (rareQuantity > 0) {
        await inventoryService.addItem(characterId, rare.itemId, rareQuantity)
        const itemName = await this.getItemName(rare.itemId)
        outputs.push({ itemId: rare.itemId, itemName, quantity: rareQuantity })
      }
    }

    // 重置槽位
    slot.soulType = null
    slot.status = 'empty'
    slot.startTime = null
    slot.endTime = null
    slot.stability = 100
    slot.lastMaintenanceTime = null
    await slotRepository.save(slot)

    const outputStr = outputs.map(o => `${o.itemName}×${o.quantity}`).join('、')

    return {
      success: true,
      outputs,
      message: `收取成功！获得：${outputStr}`
    }
  }

  // ==================== PvE系统 ====================

  /**
   * 获取血洗山林状态
   */
  async getBloodForestStatus(characterId: string): Promise<BloodForestStatus> {
    const character = await this.validateHeishaMember(characterId)

    const today = new Date().toISOString().split('T')[0]
    let dailyUsed = 0
    if (character.lastBloodForestDate === today) {
      dailyUsed = character.dailyBloodForestRaids
    }

    const realmTier = character.realm?.tier || 1
    const canRaid =
      realmTier >= BLOOD_FOREST_CONFIG.minRealm &&
      dailyUsed < BLOOD_FOREST_CONFIG.dailyLimit &&
      character.shaEnergy >= BLOOD_FOREST_CONFIG.shaCost &&
      character.hasBloodSoulBanner

    return {
      canRaid,
      dailyRemaining: Math.max(0, BLOOD_FOREST_CONFIG.dailyLimit - dailyUsed),
      dailyLimit: BLOOD_FOREST_CONFIG.dailyLimit,
      shaCost: BLOOD_FOREST_CONFIG.shaCost,
      minRealm: BLOOD_FOREST_CONFIG.minRealm
    }
  }

  /**
   * 血洗山林
   */
  async raidBloodForest(characterId: string): Promise<RaidResult> {
    const character = await this.validateHeishaMember(characterId)

    if (!character.hasBloodSoulBanner) {
      throw { code: ERROR_CODES.HEISHA_BANNER_NOT_UNLOCKED, message: '尚未获得血魂幡' }
    }

    const realmTier = character.realm?.tier || 1
    if (realmTier < BLOOD_FOREST_CONFIG.minRealm) {
      throw { code: ERROR_CODES.PVP_REALM_TOO_LOW, message: '需要筑基期才能血洗山林' }
    }

    const today = new Date().toISOString().split('T')[0]
    if (character.lastBloodForestDate !== today) {
      character.lastBloodForestDate = today
      character.dailyBloodForestRaids = 0
    }

    if (character.dailyBloodForestRaids >= BLOOD_FOREST_CONFIG.dailyLimit) {
      throw { code: ERROR_CODES.HEISHA_FOREST_LIMIT, message: '今日血洗山林次数已用尽' }
    }

    if (character.shaEnergy < BLOOD_FOREST_CONFIG.shaCost) {
      throw { code: ERROR_CODES.HEISHA_SHA_NOT_ENOUGH, message: `煞气不足，需要${BLOOD_FOREST_CONFIG.shaCost}点` }
    }

    // 消耗煞气
    character.shaEnergy -= BLOOD_FOREST_CONFIG.shaCost
    character.dailyBloodForestRaids += 1

    // 随机选择敌人
    const enemies = BLOOD_FOREST_CONFIG.enemies
    const enemy = enemies[Math.floor(Math.random() * enemies.length)]

    // 计算战力
    const playerPower = this.calculatePower(character)
    const enemyPower = Math.floor(playerPower * enemy.powerMultiplier)

    // 战斗判定
    const victory = playerPower >= enemyPower || Math.random() < 0.7 // 70%基础胜率

    const rewards = {
      spiritStones: 0,
      souls: [] as { type: string; name: string; count: number }[],
      materials: [] as { itemId: string; name: string; count: number }[]
    }

    if (victory) {
      // 灵石奖励
      rewards.spiritStones = enemy.rewards.spiritStones
      character.spiritStones = Number(character.spiritStones) + rewards.spiritStones

      // 魂魄掉落
      if (Math.random() * 100 < enemy.rewards.soulChance) {
        const soulCount =
          Math.floor(Math.random() * (BLOOD_FOREST_CONFIG.soulDrops.max - BLOOD_FOREST_CONFIG.soulDrops.min + 1)) +
          BLOOD_FOREST_CONFIG.soulDrops.min
        await this.addSoul(characterId, BLOOD_FOREST_CONFIG.soulDrops.itemId, soulCount)
        rewards.souls.push({
          type: BLOOD_FOREST_CONFIG.soulDrops.itemId,
          name: SOUL_TYPES[BLOOD_FOREST_CONFIG.soulDrops.itemId].name,
          count: soulCount
        })
      }

      // 材料掉落
      for (const drop of BLOOD_FOREST_CONFIG.materialDrops) {
        if (Math.random() * 100 < drop.chance) {
          const count = Math.floor(Math.random() * (drop.max - drop.min + 1)) + drop.min
          await inventoryService.addItem(characterId, drop.itemId, count)
          const name = await this.getItemName(drop.itemId)
          rewards.materials.push({ itemId: drop.itemId, name, count })
        }
      }
    }

    await characterRepository.save(character)

    const rewardStr = victory
      ? `灵石+${rewards.spiritStones}${rewards.souls.length > 0 ? '，' + rewards.souls.map(s => `${s.name}×${s.count}`).join('、') : ''}${
          rewards.materials.length > 0 ? '，' + rewards.materials.map(m => `${m.name}×${m.count}`).join('、') : ''
        }`
      : '无'

    return {
      success: true,
      victory,
      enemy: { name: enemy.name, power: enemyPower },
      rewards,
      message: victory ? `击败${enemy.name}！${rewardStr}` : `不敌${enemy.name}，狼狈而逃...`
    }
  }

  /**
   * 获取召唤魔影状态
   */
  async getShadowSummonStatus(characterId: string): Promise<ShadowSummonStatus> {
    const character = await this.validateHeishaMember(characterId)

    const today = new Date().toISOString().split('T')[0]
    let dailyUsed = 0
    if (character.lastShadowSummonDate === today) {
      dailyUsed = character.dailyShadowSummons
    }

    const realmTier = character.realm?.tier || 1
    const sacrificeCount = await inventoryService.getItemQuantity(characterId, SHADOW_SUMMON_CONFIG.sacrificeItemId)
    const hasSacrifice = sacrificeCount >= SHADOW_SUMMON_CONFIG.sacrificeQuantity

    const canSummon =
      realmTier >= SHADOW_SUMMON_CONFIG.minRealm &&
      dailyUsed < SHADOW_SUMMON_CONFIG.dailyLimit &&
      hasSacrifice &&
      character.hasBloodSoulBanner

    const sacrificeName = await this.getItemName(SHADOW_SUMMON_CONFIG.sacrificeItemId)

    return {
      canSummon,
      dailyRemaining: Math.max(0, SHADOW_SUMMON_CONFIG.dailyLimit - dailyUsed),
      dailyLimit: SHADOW_SUMMON_CONFIG.dailyLimit,
      sacrificeRequired: {
        itemId: SHADOW_SUMMON_CONFIG.sacrificeItemId,
        itemName: sacrificeName,
        quantity: SHADOW_SUMMON_CONFIG.sacrificeQuantity
      },
      hasSacrifice,
      minRealm: SHADOW_SUMMON_CONFIG.minRealm
    }
  }

  /**
   * 召唤魔影
   */
  async summonShadow(characterId: string): Promise<SummonResult> {
    const character = await this.validateHeishaMember(characterId)

    if (!character.hasBloodSoulBanner) {
      throw { code: ERROR_CODES.HEISHA_BANNER_NOT_UNLOCKED, message: '尚未获得血魂幡' }
    }

    const realmTier = character.realm?.tier || 1
    if (realmTier < SHADOW_SUMMON_CONFIG.minRealm) {
      throw { code: ERROR_CODES.PVP_REALM_TOO_LOW, message: '需要结丹期才能召唤魔影' }
    }

    const today = new Date().toISOString().split('T')[0]
    if (character.lastShadowSummonDate !== today) {
      character.lastShadowSummonDate = today
      character.dailyShadowSummons = 0
    }

    if (character.dailyShadowSummons >= SHADOW_SUMMON_CONFIG.dailyLimit) {
      throw { code: ERROR_CODES.HEISHA_SHADOW_LIMIT, message: '今日召唤魔影次数已用尽' }
    }

    // 检查祭品
    const sacrificeCount = await inventoryService.getItemQuantity(characterId, SHADOW_SUMMON_CONFIG.sacrificeItemId)
    if (sacrificeCount < SHADOW_SUMMON_CONFIG.sacrificeQuantity) {
      throw { code: ERROR_CODES.ITEM_NOT_ENOUGH, message: `三级妖丹不足，需要${SHADOW_SUMMON_CONFIG.sacrificeQuantity}个` }
    }

    // 消耗祭品
    await inventoryService.removeItemByItemId(characterId, SHADOW_SUMMON_CONFIG.sacrificeItemId, SHADOW_SUMMON_CONFIG.sacrificeQuantity)
    character.dailyShadowSummons += 1

    // 随机选择BOSS
    const bosses = SHADOW_SUMMON_CONFIG.bosses
    const boss = bosses[Math.floor(Math.random() * bosses.length)]

    // 计算战力
    const playerPower = this.calculatePower(character)
    const bossPower = Math.floor(playerPower * boss.powerMultiplier)

    // 战斗判定（BOSS更难）
    const victory = playerPower >= bossPower * 0.8 && Math.random() < 0.5 // 50%基础胜率

    const rewards = {
      spiritStones: 0,
      souls: [] as { type: string; name: string; count: number }[],
      materials: [] as { itemId: string; name: string; count: number }[]
    }

    if (victory) {
      // 灵石奖励
      rewards.spiritStones = boss.rewards.spiritStones
      character.spiritStones = Number(character.spiritStones) + rewards.spiritStones

      // 凶兽戾魄掉落
      if (Math.random() * 100 < boss.rewards.soulChance) {
        const soulCount = boss.rewards.soulCount
        await this.addSoul(characterId, SHADOW_SUMMON_CONFIG.soulDrop.itemId, soulCount)
        rewards.souls.push({
          type: SHADOW_SUMMON_CONFIG.soulDrop.itemId,
          name: SOUL_TYPES[SHADOW_SUMMON_CONFIG.soulDrop.itemId].name,
          count: soulCount
        })
      }

      // 材料掉落
      for (const drop of SHADOW_SUMMON_CONFIG.materialDrops) {
        if (Math.random() * 100 < drop.chance) {
          const count = Math.floor(Math.random() * (drop.max - drop.min + 1)) + drop.min
          await inventoryService.addItem(characterId, drop.itemId, count)
          const name = await this.getItemName(drop.itemId)
          rewards.materials.push({ itemId: drop.itemId, name, count })
        }
      }
    }

    await characterRepository.save(character)

    const rewardStr = victory
      ? `灵石+${rewards.spiritStones}${rewards.souls.length > 0 ? '，' + rewards.souls.map(s => `${s.name}×${s.count}`).join('、') : ''}${
          rewards.materials.length > 0 ? '，' + rewards.materials.map(m => `${m.name}×${m.count}`).join('、') : ''
        }`
      : '无'

    return {
      success: true,
      victory,
      boss: { name: boss.name, power: bossPower },
      rewards,
      message: victory ? `击败${boss.name}！${rewardStr}` : `不敌${boss.name}，魔影消散...`
    }
  }

  // ==================== PvP集成 ====================

  /**
   * PvP胜利后处理魂魄掉落
   */
  async handlePvPVictory(winnerId: string, loserId: string): Promise<{ souls: { type: string; count: number }[] }> {
    const winner = await characterRepository.findOne({ where: { id: winnerId } })
    if (!winner || !winner.hasBloodSoulBanner) {
      return { souls: [] }
    }

    const souls: { type: string; count: number }[] = []

    // 怨魂掉落
    if (Math.random() * 100 < PVP_SOUL_DROP_CONFIG.grievance_soul.chance) {
      await this.addSoul(winnerId, 'grievance_soul', 1)
      souls.push({ type: 'grievance_soul', count: 1 })
    }

    // 修士残魂掉落
    if (Math.random() * 100 < PVP_SOUL_DROP_CONFIG.cultivator_remnant.chance) {
      await this.addSoul(winnerId, 'cultivator_remnant', 1)
      souls.push({ type: 'cultivator_remnant', count: 1 })
    }

    return { souls }
  }

  // ==================== 战力计算 ====================

  /**
   * 获取杀戮值战力加成
   */
  getKillCountBonus(killCount: number): number {
    return Math.min(killCount * SHA_POOL_CONFIG.killCountBonus, SHA_POOL_CONFIG.maxKillCountBonus)
  }

  /**
   * 简单战力计算
   */
  private calculatePower(character: Character): number {
    // 基础战力（简化计算）
    const basePower = (character.realm?.tier || 1) * 1000 + Number(character.experience || 0) / 100
    return Math.floor(basePower)
  }

  // ==================== 工具方法 ====================

  /**
   * 获取物品名称
   */
  private async getItemName(itemId: string): Promise<string> {
    const { ITEMS } = await import('../game/constants/items')
    return ITEMS[itemId]?.name || itemId
  }
}

export const bloodSoulBannerService = new BloodSoulBannerService()
