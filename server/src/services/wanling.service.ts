/**
 * 万灵宗服务 - 灵兽养成系统
 */
import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { SpiritBeast } from '../models/SpiritBeast'
import { BeastRaid } from '../models/BeastRaid'
import { EntityManager } from 'typeorm'
import {
  WANLING_SECT_ID,
  BEAST_TEMPLATES,
  BEAST_RARITY_CONFIG,
  BEAST_SEARCH_CONFIG,
  BEAST_FEED_CONFIG,
  BEAST_LEVEL_CONFIG,
  BEAST_DEPLOY_CONFIG,
  BEAST_RAID_CONFIG,
  BEAST_LOYALTY_CONFIG,
  BEAST_CAPACITY_CONFIG,
  ABYSS_EXPLORE_CONFIG,
  BeastTemplate,
  SpiritBeastInfo,
  WanlingStatus,
  SearchResult,
  FeedResult,
  RaidResult,
  EvolveResult,
  AbyssExploreResult
} from '../game/constants/wanling'
import { inventoryService } from './inventory.service'
import { pvpService } from './pvp.service'
import { ERROR_CODES } from '../utils/errorCodes'
import { COOLDOWN_REDUCTION } from '../game/constants/fengxi'

const characterRepository = AppDataSource.getRepository(Character)
const spiritBeastRepository = AppDataSource.getRepository(SpiritBeast)
const beastRaidRepository = AppDataSource.getRepository(BeastRaid)

// ==================== 服务类 ====================

class WanlingService {
  /**
   * 验证万灵宗成员
   */
  private async validateWanlingMember(characterId: string): Promise<Character> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    if (character.sectId !== WANLING_SECT_ID) {
      throw { code: ERROR_CODES.WANLING_NOT_MEMBER, message: '非万灵宗弟子' }
    }

    return character
  }

  /**
   * 获取今日日期字符串
   */
  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0]
  }

  /**
   * 计算灵兽容量
   */
  private calculateBeastCapacity(character: Character): number {
    const baseCapacity = BEAST_CAPACITY_CONFIG.baseCapacity
    const realmBonus = (character.realmId - 1) * BEAST_CAPACITY_CONFIG.realmBonus
    return Math.min(baseCapacity + realmBonus, BEAST_CAPACITY_CONFIG.maxCapacity)
  }

  /**
   * 计算升级所需经验
   */
  private calculateExpToNextLevel(level: number): number {
    return Math.floor(BEAST_LEVEL_CONFIG.expPerLevel * Math.pow(BEAST_LEVEL_CONFIG.levelMultiplier, level - 1))
  }

  /**
   * 将 SpiritBeast 转换为 SpiritBeastInfo
   */
  private toBeastInfo(beast: SpiritBeast): SpiritBeastInfo {
    const template = BEAST_TEMPLATES[beast.templateId]
    const expToNextLevel = this.calculateExpToNextLevel(beast.level)

    // 计算进化信息
    let canEvolve = false
    let evolveInfo: SpiritBeastInfo['evolveInfo'] = undefined

    if (template?.evolvesTo && template.evolveLevel) {
      const targetTemplate = BEAST_TEMPLATES[template.evolvesTo]
      if (targetTemplate && beast.level >= template.evolveLevel) {
        canEvolve = true
        evolveInfo = {
          targetId: template.evolvesTo,
          targetName: targetTemplate.name,
          requiredLevel: template.evolveLevel,
          requiredItems: template.evolveItems?.map(item => ({
            itemId: item.itemId,
            itemName: item.itemId, // TODO: 从物品配置获取名称
            count: item.count,
            owned: 0 // TODO: 从背包获取
          })) || []
        }
      }
    }

    return {
      id: beast.id,
      templateId: beast.templateId,
      name: beast.name,
      customName: beast.customName || undefined,
      rarity: beast.rarity,
      level: beast.level,
      exp: beast.exp,
      expToNextLevel,
      stats: {
        attack: beast.attack,
        defense: beast.defense,
        speed: beast.speed,
        hp: beast.hp,
        currentHp: beast.currentHp
      },
      satiety: beast.satiety,
      loyalty: beast.loyalty,
      status: beast.status as SpiritBeastInfo['status'],
      deployedAt: beast.deployedAt || undefined,
      injuredUntil: beast.injuredUntil || undefined,
      skills: beast.skills,
      canEvolve,
      evolveInfo
    }
  }

  /**
   * 获取万灵宗状态
   */
  async getStatus(characterId: string): Promise<WanlingStatus> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    const isMember = character.sectId === WANLING_SECT_ID

    if (!isMember) {
      return {
        isMember: false,
        realm: character.realmId,
        beasts: [],
        maxBeasts: 0,
        deployedBeast: null,
        search: {
          canSearch: false,
          cooldownMs: 0,
          dailySearches: 0,
          maxDailySearches: 0
        },
        raid: {
          canRaid: false,
          cooldownMs: 0,
          dailyRaids: 0,
          maxDailyRaids: 0
        }
      }
    }

    // 计算有效的每日次数（不持久化，避免并发问题）
    const today = this.getTodayDate()
    const effectiveDailySearches = character.lastBeastSearchDate === today ? character.dailyBeastSearches : 0
    const effectiveDailyRaids = character.lastBeastRaidDate === today ? character.dailyBeastRaids : 0

    // 获取灵兽列表
    const beasts = await spiritBeastRepository.find({
      where: { characterId }
    })

    const beastInfos = beasts.map(b => this.toBeastInfo(b))
    const deployedBeast = beastInfos.find(b => b.status === 'deployed') || null

    // 计算寻觅冷却 (注意：bigint 从数据库返回的是字符串，需要转换)
    // 风雷翅装备时缩减30%
    const now = Date.now()
    const lastSearchTime = Number(character.lastBeastSearchTime) || 0
    const searchCooldownReduction = character.windThunderWingsEquipped ? COOLDOWN_REDUCTION.beastSearch.reduction : 0
    const searchActualCooldown = Math.floor(BEAST_SEARCH_CONFIG.cooldownMs * (1 - searchCooldownReduction))
    const searchCooldownRemaining = Math.max(0, (lastSearchTime + searchActualCooldown) - now)
    const canSearch = searchCooldownRemaining === 0 &&
      effectiveDailySearches < BEAST_SEARCH_CONFIG.dailyLimit &&
      character.realmId >= BEAST_SEARCH_CONFIG.minRealm

    // 计算偷菜冷却 (注意：bigint 从数据库返回的是字符串，需要转换)
    const lastRaidTime = Number(character.lastBeastRaidTime) || 0
    const raidCooldownRemaining = Math.max(0, (lastRaidTime + BEAST_RAID_CONFIG.cooldownMs) - now)
    const canRaid = raidCooldownRemaining === 0 &&
      effectiveDailyRaids < BEAST_RAID_CONFIG.dailyLimit &&
      character.realmId >= BEAST_RAID_CONFIG.minRealm &&
      deployedBeast !== null

    return {
      isMember: true,
      realm: character.realmId,
      beasts: beastInfos,
      maxBeasts: this.calculateBeastCapacity(character),
      deployedBeast,
      search: {
        canSearch,
        cooldownMs: searchCooldownRemaining,
        dailySearches: effectiveDailySearches,
        maxDailySearches: BEAST_SEARCH_CONFIG.dailyLimit
      },
      raid: {
        canRaid,
        cooldownMs: raidCooldownRemaining,
        dailyRaids: effectiveDailyRaids,
        maxDailyRaids: BEAST_RAID_CONFIG.dailyLimit
      }
    }
  }

  /**
   * 寻觅灵兽
   */
  async searchBeast(characterId: string): Promise<SearchResult> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const character = await manager.findOne(Character, {
        where: { id: characterId },
        lock: { mode: 'pessimistic_write' }
      })

      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      if (character.sectId !== WANLING_SECT_ID) {
        throw { code: ERROR_CODES.WANLING_NOT_MEMBER, message: '非万灵宗弟子' }
      }

      // 重置每日次数（在事务内）
      const today = this.getTodayDate()
      if (character.lastBeastSearchDate !== today) {
        character.dailyBeastSearches = 0
        character.lastBeastSearchDate = today
      }

      // 检查冷却（风雷翅装备时缩减30%）
      const now = Date.now()
      const lastSearchTime = Number(character.lastBeastSearchTime) || 0
      const baseCooldown = BEAST_SEARCH_CONFIG.cooldownMs
      const cooldownReduction = character.windThunderWingsEquipped ? COOLDOWN_REDUCTION.beastSearch.reduction : 0
      const actualCooldown = Math.floor(baseCooldown * (1 - cooldownReduction))
      if (now < lastSearchTime + actualCooldown) {
        throw { code: ERROR_CODES.WANLING_SEARCH_COOLDOWN, message: '寻觅灵兽冷却中' }
      }

      // 检查每日次数
      if (character.dailyBeastSearches >= BEAST_SEARCH_CONFIG.dailyLimit) {
        throw { code: ERROR_CODES.WANLING_SEARCH_DAILY_LIMIT, message: '今日寻觅次数已用尽' }
      }

      // 检查境界
      if (character.realmId < BEAST_SEARCH_CONFIG.minRealm) {
        throw { code: ERROR_CODES.WANLING_RAID_REALM_LOW, message: '境界不足，无法寻觅灵兽' }
      }

      // 检查容量
      const currentBeasts = await manager.count(SpiritBeast, { where: { characterId } })
      const maxCapacity = this.calculateBeastCapacity(character)
      if (currentBeasts >= maxCapacity) {
        throw { code: ERROR_CODES.WANLING_BEAST_MAX_CAPACITY, message: '灵兽数量已满' }
      }

      // 计算成功率
      const successRate = Math.min(
        100,
        BEAST_SEARCH_CONFIG.baseSuccessRate + character.realmId * BEAST_SEARCH_CONFIG.realmBonusRate
      )

      // 判断是否成功（先判断再更新状态）
      const isSuccess = Math.random() * 100 <= successRate

      // 更新寻觅状态
      character.lastBeastSearchTime = now
      character.dailyBeastSearches += 1

      if (!isSuccess) {
        // 失败时只保存角色状态
        await manager.save(Character, character)
        return {
          success: false,
          message: '寻觅失败，未能发现灵兽踪迹'
        }
      }

      // 随机选择灵兽稀有度
      const rarity = this.randomRarity()

      // 从对应稀有度的灵兽中随机选择
      let availableTemplates = Object.values(BEAST_TEMPLATES).filter(t => t.rarity === rarity)
      if (availableTemplates.length === 0) {
        // 没有对应稀有度的灵兽，降级到普通
        availableTemplates = Object.values(BEAST_TEMPLATES).filter(t => t.rarity === 'common')
        if (availableTemplates.length === 0) {
          await manager.save(Character, character)
          return {
            success: false,
            message: '未能发现灵兽踪迹'
          }
        }
      }

      const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)]

      // 创建灵兽
      const beast = manager.create(SpiritBeast, {
        characterId,
        templateId: template.id,
        name: template.name,
        rarity: template.rarity,
        level: 1,
        exp: 0,
        attack: template.baseStats.attack,
        defense: template.baseStats.defense,
        speed: template.baseStats.speed,
        hp: template.baseStats.hp,
        currentHp: template.baseStats.hp,
        satiety: BEAST_FEED_CONFIG.maxSatiety,
        loyalty: BEAST_LOYALTY_CONFIG.initialLoyalty,
        status: 'idle',
        lastSatietyDecayTime: now
      })
      beast.skills = template.skills

      // 在同一事务中保存角色和灵兽
      await manager.save(Character, character)
      await manager.save(SpiritBeast, beast)

      const rarityConfig = BEAST_RARITY_CONFIG[rarity as keyof typeof BEAST_RARITY_CONFIG]

      return {
        success: true,
        message: `成功捕获${rarityConfig.name}灵兽【${template.name}】！`,
        beast: this.toBeastInfo(beast)
      }
    })
  }

  /**
   * 随机选择稀有度
   */
  private randomRarity(): string {
    const weights = BEAST_SEARCH_CONFIG.rarityWeights
    const total = Object.values(weights).reduce((a, b) => a + b, 0)
    let random = Math.random() * total

    for (const [rarity, weight] of Object.entries(weights)) {
      random -= weight
      if (random <= 0) {
        return rarity
      }
    }
    return 'common'
  }

  /**
   * 获取灵兽列表
   */
  async getBeasts(characterId: string): Promise<SpiritBeastInfo[]> {
    await this.validateWanlingMember(characterId)

    const beasts = await spiritBeastRepository.find({
      where: { characterId }
    })

    return beasts.map(b => this.toBeastInfo(b))
  }

  /**
   * 喂养灵兽
   */
  async feedBeast(characterId: string, beastId: string, foodId: string): Promise<FeedResult> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const character = await manager.findOne(Character, {
        where: { id: characterId },
        lock: { mode: 'pessimistic_write' }
      })

      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      if (character.sectId !== WANLING_SECT_ID) {
        throw { code: ERROR_CODES.WANLING_NOT_MEMBER, message: '非万灵宗弟子' }
      }

      const beast = await manager.findOne(SpiritBeast, {
        where: { id: beastId, characterId },
        lock: { mode: 'pessimistic_write' }
      })

      if (!beast) {
        throw { code: ERROR_CODES.WANLING_BEAST_NOT_FOUND, message: '灵兽不存在' }
      }

      const food = BEAST_FEED_CONFIG.foods[foodId as keyof typeof BEAST_FEED_CONFIG.foods]
      if (!food) {
        throw { code: ERROR_CODES.WANLING_FEED_NO_FOOD, message: '食物不存在' }
      }

      // 检查饱食度
      if (beast.satiety >= BEAST_FEED_CONFIG.maxSatiety) {
        throw { code: ERROR_CODES.WANLING_FEED_SATIETY_FULL, message: '灵兽饱食度已满' }
      }

      // 检查灵石
      if (character.spiritStones < food.cost) {
        throw { code: ERROR_CODES.PLAYER_NOT_ENOUGH_SPIRIT_STONES, message: '灵石不足' }
      }

      // 扣除灵石
      character.spiritStones = Number(character.spiritStones) - food.cost

      // 增加饱食度和经验
      beast.satiety = Math.min(beast.satiety + food.satietyGain, BEAST_FEED_CONFIG.maxSatiety)
      beast.exp += food.expGain
      beast.loyalty = Math.min(beast.loyalty + BEAST_LOYALTY_CONFIG.feedLoyaltyGain, BEAST_LOYALTY_CONFIG.maxLoyalty)

      // 检查升级
      let levelUp = false
      let newLevel = beast.level
      const expToNextLevel = this.calculateExpToNextLevel(beast.level)

      if (beast.exp >= expToNextLevel && beast.level < BEAST_LEVEL_CONFIG.maxLevel) {
        beast.exp -= expToNextLevel
        beast.level += 1
        newLevel = beast.level
        levelUp = true

        // 更新属性
        const template = BEAST_TEMPLATES[beast.templateId]
        if (template) {
          const newStats = BEAST_LEVEL_CONFIG.statsPerLevel(template, beast.level)
          beast.attack = newStats.attack
          beast.defense = newStats.defense
          beast.speed = newStats.speed
          beast.hp = newStats.hp
          beast.currentHp = Math.min(beast.currentHp + 10, beast.hp) // 升级恢复部分HP
        }
      }

      // 在同一事务中保存
      await manager.save(Character, character)
      await manager.save(SpiritBeast, beast)

      return {
        success: true,
        message: levelUp ? `喂养成功！${beast.name}升级到${newLevel}级！` : `喂养成功！`,
        expGain: food.expGain,
        satietyGain: food.satietyGain,
        loyaltyGain: BEAST_LOYALTY_CONFIG.feedLoyaltyGain,
        levelUp,
        newLevel: levelUp ? newLevel : undefined
      }
    })
  }

  /**
   * 出战灵兽
   */
  async deployBeast(characterId: string, beastId: string): Promise<SpiritBeastInfo> {
    await this.validateWanlingMember(characterId)

    // 检查是否已有出战灵兽
    const deployedBeast = await spiritBeastRepository.findOne({
      where: { characterId, status: 'deployed' }
    })

    if (deployedBeast) {
      throw { code: ERROR_CODES.WANLING_MAX_DEPLOYED, message: '已有出战的灵兽' }
    }

    const beast = await spiritBeastRepository.findOne({
      where: { id: beastId, characterId }
    })

    if (!beast) {
      throw { code: ERROR_CODES.WANLING_BEAST_NOT_FOUND, message: '灵兽不存在' }
    }

    if (beast.status === 'injured') {
      throw { code: ERROR_CODES.WANLING_BEAST_INJURED, message: '灵兽受伤中，无法出战' }
    }

    if (beast.status !== 'idle' && beast.status !== 'resting') {
      throw { code: ERROR_CODES.WANLING_BEAST_BUSY, message: '灵兽正在执行任务' }
    }

    beast.status = 'deployed'
    beast.deployedAt = Date.now()
    await spiritBeastRepository.save(beast)

    return this.toBeastInfo(beast)
  }

  /**
   * 收回灵兽
   */
  async recallBeast(characterId: string, beastId: string): Promise<SpiritBeastInfo> {
    await this.validateWanlingMember(characterId)

    const beast = await spiritBeastRepository.findOne({
      where: { id: beastId, characterId }
    })

    if (!beast) {
      throw { code: ERROR_CODES.WANLING_BEAST_NOT_FOUND, message: '灵兽不存在' }
    }

    if (beast.status !== 'deployed') {
      throw { code: ERROR_CODES.WANLING_BEAST_NOT_DEPLOYED, message: '灵兽未出战' }
    }

    beast.status = 'idle'
    beast.deployedAt = null
    await spiritBeastRepository.save(beast)

    return this.toBeastInfo(beast)
  }

  /**
   * 灵兽休息
   */
  async restBeast(characterId: string, beastId: string): Promise<SpiritBeastInfo> {
    await this.validateWanlingMember(characterId)

    const beast = await spiritBeastRepository.findOne({
      where: { id: beastId, characterId }
    })

    if (!beast) {
      throw { code: ERROR_CODES.WANLING_BEAST_NOT_FOUND, message: '灵兽不存在' }
    }

    if (beast.status === 'deployed') {
      throw { code: ERROR_CODES.WANLING_BEAST_ALREADY_DEPLOYED, message: '请先收回灵兽' }
    }

    if (beast.status === 'raiding') {
      throw { code: ERROR_CODES.WANLING_BEAST_BUSY, message: '灵兽正在执行任务' }
    }

    beast.status = 'resting'
    await spiritBeastRepository.save(beast)

    return this.toBeastInfo(beast)
  }

  /**
   * 灵兽改名
   */
  async renameBeast(characterId: string, beastId: string, newName: string): Promise<SpiritBeastInfo> {
    await this.validateWanlingMember(characterId)

    // 验证名称
    if (!newName || newName.trim().length === 0) {
      throw { code: ERROR_CODES.WANLING_NAME_INVALID, message: '灵兽名字无效' }
    }

    if (newName.length > 10) {
      throw { code: ERROR_CODES.WANLING_NAME_TOO_LONG, message: '灵兽名字过长（最多10字）' }
    }

    const beast = await spiritBeastRepository.findOne({
      where: { id: beastId, characterId }
    })

    if (!beast) {
      throw { code: ERROR_CODES.WANLING_BEAST_NOT_FOUND, message: '灵兽不存在' }
    }

    beast.customName = newName.trim()
    await spiritBeastRepository.save(beast)

    return this.toBeastInfo(beast)
  }

  /**
   * 放生灵兽
   */
  async releaseBeast(characterId: string, beastId: string): Promise<{ success: boolean; message: string }> {
    await this.validateWanlingMember(characterId)

    const beast = await spiritBeastRepository.findOne({
      where: { id: beastId, characterId }
    })

    if (!beast) {
      throw { code: ERROR_CODES.WANLING_BEAST_NOT_FOUND, message: '灵兽不存在' }
    }

    if (beast.status === 'deployed' || beast.status === 'raiding') {
      throw { code: ERROR_CODES.WANLING_BEAST_BUSY, message: '请先收回灵兽' }
    }

    const beastName = beast.customName || beast.name
    await spiritBeastRepository.remove(beast)

    return {
      success: true,
      message: `已放生灵兽【${beastName}】`
    }
  }

  /**
   * 获取可偷菜目标列表
   */
  async getRaidTargets(characterId: string): Promise<{ id: string; name: string; realm: number; realmName: string }[]> {
    await this.validateWanlingMember(characterId)

    // 获取黄枫谷弟子
    const targets = await characterRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.realm', 'realm')
      .where('c.id != :characterId', { characterId })
      .andWhere('c.sectId = :sectId', { sectId: 'huangfeng' })
      .andWhere('c.herbGardenUnlocked > 0')
      .orderBy('c.updatedAt', 'DESC')
      .take(20)
      .getMany()

    return targets.map(t => ({
      id: t.id,
      name: t.name,
      realm: t.realmId,
      realmName: t.realm?.name || '未知'
    }))
  }

  /**
   * 灵兽偷菜
   */
  async raidGarden(characterId: string, targetId: string): Promise<RaidResult> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const character = await manager.findOne(Character, {
        where: { id: characterId },
        lock: { mode: 'pessimistic_write' }
      })

      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      if (character.sectId !== WANLING_SECT_ID) {
        throw { code: ERROR_CODES.WANLING_NOT_MEMBER, message: '非万灵宗弟子' }
      }

      // 重置每日次数（在事务内）
      const today = this.getTodayDate()
      if (character.lastBeastRaidDate !== today) {
        character.dailyBeastRaids = 0
        character.lastBeastRaidDate = today
      }

      // 检查冷却
      const now = Date.now()
      const lastRaidTime = Number(character.lastBeastRaidTime) || 0
      if (now < lastRaidTime + BEAST_RAID_CONFIG.cooldownMs) {
        throw { code: ERROR_CODES.WANLING_RAID_COOLDOWN, message: '偷菜冷却中' }
      }

      // 检查每日次数
      if (character.dailyBeastRaids >= BEAST_RAID_CONFIG.dailyLimit) {
        throw { code: ERROR_CODES.WANLING_RAID_DAILY_LIMIT, message: '今日偷菜次数已用尽' }
      }

      // 检查境界
      if (character.realmId < BEAST_RAID_CONFIG.minRealm) {
        throw { code: ERROR_CODES.WANLING_RAID_REALM_LOW, message: '境界不足' }
      }

      // 获取出战灵兽（加锁）
      const beast = await manager.findOne(SpiritBeast, {
        where: { characterId, status: 'deployed' },
        lock: { mode: 'pessimistic_write' }
      })

      if (!beast) {
        throw { code: ERROR_CODES.WANLING_RAID_NO_DEPLOYED, message: '没有出战的灵兽' }
      }

      // 获取目标
      const target = await manager.findOne(Character, {
        where: { id: targetId }
      })

      if (!target) {
        throw { code: ERROR_CODES.WANLING_RAID_TARGET_NOT_FOUND, message: '目标不存在' }
      }

      if (target.sectId !== 'huangfeng') {
        throw { code: ERROR_CODES.WANLING_RAID_TARGET_NO_GARDEN, message: '目标非黄枫谷弟子' }
      }

      // 更新偷菜状态
      character.lastBeastRaidTime = now
      character.dailyBeastRaids += 1

      // 计算成功率
      let successRate: number = BEAST_RAID_CONFIG.baseSuccessRate
      successRate += beast.speed * BEAST_RAID_CONFIG.speedBonusRate
      successRate += beast.loyalty * BEAST_RAID_CONFIG.loyaltySuccessBonus
      successRate = Math.min(successRate, BEAST_RAID_CONFIG.maxSuccessRate)

      const success = Math.random() * 100 < successRate
      let rewards: { itemId: string; itemName: string; count: number }[] = []
      let beastInjured = false
      let loyaltyChange = 0

      if (success) {
        // 成功 - 随机奖励
        const rewardConfig = BEAST_RAID_CONFIG.rewards.success
        const totalWeight = rewardConfig.reduce((a, b) => a + b.weight, 0)
        let random = Math.random() * totalWeight

        for (const reward of rewardConfig) {
          random -= reward.weight
          if (random <= 0) {
            const count = Math.floor(Math.random() * (reward.maxCount - reward.minCount + 1)) + reward.minCount
            rewards.push({
              itemId: reward.itemId,
              itemName: this.getItemName(reward.itemId),
              count
            })
            break
          }
        }

        loyaltyChange = 1 // 成功增加忠诚度
      } else {
        // 失败 - 灵兽受伤，保底奖励
        beastInjured = true
        beast.currentHp = Math.floor(beast.currentHp * (1 - BEAST_RAID_CONFIG.failureDamagePercent / 100))
        beast.status = 'injured'
        beast.injuredUntil = now + BEAST_RAID_CONFIG.injuryRecoveryMs
        loyaltyChange = -BEAST_LOYALTY_CONFIG.injuryLoyaltyLoss

        // 保底奖励
        rewards.push({
          itemId: BEAST_RAID_CONFIG.rewards.fallback.itemId,
          itemName: this.getItemName(BEAST_RAID_CONFIG.rewards.fallback.itemId),
          count: BEAST_RAID_CONFIG.rewards.fallback.count
        })
      }

      // 更新灵兽
      beast.loyalty = Math.max(
        BEAST_LOYALTY_CONFIG.minLoyalty,
        Math.min(beast.loyalty + loyaltyChange, BEAST_LOYALTY_CONFIG.maxLoyalty)
      )

      // 记录偷菜记录
      const raid = manager.create(BeastRaid, {
        raiderId: characterId,
        raiderName: character.name,
        beastId: beast.id,
        beastName: beast.customName || beast.name,
        targetId: target.id,
        targetName: target.name,
        success,
        beastInjured,
        loyaltyChange
      })
      raid.rewards = rewards

      // 在同一事务中保存所有数据
      await manager.save(Character, character)
      await manager.save(SpiritBeast, beast)
      await manager.save(BeastRaid, raid)

      return {
        success,
        message: success
          ? `${beast.customName || beast.name}成功从${target.name}的药园窃取了灵草！`
          : `${beast.customName || beast.name}被发现了！灵兽受伤需要休息。`,
        targetName: target.name,
        rewards,
        beastInjured,
        loyaltyChange
      }
    })
  }

  /**
   * 获取物品名称
   */
  private getItemName(itemId: string): string {
    const itemNames: Record<string, string> = {
      herb_lingcao: '灵草',
      herb_qingling: '青灵草',
      herb_zicao: '紫草',
      herb_huangjing: '黄精',
      herb_common: '普通灵草'
    }
    return itemNames[itemId] || itemId
  }

  /**
   * 进化灵兽
   */
  async evolveBeast(characterId: string, beastId: string): Promise<EvolveResult> {
    const character = await this.validateWanlingMember(characterId)

    const beast = await spiritBeastRepository.findOne({
      where: { id: beastId, characterId }
    })

    if (!beast) {
      throw { code: ERROR_CODES.WANLING_BEAST_NOT_FOUND, message: '灵兽不存在' }
    }

    const template = BEAST_TEMPLATES[beast.templateId]
    if (!template?.evolvesTo || !template.evolveLevel) {
      throw { code: ERROR_CODES.WANLING_EVOLVE_NOT_AVAILABLE, message: '该灵兽无法进化' }
    }

    if (beast.level < template.evolveLevel) {
      throw { code: ERROR_CODES.WANLING_EVOLVE_LEVEL_NOT_MET, message: `需要达到${template.evolveLevel}级才能进化` }
    }

    // TODO: 检查进化材料
    // if (template.evolveItems) {
    //   for (const item of template.evolveItems) {
    //     // 检查背包是否有足够材料
    //   }
    // }

    const newTemplate = BEAST_TEMPLATES[template.evolvesTo]
    if (!newTemplate) {
      throw { code: ERROR_CODES.WANLING_EVOLVE_NOT_AVAILABLE, message: '进化目标不存在' }
    }

    const oldName = beast.customName || beast.name
    const oldTemplateId = beast.templateId

    // 更新灵兽
    beast.templateId = newTemplate.id
    beast.name = newTemplate.name
    beast.rarity = newTemplate.rarity
    beast.skills = newTemplate.skills

    // 重新计算属性
    const newStats = BEAST_LEVEL_CONFIG.statsPerLevel(newTemplate, beast.level)
    beast.attack = newStats.attack
    beast.defense = newStats.defense
    beast.speed = newStats.speed
    beast.hp = newStats.hp
    beast.currentHp = beast.hp // 进化后满血

    await spiritBeastRepository.save(beast)

    return {
      success: true,
      message: `${oldName}成功进化为${newTemplate.name}！`,
      oldBeast: {
        templateId: oldTemplateId,
        name: oldName
      },
      newBeast: this.toBeastInfo(beast)
    }
  }

  /**
   * 获取偷菜记录
   */
  async getRaidHistory(characterId: string, limit: number = 20): Promise<BeastRaid[]> {
    await this.validateWanlingMember(characterId)

    return beastRaidRepository.find({
      where: { raiderId: characterId },
      order: { createdAt: 'DESC' },
      take: limit
    })
  }

  /**
   * 万兽渊探渊 - 探索万兽渊深处，挑战远古妖兽
   */
  async exploreAbyss(characterId: string): Promise<AbyssExploreResult> {
    const character = await this.validateWanlingMember(characterId)

    // 检查境界
    const realmTier = character.realmId ? Math.ceil(character.realmId / 4) : 1
    if (realmTier < ABYSS_EXPLORE_CONFIG.minRealm) {
      throw { code: ERROR_CODES.WANLING_ABYSS_REALM_LOW, message: '境界不足，需要结丹期以上方可探渊' }
    }

    // 检查冷却（使用lastAbyssExploreTime字段，需要在Character模型添加）
    const now = Date.now()
    const lastExploreTime = character.lastAbyssExploreTime ? Number(character.lastAbyssExploreTime) : 0
    if (now - lastExploreTime < ABYSS_EXPLORE_CONFIG.cooldownMs) {
      const remaining = ABYSS_EXPLORE_CONFIG.cooldownMs - (now - lastExploreTime)
      const hours = Math.floor(remaining / (60 * 60 * 1000))
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
      throw { code: ERROR_CODES.WANLING_ABYSS_COOLDOWN, message: `探渊冷却中，${hours}时${minutes}分后可再次探索` }
    }

    // 生成妖兽
    const beastPower =
      Math.floor(
        Math.random() * (ABYSS_EXPLORE_CONFIG.beastPowerRange.max - ABYSS_EXPLORE_CONFIG.beastPowerRange.min)
      ) + ABYSS_EXPLORE_CONFIG.beastPowerRange.min
    const beastNames = ['赤炎蛟', '玄冰蟒', '雷翼虎', '幽冥狼', '碧眼金雕', '九尾妖狐', '火鸦王', '冰魄蛛后']
    const beastName = beastNames[Math.floor(Math.random() * beastNames.length)]

    // 计算玩家战力
    const playerPower = await pvpService.calculatePower(character)

    // 计算胜率
    const successRate = Math.min((playerPower / beastPower) * 100, ABYSS_EXPLORE_CONFIG.maxSuccessRate)
    const victory = Math.random() * 100 < successRate

    // 更新冷却时间
    character.lastAbyssExploreTime = now
    await characterRepository.save(character)

    if (!victory) {
      return {
        success: true,
        message: `你在万兽渊深处遭遇了${beastName}（战力${beastPower.toLocaleString()}），激战后不敌撤退！`,
        beastName,
        beastPower,
        victory: false
      }
    }

    // 胜利奖励
    const rewards = {
      cultivation: ABYSS_EXPLORE_CONFIG.baseRewards.cultivation + Math.floor(beastPower / 100),
      spiritStones: ABYSS_EXPLORE_CONFIG.baseRewards.spiritStones + Math.floor(beastPower / 200)
    }

    character.experience = Number(character.experience) + rewards.cultivation
    character.spiritStones = Number(character.spiritStones) + rewards.spiritStones
    await characterRepository.save(character)

    // 气运爆发判定
    let luckBurst: AbyssExploreResult['luckBurst'] = undefined
    if (beastPower >= ABYSS_EXPLORE_CONFIG.luckBurst.minBeastPower) {
      if (Math.random() < ABYSS_EXPLORE_CONFIG.luckBurst.chance) {
        await inventoryService.addItem(characterId, ABYSS_EXPLORE_CONFIG.luckBurst.itemId, 1)
        luckBurst = {
          triggered: true,
          itemId: ABYSS_EXPLORE_CONFIG.luckBurst.itemId,
          itemName: '火凤之翎'
        }
      }
    }

    let message = `你在万兽渊深处战胜了${beastName}（战力${beastPower.toLocaleString()}），获得${rewards.cultivation}修为、${rewards.spiritStones}灵石！`
    if (luckBurst) {
      message += ` ${ABYSS_EXPLORE_CONFIG.luckBurst.description}`
    }

    return {
      success: true,
      message,
      beastName,
      beastPower,
      victory: true,
      rewards,
      luckBurst
    }
  }
}

export const wanlingService = new WanlingService()
