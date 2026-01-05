/**
 * 试炼古塔服务
 * 核心功能：闯塔、继续闯塔、退出古塔、琉璃塔榜
 */
import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { Realm } from '../models/Realm'
import { TowerRecord, TowerServerFirst } from '../models/TowerRecord'
import { ERROR_CODES } from '../utils/errorCodes'
import { SPIRIT_ROOTS } from '../game/constants/spiritRoots'
import { TOWER_CONFIG, FloorType, getFloorConfig, getFloorType, getResetCost, SERVER_FIRST_REWARDS } from '../game/constants/tower'

const characterRepository = AppDataSource.getRepository(Character)
const realmRepository = AppDataSource.getRepository(Realm)
const towerRecordRepository = AppDataSource.getRepository(TowerRecord)
const serverFirstRepository = AppDataSource.getRepository(TowerServerFirst)

export interface TowerStatus {
  currentFloor: number // 当前层数
  bestFloor: number // 历史最高
  inTower: boolean // 是否在塔中
  dailyAttempts: number // 今日已用次数
  maxDailyAttempts: number // 每日最大次数
  dailyResets: number // 今日重置次数
  maxDailyResets: number // 每日最大重置次数
  resetCost: number // 重置消耗
  clearedFloors: number[] // 已首通的层数
  nextFloor: {
    floor: number
    name: string
    type: string
    guardianName: string
    estimatedPower: number
    rewards: {
      spiritStones: number
      experience: number
    }
  } | null
}

export interface FloorInfo {
  floor: number
  name: string
  type: string
  guardianName: string
  estimatedPower: number
  rewards: {
    spiritStones: number
    experience: number
  }
}

export interface ChallengeResult {
  success: boolean
  victory: boolean
  floor: FloorInfo
  battleLog: {
    rounds: number
    playerDamage: number
    guardianDamage: number
  }
  rewards: {
    spiritStones: number
    experience: number
    items: { itemId: string; count: number }[]
  }
  isFirstClear: boolean
  isServerFirst: boolean
  nextFloor: FloorInfo | null
  message: string
  breakthrough?: {
    newRealmName: string
    breakthroughCount: number
  }
}

class TowerService {
  /**
   * 获取古塔状态
   */
  async getStatus(characterId: string): Promise<TowerStatus> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    // 检查并重置每日次数
    await this.resetDailyIfNeeded(character)

    const resetCost = getResetCost(character.towerDailyResets)
    const inTower = character.towerCurrentFloor > 0

    // 下一层信息
    const nextFloorNum = character.towerCurrentFloor + 1
    let nextFloor = null
    if (nextFloorNum <= TOWER_CONFIG.maxFloor) {
      const config = getFloorConfig(nextFloorNum)
      // 计算角色战力和预估敌人战力
      const characterPower = this.calculatePower(character)
      const estimatedPower = Math.floor(characterPower * config.powerMultiplier)
      nextFloor = {
        floor: config.floor,
        name: config.name,
        type: config.type,
        guardianName: config.guardianName,
        estimatedPower,
        rewards: {
          spiritStones: config.rewards.spiritStones,
          experience: config.rewards.experience
        }
      }
    }

    return {
      currentFloor: character.towerCurrentFloor,
      bestFloor: character.towerBestFloor,
      inTower,
      dailyAttempts: character.towerDailyAttempts,
      maxDailyAttempts: TOWER_CONFIG.dailyFreeAttempts,
      dailyResets: character.towerDailyResets,
      maxDailyResets: TOWER_CONFIG.maxDailyResets,
      resetCost,
      clearedFloors: character.towerClearedFloors,
      nextFloor
    }
  }

  /**
   * 闯塔（从第一层开始）
   */
  async enterTower(characterId: string): Promise<ChallengeResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    // 检查并重置每日次数
    await this.resetDailyIfNeeded(character)

    // 检查是否有挑战次数：已用次数 < 免费次数 + 已重置次数
    const maxAttempts = TOWER_CONFIG.dailyFreeAttempts + character.towerDailyResets
    if (character.towerDailyAttempts >= maxAttempts) {
      throw { code: ERROR_CODES.TOWER_NO_ATTEMPTS, message: '今日挑战次数已用尽，请重置古塔' }
    }

    // 重置当前层数，从第1层开始
    character.towerCurrentFloor = 0

    // 消耗挑战次数
    character.towerDailyAttempts += 1

    await characterRepository.save(character)

    // 挑战第一层
    return this.challengeFloor(character, 1)
  }

  /**
   * 继续闯塔（从当前层继续）
   */
  async continueTower(characterId: string): Promise<ChallengeResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    if (character.towerCurrentFloor <= 0) {
      throw { code: ERROR_CODES.TOWER_NOT_IN_TOWER, message: '请先进入古塔' }
    }

    const nextFloor = character.towerCurrentFloor + 1
    if (nextFloor > TOWER_CONFIG.maxFloor) {
      throw { code: ERROR_CODES.TOWER_MAX_FLOOR, message: '已到达古塔顶层' }
    }

    return this.challengeFloor(character, nextFloor)
  }

  /**
   * 退出古塔
   */
  async exitTower(characterId: string): Promise<{ success: boolean; message: string; bestFloor: number }> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    // 检查是否在塔中
    if (character.towerCurrentFloor <= 0) {
      throw { code: ERROR_CODES.TOWER_NOT_IN_TOWER, message: '当前不在古塔中' }
    }

    const currentFloor = character.towerCurrentFloor
    character.towerCurrentFloor = 0

    // 更新最高层数
    if (currentFloor > character.towerBestFloor) {
      character.towerBestFloor = currentFloor
    }

    await characterRepository.save(character)

    return {
      success: true,
      message: `已退出古塔，本次最高闯至第${currentFloor}层`,
      bestFloor: character.towerBestFloor
    }
  }

  /**
   * 重置古塔（消耗修为）
   */
  async resetTower(characterId: string): Promise<{ success: boolean; message: string; cost: number }> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    // 检查并重置每日次数
    await this.resetDailyIfNeeded(character)

    // 检查是否在塔中
    if (character.towerCurrentFloor > 0) {
      throw { code: ERROR_CODES.TOWER_IN_TOWER, message: '正在塔中，请先退出后再重置' }
    }

    // 检查是否已用完所有可用次数（免费次数 + 已重置次数）
    const maxAttempts = TOWER_CONFIG.dailyFreeAttempts + character.towerDailyResets
    if (character.towerDailyAttempts < maxAttempts) {
      throw { code: ERROR_CODES.TOWER_FREE_ATTEMPTS_LEFT, message: '还有挑战次数，无需重置' }
    }

    // 检查今日重置次数
    if (character.towerDailyResets >= TOWER_CONFIG.maxDailyResets) {
      throw { code: ERROR_CODES.TOWER_MAX_RESETS, message: '今日重置次数已达上限' }
    }

    // 计算消耗
    const cost = getResetCost(character.towerDailyResets)

    // 检查修为
    if (Number(character.experience) < cost) {
      throw { code: ERROR_CODES.TOWER_NOT_ENOUGH_EXP, message: `修为不足，需要${cost}修为` }
    }

    // 扣除修为，增加重置次数
    character.experience = Number(character.experience) - cost
    character.towerDailyResets += 1
    character.towerCurrentFloor = 0 // 重置进度
    // 注意：不清空 towerClearedFloors，首通记录永久保留

    await characterRepository.save(character)

    return {
      success: true,
      message: `重置成功，消耗${cost}修为，可再次挑战古塔`,
      cost
    }
  }

  /**
   * 获取琉璃塔榜
   */
  async getRanking(
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    rankings: {
      rank: number
      characterId: string
      characterName: string
      bestFloor: number
      realmName: string
    }[]
    total: number
  }> {
    const [characters, total] = await characterRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.realm', 'realm')
      .where('c.towerBestFloor > 0')
      .orderBy('c.towerBestFloor', 'DESC')
      .addOrderBy('c.updatedAt', 'ASC') // 同层数先达到的排前面
      .skip(offset)
      .take(limit)
      .getManyAndCount()

    const rankings = characters.map((char, index) => ({
      rank: offset + index + 1,
      characterId: char.id,
      characterName: char.name,
      bestFloor: char.towerBestFloor,
      realmName: char.realm?.name || '未知'
    }))

    return { rankings, total }
  }

  /**
   * 获取全服首杀记录
   */
  async getServerFirsts(): Promise<TowerServerFirst[]> {
    return serverFirstRepository.find({
      order: { floor: 'ASC' }
    })
  }

  // ==================== 私有方法 ====================

  /**
   * 挑战指定层
   */
  private async challengeFloor(character: Character, floor: number): Promise<ChallengeResult> {
    const floorConfig = getFloorConfig(floor)

    // 计算战力
    const characterPower = this.calculatePower(character)
    const guardianPower = Math.floor(characterPower * floorConfig.powerMultiplier)

    // 模拟战斗（使用角色实际属性）
    const battleResult = this.simulateBattle(character, guardianPower, floor)

    // 检查是否首通
    const clearedFloors = character.towerClearedFloors
    const isFirstClear = !clearedFloors.includes(floor) && battleResult.victory

    // 检查是否全服首杀（仅首领层）
    let isServerFirst = false
    if (battleResult.victory && floorConfig.type === FloorType.BOSS) {
      const existing = await serverFirstRepository.findOne({ where: { floor } })
      if (!existing) {
        isServerFirst = true
        // 记录全服首杀
        const serverFirst = new TowerServerFirst()
        serverFirst.floor = floor
        serverFirst.characterId = character.id
        serverFirst.characterName = character.name
        await serverFirstRepository.save(serverFirst)
      }
    }

    // 计算奖励
    let rewards = { spiritStones: 0, experience: 0, items: [] as { itemId: string; count: number }[] }
    if (battleResult.victory) {
      rewards = this.calculateRewards(character, floor, floorConfig, isFirstClear, isServerFirst)

      // 发放奖励
      character.spiritStones = Number(character.spiritStones) + rewards.spiritStones
      character.experience = Number(character.experience) + rewards.experience

      // 更新层数
      character.towerCurrentFloor = floor
      if (floor > character.towerBestFloor) {
        character.towerBestFloor = floor
      }

      // 记录首通
      if (isFirstClear) {
        character.towerClearedFloors = [...clearedFloors, floor]
      }
    } else {
      // 失败时重置层数，被逐出古塔
      character.towerCurrentFloor = 0
    }

    await characterRepository.save(character)

    // 检查突破（仅胜利时）
    let breakthroughInfo: { newRealmName: string; breakthroughCount: number } | undefined
    if (battleResult.victory && rewards.experience > 0) {
      const breakthroughResult = await this.tryBreakthrough(character)
      if (breakthroughResult.success && breakthroughResult.newRealm) {
        breakthroughInfo = {
          newRealmName: breakthroughResult.newRealm.name,
          breakthroughCount: breakthroughResult.breakthroughCount || 1
        }
      }
    }

    // 保存战斗记录
    const record = new TowerRecord()
    record.characterId = character.id
    record.characterName = character.name
    record.floor = floor
    record.floorType = floorConfig.type
    record.guardianName = floorConfig.guardianName
    record.result = battleResult.victory ? 1 : 0
    record.rounds = battleResult.rounds
    record.characterPower = characterPower
    record.guardianPower = guardianPower
    record.damageDealt = battleResult.damageDealt
    record.damageTaken = battleResult.damageTaken
    record.spiritStonesGained = rewards.spiritStones
    record.experienceGained = rewards.experience
    record.isFirstClear = isFirstClear
    record.isServerFirst = isServerFirst

    await towerRecordRepository.save(record)

    // 构建消息
    let message = battleResult.victory ? `成功击败${floorConfig.guardianName}！` : `被${floorConfig.guardianName}击败...`

    if (isServerFirst) {
      message += ' 恭喜获得全服首杀！天道嘉奖！'
    } else if (isFirstClear) {
      message += ' 首次通关奖励已发放！'
    }

    // 构建当前层信息
    const floorInfo: FloorInfo = {
      floor: floorConfig.floor,
      name: floorConfig.name,
      type: floorConfig.type,
      guardianName: floorConfig.guardianName,
      estimatedPower: guardianPower,
      rewards: {
        spiritStones: floorConfig.rewards.spiritStones,
        experience: floorConfig.rewards.experience
      }
    }

    // 构建下一层信息（仅胜利且未到顶层时）
    let nextFloorInfo: FloorInfo | null = null
    if (battleResult.victory && floor < TOWER_CONFIG.maxFloor) {
      const nextFloorConfig = getFloorConfig(floor + 1)
      const nextGuardianPower = Math.floor(characterPower * nextFloorConfig.powerMultiplier)
      nextFloorInfo = {
        floor: nextFloorConfig.floor,
        name: nextFloorConfig.name,
        type: nextFloorConfig.type,
        guardianName: nextFloorConfig.guardianName,
        estimatedPower: nextGuardianPower,
        rewards: {
          spiritStones: nextFloorConfig.rewards.spiritStones,
          experience: nextFloorConfig.rewards.experience
        }
      }
    }

    return {
      success: true,
      victory: battleResult.victory,
      floor: floorInfo,
      battleLog: {
        rounds: battleResult.rounds,
        playerDamage: battleResult.damageDealt,
        guardianDamage: battleResult.damageTaken
      },
      rewards,
      isFirstClear,
      isServerFirst,
      nextFloor: nextFloorInfo,
      message,
      breakthrough: breakthroughInfo
    }
  }

  /**
   * 计算战力
   */
  private calculatePower(character: Character): number {
    const spiritRoot = SPIRIT_ROOTS[character.spiritRootId]
    const combatBonus = spiritRoot?.combatPowerBonus || 0

    const basePower = character.maxHp * 0.5 + character.attack * 3 + character.defense * 2 + character.speed * 1.5

    return Math.floor(basePower * (1 + combatBonus / 100))
  }

  /**
   * 模拟战斗（使用角色实际属性）
   */
  private simulateBattle(
    character: Character,
    guardianPower: number,
    floor: number
  ): { victory: boolean; rounds: number; damageDealt: number; damageTaken: number } {
    const maxRounds = TOWER_CONFIG.baseRounds + floor * TOWER_CONFIG.roundsPerFloor

    // 玩家属性
    const playerAttack = character.attack
    const playerDefense = character.defense
    const playerSpeed = character.speed
    let playerHp = character.maxHp

    // 守卫属性（基于战力反推）
    const guardianAttack = Math.floor(guardianPower * 0.3)
    const guardianDefense = Math.floor(guardianPower * 0.15)
    let guardianHp = Math.floor(guardianPower * 8)

    let rounds = 0
    let damageDealt = 0
    let damageTaken = 0

    // 添加随机性
    const variance = 0.2

    while (playerHp > 0 && guardianHp > 0 && rounds < maxRounds) {
      rounds++

      // 玩家攻击（攻击力 - 守卫防御，最低造成10%攻击力伤害）
      const rawPlayerDamage = Math.floor(playerAttack * (0.9 + Math.random() * variance))
      const playerDamage = Math.max(rawPlayerDamage - guardianDefense, Math.floor(playerAttack * 0.1))
      guardianHp -= playerDamage
      damageDealt += playerDamage

      if (guardianHp <= 0) break

      // 守卫攻击（根据速度差距调整闪避）
      const dodgeChance = Math.min(0.3, (playerSpeed - guardianPower * 0.1) / 1000)
      if (Math.random() > dodgeChance) {
        const rawGuardianDamage = Math.floor(guardianAttack * (0.9 + Math.random() * variance))
        const guardianDamage = Math.max(rawGuardianDamage - playerDefense, Math.floor(guardianAttack * 0.1))
        playerHp -= guardianDamage
        damageTaken += guardianDamage
      }
    }

    // 判定结果：击杀守卫或回合结束时HP比例更高
    const victory = guardianHp <= 0 || (playerHp > 0 && playerHp / character.maxHp > guardianHp / (guardianPower * 8))

    return { victory, rounds, damageDealt, damageTaken }
  }

  /**
   * 计算奖励
   */
  private calculateRewards(
    character: Character,
    floor: number,
    floorConfig: ReturnType<typeof getFloorConfig>,
    isFirstClear: boolean,
    isServerFirst: boolean
  ): { spiritStones: number; experience: number; items: { itemId: string; count: number }[] } {
    let spiritStones = floorConfig.rewards.spiritStones
    let experience = floorConfig.rewards.experience
    const items: { itemId: string; count: number }[] = []

    // 高阶加成
    const realmTier = character.realm?.tier || 1
    if (realmTier >= TOWER_CONFIG.highRealmBonusThreshold) {
      spiritStones = Math.floor(spiritStones * TOWER_CONFIG.highRealmBonusMultiplier)
      experience = Math.floor(experience * TOWER_CONFIG.highRealmBonusMultiplier)
    }

    // 首通奖励
    if (isFirstClear && (floorConfig.type === FloorType.ELITE || floorConfig.type === FloorType.BOSS)) {
      let firstClearRewards = floorConfig.firstClearRewards
      let bonusStones = firstClearRewards.spiritStones
      let bonusExp = firstClearRewards.experience

      if (realmTier >= TOWER_CONFIG.highRealmBonusThreshold) {
        bonusStones = Math.floor(bonusStones * TOWER_CONFIG.highRealmBonusMultiplier)
        bonusExp = Math.floor(bonusExp * TOWER_CONFIG.highRealmBonusMultiplier)
      }

      spiritStones += bonusStones
      experience += bonusExp

      // 首通物品
      if (firstClearRewards.items) {
        for (const item of firstClearRewards.items) {
          if (Math.random() * 100 < item.chance) {
            items.push({ itemId: item.itemId, count: item.count })
          }
        }
      }
    }

    // 全服首杀奖励
    if (isServerFirst) {
      spiritStones += SERVER_FIRST_REWARDS.spiritStones
      experience += SERVER_FIRST_REWARDS.experience
    }

    // 普通层物品掉落
    if (floorConfig.rewards.items) {
      for (const item of floorConfig.rewards.items) {
        if (Math.random() * 100 < item.chance) {
          items.push({ itemId: item.itemId, count: item.count })
        }
      }
    }

    return { spiritStones, experience, items }
  }

  /**
   * 重置每日数据
   */
  private async resetDailyIfNeeded(character: Character): Promise<void> {
    const today = new Date().toISOString().split('T')[0]

    if (character.lastTowerDate !== today) {
      character.towerDailyAttempts = 0
      character.towerDailyResets = 0
      character.lastTowerDate = today
      await characterRepository.save(character)
    }
  }

  /**
   * 尝试突破境界
   */
  private async tryBreakthrough(
    character: Character
  ): Promise<{ success: boolean; newRealm?: Realm; breakthroughCount?: number }> {
    if (!character.realm) {
      return { success: false }
    }

    let currentExp = Number(character.experience)
    let requiredExp = Number(character.realm.requiredExperience)

    // 修为未达到要求
    if (currentExp < requiredExp) {
      return { success: false }
    }

    let breakthroughCount = 0
    let finalRealm: Realm | null = null

    // 循环突破，直到修为不足或达到最高境界
    while (currentExp >= requiredExp) {
      const currentTier = character.realm!.tier
      const currentSubTier = character.realm!.subTier

      let nextTier = currentTier
      let nextSubTier = currentSubTier + 1

      if (nextSubTier > 4) {
        nextTier = currentTier + 1
        nextSubTier = 1
      }

      // 查找下一个境界
      const nextRealm = await realmRepository.findOne({
        where: { tier: nextTier, subTier: nextSubTier }
      })

      if (!nextRealm) {
        // 已达最高境界
        break
      }

      // 更新角色境界
      character.realm = nextRealm
      character.realmId = nextRealm.id
      breakthroughCount++
      finalRealm = nextRealm

      // 更新循环条件
      requiredExp = Number(nextRealm.requiredExperience)
    }

    if (breakthroughCount > 0 && finalRealm) {
      await characterRepository.save(character)
      return { success: true, newRealm: finalRealm, breakthroughCount }
    }

    return { success: false }
  }
}

export const towerService = new TowerService()
