/**
 * 元婴宗专属系统服务 - 元婴密卷系统
 * 元神出窍、元婴闭关、问道寻真、青元剑诀
 */
import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { NascentSoul } from '../models/NascentSoul'
import { InventoryItem } from '../models/InventoryItem'
import { EntityManager } from 'typeorm'
import {
  YUANYING_SECT_ID,
  NASCENT_SOUL_LEVELS,
  MAX_NASCENT_SOUL_LEVEL,
  SOUL_PROJECTION_CONFIG,
  PROJECTION_YIELDS_BY_ROOT,
  RARE_RECIPE_DROP,
  NASCENT_CULTIVATION_CONFIG,
  SEEK_TRUTH_CONFIG,
  GREEN_SWORD_CONFIG,
  FRAGMENT_ITEMS,
  FIRE_CRANE_DROP_CONFIG,
  type RootElement,
  type NascentSoulStatus,
  type FragmentType
} from '../game/constants/yuanying'
import { SPIRIT_ROOTS } from '../game/constants/spiritRoots'
import { ERROR_CODES } from '../utils/errorCodes'
import { COOLDOWN_REDUCTION } from '../game/constants/fengxi'

const characterRepository = AppDataSource.getRepository(Character)
const nascentSoulRepository = AppDataSource.getRepository(NascentSoul)
const inventoryRepository = AppDataSource.getRepository(InventoryItem)

// ==================== 接口定义 ====================

export interface YuanyingStatus {
  isYuanyingMember: boolean
  canUseNascentSoul: boolean // 是否达到元婴期
  soul: NascentSoulState | null
  fragments: FragmentState | null
  greenSwordMastered: boolean
  seekTruthCooldown: number | null // 问道寻真剩余冷却毫秒
}

export interface NascentSoulState {
  level: number
  exp: number
  expToNextLevel: number
  levelProgress: number
  status: NascentSoulStatus
  activityStartAt: number | null
  elapsedTime: number
  accumulatedRewards: {
    cultivation?: number
    items?: { id: string; quantity: number }[]
  }
  // 出窍状态额外信息
  projectionInfo?: {
    totalDuration: number
    remainingTime: number
    progressPercent: number
    rootElement: RootElement
    expectedYields: string[]
  }
  // 闭关状态额外信息
  cultivationInfo?: {
    settleCycleMs: number
    cultivationBonusPerCycle: number
    cyclesCompleted: number
    pendingCultivation: number
  }
}

export interface FragmentState {
  upper: boolean
  middle: boolean
  lower: boolean
  canMaster: boolean
}

export interface ProjectionResult {
  success: boolean
  message: string
  rootElement: RootElement
  estimatedDuration: number
  expectedYields: string[]
}

export interface CultivationResult {
  success: boolean
  message: string
  cultivationBonusPerCycle: number
}

export interface RecallResult {
  success: boolean
  message: string
  wasProjecting: boolean
  wasCultivating: boolean
  rewards: {
    cultivation?: number
    items?: { id: string; name: string; quantity: number }[]
    nascentExp?: number // 元婴经验
  }
  interrupted: boolean
}

export interface SeekTruthResult {
  success: boolean
  message: string
  rewardType: 'cultivation' | 'material' | 'nascentExp' | 'fragment'
  rewards: {
    cultivation?: number
    items?: { id: string; name: string; quantity: number }[]
    nascentExp?: number
    fragment?: { type: FragmentType; name: string }
  }
  cooldownEndsAt: number
  specialDrop?: { itemId: string; name: string; quantity: number; description: string } // 火鹤之羽等稀有掉落
}

export interface MasterSwordResult {
  success: boolean
  message: string
  effects: {
    swordDamageBonus: number
    cultivationBonus: number
    specialSkill: string
  }
}

// ==================== 服务类 ====================

class YuanyingService {
  /**
   * 验证是否为元婴宗弟子
   */
  private async validateMember(characterId: string): Promise<Character> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    if (character.sectId !== YUANYING_SECT_ID) {
      throw { code: ERROR_CODES.YUANYING_NOT_MEMBER, message: '只有元婴宗弟子才能使用此功能' }
    }

    return character
  }

  /**
   * 验证是否达到元婴期境界
   */
  private validateNascentSoulRealm(character: Character): void {
    const realmTier = character.realm?.tier || 1
    if (realmTier < SOUL_PROJECTION_CONFIG.minRealm) {
      throw { code: ERROR_CODES.YUANYING_REALM_TOO_LOW, message: '需达到元婴期境界才能使用元婴功能' }
    }
  }

  /**
   * 获取或创建元婴
   */
  private async getOrCreateNascentSoul(characterId: string): Promise<NascentSoul> {
    let soul = await nascentSoulRepository.findOne({
      where: { characterId }
    })

    if (!soul) {
      soul = nascentSoulRepository.create({
        characterId,
        level: 1,
        exp: 0,
        status: 'idle'
      })
      await nascentSoulRepository.save(soul)
    }

    return soul
  }

  /**
   * 获取角色的灵根元素
   */
  private getRootElement(character: Character): RootElement {
    const rootId = character.spiritRootId
    const rootConfig = SPIRIT_ROOTS[rootId]

    if (!rootConfig) return 'mixed'

    // 根据灵根类型返回元素
    if (rootId.includes('metal') || rootId.includes('gold')) return 'metal'
    if (rootId.includes('wood')) return 'wood'
    if (rootId.includes('water') || rootId.includes('ice')) return 'water'
    if (rootId.includes('fire') || rootId.includes('flame')) return 'fire'
    if (rootId.includes('earth') || rootId.includes('soil')) return 'earth'

    // 默认混元
    return 'mixed'
  }

  /**
   * 计算元婴等级进度
   */
  private getLevelProgress(level: number, exp: number): number {
    if (level >= MAX_NASCENT_SOUL_LEVEL) return 100
    const currentConfig = NASCENT_SOUL_LEVELS[level]
    const nextConfig = NASCENT_SOUL_LEVELS[level + 1]
    if (!currentConfig || !nextConfig) return 0

    const expInCurrentLevel = exp - currentConfig.expRequired
    const expNeededForLevel = nextConfig.expRequired - currentConfig.expRequired
    return Math.min(100, Math.max(0, (expInCurrentLevel / expNeededForLevel) * 100))
  }

  /**
   * 计算升级所需经验
   */
  private getExpToNextLevel(level: number, exp: number): number {
    if (level >= MAX_NASCENT_SOUL_LEVEL) return 0
    const nextConfig = NASCENT_SOUL_LEVELS[level + 1]
    if (!nextConfig) return 0
    return Math.max(0, nextConfig.expRequired - exp)
  }

  /**
   * 检查并处理升级
   */
  private async checkAndLevelUp(soul: NascentSoul): Promise<boolean> {
    if (soul.level >= MAX_NASCENT_SOUL_LEVEL) return false

    const nextConfig = NASCENT_SOUL_LEVELS[soul.level + 1]
    if (!nextConfig) return false

    if (soul.exp >= nextConfig.expRequired) {
      soul.level += 1
      await nascentSoulRepository.save(soul)
      return true
    }

    return false
  }

  /**
   * 添加物品到背包
   * @param manager 可选的事务管理器
   */
  private async addItemToInventory(characterId: string, itemId: string, quantity: number, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(InventoryItem) : inventoryRepository

    let item = await repo.findOne({
      where: { characterId, itemId }
    })

    if (item) {
      item.quantity += quantity
    } else {
      item = repo.create({
        characterId,
        itemId,
        quantity
      })
    }

    await repo.save(item)
  }

  // ==================== 公开方法 ====================

  /**
   * 获取元婴宗系统状态
   */
  async getStatus(characterId: string): Promise<YuanyingStatus> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    const isYuanyingMember = character.sectId === YUANYING_SECT_ID
    const realmTier = character.realm?.tier || 1
    const canUseNascentSoul = realmTier >= SOUL_PROJECTION_CONFIG.minRealm

    if (!isYuanyingMember) {
      return {
        isYuanyingMember: false,
        canUseNascentSoul,
        soul: null,
        fragments: null,
        greenSwordMastered: false,
        seekTruthCooldown: null
      }
    }

    // 获取元婴状态
    let soulState: NascentSoulState | null = null
    if (canUseNascentSoul) {
      const soul = await this.getOrCreateNascentSoul(characterId)
      const levelConfig = NASCENT_SOUL_LEVELS[soul.level]
      const now = Date.now()
      const elapsedTime = soul.activityStartAt ? now - soul.activityStartAt : 0

      soulState = {
        level: soul.level,
        exp: soul.exp,
        expToNextLevel: this.getExpToNextLevel(soul.level, soul.exp),
        levelProgress: this.getLevelProgress(soul.level, soul.exp),
        status: soul.status,
        activityStartAt: soul.activityStartAt,
        elapsedTime,
        accumulatedRewards: soul.accumulatedRewards
      }

      // 出窍状态信息
      if (soul.status === 'projecting' && soul.activityStartAt) {
        const rootElement = this.getRootElement(character)
        const yields = PROJECTION_YIELDS_BY_ROOT[rootElement]
        const expectedYields = yields.items.map(i => i.name)
        const remainingTime = Math.max(0, SOUL_PROJECTION_CONFIG.durationMs - elapsedTime)

        soulState.projectionInfo = {
          totalDuration: SOUL_PROJECTION_CONFIG.durationMs,
          remainingTime,
          progressPercent: Math.min(100, (elapsedTime / SOUL_PROJECTION_CONFIG.durationMs) * 100),
          rootElement,
          expectedYields
        }
      }

      // 闭关状态信息
      if (soul.status === 'cultivating' && soul.activityStartAt) {
        const lastSettle = soul.lastSettleAt || soul.activityStartAt
        const timeSinceLastSettle = now - lastSettle
        const cyclesCompleted = Math.floor(timeSinceLastSettle / NASCENT_CULTIVATION_CONFIG.settleCycleMs)
        const pendingCultivation = cyclesCompleted * levelConfig.cultivationBonusPerCycle

        soulState.cultivationInfo = {
          settleCycleMs: NASCENT_CULTIVATION_CONFIG.settleCycleMs,
          cultivationBonusPerCycle: levelConfig.cultivationBonusPerCycle,
          cyclesCompleted,
          pendingCultivation
        }
      }
    }

    // 获取残篇状态
    const fragments = character.greenSwordFragments
    const fragmentState: FragmentState = {
      upper: fragments.upper,
      middle: fragments.middle,
      lower: fragments.lower,
      canMaster: fragments.upper && fragments.middle && fragments.lower && !character.greenSwordMastered
    }

    // 计算问道寻真冷却（风雷翅装备时缩减30%）
    let seekTruthCooldown: number | null = null
    if (character.lastSeekTruthTime) {
      const baseCooldown = SEEK_TRUTH_CONFIG.cooldownMs
      const cooldownReduction = character.windThunderWingsEquipped ? COOLDOWN_REDUCTION.seekTruth.reduction : 0
      const actualCooldown = Math.floor(baseCooldown * (1 - cooldownReduction))
      const cooldownEnds = character.lastSeekTruthTime + actualCooldown
      if (cooldownEnds > Date.now()) {
        seekTruthCooldown = cooldownEnds - Date.now()
      }
    }

    return {
      isYuanyingMember: true,
      canUseNascentSoul,
      soul: soulState,
      fragments: fragmentState,
      greenSwordMastered: character.greenSwordMastered,
      seekTruthCooldown
    }
  }

  /**
   * 元神出窍（开始寻宝）
   * 使用事务和悲观锁防止并发问题
   * 注意：此功能所有元婴期修士都可使用，不限宗门
   */
  async startProjection(characterId: string): Promise<ProjectionResult> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 获取角色并验证
      const character = await manager.findOne(Character, {
        where: { id: characterId },
        relations: ['realm']
      })

      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      // 元神出窍只需元婴期境界，不限宗门
      const realmTier = character.realm?.tier || 1
      if (realmTier < SOUL_PROJECTION_CONFIG.minRealm) {
        throw { code: ERROR_CODES.YUANYING_REALM_TOO_LOW, message: '需达到元婴期境界才能使用元婴功能' }
      }

      // 获取或创建元婴（使用悲观锁）
      let soul = await manager.findOne(NascentSoul, {
        where: { characterId },
        lock: { mode: 'pessimistic_write' }
      })

      if (!soul) {
        soul = manager.create(NascentSoul, {
          characterId,
          level: 1,
          exp: 0,
          status: 'idle'
        })
        await manager.save(soul)
        // 重新获取以应用锁
        soul = await manager.findOne(NascentSoul, {
          where: { characterId },
          lock: { mode: 'pessimistic_write' }
        }) as NascentSoul
      }

      // 检查元婴状态
      if (soul.status !== 'idle') {
        throw { code: ERROR_CODES.YUANYING_SOUL_BUSY, message: '元婴正在活动中，无法出窍' }
      }

      // 获取灵根元素
      const rootElement = this.getRootElement(character)
      const yields = PROJECTION_YIELDS_BY_ROOT[rootElement]
      const expectedYields = yields.items.length > 0
        ? yields.items.map(i => i.name)
        : ['随机五行材料']

      // 开始出窍
      soul.startProjection()
      await manager.save(soul)

      return {
        success: true,
        message: `元神已出窍，正在寻觅${rootElement === 'mixed' ? '各类珍稀' : this.getElementName(rootElement)}材料...`,
        rootElement,
        estimatedDuration: SOUL_PROJECTION_CONFIG.durationMs,
        expectedYields
      }
    })
  }

  /**
   * 元婴闭关（开始修炼）- 宗门专属
   * 使用事务和悲观锁防止并发问题
   */
  async startCultivation(characterId: string): Promise<CultivationResult> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 获取角色并验证
      const character = await manager.findOne(Character, {
        where: { id: characterId },
        relations: ['realm']
      })

      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      if (character.sectId !== YUANYING_SECT_ID) {
        throw { code: ERROR_CODES.YUANYING_NOT_MEMBER, message: '只有元婴宗弟子才能使用此功能' }
      }

      const realmTier = character.realm?.tier || 1
      if (realmTier < SOUL_PROJECTION_CONFIG.minRealm) {
        throw { code: ERROR_CODES.YUANYING_REALM_TOO_LOW, message: '需达到元婴期境界才能使用元婴功能' }
      }

      // 获取或创建元婴（使用悲观锁）
      let soul = await manager.findOne(NascentSoul, {
        where: { characterId },
        lock: { mode: 'pessimistic_write' }
      })

      if (!soul) {
        soul = manager.create(NascentSoul, {
          characterId,
          level: 1,
          exp: 0,
          status: 'idle'
        })
        await manager.save(soul)
        soul = await manager.findOne(NascentSoul, {
          where: { characterId },
          lock: { mode: 'pessimistic_write' }
        }) as NascentSoul
      }

      // 检查元婴状态
      if (soul.status !== 'idle') {
        throw { code: ERROR_CODES.YUANYING_SOUL_BUSY, message: '元婴正在活动中，无法闭关' }
      }

      const levelConfig = NASCENT_SOUL_LEVELS[soul.level]

      // 开始闭关
      soul.startCultivation()
      await manager.save(soul)

      return {
        success: true,
        message: `元婴进入闭关状态，每${NASCENT_CULTIVATION_CONFIG.settleCycleMs / (60 * 60 * 1000)}小时可获得${levelConfig.cultivationBonusPerCycle}修为`,
        cultivationBonusPerCycle: levelConfig.cultivationBonusPerCycle
      }
    })
  }

  /**
   * 元婴归窍（召回并结算）
   * 使用事务和悲观锁防止并发问题
   * 注意：出窍状态的召回不限宗门，闭关状态的召回需要是元婴宗弟子
   */
  async recallSoul(characterId: string): Promise<RecallResult> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 获取角色并验证
      const character = await manager.findOne(Character, {
        where: { id: characterId },
        relations: ['realm']
      })

      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      // 获取元婴（使用悲观锁）
      const soul = await manager.findOne(NascentSoul, {
        where: { characterId },
        lock: { mode: 'pessimistic_write' }
      })

      if (!soul) {
        throw { code: ERROR_CODES.YUANYING_NO_NASCENT_SOUL, message: '尚未凝聚元婴' }
      }

      // 检查元婴状态
      if (soul.status === 'idle') {
        throw { code: ERROR_CODES.YUANYING_SOUL_IDLE, message: '元婴正在静养中，无需召回' }
      }

      const wasProjecting = soul.status === 'projecting'
      const wasCultivating = soul.status === 'cultivating'
      const now = Date.now()
      const elapsedTime = soul.activityStartAt ? now - soul.activityStartAt : 0

      const rewards: RecallResult['rewards'] = {}
      let interrupted = false

      if (wasProjecting) {
        // 计算出窍奖励
        const completionRatio = Math.min(1, elapsedTime / SOUL_PROJECTION_CONFIG.durationMs)
        interrupted = completionRatio < 1

        // 中断时无任何收益（设计要求）
        if (!interrupted) {
          const rootElement = this.getRootElement(character)
          let yields = PROJECTION_YIELDS_BY_ROOT[rootElement]

          // 混元灵根随机选择一种
          if (rootElement === 'mixed') {
            const elements: RootElement[] = ['metal', 'wood', 'water', 'fire', 'earth']
            const randomElement = elements[Math.floor(Math.random() * elements.length)]
            yields = PROJECTION_YIELDS_BY_ROOT[randomElement]
          }

          // 元婴等级加成
          const levelConfig = NASCENT_SOUL_LEVELS[soul.level]
          const bonusMultiplier = 1 + (levelConfig.projectionBonusPercent / 100)

          // 物品奖励
          rewards.items = []
          for (const item of yields.items) {
            const baseQty = Math.floor((Math.random() * (item.maxQty - item.minQty + 1) + item.minQty) * bonusMultiplier)
            if (baseQty > 0) {
              await this.addItemToInventory(characterId, item.id, baseQty, manager)
              rewards.items.push({ id: item.id, name: item.name, quantity: baseQty })
            }
          }

          // 元婴经验奖励
          const expReward = Math.floor(SOUL_PROJECTION_CONFIG.baseExpReward * bonusMultiplier)
          soul.exp += expReward
          rewards.nascentExp = expReward

          // 检查元婴升级
          if (soul.level < MAX_NASCENT_SOUL_LEVEL) {
            const nextConfig = NASCENT_SOUL_LEVELS[soul.level + 1]
            if (nextConfig && soul.exp >= nextConfig.expRequired) {
              soul.level += 1
            }
          }

          // 稀有丹方掉落（小概率）
          if (Math.random() < RARE_RECIPE_DROP.chance) {
            const recipe = RARE_RECIPE_DROP.recipes[Math.floor(Math.random() * RARE_RECIPE_DROP.recipes.length)]
            await this.addItemToInventory(characterId, recipe.id, 1, manager)
            rewards.items!.push({ id: recipe.id, name: recipe.name, quantity: 1 })
          }
        }
      }

      if (wasCultivating) {
        // 计算闭关奖励
        const lastSettle = soul.lastSettleAt || soul.activityStartAt || now
        const timeSinceLastSettle = now - lastSettle
        const cyclesCompleted = Math.floor(timeSinceLastSettle / NASCENT_CULTIVATION_CONFIG.settleCycleMs)

        const levelConfig = NASCENT_SOUL_LEVELS[soul.level]
        let cultivationGain = cyclesCompleted * levelConfig.cultivationBonusPerCycle

        // 青元剑诀加成：元婴共鸣，提升闭关修炼效率+15%
        if (character.greenSwordMastered) {
          cultivationGain = Math.floor(cultivationGain * (1 + GREEN_SWORD_CONFIG.effects.cultivationBonus / 100))
        }

        if (cultivationGain > 0) {
          character.experience += cultivationGain
          await manager.save(character)
          rewards.cultivation = cultivationGain
        }

        // 检查是否有未完成的周期（不算作中断，但不给未满周期的奖励）
        interrupted = false
      }

      // 元婴归窍
      soul.returnToIdle()
      await manager.save(soul)

      const message = wasProjecting
        ? (interrupted ? '元婴被迫归窍，寻宝中断，本次无收益' : '元婴圆满归窍，收获满满！')
        : '元婴结束闭关，修为精进！'

      return {
        success: true,
        message,
        wasProjecting,
        wasCultivating,
        rewards,
        interrupted
      }
    })
  }

  /**
   * 问道寻真（宗门专属）
   * 使用事务和悲观锁防止并发问题
   */
  async seekTruth(characterId: string): Promise<SeekTruthResult> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 获取角色并验证（使用悲观锁）
      const character = await manager.findOne(Character, {
        where: { id: characterId },
        relations: ['realm'],
        lock: { mode: 'pessimistic_write' }
      })

      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      if (character.sectId !== YUANYING_SECT_ID) {
        throw { code: ERROR_CODES.YUANYING_NOT_MEMBER, message: '只有元婴宗弟子才能使用此功能' }
      }

      // 检查冷却（风雷翅装备时缩减30%）
      const now = Date.now()
      if (character.lastSeekTruthTime) {
        const baseCooldown = SEEK_TRUTH_CONFIG.cooldownMs
        const cooldownReduction = character.windThunderWingsEquipped ? COOLDOWN_REDUCTION.seekTruth.reduction : 0
        const actualCooldown = Math.floor(baseCooldown * (1 - cooldownReduction))
        const cooldownEnds = character.lastSeekTruthTime + actualCooldown
        if (now < cooldownEnds) {
          throw { code: ERROR_CODES.YUANYING_SEEK_TRUTH_COOLDOWN, message: '问道寻真正在冷却中' }
        }
      }

      // 检查修为是否足够
      if (character.experience < SEEK_TRUTH_CONFIG.expCost) {
        throw { code: ERROR_CODES.YUANYING_SEEK_TRUTH_EXP_NOT_ENOUGH, message: '修为不足，无法问道' }
      }

      // 扣除修为
      character.experience -= SEEK_TRUTH_CONFIG.expCost
      character.lastSeekTruthTime = now

      // 随机决定奖励类型
      const roll = Math.random()
      const rewards = SEEK_TRUTH_CONFIG.rewards

      let rewardType: SeekTruthResult['rewardType']
      const rewardData: SeekTruthResult['rewards'] = {}

      if (roll < rewards.fragment.chance) {
        // 获得残篇 (5%)
        rewardType = 'fragment'
        const fragmentTypes = rewards.fragment.types as readonly FragmentType[]
        const fragments = character.greenSwordFragments

        // 优先给未拥有的残篇
        const missingFragments = fragmentTypes.filter(t => !fragments[t])
        const fragmentType = missingFragments.length > 0
          ? missingFragments[Math.floor(Math.random() * missingFragments.length)]
          : fragmentTypes[Math.floor(Math.random() * fragmentTypes.length)]

        // 更新残篇状态
        fragments[fragmentType] = true
        character.greenSwordFragments = fragments

        // 添加到背包（作为特殊物品记录）
        const fragmentItem = FRAGMENT_ITEMS[fragmentType]
        rewardData.fragment = { type: fragmentType, name: fragmentItem.name }

      } else if (roll < rewards.fragment.chance + rewards.nascentExp.chance) {
        // 获得元婴经验 (15%)
        rewardType = 'nascentExp'
        const expGain = Math.floor(Math.random() * (rewards.nascentExp.maxGain - rewards.nascentExp.minGain + 1)) + rewards.nascentExp.minGain

        // 需要元婴期才能获得经验
        const realmTier = character.realm?.tier || 1
        if (realmTier >= SOUL_PROJECTION_CONFIG.minRealm) {
          let soul = await manager.findOne(NascentSoul, {
            where: { characterId }
          })

          if (!soul) {
            soul = manager.create(NascentSoul, {
              characterId,
              level: 1,
              exp: 0,
              status: 'idle'
            })
          }

          soul.exp += expGain
          await manager.save(soul)

          // 检查升级
          if (soul.level < MAX_NASCENT_SOUL_LEVEL) {
            const nextConfig = NASCENT_SOUL_LEVELS[soul.level + 1]
            if (nextConfig && soul.exp >= nextConfig.expRequired) {
              soul.level += 1
              await manager.save(soul)
            }
          }
          rewardData.nascentExp = expGain
        } else {
          // 未达元婴期，转为获得修为奖励
          const cultivationGain = Math.floor(expGain * 2) // 转换为修为
          character.experience += cultivationGain
          rewardData.cultivation = cultivationGain
          rewardType = 'cultivation'
        }

      } else if (roll < rewards.fragment.chance + rewards.nascentExp.chance + rewards.material.chance) {
        // 获得材料 (30%)
        rewardType = 'material'
        const materialItems = rewards.material.items
        const randomItem = materialItems[Math.floor(Math.random() * materialItems.length)]

        await this.addItemToInventory(characterId, randomItem.id, randomItem.qty, manager)
        rewardData.items = [{ id: randomItem.id, name: randomItem.name, quantity: randomItem.qty }]

      } else {
        // 获得修为 (50%)
        rewardType = 'cultivation'
        const cultivationGain = Math.floor(Math.random() * (rewards.cultivation.maxGain - rewards.cultivation.minGain + 1)) + rewards.cultivation.minGain

        character.experience += cultivationGain
        rewardData.cultivation = cultivationGain
      }

      await manager.save(character)

      const cooldownEndsAt = now + SEEK_TRUTH_CONFIG.cooldownMs

      const messageMap = {
        cultivation: `问道有所得，获得${rewardData.cultivation}修为！`,
        material: `寻真途中发现宝物，获得${rewardData.items?.[0].name}×${rewardData.items?.[0].quantity}！`,
        nascentExp: `悟道精进，元婴获得${rewardData.nascentExp}点经验！`,
        fragment: `天降机缘！获得${rewardData.fragment?.name}！`
      }

      // 火鹤之羽特殊掉落判定（元婴期以上）
      let specialDrop: SeekTruthResult['specialDrop'] = undefined
      const realmTier = character.realm?.tier || 1
      if (realmTier >= FIRE_CRANE_DROP_CONFIG.minRealm && Math.random() < FIRE_CRANE_DROP_CONFIG.chance) {
        await this.addItemToInventory(characterId, FIRE_CRANE_DROP_CONFIG.itemId, 1, manager)
        specialDrop = {
          itemId: FIRE_CRANE_DROP_CONFIG.itemId,
          name: FIRE_CRANE_DROP_CONFIG.name,
          quantity: 1,
          description: FIRE_CRANE_DROP_CONFIG.description
        }
      }

      return {
        success: true,
        message: messageMap[rewardType],
        rewardType,
        rewards: rewardData,
        cooldownEndsAt,
        specialDrop
      }
    })
  }

  /**
   * 获取青元剑诀残篇状态
   */
  async getFragmentStatus(characterId: string): Promise<FragmentState> {
    const character = await this.validateMember(characterId)
    const fragments = character.greenSwordFragments

    return {
      upper: fragments.upper,
      middle: fragments.middle,
      lower: fragments.lower,
      canMaster: fragments.upper && fragments.middle && fragments.lower && !character.greenSwordMastered
    }
  }

  /**
   * 领悟青元剑诀
   * 使用事务和悲观锁防止并发问题
   */
  async masterGreenSword(characterId: string): Promise<MasterSwordResult> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 获取角色并验证（使用悲观锁）
      const character = await manager.findOne(Character, {
        where: { id: characterId },
        lock: { mode: 'pessimistic_write' }
      })

      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      if (character.sectId !== YUANYING_SECT_ID) {
        throw { code: ERROR_CODES.YUANYING_NOT_MEMBER, message: '只有元婴宗弟子才能使用此功能' }
      }

      // 检查是否已领悟
      if (character.greenSwordMastered) {
        throw { code: ERROR_CODES.YUANYING_SWORD_ALREADY_MASTERED, message: '已领悟青元剑诀' }
      }

      // 检查残篇是否集齐
      const fragments = character.greenSwordFragments
      if (!fragments.upper || !fragments.middle || !fragments.lower) {
        throw { code: ERROR_CODES.YUANYING_FRAGMENT_INCOMPLETE, message: '青元剑诀残篇未集齐' }
      }

      // 检查修为是否足够
      if (character.experience < GREEN_SWORD_CONFIG.expCost) {
        throw { code: ERROR_CODES.YUANYING_MASTER_EXP_NOT_ENOUGH, message: '修为不足，无法领悟' }
      }

      // 扣除修为并领悟
      character.experience -= GREEN_SWORD_CONFIG.expCost
      character.greenSwordMastered = true
      await manager.save(character)

      return {
        success: true,
        message: '青元剑诀领悟成功！剑道加成永久生效！',
        effects: GREEN_SWORD_CONFIG.effects
      }
    })
  }

  // ==================== 辅助方法 ====================

  /**
   * 获取元素名称
   */
  private getElementName(element: RootElement): string {
    const names: Record<RootElement, string> = {
      metal: '金系',
      wood: '木系',
      water: '水系',
      fire: '火系',
      earth: '土系',
      mixed: '混元'
    }
    return names[element]
  }

  /**
   * 定时任务：结算所有闭关中的元婴修为
   */
  async settleAllCultivations(): Promise<void> {
    const cultivatingSouls = await nascentSoulRepository.find({
      where: { status: 'cultivating' }
    })

    const now = Date.now()

    for (const soul of cultivatingSouls) {
      const lastSettle = soul.lastSettleAt || soul.activityStartAt || now
      const timeSinceLastSettle = now - lastSettle
      const cyclesCompleted = Math.floor(timeSinceLastSettle / NASCENT_CULTIVATION_CONFIG.settleCycleMs)

      if (cyclesCompleted > 0) {
        const character = await characterRepository.findOne({
          where: { id: soul.characterId }
        })

        if (character) {
          const levelConfig = NASCENT_SOUL_LEVELS[soul.level]
          let cultivationGain = cyclesCompleted * levelConfig.cultivationBonusPerCycle

          // 青元剑诀加成：元婴共鸣，提升闭关修炼效率+15%
          if (character.greenSwordMastered) {
            cultivationGain = Math.floor(cultivationGain * (1 + GREEN_SWORD_CONFIG.effects.cultivationBonus / 100))
          }

          character.experience += cultivationGain
          await characterRepository.save(character)

          // 更新结算时间
          soul.lastSettleAt = now
          soul.addAccumulatedCultivation(cultivationGain)
          await nascentSoulRepository.save(soul)
        }
      }
    }
  }
}

export const yuanyingService = new YuanyingService()
