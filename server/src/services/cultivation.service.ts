import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { Realm } from '../models/Realm'
import { SPIRIT_ROOTS } from '../game/constants/spiritRoots'
import {
  executeCultivation,
  checkCooldown,
  generateCooldown,
  getDaoHeartLevel,
  calculateCultivationRates,
  calculateDeepCultivation,
  calculateDailyActivityDecay,
  calculatePassiveCultivation,
  cleanupPoisonStacks,
  canEnablePeaceMode,
  ACTIVITY_SOURCES,
  DEEP_CULTIVATION_DURATION,
  DEEP_CULTIVATION_COOLDOWN,
  CULTIVATION_COOLDOWN_MIN,
  CULTIVATION_COOLDOWN_MAX,
  type CultivationExecuteResult,
  type DeepCultivationResult,
  type PoisonStack,
  type TaiyiEffects
} from '../game/systems/cultivation'
import {
  isBuffActive,
  calculateConsciousnessBonus,
  cleanExpiredDebuffs,
  calculateTotalDebuffEffect,
  type ElementType,
  type ConsciousnessDebuff
} from '../game/constants/taiyi'
import { NANGONG_WAN_CONFIG, TRIBULATION_CONFIG } from '../game/constants/worldEvents'
import { getItemTemplate } from '../game/constants/items'
import { worldEventService } from './worldEvent.service'
import { inventoryService } from './inventory.service'
import { soulCollapseService } from './soulCollapse.service'
import { getIO, emitToPlayer } from '../socket/index'

const characterRepository = AppDataSource.getRepository(Character)
const realmRepository = AppDataSource.getRepository(Realm)

// 太一门宗门ID
const TAIYI_SECT_ID = 'sect_taiyi'

export class CultivationService {
  // 获取太一门效果（如果角色是太一门弟子）
  private getTaiyiEffects(character: Character): TaiyiEffects | undefined {
    // 检查是否是太一门弟子
    if (character.sectId !== TAIYI_SECT_ID) {
      return undefined
    }

    const effects: TaiyiEffects = {}

    // 道心通明：神识带来的成功率加成
    if (character.consciousness > 0) {
      effects.consciousnessBonus = calculateConsciousnessBonus(character.consciousness)
    }

    // 神识冲击减益：检查是否被施加了debuff
    if (character.consciousnessDebuffsJson) {
      let debuffs: ConsciousnessDebuff[] = JSON.parse(character.consciousnessDebuffsJson)
      debuffs = cleanExpiredDebuffs(debuffs)
      if (debuffs.length > 0) {
        effects.debuffEffect = calculateTotalDebuffEffect(debuffs)
        // 同时更新character的debuffs（清理过期的）
        character.consciousnessDebuffsJson = JSON.stringify(debuffs)
      }
    }

    // 检查润水之息（water）和厚土之息（earth）增益
    if (character.activeBuffElement && character.buffExpiresAt) {
      if (isBuffActive(character.buffExpiresAt)) {
        const activeElement = character.activeBuffElement as ElementType
        if (activeElement === 'water') {
          effects.waterBuffActive = true
        } else if (activeElement === 'earth') {
          effects.earthBuffActive = true
        }
      }
    }

    return effects
  }
  // 获取修炼状态
  async getCultivationStatus(characterId: string) {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    const spiritRoot = SPIRIT_ROOTS[character.spiritRootId]
    if (!spiritRoot) {
      throw new Error('灵根信息不存在')
    }

    const poisonStacks: PoisonStack[] = JSON.parse(character.poisonStacks || '[]')
    const totalPoisonStacks = poisonStacks.reduce((sum, p) => sum + p.stacks, 0)

    // 获取太一门效果用于显示正确的成功率
    const taiyiEffects = this.getTaiyiEffects(character)

    const daoHeart = getDaoHeartLevel(character.activityPoints)
    const rates = calculateCultivationRates(spiritRoot, character.activityPoints, totalPoisonStacks, taiyiEffects)
    const cooldownStatus = checkCooldown(character.lastCultivationTime, character.currentCooldown)
    const deepCooldownStatus = checkCooldown(character.lastDeepCultivationTime, DEEP_CULTIVATION_COOLDOWN)

    // 检查深度闭关是否进行中
    let deepSession = null
    if (character.deepCultivationStartTime && character.deepCultivationEndTime) {
      const now = Date.now()
      if (now < character.deepCultivationEndTime) {
        deepSession = {
          startTime: character.deepCultivationStartTime,
          endTime: character.deepCultivationEndTime,
          isActive: true,
          remainingTime: character.deepCultivationEndTime - now
        }
      }
    }

    return {
      spiritRoot,
      daoHeart,
      activityPoints: character.activityPoints,
      activityHistory: JSON.parse(character.activityHistory || '{}'),
      rates,
      cooldownStatus,
      deepCooldownStatus,
      deepSession,
      lastCultivationTime: character.lastCultivationTime ? Number(character.lastCultivationTime) : null,
      currentCooldown: character.currentCooldown,
      lastDeepCultivationTime: character.lastDeepCultivationTime ? Number(character.lastDeepCultivationTime) : null,
      poisonStacks, // 返回数组而不是总数
      peaceMode: character.peaceMode,
      canCultivate: cooldownStatus.canCultivate && !deepSession,
      canStartDeepCultivation: deepCooldownStatus.canCultivate && !deepSession,
      canTogglePeaceMode: canEnablePeaceMode(character.realm?.tier || 1),
      // 太一门效果
      taiyiEffects: taiyiEffects
        ? {
            consciousnessBonus: taiyiEffects.consciousnessBonus || 0,
            debuffEffect: taiyiEffects.debuffEffect || 0,
            waterBuffActive: taiyiEffects.waterBuffActive || false,
            earthBuffActive: taiyiEffects.earthBuffActive || false
          }
        : null
    }
  }

  // 执行闭关修炼
  async startCultivation(characterId: string): Promise<CultivationExecuteResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    const spiritRoot = SPIRIT_ROOTS[character.spiritRootId]
    if (!spiritRoot) {
      throw new Error('灵根信息不存在')
    }

    // 检查是否在深度闭关中
    if (character.deepCultivationStartTime && character.deepCultivationEndTime) {
      if (Date.now() < character.deepCultivationEndTime) {
        throw new Error('正在神游太虚中，无法进行普通闭关')
      }
    }

    // 检查冷却
    const cooldownStatus = checkCooldown(character.lastCultivationTime, character.currentCooldown)
    if (!cooldownStatus.canCultivate) {
      throw new Error(`闭关冷却中，请${cooldownStatus.remainingTimeDisplay}后再试`)
    }

    // 清理过期丹毒
    let poisonStacks: PoisonStack[] = JSON.parse(character.poisonStacks || '[]')
    poisonStacks = cleanupPoisonStacks(poisonStacks)
    const totalPoisonStacks = poisonStacks.reduce((sum, p) => sum + p.stacks, 0)

    // 获取太一门效果（如果是太一门弟子）
    const taiyiEffects = this.getTaiyiEffects(character)

    // 执行修炼
    const realmTier = character.realm?.tier || 1
    const result = executeCultivation(spiritRoot, character.activityPoints, realmTier, totalPoisonStacks, taiyiEffects)

    // 应用世界事件buff加成
    const worldEventMultiplier = await worldEventService.getCultivationMultiplier(characterId)
    let adjustedExp = Math.floor(result.finalExp * worldEventMultiplier)

    // 应用道心破碎惩罚（闭关收益-50%）
    const shatteredStatus = await soulCollapseService.getSoulShatteredStatus(characterId)
    const soulShatteredPenalty = shatteredStatus.isActive ? shatteredStatus.cultivationPenalty : 0
    if (soulShatteredPenalty > 0) {
      adjustedExp = Math.floor(adjustedExp * (1 - soulShatteredPenalty))
    }

    // 处理奇遇物品奖励
    let adventureItemReward: { itemId: string; name: string } | null = null
    if (result.adventure?.itemReward) {
      // 有物品奖励的奇遇，添加到背包
      await inventoryService.addItem(characterId, result.adventure.itemReward, 1)
      const itemTemplate = getItemTemplate(result.adventure.itemReward)
      adventureItemReward = {
        itemId: result.adventure.itemReward,
        name: itemTemplate?.name || result.adventure.itemReward
      }
    }

    // 检查南宫婉奇遇状态
    let nangongWanTriggered = false
    let nangongWanMessage = ''

    if (character.nangongWanActive) {
      // 南宫婉奇遇期间，修为储存而不是直接获得
      character.nangongWanStoredExp = Number(character.nangongWanStoredExp) + adjustedExp
    } else {
      // 检查是否触发南宫婉奇遇（筑基期0.1%概率）
      if (realmTier === NANGONG_WAN_CONFIG.REQUIRED_TIER && Math.random() < NANGONG_WAN_CONFIG.TRIGGER_CHANCE) {
        nangongWanTriggered = true
        nangongWanMessage = await this.triggerNangongWanAdventure(character)
        // 触发后本次修炼的修为也储存
        character.nangongWanStoredExp = adjustedExp
      } else {
        character.experience = Number(character.experience) + adjustedExp
      }
    }

    // 更新角色数据
    character.lastCultivationTime = Date.now()
    character.currentCooldown = result.cooldown
    character.poisonStacks = JSON.stringify(poisonStacks)

    // 更新修炼进度百分比
    const requiredExp = character.realm?.requiredExperience || 100
    character.realmProgress = Math.min(100, Math.floor((Number(character.experience) / Number(requiredExp)) * 100))

    // 先检查每日重置，再增加活跃度（避免刚加的活跃度被衰减）
    this.checkDailyReset(character)
    this.addActivityInternal(character, 'cultivation')

    await characterRepository.save(character)

    // 检查是否可以突破（南宫婉奇遇期间不检查突破）
    let breakthroughResult: { success: boolean; newRealm?: Realm; message: string } = { success: false, message: '' }
    if (!character.nangongWanActive && !nangongWanTriggered) {
      breakthroughResult = await this.tryBreakthrough(character)
    }

    // 构建返回结果
    const returnResult: CultivationExecuteResult & {
      nangongWan?: { triggered: boolean; message: string; storedExp?: number }
      worldEventMultiplier?: number
      adventureItemReward?: { itemId: string; name: string }
      soulShattered?: { active: boolean; penalty: number; remainingMs: number }
    } = {
      ...result,
      finalExp: adjustedExp, // 覆盖为调整后的经验
      breakthrough: breakthroughResult.success
        ? {
            newRealmName: breakthroughResult.newRealm?.name,
            message: breakthroughResult.message
          }
        : undefined,
      adventureItemReward: adventureItemReward || undefined,
      soulShattered: shatteredStatus.isActive
        ? {
            active: true,
            penalty: soulShatteredPenalty,
            remainingMs: shatteredStatus.remainingMs
          }
        : undefined
    }

    // 添加南宫婉奇遇信息
    if (nangongWanTriggered) {
      returnResult.nangongWan = {
        triggered: true,
        message: nangongWanMessage,
        storedExp: adjustedExp
      }
    } else if (character.nangongWanActive) {
      returnResult.nangongWan = {
        triggered: false,
        message: '修为已储存',
        storedExp: Number(character.nangongWanStoredExp)
      }
    }

    // 添加世界事件加成信息
    if (worldEventMultiplier !== 1.0) {
      returnResult.worldEventMultiplier = worldEventMultiplier
    }

    return returnResult
  }

  // 开始深度闭关
  async startDeepCultivation(characterId: string): Promise<{ success: boolean; endTime: number }> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    // 检查是否已在深度闭关中
    if (character.deepCultivationStartTime && character.deepCultivationEndTime) {
      if (Date.now() < character.deepCultivationEndTime) {
        throw new Error('已在神游太虚中')
      }
    }

    // 检查冷却
    const cooldownStatus = checkCooldown(character.lastDeepCultivationTime, DEEP_CULTIVATION_COOLDOWN)
    if (!cooldownStatus.canCultivate) {
      throw new Error(`神游太虚冷却中，请${cooldownStatus.remainingTimeDisplay}后再试`)
    }

    const now = Date.now()
    character.deepCultivationStartTime = now
    character.deepCultivationEndTime = now + DEEP_CULTIVATION_DURATION

    await characterRepository.save(character)

    return {
      success: true,
      endTime: character.deepCultivationEndTime
    }
  }

  // 结束深度闭关
  async finishDeepCultivation(characterId: string, forceExit: boolean = false): Promise<DeepCultivationResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (!character.deepCultivationStartTime || !character.deepCultivationEndTime) {
      throw new Error('未在神游太虚中')
    }

    const spiritRoot = SPIRIT_ROOTS[character.spiritRootId]
    if (!spiritRoot) {
      throw new Error('灵根信息不存在')
    }

    const now = Date.now()
    const wasEarlyExit = forceExit || now < character.deepCultivationEndTime
    const actualDuration = wasEarlyExit
      ? now - character.deepCultivationStartTime
      : Math.min(now - character.deepCultivationStartTime, DEEP_CULTIVATION_DURATION)

    // 获取太一门效果（如果是太一门弟子）
    const taiyiEffects = this.getTaiyiEffects(character)

    const realmTier = character.realm?.tier || 1
    const result = calculateDeepCultivation(spiritRoot, character.activityPoints, realmTier, actualDuration, wasEarlyExit, taiyiEffects)

    // 更新角色数据
    character.experience = Number(character.experience) + result.totalExp
    character.lastDeepCultivationTime = Date.now()
    character.deepCultivationStartTime = null
    character.deepCultivationEndTime = null

    // 更新修炼进度百分比
    const requiredExp = character.realm?.requiredExperience || 100
    character.realmProgress = Math.min(100, Math.floor((Number(character.experience) / Number(requiredExp)) * 100))

    // 先检查每日重置，再增加活跃度
    this.checkDailyReset(character)
    this.addActivityInternal(character, 'deep_cultivation')

    await characterRepository.save(character)

    // 神游太虚特殊奇遇物品奖励
    if (result.specialEncounter) {
      try {
        await inventoryService.addItem(characterId, result.specialEncounter.itemReward, 1)
      } catch (error) {
        console.error('深度闭关奇遇物品发放失败:', error)
      }
    }

    // 检查是否可以突破
    const breakthroughResult = await this.tryBreakthrough(character)

    return {
      ...result,
      breakthrough: breakthroughResult.success
        ? {
            newRealmName: breakthroughResult.newRealm?.name,
            message: breakthroughResult.message
          }
        : undefined
    }
  }

  // 切换和平模式
  async togglePeaceMode(characterId: string): Promise<boolean> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    const realmTier = character.realm?.tier || 1
    if (!canEnablePeaceMode(realmTier)) {
      throw new Error('只有炼气期修士可以开启和平模式')
    }

    character.peaceMode = !character.peaceMode
    await characterRepository.save(character)

    return character.peaceMode
  }

  // 添加丹毒
  async addPoisonStack(characterId: string, pillType: string): Promise<number> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    let poisonStacks: PoisonStack[] = JSON.parse(character.poisonStacks || '[]')
    poisonStacks = cleanupPoisonStacks(poisonStacks)

    const existing = poisonStacks.find(p => p.pillType === pillType)
    if (existing) {
      existing.stacks = Math.min(existing.stacks + 1, 5)
      existing.lastUseTime = Date.now()
    } else {
      poisonStacks.push({
        pillType,
        stacks: 1,
        lastUseTime: Date.now()
      })
    }

    character.poisonStacks = JSON.stringify(poisonStacks)
    await characterRepository.save(character)

    return poisonStacks.reduce((sum, p) => sum + p.stacks, 0)
  }

  // 清除所有丹毒
  async clearAllPoison(characterId: string): Promise<void> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    character.poisonStacks = '[]'
    await characterRepository.save(character)
  }

  // 内部方法：增加活跃度
  private addActivityInternal(character: Character, sourceId: string): boolean {
    const source = ACTIVITY_SOURCES.find(s => s.id === sourceId)
    if (!source) return false

    const history: Record<string, number> = JSON.parse(character.activityHistory || '{}')
    const currentCount = history[sourceId] || 0

    if (currentCount >= source.dailyLimit) {
      return false
    }

    character.activityPoints += source.points
    history[sourceId] = currentCount + 1
    character.activityHistory = JSON.stringify(history)

    return true
  }

  // 检查每日重置
  private checkDailyReset(character: Character): void {
    const today = new Date().toDateString()
    if (character.lastActivityReset !== today) {
      character.activityPoints = calculateDailyActivityDecay(character.activityPoints)
      character.activityHistory = '{}'
      character.lastActivityReset = today
    }
  }

  // 处理上线（被动修炼结算）
  async handleOnline(characterId: string): Promise<number> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    let passiveExp = 0
    if (character.lastOnlineTime) {
      passiveExp = calculatePassiveCultivation(character.lastOnlineTime)
      if (passiveExp > 0) {
        character.experience = Number(character.experience) + passiveExp

        // 更新修炼进度百分比
        const requiredExp = character.realm?.requiredExperience || 100
        character.realmProgress = Math.min(100, Math.floor((Number(character.experience) / Number(requiredExp)) * 100))
      }
    }

    character.lastOnlineTime = Date.now()

    // 检查深度闭关是否完成
    if (character.deepCultivationStartTime && character.deepCultivationEndTime) {
      if (Date.now() >= character.deepCultivationEndTime) {
        // 自动结算深度闭关（不作为强制退出）
        // 这里只更新时间，让玩家主动领取结果
      }
    }

    // 检查每日重置
    this.checkDailyReset(character)

    await characterRepository.save(character)

    return passiveExp
  }

  /**
   * 尝试突破境界
   * 当修为达到当前境界要求时自动突破到下一个境界
   * 支持连续突破：如果经验足够，可以连续突破多个境界
   * 注意：炼气圆满突破筑基需要筑基丹，结丹/元婴之劫需要手动触发
   * @returns 突破结果，如果突破成功返回最终境界信息
   */
  async tryBreakthrough(
    character: Character
  ): Promise<{ success: boolean; newRealm?: Realm; message: string; breakthroughCount?: number; needsTribulation?: string }> {
    if (!character.realm) {
      return { success: false, message: '境界信息不存在' }
    }

    let currentExp = Number(character.experience)
    let requiredExp = Number(character.realm.requiredExperience)

    // 修为未达到要求
    if (currentExp < requiredExp) {
      return { success: false, message: '修为不足' }
    }

    let breakthroughCount = 0
    let finalRealm: Realm | null = null
    const breakthroughMessages: string[] = []

    // 循环突破，直到修为不足或达到最高境界
    while (currentExp >= requiredExp) {
      // 查找下一个境界
      const currentTier = character.realm!.tier
      const currentSubTier = character.realm!.subTier

      let nextTier = currentTier
      let nextSubTier = currentSubTier + 1

      if (nextSubTier > 4) {
        nextTier = currentTier + 1
        nextSubTier = 1
      }

      // 检查是否已达最高境界
      if (nextTier > 9) {
        break
      }

      // 检查是否需要渡劫
      // 炼气圆满 -> 筑基：需要筑基丹
      if (
        currentTier === TRIBULATION_CONFIG.FOUNDATION.REQUIRED_TIER &&
        currentSubTier === TRIBULATION_CONFIG.FOUNDATION.REQUIRED_SUB_TIER
      ) {
        // 检查是否有筑基丹
        const hasFoundationPill = await inventoryService.hasItems(
          character.id,
          TRIBULATION_CONFIG.FOUNDATION.REQUIRED_ITEMS.map(i => ({ itemId: i.itemId, quantity: i.quantity }))
        )
        if (!hasFoundationPill) {
          // 没有筑基丹，保存已有突破并停止
          if (breakthroughCount > 0 && finalRealm) {
            character.realmProgress = Math.min(100, Math.floor((Number(character.experience) / Number(finalRealm.requiredExperience)) * 100))
            character.maxHp = 100 + finalRealm.hpBonus
            character.maxMp = 50 + finalRealm.mpBonus
            character.attack = 10 + finalRealm.attackBonus
            character.defense = 5 + finalRealm.defenseBonus
            await characterRepository.save(character)
          }
          return {
            success: breakthroughCount > 0,
            newRealm: finalRealm || undefined,
            message:
              breakthroughCount > 0 ? `突破至${finalRealm?.name}，但炼气圆满需要筑基丹才能突破筑基` : '炼气圆满需要筑基丹才能突破筑基',
            breakthroughCount,
            needsTribulation: 'foundation'
          }
        }
        // 有筑基丹，消耗并继续突破
        await inventoryService.removeItems(
          character.id,
          TRIBULATION_CONFIG.FOUNDATION.REQUIRED_ITEMS.map(i => ({ itemId: i.itemId, quantity: i.quantity }))
        )
      }

      // 筑基圆满 -> 结丹：需要手动渡劫
      if (
        currentTier === TRIBULATION_CONFIG.CORE_FORMATION.REQUIRED_TIER &&
        currentSubTier === TRIBULATION_CONFIG.CORE_FORMATION.REQUIRED_SUB_TIER
      ) {
        // 保存已有突破
        if (breakthroughCount > 0 && finalRealm) {
          character.realmProgress = Math.min(100, Math.floor((Number(character.experience) / Number(finalRealm.requiredExperience)) * 100))
          character.maxHp = 100 + finalRealm.hpBonus
          character.maxMp = 50 + finalRealm.mpBonus
          character.attack = 10 + finalRealm.attackBonus
          character.defense = 5 + finalRealm.defenseBonus
          await characterRepository.save(character)
        }
        return {
          success: breakthroughCount > 0,
          newRealm: finalRealm || undefined,
          message: breakthroughCount > 0 ? `突破至${finalRealm?.name}，筑基圆满需要主动渡结丹之劫` : '筑基圆满需要主动渡结丹之劫',
          breakthroughCount,
          needsTribulation: 'core_formation'
        }
      }

      // 结丹圆满 -> 元婴：需要手动渡劫
      if (
        currentTier === TRIBULATION_CONFIG.NASCENT_SOUL.REQUIRED_TIER &&
        currentSubTier === TRIBULATION_CONFIG.NASCENT_SOUL.REQUIRED_SUB_TIER
      ) {
        // 保存已有突破
        if (breakthroughCount > 0 && finalRealm) {
          character.realmProgress = Math.min(100, Math.floor((Number(character.experience) / Number(finalRealm.requiredExperience)) * 100))
          character.maxHp = 100 + finalRealm.hpBonus
          character.maxMp = 50 + finalRealm.mpBonus
          character.attack = 10 + finalRealm.attackBonus
          character.defense = 5 + finalRealm.defenseBonus
          await characterRepository.save(character)
        }
        return {
          success: breakthroughCount > 0,
          newRealm: finalRealm || undefined,
          message: breakthroughCount > 0 ? `突破至${finalRealm?.name}，结丹圆满需要主动渡元婴之劫` : '结丹圆满需要主动渡元婴之劫',
          breakthroughCount,
          needsTribulation: 'nascent_soul'
        }
      }

      // 查找下一个境界的数据
      const nextRealm = await realmRepository.findOne({
        where: { tier: nextTier, subTier: nextSubTier }
      })

      if (!nextRealm) {
        console.error(`❌ 找不到境界数据: tier=${nextTier}, subTier=${nextSubTier}，突破中止`)
        break
      }

      // 执行突破：扣除当前境界所需修为，更新境界
      currentExp = currentExp - requiredExp
      character.experience = currentExp
      character.realmId = nextRealm.id
      character.realm = nextRealm
      finalRealm = nextRealm
      breakthroughCount++
      breakthroughMessages.push(nextRealm.name)

      // 更新所需经验为新境界的要求
      requiredExp = Number(nextRealm.requiredExperience)
    }

    // 如果没有发生突破
    if (breakthroughCount === 0 || !finalRealm) {
      return { success: false, message: '突破失败' }
    }

    // 更新最终进度百分比
    character.realmProgress = Math.min(100, Math.floor((Number(character.experience) / Number(finalRealm.requiredExperience)) * 100))

    // 更新属性加成（使用最终境界）
    character.maxHp = 100 + finalRealm.hpBonus
    character.maxMp = 50 + finalRealm.mpBonus
    character.attack = 10 + finalRealm.attackBonus
    character.defense = 5 + finalRealm.defenseBonus

    await characterRepository.save(character)

    // 生成突破消息
    let message: string
    if (breakthroughCount === 1) {
      message = `恭喜突破至${finalRealm.name}！`
    } else {
      message = `连续突破${breakthroughCount}次，直达${finalRealm.name}！`
    }

    return {
      success: true,
      newRealm: finalRealm,
      message,
      breakthroughCount
    }
  }

  // ========== 南宫婉奇遇系统 ==========

  /**
   * 触发南宫婉奇遇
   */
  private async triggerNangongWanAdventure(character: Character): Promise<string> {
    const now = Date.now()

    // 保存原境界信息
    character.nangongWanOriginalTier = character.realm?.tier || 1
    character.nangongWanOriginalSubTier = character.realm?.subTier || 1
    character.nangongWanOriginalRealmId = character.realmId

    // 设置奇遇状态
    character.nangongWanActive = true
    character.nangongWanStartTime = now
    character.nangongWanEndTime = now + NANGONG_WAN_CONFIG.DURATION
    character.nangongWanStoredExp = 0

    // 境界跌落到炼气初期
    const fallRealm = await realmRepository.findOne({
      where: { tier: NANGONG_WAN_CONFIG.FALL_TO_TIER, subTier: NANGONG_WAN_CONFIG.FALL_TO_SUB_TIER }
    })

    if (fallRealm) {
      character.realmId = fallRealm.id
      character.realm = fallRealm
    }

    await characterRepository.save(character)

    // 发送个人通知
    const io = getIO()
    if (io) {
      emitToPlayer(io, character.id, 'nangong-wan:trigger', {
        message: NANGONG_WAN_CONFIG.TRIGGER_MESSAGE,
        duration: NANGONG_WAN_CONFIG.DURATION,
        endTime: character.nangongWanEndTime
      })
    }

    return NANGONG_WAN_CONFIG.TRIGGER_MESSAGE
  }

  /**
   * 结束南宫婉奇遇（手动或自动）
   */
  async endNangongWanAdventure(characterId: string): Promise<{
    success: boolean
    returnedExp: number
    message: string
    newRealm?: { id: number; name: string; tier: number; subTier: number }
  }> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (!character.nangongWanActive) {
      throw new Error('当前未处于南宫婉奇遇中')
    }

    // 恢复原境界
    const originalRealm = await realmRepository.findOne({
      where: {
        tier: character.nangongWanOriginalTier,
        subTier: character.nangongWanOriginalSubTier
      }
    })

    if (originalRealm) {
      character.realmId = originalRealm.id
      character.realm = originalRealm
    }

    // 返还储存的修为
    const returnedExp = Math.floor(Number(character.nangongWanStoredExp) * NANGONG_WAN_CONFIG.EXP_RETURN_MULTIPLIER)
    character.experience = Number(character.experience) + returnedExp

    // 更新修炼进度百分比
    const requiredExp = character.realm?.requiredExperience || 100
    character.realmProgress = Math.min(100, Math.floor((Number(character.experience) / Number(requiredExp)) * 100))

    // 重置南宫婉状态
    character.nangongWanActive = false
    character.nangongWanStartTime = null
    character.nangongWanEndTime = null
    character.nangongWanStoredExp = 0
    character.nangongWanOriginalTier = 1
    character.nangongWanOriginalSubTier = 1
    character.nangongWanOriginalRealmId = null

    await characterRepository.save(character)

    // 发送个人通知
    const io = getIO()
    if (io) {
      emitToPlayer(io, character.id, 'nangong-wan:end', {
        returnedExp,
        message: NANGONG_WAN_CONFIG.END_MESSAGE,
        newRealm: originalRealm
          ? {
              id: originalRealm.id,
              name: originalRealm.name,
              tier: originalRealm.tier,
              subTier: originalRealm.subTier
            }
          : undefined
      })
    }

    return {
      success: true,
      returnedExp,
      message: NANGONG_WAN_CONFIG.END_MESSAGE,
      newRealm: originalRealm
        ? {
            id: originalRealm.id,
            name: originalRealm.name,
            tier: originalRealm.tier,
            subTier: originalRealm.subTier
          }
        : undefined
    }
  }

  /**
   * 获取南宫婉奇遇状态
   */
  async getNangongWanStatus(characterId: string): Promise<{
    active: boolean
    startTime: number | null
    endTime: number | null
    storedExp: number
    originalRealm: { tier: number; subTier: number } | null
    remainingTime: number | null
  }> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (!character.nangongWanActive) {
      return {
        active: false,
        startTime: null,
        endTime: null,
        storedExp: 0,
        originalRealm: null,
        remainingTime: null
      }
    }

    const now = Date.now()
    const remainingTime = character.nangongWanEndTime ? Math.max(0, character.nangongWanEndTime - now) : null

    return {
      active: true,
      startTime: character.nangongWanStartTime,
      endTime: character.nangongWanEndTime,
      storedExp: Number(character.nangongWanStoredExp),
      originalRealm: {
        tier: character.nangongWanOriginalTier,
        subTier: character.nangongWanOriginalSubTier
      },
      remainingTime
    }
  }

  /**
   * 检查并结束过期的南宫婉奇遇（定时任务调用）
   */
  async checkAndEndExpiredNangongWan(): Promise<number> {
    const now = Date.now()

    // 查找所有过期的南宫婉奇遇
    const expiredCharacters = await characterRepository
      .createQueryBuilder('character')
      .where('character.nangongWanActive = true')
      .andWhere('character.nangongWanEndTime <= :now', { now })
      .getMany()

    let endedCount = 0

    for (const character of expiredCharacters) {
      try {
        await this.endNangongWanAdventure(character.id)
        endedCount++
        console.log(`[NangongWan] 自动结束 ${character.name} 的南宫婉奇遇`)
      } catch (error) {
        console.error(`[NangongWan] 结束 ${character.name} 的奇遇失败:`, error)
      }
    }

    return endedCount
  }
}

export const cultivationService = new CultivationService()
