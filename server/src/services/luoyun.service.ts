/**
 * 落云宗专属系统服务 - 灵眼之树系统
 * 全服共享培育神树，贡献排名获取奖励
 */
import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { LingyanTree } from '../models/LingyanTree'
import { LingyanContribution } from '../models/LingyanContribution'
import { InventoryItem } from '../models/InventoryItem'
import {
  LUOYUN_SECT_ID,
  LINGYAN_TREE_CONFIG,
  WATERING_CONFIG,
  DEMON_PILL_CONFIG,
  getDemonPillConfig,
  DEFENSE_CONFIG,
  HARVEST_CONFIG,
  getTopRewardQuantity,
  BETRAYAL_CONFIG,
  LINGYAN_LIQUID_EFFECTS,
  getTodayDateString,
  // 新增环境/阶段系统导入
  ENVIRONMENT_CONFIG,
  ENVIRONMENT_CHANGE_CONFIG,
  GROWTH_STAGE_CONFIG,
  FRUIT_QUALITY_CONFIG,
  MAX_GROWTH_STAGE,
  MAX_SPIRIT_PATTERNS,
  ALL_ENVIRONMENTS,
  getSpiritRootElementMapping,
  canSatisfyEnvironment,
  calculateElementContribution,
  getRandomEnvironment,
  calculateGrowthStage,
  getStageProgress,
  getFruitQuality,
  type LingyanTreeStatus,
  type LingyanTreeState,
  type PlayerContributionState,
  type ContributionRanking,
  type TreeEnvironment,
  type ElementType
} from '../game/constants/luoyun'
import { SPIRIT_ROOTS } from '../game/constants/spiritRoots'
import { ERROR_CODES } from '../utils/errorCodes'
import { LessThan, MoreThan, EntityManager } from 'typeorm'

const characterRepository = AppDataSource.getRepository(Character)
const treeRepository = AppDataSource.getRepository(LingyanTree)
const contributionRepository = AppDataSource.getRepository(LingyanContribution)
const inventoryRepository = AppDataSource.getRepository(InventoryItem)

// ==================== 接口定义 ====================

export interface LuoyunStatus {
  isLuoyunMember: boolean
  tree: LingyanTreeState | null
  contribution: PlayerContributionState | null
  rankings: ContributionRanking[]
}

export interface WateringResult {
  success: boolean
  message: string
  maturityGain: number
  contributionGain: number
  newMaturity: number
  newContribution: number
  hasWoodRootBonus: boolean
  elementContributed: ElementType | null
  woodGained: number
}

export interface OfferPillResult {
  success: boolean
  message: string
  tier: number
  count: number
  maturityGain: number
  contributionGain: number
  newMaturity: number
  newContribution: number
  elementContributed: ElementType | null
  woodGained: number
}

export interface DefendResult {
  success: boolean
  message: string
  contributionGain: number
  newContribution: number
  defendersCount: number
  defendersNeeded: number
}

export interface HarvestResult {
  success: boolean
  message: string
  rewards: {
    itemId: string
    itemName: string
    quantity: number
  }[]
  expGained: number
  rank: number
  isTopRanked: boolean
  fruitQuality: {
    name: string
    spiritPatterns: number
    color: string
  }
}

export interface LiquidUseResult {
  success: boolean
  message: string
  effect: 'root' | 'herb'
  rootUpgraded?: {
    oldRoot: string
    newRoot: string
  }
  herbBuffExpires?: number
}

export interface SatisfyEnvironmentResult {
  success: boolean
  message: string
  environment: TreeEnvironment
  elementContributed: ElementType | null
  woodGained: number
  contributionGain: number
  newContribution: number
  stageProgress: {
    currentStage: number
    stageName: string
    totalWood: number
    progress: number
  }
}

export interface EnvironmentChangeResult {
  oldEnvironment: TreeEnvironment
  newEnvironment: TreeEnvironment
  wasSatisfied: boolean
  maturityPenalty: number
}

// ==================== 服务类 ====================

class LuoyunService {
  /**
   * 验证是否为落云宗弟子
   */
  private async validateMember(characterId: string): Promise<Character> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    if (character.sectId !== LUOYUN_SECT_ID) {
      throw { code: ERROR_CODES.LUOYUN_NOT_MEMBER, message: '只有落云宗弟子才能使用此功能' }
    }

    return character
  }

  /**
   * 获取物品名称
   */
  private getItemName(itemId: string): string {
    const itemNames: Record<string, string> = {
      'lingyan_fruit_common': '普通灵眼果',
      'lingyan_fruit_fine': '精品灵眼果',
      'lingyan_fruit_rare': '稀有灵眼果',
      'lingyan_fruit_epic': '史诗灵眼果',
      'lingyan_fruit_legendary': '传说灵眼果',
      'spirit_stone': '灵石',
      'cultivation_pill': '修炼丹',
      'spirit_water': '灵泉水'
    }
    return itemNames[itemId] || itemId
  }

  /**
   * 获取或创建灵眼之树（全局单例）
   */
  private async getOrCreateTree(manager?: EntityManager): Promise<LingyanTree> {
    const repo = manager ? manager.getRepository(LingyanTree) : treeRepository

    let tree = await repo.findOne({
      where: {},
      lock: manager ? { mode: 'pessimistic_write' } : undefined
    })

    if (!tree) {
      tree = repo.create({
        maturity: 0,
        cycle: 1,
        status: 'growing',
        // 新增环境系统初始化
        environment: getRandomEnvironment(),
        lastEnvironmentChangeAt: Date.now(),
        environmentSatisfied: false,
        environmentSatisfiedBy: null,
        // 新增阶段系统初始化
        currentStage: 1,
        stageElementPool: { wood: 0, water: 0, earth: 0, fire: 0, metal: 0 },
        spiritPatterns: 0
      })
      await repo.save(tree)
    }

    return tree
  }

  /**
   * 获取或创建玩家贡献记录
   */
  private async getOrCreateContribution(characterId: string, cycle: number, manager?: EntityManager): Promise<LingyanContribution> {
    const repo = manager ? manager.getRepository(LingyanContribution) : contributionRepository

    let contribution = await repo.findOne({
      where: { characterId, cycle },
      lock: manager ? { mode: 'pessimistic_write' } : undefined
    })

    if (!contribution) {
      contribution = repo.create({
        characterId,
        cycle,
        contribution: 0,
        wateringCount: 0
      })
      await repo.save(contribution)
    }

    return contribution
  }

  /**
   * 检查角色是否拥有木灵根（双倍贡献）
   */
  private hasWoodRoot(character: Character): boolean {
    const rootId = character.spiritRootId
    // 木灵根或变异木灵根
    return rootId === 'wood_root' || rootId === 'mutant_wood_root' || rootId === 'wood_spirit_root'
  }

  /**
   * 获取贡献排名
   */
  private async getRankings(cycle: number, limit: number = 10): Promise<ContributionRanking[]> {
    const contributions = await contributionRepository.find({
      where: { cycle },
      order: { contribution: 'DESC' },
      take: limit,
      relations: ['character']
    })

    return contributions.map((c, index) => ({
      rank: index + 1,
      characterId: c.characterId,
      characterName: c.character?.name || '未知',
      contribution: c.contribution,
      rewardQuantity: getTopRewardQuantity(index + 1)
    }))
  }

  /**
   * 获取玩家排名
   */
  private async getPlayerRank(characterId: string, cycle: number): Promise<number> {
    const playerContrib = await contributionRepository.findOne({
      where: { characterId, cycle }
    })

    if (!playerContrib || playerContrib.contribution === 0) {
      return 0
    }

    const higherCount = await contributionRepository.count({
      where: {
        cycle,
        contribution: MoreThan(playerContrib.contribution)
      }
    })

    return higherCount + 1
  }

  // ==================== 公开方法 ====================

  /**
   * 获取落云宗状态（灵树状态 + 个人贡献 + 排名）
   */
  async getStatus(characterId: string): Promise<LuoyunStatus> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    const isLuoyunMember = character.sectId === LUOYUN_SECT_ID

    if (!isLuoyunMember) {
      return {
        isLuoyunMember: false,
        tree: null,
        contribution: null,
        rankings: []
      }
    }

    const tree = await this.getOrCreateTree()
    const contribution = await this.getOrCreateContribution(characterId, tree.cycle)
    const rankings = await this.getRankings(tree.cycle)
    const playerRank = await this.getPlayerRank(characterId, tree.cycle)

    const now = Date.now()
    const todayDate = getTodayDateString()

    // 计算入侵剩余时间
    let invasionTimeRemaining: number | null = null
    if (tree.status === 'invaded' && tree.invasionStartedAt) {
      const invasionEndTime = tree.invasionStartedAt + LINGYAN_TREE_CONFIG.invasionDurationMs
      invasionTimeRemaining = Math.max(0, invasionEndTime - now)
    }

    // 计算预计奖励
    const estimatedBaseReward = {
      itemId: HARVEST_CONFIG.baseRewards.itemId,
      quantity: HARVEST_CONFIG.baseRewards.quantity,
      exp: HARVEST_CONFIG.baseRewards.expBonus
    }

    const bonusReward =
      playerRank > 0 && playerRank <= 10
        ? {
            itemId: HARVEST_CONFIG.topRewards.itemId,
            quantity: getTopRewardQuantity(playerRank)
          }
        : null

    const treeState: LingyanTreeState = {
      maturity: tree.maturity,
      maturityPercent: tree.maturityPercent,
      cycle: tree.cycle,
      status: tree.status,
      invasionStartedAt: tree.invasionStartedAt,
      invasionTimeRemaining,
      defendersCount: tree.defendersCount,
      defendersNeeded: LINGYAN_TREE_CONFIG.minDefendersToSucceed,
      canHarvest: tree.status === 'harvesting' && !contribution.rewardsClaimed,
      // 环境系统
      environment: tree.environment,
      lastEnvironmentChangeAt: tree.lastEnvironmentChangeAt,
      environmentSatisfied: tree.environmentSatisfied,
      environmentSatisfiedBy: tree.environmentSatisfiedBy,
      // 成长阶段系统
      currentStage: tree.currentStage,
      stageElementPool: tree.stageElementPool,
      spiritPatterns: tree.spiritPatterns
    }

    const contributionState: PlayerContributionState = {
      contribution: contribution.contribution,
      rank: playerRank,
      canWater: !contribution.hasWateredToday(todayDate),
      wateredToday: contribution.hasWateredToday(todayDate),
      defendedInvasion: contribution.defendedInvasion,
      rewardsClaimed: contribution.rewardsClaimed,
      estimatedReward: {
        base: estimatedBaseReward,
        bonus: bonusReward
      },
      // 元素贡献
      elementContributions: contribution.elementContributions,
      environmentSatisfyCount: contribution.environmentSatisfyCount
    }

    return {
      isLuoyunMember: true,
      tree: treeState,
      contribution: contributionState,
      rankings
    }
  }

  /**
   * 浇灌灵树
   */
  async waterTree(characterId: string): Promise<WateringResult> {
    return await AppDataSource.transaction(async manager => {
      const charRepo = manager.getRepository(Character)
      const treeRepo = manager.getRepository(LingyanTree)
      const contribRepo = manager.getRepository(LingyanContribution)

      // 获取角色并加锁
      const character = await charRepo.findOne({
        where: { id: characterId },
        relations: ['realm'],
        lock: { mode: 'pessimistic_write' }
      })

      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      if (character.sectId !== LUOYUN_SECT_ID) {
        throw { code: ERROR_CODES.LUOYUN_NOT_MEMBER, message: '只有落云宗弟子才能使用此功能' }
      }

      const tree = await this.getOrCreateTree(manager)
      const contribution = await this.getOrCreateContribution(characterId, tree.cycle, manager)

      // 检查灵树状态
      if (tree.status !== 'growing') {
        throw { code: ERROR_CODES.LUOYUN_TREE_NOT_GROWING, message: '灵树当前不处于生长状态' }
      }

      // 检查今日是否已浇灌
      const todayDate = getTodayDateString()
      if (contribution.hasWateredToday(todayDate)) {
        throw { code: ERROR_CODES.LUOYUN_WATERING_DAILY_LIMIT, message: '今日已浇灌过灵树' }
      }

      // 检查修为是否足够
      if (character.experience < WATERING_CONFIG.expCost) {
        throw { code: ERROR_CODES.LUOYUN_WATERING_EXP_NOT_ENOUGH, message: '修为不足，无法浇灌' }
      }

      // 计算木灵根加成
      const hasWoodRootBonus = this.hasWoodRoot(character)
      const contributionMultiplier = hasWoodRootBonus ? WATERING_CONFIG.woodRootBonus : 1

      const maturityGain = WATERING_CONFIG.maturityGain
      const contributionGain = Math.floor(WATERING_CONFIG.contributionGain * contributionMultiplier)

      // 扣除修为
      character.experience -= WATERING_CONFIG.expCost

      // 更新灵树成熟度
      tree.maturity = Math.min(tree.maturity + maturityGain, LINGYAN_TREE_CONFIG.maxMaturity)

      // 计算元素贡献
      const spiritRootId = character.spiritRootId
      const elementContrib = calculateElementContribution(spiritRootId, WATERING_CONFIG.elementAmount)

      // 更新灵树元素池
      const pool = tree.stageElementPool
      if (elementContrib.primaryElement) {
        pool[elementContrib.primaryElement] = (pool[elementContrib.primaryElement] || 0) + elementContrib.primaryAmount
      }
      pool.wood = (pool.wood || 0) + elementContrib.woodAmount
      tree.stageElementPool = pool

      // 检查阶段进化
      const newStage = calculateGrowthStage(pool.wood)
      if (newStage > tree.currentStage) {
        tree.currentStage = newStage
        // 阶段提升时增加灵纹
        tree.spiritPatterns = Math.min(tree.spiritPatterns + 1, MAX_SPIRIT_PATTERNS)
      }

      // 更新贡献
      contribution.contribution += contributionGain
      contribution.wateringCount += 1
      contribution.lastWateringDate = todayDate

      // 更新玩家元素贡献记录
      const elemContribs = contribution.elementContributions
      if (elementContrib.primaryElement) {
        elemContribs[elementContrib.primaryElement] = (elemContribs[elementContrib.primaryElement] || 0) + elementContrib.primaryAmount
      }
      elemContribs.wood = (elemContribs.wood || 0) + elementContrib.woodAmount
      contribution.elementContributions = elemContribs

      await charRepo.save(character)
      await treeRepo.save(tree)
      await contribRepo.save(contribution)

      // 检查是否触发收获期
      if (tree.maturity >= LINGYAN_TREE_CONFIG.maxMaturity && tree.status === 'growing') {
        tree.status = 'invaded'
        tree.invasionStartedAt = Date.now()
        tree.invasionDefenders = []
        await treeRepo.save(tree)
      }

      return {
        success: true,
        message: hasWoodRootBonus ? `木灵根亲和触发，浇灌成功！贡献翻倍！` : '浇灌成功！',
        maturityGain,
        contributionGain,
        newMaturity: tree.maturity,
        newContribution: contribution.contribution,
        hasWoodRootBonus,
        elementContributed: elementContrib.primaryElement,
        woodGained: elementContrib.woodAmount
      }
    })
  }

  /**
   * 献祭妖丹
   */
  async offerPill(characterId: string, tier: number, count: number): Promise<OfferPillResult> {
    // 验证妖丹等级（事务前校验）
    const pillConfig = getDemonPillConfig(tier)
    if (!pillConfig) {
      throw { code: ERROR_CODES.LUOYUN_INVALID_PILL_TIER, message: '无效的妖丹等级' }
    }

    return await AppDataSource.transaction(async manager => {
      const charRepo = manager.getRepository(Character)
      const treeRepo = manager.getRepository(LingyanTree)
      const contribRepo = manager.getRepository(LingyanContribution)
      const invRepo = manager.getRepository(InventoryItem)

      // 获取角色并验证
      const character = await charRepo.findOne({
        where: { id: characterId },
        lock: { mode: 'pessimistic_write' }
      })

      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      if (character.sectId !== LUOYUN_SECT_ID) {
        throw { code: ERROR_CODES.LUOYUN_NOT_MEMBER, message: '只有落云宗弟子才能使用此功能' }
      }

      const tree = await this.getOrCreateTree(manager)
      const contribution = await this.getOrCreateContribution(characterId, tree.cycle, manager)

      // 检查灵树状态
      if (tree.status !== 'growing') {
        throw { code: ERROR_CODES.LUOYUN_TREE_NOT_GROWING, message: '灵树当前不处于生长状态' }
      }

      // 检查背包中的妖丹数量（加锁）
      const inventoryItem = await invRepo.findOne({
        where: {
          characterId,
          itemId: pillConfig.id
        },
        lock: { mode: 'pessimistic_write' }
      })

      if (!inventoryItem || inventoryItem.quantity < count) {
        throw { code: ERROR_CODES.LUOYUN_PILL_NOT_ENOUGH, message: '妖丹数量不足' }
      }

      // 计算收益
      const maturityGain = pillConfig.maturityGain * count
      const contributionGain = pillConfig.contributionGain * count

      // 扣除妖丹
      inventoryItem.quantity -= count
      if (inventoryItem.quantity <= 0) {
        await invRepo.remove(inventoryItem)
      } else {
        await invRepo.save(inventoryItem)
      }

      // 更新灵树成熟度
      tree.maturity = Math.min(tree.maturity + maturityGain, LINGYAN_TREE_CONFIG.maxMaturity)

      // 计算元素贡献（基于玩家灵根和妖丹等级）
      const spiritRootId = character.spiritRootId
      const totalElementAmount = pillConfig.elementAmount * count
      const elementContrib = calculateElementContribution(spiritRootId, totalElementAmount)

      // 更新灵树元素池
      const pool = tree.stageElementPool
      if (elementContrib.primaryElement) {
        pool[elementContrib.primaryElement] = (pool[elementContrib.primaryElement] || 0) + elementContrib.primaryAmount
      }
      pool.wood = (pool.wood || 0) + elementContrib.woodAmount
      tree.stageElementPool = pool

      // 检查阶段进化
      const newStage = calculateGrowthStage(pool.wood)
      if (newStage > tree.currentStage) {
        tree.currentStage = newStage
        // 阶段提升时增加灵纹
        tree.spiritPatterns = Math.min(tree.spiritPatterns + 1, MAX_SPIRIT_PATTERNS)
      }

      // 更新贡献
      contribution.contribution += contributionGain
      contribution.addPillContribution(tier, count)

      // 更新玩家元素贡献记录
      const elemContribs = contribution.elementContributions
      if (elementContrib.primaryElement) {
        elemContribs[elementContrib.primaryElement] = (elemContribs[elementContrib.primaryElement] || 0) + elementContrib.primaryAmount
      }
      elemContribs.wood = (elemContribs.wood || 0) + elementContrib.woodAmount
      contribution.elementContributions = elemContribs

      await treeRepo.save(tree)
      await contribRepo.save(contribution)

      // 检查是否触发收获期
      if (tree.maturity >= LINGYAN_TREE_CONFIG.maxMaturity && tree.status === 'growing') {
        tree.status = 'invaded'
        tree.invasionStartedAt = Date.now()
        tree.invasionDefenders = []
        await treeRepo.save(tree)
      }

      return {
        success: true,
        message: `献祭${count}颗${pillConfig.name}成功！`,
        tier,
        count,
        maturityGain,
        contributionGain,
        newMaturity: tree.maturity,
        newContribution: contribution.contribution,
        elementContributed: elementContrib.primaryElement,
        woodGained: elementContrib.woodAmount
      }
    })
  }

  /**
   * 参与防御入侵
   */
  async defend(characterId: string): Promise<DefendResult> {
    return await AppDataSource.transaction(async manager => {
      const charRepo = manager.getRepository(Character)
      const treeRepo = manager.getRepository(LingyanTree)
      const contribRepo = manager.getRepository(LingyanContribution)

      // 获取角色并验证
      const character = await charRepo.findOne({
        where: { id: characterId },
        lock: { mode: 'pessimistic_write' }
      })

      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      if (character.sectId !== LUOYUN_SECT_ID) {
        throw { code: ERROR_CODES.LUOYUN_NOT_MEMBER, message: '只有落云宗弟子才能使用此功能' }
      }

      const tree = await this.getOrCreateTree(manager)
      const contribution = await this.getOrCreateContribution(characterId, tree.cycle, manager)

      // 检查是否正在被入侵
      if (tree.status !== 'invaded') {
        throw { code: ERROR_CODES.LUOYUN_NOT_IN_INVASION, message: '当前没有入侵事件' }
      }

      // 检查是否已参与防御
      if (contribution.defendedInvasion) {
        throw { code: ERROR_CODES.LUOYUN_ALREADY_DEFENDED, message: '已参与过本次防御' }
      }

      // 添加到防御者列表
      const defenders = tree.invasionDefenders
      if (!defenders.includes(characterId)) {
        defenders.push(characterId)
        tree.invasionDefenders = defenders
      }

      // 标记已防御并增加贡献
      contribution.defendedInvasion = true
      contribution.contribution += DEFENSE_CONFIG.contributionReward

      await treeRepo.save(tree)
      await contribRepo.save(contribution)

      // 检查是否防御成功（在事务内处理状态变更）
      if (tree.defendersCount >= LINGYAN_TREE_CONFIG.minDefendersToSucceed) {
        tree.status = 'harvesting'
        tree.harvestStartedAt = Date.now()
        await treeRepo.save(tree)
      }

      return {
        success: true,
        message: '参与防御成功！获得额外贡献奖励！',
        contributionGain: DEFENSE_CONFIG.contributionReward,
        newContribution: contribution.contribution,
        defendersCount: tree.defendersCount,
        defendersNeeded: LINGYAN_TREE_CONFIG.minDefendersToSucceed
      }
    })
  }

  /**
   * 领取收获奖励
   */
  async claimHarvest(characterId: string): Promise<HarvestResult> {
    return await AppDataSource.transaction(async manager => {
      const charRepo = manager.getRepository(Character)
      const contribRepo = manager.getRepository(LingyanContribution)

      // 获取角色并验证
      const character = await charRepo.findOne({
        where: { id: characterId },
        lock: { mode: 'pessimistic_write' }
      })

      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      if (character.sectId !== LUOYUN_SECT_ID) {
        throw { code: ERROR_CODES.LUOYUN_NOT_MEMBER, message: '只有落云宗弟子才能使用此功能' }
      }

      const tree = await this.getOrCreateTree(manager)
      const contribution = await this.getOrCreateContribution(characterId, tree.cycle, manager)

      // 检查是否为收获期
      if (tree.status !== 'harvesting') {
        throw { code: ERROR_CODES.LUOYUN_TREE_NOT_HARVESTING, message: '灵树尚未进入收获期' }
      }

      // 检查是否有贡献
      if (contribution.contribution === 0) {
        throw { code: ERROR_CODES.LUOYUN_NO_CONTRIBUTION, message: '本周期无贡献，无法领取奖励' }
      }

      // 检查是否已领取
      if (contribution.rewardsClaimed) {
        throw { code: ERROR_CODES.LUOYUN_REWARDS_CLAIMED, message: '已领取过本周期奖励' }
      }

      // 计算排名（事务内）
      const higherCount = await contribRepo.count({
        where: {
          cycle: tree.cycle,
          contribution: MoreThan(contribution.contribution)
        }
      })
      const rank = higherCount + 1

      const rewards: { itemId: string; itemName: string; quantity: number }[] = []

      // 获取果实品质（基于灵纹数量）
      const fruitQuality = getFruitQuality(tree.spiritPatterns)

      // 基础奖励 - 灵眼枝
      const branchReward = HARVEST_CONFIG.baseRewards
      await this.addItemToInventory(characterId, branchReward.itemId, branchReward.quantity, manager)
      rewards.push({
        itemId: branchReward.itemId,
        itemName: '灵眼枝',
        quantity: branchReward.quantity
      })

      // 修为奖励（基于果实品质）
      const expGained = fruitQuality.baseCultivation
      character.experience += expGained

      // 品质额外奖励
      for (const bonusItem of fruitQuality.bonusItems) {
        await this.addItemToInventory(characterId, bonusItem.itemId, bonusItem.quantity, manager)
        rewards.push({
          itemId: bonusItem.itemId,
          itemName: this.getItemName(bonusItem.itemId),
          quantity: bonusItem.quantity
        })
      }

      // 排名奖励 - 灵眼之液
      let isTopRanked = false
      if (rank > 0 && rank <= 10) {
        const liquidQuantity = getTopRewardQuantity(rank)
        if (liquidQuantity > 0) {
          await this.addItemToInventory(characterId, HARVEST_CONFIG.topRewards.itemId, liquidQuantity, manager)
          rewards.push({
            itemId: HARVEST_CONFIG.topRewards.itemId,
            itemName: '灵眼之液',
            quantity: liquidQuantity
          })
          isTopRanked = true
        }
      }

      // 标记已领取
      contribution.rewardsClaimed = true

      await charRepo.save(character)
      await contribRepo.save(contribution)

      return {
        success: true,
        message: isTopRanked
          ? `恭喜获得【${fruitQuality.name}】果实！排名第${rank}名！`
          : `恭喜获得【${fruitQuality.name}】果实！`,
        rewards,
        expGained,
        rank,
        isTopRanked,
        fruitQuality: {
          name: fruitQuality.name,
          spiritPatterns: tree.spiritPatterns,
          color: fruitQuality.color
        }
      }
    })
  }

  /**
   * 使用灵眼之液
   */
  async useLiquid(characterId: string, effect: 'root' | 'herb'): Promise<LiquidUseResult> {
    return await AppDataSource.transaction(async manager => {
      const charRepo = manager.getRepository(Character)
      const invRepo = manager.getRepository(InventoryItem)

      // 获取角色并验证
      const character = await charRepo.findOne({
        where: { id: characterId },
        lock: { mode: 'pessimistic_write' }
      })

      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      if (character.sectId !== LUOYUN_SECT_ID) {
        throw { code: ERROR_CODES.LUOYUN_NOT_MEMBER, message: '只有落云宗弟子才能使用此功能' }
      }

      // 检查是否有灵眼之液（加锁）
      const liquidItem = await invRepo.findOne({
        where: {
          characterId,
          itemId: 'lingyan_liquid'
        },
        lock: { mode: 'pessimistic_write' }
      })

      if (!liquidItem || liquidItem.quantity < 1) {
        throw { code: ERROR_CODES.LUOYUN_LIQUID_NOT_ENOUGH, message: '灵眼之液不足' }
      }

      if (effect === 'root') {
        // 升级灵根（终身限一次）
        if (character.lingyanLiquidUsedForRoot) {
          throw { code: ERROR_CODES.LUOYUN_ROOT_ALREADY_UPGRADED, message: '已使用过灵眼之液升级灵根' }
        }

        const oldRootId = character.spiritRootId
        const newRootId = this.getUpgradedRootId(oldRootId)

        if (!newRootId) {
          throw { code: ERROR_CODES.LUOYUN_ROOT_ALREADY_UPGRADED, message: '灵根已达最高品质，无法再升级' }
        }

        // 扣除物品
        liquidItem.quantity -= 1
        if (liquidItem.quantity <= 0) {
          await invRepo.remove(liquidItem)
        } else {
          await invRepo.save(liquidItem)
        }

        // 升级灵根
        character.spiritRootId = newRootId
        character.lingyanLiquidUsedForRoot = true
        await charRepo.save(character)

        const oldRoot = SPIRIT_ROOTS[oldRootId]
        const newRoot = SPIRIT_ROOTS[newRootId]

        return {
          success: true,
          message: `灵根升级成功！${oldRoot?.name || oldRootId} -> ${newRoot?.name || newRootId}`,
          effect: 'root' as const,
          rootUpgraded: {
            oldRoot: oldRoot?.name || oldRootId,
            newRoot: newRoot?.name || newRootId
          }
        }
      } else {
        // 催熟灵草buff
        const buffExpires = Date.now() + LINGYAN_LIQUID_EFFECTS.herbRipening.durationMs

        // 扣除物品
        liquidItem.quantity -= 1
        if (liquidItem.quantity <= 0) {
          await invRepo.remove(liquidItem)
        } else {
          await invRepo.save(liquidItem)
        }

        // 设置buff
        character.lingyanLiquidHerbBuffExpires = buffExpires
        await charRepo.save(character)

        return {
          success: true,
          message: '灵眼之液生效！药园灵草成熟速度提升100%，持续4小时！',
          effect: 'herb' as const,
          herbBuffExpires: buffExpires
        }
      }
    })
  }

  /**
   * 获取贡献排行榜
   */
  async getRankingList(characterId: string, limit: number = 20): Promise<ContributionRanking[]> {
    const character = await this.validateMember(characterId)
    const tree = await this.getOrCreateTree()
    return this.getRankings(tree.cycle, limit)
  }

  // ==================== 环境与阶段系统方法 ====================

  /**
   * 满足当前环境需求（玩家操作）
   */
  async satisfyEnvironment(characterId: string): Promise<SatisfyEnvironmentResult> {
    return await AppDataSource.transaction(async manager => {
      const charRepo = manager.getRepository(Character)
      const treeRepo = manager.getRepository(LingyanTree)
      const contribRepo = manager.getRepository(LingyanContribution)

      // 获取角色并验证
      const character = await charRepo.findOne({
        where: { id: characterId },
        relations: ['realm'],
        lock: { mode: 'pessimistic_write' }
      })

      if (!character) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      if (character.sectId !== LUOYUN_SECT_ID) {
        throw { code: ERROR_CODES.LUOYUN_NOT_MEMBER, message: '只有落云宗弟子才能使用此功能' }
      }

      const tree = await this.getOrCreateTree(manager)
      const contribution = await this.getOrCreateContribution(characterId, tree.cycle, manager)

      // 检查灵树状态
      if (tree.status !== 'growing') {
        throw { code: ERROR_CODES.LUOYUN_TREE_NOT_GROWING, message: '灵树当前不处于生长状态' }
      }

      // 检查环境是否已被满足
      if (tree.environmentSatisfied) {
        throw { code: ERROR_CODES.LUOYUN_ENVIRONMENT_SATISFIED, message: '当前环境已被满足' }
      }

      // 检查角色灵根是否能满足当前环境
      const spiritRootId = character.spiritRootId
      const currentEnv = tree.environment as TreeEnvironment

      if (!canSatisfyEnvironment(spiritRootId, currentEnv)) {
        const envConfig = ENVIRONMENT_CONFIG[currentEnv]
        throw {
          code: ERROR_CODES.LUOYUN_CANNOT_SATISFY_ENVIRONMENT,
          message: `你的灵根无法满足【${envConfig.name}】环境，需要${envConfig.requiredElement}属性灵根`
        }
      }

      // 计算元素贡献
      const baseAmount = ENVIRONMENT_CHANGE_CONFIG.satisfyElementAmount
      const elementContrib = calculateElementContribution(spiritRootId, baseAmount)

      // 更新灵树元素池
      const pool = tree.stageElementPool
      if (elementContrib.primaryElement) {
        pool[elementContrib.primaryElement] = (pool[elementContrib.primaryElement] || 0) + elementContrib.primaryAmount
      }
      pool.wood = (pool.wood || 0) + elementContrib.woodAmount
      tree.stageElementPool = pool

      // 检查阶段进化
      const newStage = calculateGrowthStage(pool.wood)
      if (newStage > tree.currentStage) {
        tree.currentStage = newStage
        // 阶段提升时增加灵纹
        tree.spiritPatterns = Math.min(tree.spiritPatterns + 1, MAX_SPIRIT_PATTERNS)
      }

      // 标记环境已满足
      tree.environmentSatisfied = true
      tree.environmentSatisfiedBy = characterId

      // 更新贡献
      const contributionGain = 15 // 满足环境的贡献奖励
      contribution.contribution += contributionGain
      contribution.environmentSatisfyCount += 1

      // 更新元素贡献记录
      const elemContribs = contribution.elementContributions
      if (elementContrib.primaryElement) {
        elemContribs[elementContrib.primaryElement] = (elemContribs[elementContrib.primaryElement] || 0) + elementContrib.primaryAmount
      }
      elemContribs.wood = (elemContribs.wood || 0) + elementContrib.woodAmount
      contribution.elementContributions = elemContribs

      await treeRepo.save(tree)
      await contribRepo.save(contribution)

      const stageConfig = GROWTH_STAGE_CONFIG[tree.currentStage]

      return {
        success: true,
        message: `成功为灵眼之树注入${elementContrib.primaryElement || '混元'}灵力！`,
        environment: currentEnv,
        elementContributed: elementContrib.primaryElement,
        woodGained: elementContrib.woodAmount,
        contributionGain,
        newContribution: contribution.contribution,
        stageProgress: {
          currentStage: tree.currentStage,
          stageName: stageConfig.name,
          totalWood: pool.wood,
          progress: getStageProgress(pool.wood, tree.currentStage)
        }
      }
    })
  }

  /**
   * 每小时环境变化（定时器调用）
   */
  async changeEnvironment(): Promise<EnvironmentChangeResult | null> {
    return await AppDataSource.transaction(async manager => {
      const treeRepo = manager.getRepository(LingyanTree)

      const tree = await treeRepo.findOne({
        where: {},
        lock: { mode: 'pessimistic_write' }
      })

      if (!tree || tree.status !== 'growing') {
        return null
      }

      const oldEnvironment = tree.environment as TreeEnvironment
      const wasSatisfied = tree.environmentSatisfied
      let maturityPenalty = 0

      // 如果环境未被满足，扣除成熟度
      if (!wasSatisfied) {
        const envConfig = ENVIRONMENT_CONFIG[oldEnvironment]
        maturityPenalty = envConfig.penaltyPerHour
        tree.maturity = Math.max(0, tree.maturity - maturityPenalty)
      }

      // 随机选择新环境
      const newEnvironment = getRandomEnvironment(oldEnvironment)

      // 重置环境状态
      tree.environment = newEnvironment
      tree.lastEnvironmentChangeAt = Date.now()
      tree.environmentSatisfied = false
      tree.environmentSatisfiedBy = null

      await treeRepo.save(tree)

      return {
        oldEnvironment,
        newEnvironment,
        wasSatisfied,
        maturityPenalty
      }
    })
  }

  /**
   * 获取环境信息（供前端显示）
   */
  getEnvironmentInfo(environment: TreeEnvironment) {
    const config = ENVIRONMENT_CONFIG[environment]
    return {
      type: environment,
      name: config.name,
      description: config.description,
      requiredElement: config.requiredElement,
      icon: config.icon
    }
  }

  /**
   * 获取阶段信息（供前端显示）
   */
  getStageInfo(stage: number, totalWood: number) {
    const config = GROWTH_STAGE_CONFIG[stage]
    return {
      stage,
      name: config.name,
      description: config.description,
      maxPatterns: config.maxPatterns,
      progress: getStageProgress(totalWood, stage),
      nextStageWood: stage < MAX_GROWTH_STAGE ? GROWTH_STAGE_CONFIG[stage + 1].woodRequired : null
    }
  }

  // ==================== 内部辅助方法 ====================

  /**
   * 检查灵树成熟度，触发收获期或入侵
   */
  private async checkTreeMaturity(tree: LingyanTree): Promise<void> {
    if (tree.maturity >= LINGYAN_TREE_CONFIG.maxMaturity && tree.status === 'growing') {
      // 触发入侵事件
      tree.status = 'invaded'
      tree.invasionStartedAt = Date.now()
      tree.invasionDefenders = []
      await treeRepository.save(tree)
    }
  }

  /**
   * 检查入侵状态
   */
  private async checkInvasionStatus(tree: LingyanTree): Promise<void> {
    if (tree.status !== 'invaded') return

    const now = Date.now()
    const invasionEndTime = tree.invasionStartedAt! + LINGYAN_TREE_CONFIG.invasionDurationMs

    // 检查是否防御成功
    if (tree.defendersCount >= LINGYAN_TREE_CONFIG.minDefendersToSucceed) {
      // 防御成功，进入收获期
      tree.status = 'harvesting'
      tree.harvestStartedAt = now
      await treeRepository.save(tree)
    } else if (now >= invasionEndTime) {
      // 时间到，检查是否防御成功
      if (tree.defendersCount >= LINGYAN_TREE_CONFIG.minDefendersToSucceed) {
        tree.status = 'harvesting'
        tree.harvestStartedAt = now
      } else {
        // 防御失败，直接开始新周期（损失一部分成熟度）
        await this.startNewCycle(tree, true)
      }
      await treeRepository.save(tree)
    }
  }

  /**
   * 开始新周期
   */
  private async startNewCycle(tree: LingyanTree, invasionFailed: boolean = false): Promise<void> {
    tree.cycle += 1
    tree.maturity = invasionFailed ? Math.floor(LINGYAN_TREE_CONFIG.maxMaturity * 0.3) : 0
    tree.status = 'growing'
    tree.invasionStartedAt = null
    tree.invasionDefendersJson = null
    tree.harvestStartedAt = null
    tree.lastHarvestAt = Date.now()

    // 重置环境系统
    tree.environment = getRandomEnvironment()
    tree.lastEnvironmentChangeAt = Date.now()
    tree.environmentSatisfied = false
    tree.environmentSatisfiedBy = null

    // 重置阶段系统
    tree.currentStage = 1
    tree.stageElementPool = { wood: 0, water: 0, earth: 0, fire: 0, metal: 0 }
    tree.spiritPatterns = 0

    await treeRepository.save(tree)
  }

  /**
   * 添加物品到背包
   */
  private async addItemToInventory(characterId: string, itemId: string, quantity: number, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(InventoryItem) : inventoryRepository

    let item = await repo.findOne({
      where: { characterId, itemId },
      lock: manager ? { mode: 'pessimistic_write' } : undefined
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

  /**
   * 获取升级后的灵根ID
   */
  private getUpgradedRootId(currentRootId: string): string | null {
    // 灵根升级路径
    const upgradeMap: Record<string, string> = {
      mortal_root: 'pseudo_root',
      pseudo_root: 'low_five_elements_root',
      low_five_elements_root: 'mid_five_elements_root',
      mid_five_elements_root: 'high_five_elements_root',
      high_five_elements_root: 'dual_root',
      dual_root: 'single_root',
      metal_root: 'mutant_metal_root',
      wood_root: 'mutant_wood_root',
      water_root: 'mutant_water_root',
      fire_root: 'mutant_fire_root',
      earth_root: 'mutant_earth_root',
      single_root: 'heavenly_root'
    }

    return upgradeMap[currentRootId] || null
  }

  /**
   * 定时任务：检查入侵状态
   */
  async checkAndResolveInvasions(): Promise<void> {
    const tree = await treeRepository.findOne({ where: {} })
    if (!tree || tree.status !== 'invaded') return

    await this.checkInvasionStatus(tree)
  }

  /**
   * 定时任务：检查收获期是否结束
   */
  async checkHarvestExpiry(): Promise<void> {
    const tree = await treeRepository.findOne({ where: {} })
    if (!tree || tree.status !== 'harvesting') return

    const now = Date.now()
    const harvestEndTime = tree.harvestStartedAt! + LINGYAN_TREE_CONFIG.harvestWindowMs

    if (now >= harvestEndTime) {
      await this.startNewCycle(tree, false)
    }
  }
}

export const luoyunService = new LuoyunService()
