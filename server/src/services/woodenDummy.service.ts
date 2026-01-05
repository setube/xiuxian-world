import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { WoodenDummyRecord, BattleRound, BATTLE_RESULT } from '../models/WoodenDummyRecord'
import { generateDummyStats, getDummyChallengeCost, WOODEN_DUMMY_COOLDOWN } from '../game/constants/formations'
import { SPIRIT_ROOTS } from '../game/constants/spiritRoots'
import { COMBAT_PASSIVES } from '../game/constants/fengxi'

const characterRepository = AppDataSource.getRepository(Character)
const dummyRecordRepository = AppDataSource.getRepository(WoodenDummyRecord)

export interface WoodenDummyStatus {
  canChallenge: boolean
  cooldownRemaining: number
  lastChallengeTime: number | null
  bestRecord: {
    realmTier: number
    realmSubTier: number
    dummyName: string
    result: number
  } | null
  todayStats: {
    totalChallenges: number
    wins: number
    losses: number
    draws: number
  }
}

export interface DummyBattleResult {
  success: boolean
  result: number // 0=失败, 1=胜利, 2=平局
  record: WoodenDummyRecord
  message: string
}

export interface CombatStats {
  hp: number
  maxHp: number
  attack: number
  defense: number
  speed: number
}

/**
 * 木人阁服务
 * 提供与木人傀儡切磋的功能，用于评估玩家战力
 */
class WoodenDummyService {
  /**
   * 获取木人阁状态
   */
  async getStatus(characterId: string): Promise<WoodenDummyStatus> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    const now = Date.now()
    const lastTime = character.lastWoodenDummyTime || 0
    const cooldownRemaining = Math.max(0, WOODEN_DUMMY_COOLDOWN - (now - lastTime))
    const canChallenge = cooldownRemaining === 0

    // 获取最佳记录（击败的最高境界木人）
    const bestRecord = await dummyRecordRepository
      .createQueryBuilder('record')
      .where('record.characterId = :characterId', { characterId })
      .andWhere('record.result = :result', { result: BATTLE_RESULT.WIN })
      .orderBy('record.dummyRealmTier', 'DESC')
      .addOrderBy('record.dummyRealmSubTier', 'DESC')
      .getOne()

    // 获取今日统计
    const today = new Date().toDateString()
    const todayRecords = await dummyRecordRepository
      .createQueryBuilder('record')
      .where('record.characterId = :characterId', { characterId })
      .andWhere('DATE(record.createdAt) = DATE(:today)', { today: new Date() })
      .getMany()

    const todayStats = {
      totalChallenges: todayRecords.length,
      wins: todayRecords.filter(r => r.result === BATTLE_RESULT.WIN).length,
      losses: todayRecords.filter(r => r.result === BATTLE_RESULT.LOSE).length,
      draws: todayRecords.filter(r => r.result === BATTLE_RESULT.DRAW).length
    }

    return {
      canChallenge,
      cooldownRemaining,
      lastChallengeTime: character.lastWoodenDummyTime,
      bestRecord: bestRecord
        ? {
            realmTier: bestRecord.dummyRealmTier,
            realmSubTier: bestRecord.dummyRealmSubTier,
            dummyName: bestRecord.dummyName,
            result: bestRecord.result
          }
        : null,
      todayStats
    }
  }

  /**
   * 挑战木人傀儡
   */
  async challengeDummy(characterId: string, realmTier: number, subTier: number = 2): Promise<DummyBattleResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    // 检查冷却
    const now = Date.now()
    const lastTime = character.lastWoodenDummyTime || 0
    if (now - lastTime < WOODEN_DUMMY_COOLDOWN) {
      const remaining = Math.ceil((WOODEN_DUMMY_COOLDOWN - (now - lastTime)) / 1000)
      throw new Error(`木人阁冷却中，请等待 ${remaining} 秒`)
    }

    // 验证境界范围
    if (realmTier < 1 || realmTier > 9) {
      throw new Error('无效的境界选择')
    }
    if (subTier < 1 || subTier > 4) {
      throw new Error('无效的小境界选择')
    }

    // 检查灵石消耗
    const cost = getDummyChallengeCost(realmTier)
    if (Number(character.spiritStones) < cost) {
      throw new Error(`灵石不足，需要 ${cost} 灵石`)
    }

    // 生成木人属性
    const dummyConfig = generateDummyStats(realmTier, subTier)
    const dummyStats: CombatStats = {
      hp: dummyConfig.baseHp,
      maxHp: dummyConfig.baseHp,
      attack: dummyConfig.baseAttack,
      defense: dummyConfig.baseDefense,
      speed: dummyConfig.baseSpeed
    }

    // 计算玩家战斗属性
    const playerStats = this.calculatePlayerStats(character)

    // 计算战力
    const playerPower = this.calculateCombatPower(playerStats)
    const dummyPower = this.calculateCombatPower(dummyStats)

    // 模拟战斗（传入木人境界用于风雷翅被动判定）
    const battleResult = this.simulateBattle(playerStats, dummyStats, character, realmTier)

    // 扣除灵石
    character.spiritStones = Number(character.spiritStones) - cost
    character.lastWoodenDummyTime = now
    await characterRepository.save(character)

    // 保存战斗记录
    const record = new WoodenDummyRecord()
    record.characterId = characterId
    record.characterName = character.name
    record.dummyRealmTier = realmTier
    record.dummyRealmSubTier = subTier
    record.dummyName = dummyConfig.name
    record.result = battleResult.result
    record.roundsLasted = battleResult.rounds
    record.totalRounds = battleResult.totalRounds
    record.damageDealt = battleResult.damageDealt
    record.damageTaken = battleResult.damageTaken
    record.characterPower = playerPower
    record.dummyPower = dummyPower
    record.spiritStonesCost = cost
    record.battleLog = battleResult.log

    await dummyRecordRepository.save(record)

    // 生成结果消息
    let message: string
    switch (battleResult.result) {
      case BATTLE_RESULT.WIN:
        message = `恭喜！你击败了${dummyConfig.name}，共战斗${battleResult.rounds}回合`
        break
      case BATTLE_RESULT.LOSE:
        message = `惜败！你被${dummyConfig.name}击败，坚持了${battleResult.rounds}回合`
        break
      case BATTLE_RESULT.DRAW:
        message = `平局！与${dummyConfig.name}战成平手，战斗持续${battleResult.rounds}回合`
        break
      default:
        message = '战斗结束'
    }

    return {
      success: true,
      result: battleResult.result,
      record,
      message
    }
  }

  /**
   * 获取战斗历史
   */
  async getHistory(characterId: string, limit: number = 20): Promise<WoodenDummyRecord[]> {
    return dummyRecordRepository.find({
      where: { characterId },
      order: { createdAt: 'DESC' },
      take: limit
    })
  }

  /**
   * 计算玩家战斗属性
   */
  private calculatePlayerStats(character: Character): CombatStats {
    // 获取灵根加成
    const spiritRoot = SPIRIT_ROOTS[character.spiritRootId]
    const combatBonus = spiritRoot?.combatPowerBonus || 0

    // 基础属性 + 灵根加成
    const attackBonus = Math.floor((character.attack * combatBonus) / 100)
    const defenseBonus = Math.floor((character.defense * combatBonus) / 100)

    return {
      hp: character.hp,
      maxHp: character.maxHp,
      attack: character.attack + attackBonus,
      defense: character.defense + defenseBonus,
      speed: character.speed
    }
  }

  /**
   * 计算战力值
   */
  private calculateCombatPower(stats: CombatStats): number {
    return Math.floor(stats.maxHp * 0.5 + stats.attack * 3 + stats.defense * 2 + stats.speed * 1.5)
  }

  /**
   * 模拟战斗
   */
  private simulateBattle(
    playerStats: CombatStats,
    dummyStats: CombatStats,
    character: Character,
    dummyRealmTier?: number
  ): {
    result: number
    rounds: number
    totalRounds: number
    damageDealt: number
    damageTaken: number
    log: BattleRound[]
  } {
    const MAX_ROUNDS = 50
    const log: BattleRound[] = []

    let playerHp = playerStats.maxHp
    let dummyHp = dummyStats.maxHp
    let totalDamageDealt = 0
    let totalDamageTaken = 0
    let round = 0

    // 风雷翅被动效果检查
    const hasWindThunderWings = character.windThunderWingsEquipped === true

    // 风雷之先：同境界30%先手+15%战力
    let windThunderFirstTriggered = false
    let attackBonus = 0
    if (hasWindThunderWings && dummyRealmTier && dummyRealmTier === character.realmId) {
      if (Math.random() < COMBAT_PASSIVES.windThunderFirst.triggerChance) {
        windThunderFirstTriggered = true
        attackBonus = COMBAT_PASSIVES.windThunderFirst.combatBonus
      }
    }

    // 根据速度决定先手（风雷之先可强制先手）
    let playerFirst = playerStats.speed >= dummyStats.speed
    if (windThunderFirstTriggered) {
      playerFirst = true
    }

    // 应用战力加成
    const effectiveAttack = Math.floor(playerStats.attack * (1 + attackBonus))

    while (round < MAX_ROUNDS && playerHp > 0 && dummyHp > 0) {
      round++

      let playerDamage = 0
      let dummyDamage = 0
      const events: string[] = []

      // 风雷之先效果提示（第一回合）
      if (round === 1 && windThunderFirstTriggered) {
        events.push('【风雷之先】抢占先机，战力+15%!')
      }

      // 雷遁之速：每回合20%闪避
      let playerDodged = false
      if (hasWindThunderWings && Math.random() < COMBAT_PASSIVES.thunderDodge.dodgeChance) {
        playerDodged = true
        events.push('【雷遁之速】闪避!')
      }

      if (playerFirst) {
        // 玩家先攻
        playerDamage = this.calculateDamage(effectiveAttack, dummyStats.defense)

        // 暴击判定（基于幸运值）
        if (Math.random() * 100 < character.luck) {
          playerDamage = Math.floor(playerDamage * 1.5)
          events.push('暴击!')
        }

        dummyHp -= playerDamage
        totalDamageDealt += playerDamage

        // 木人反击（如果还活着且玩家未闪避）
        if (dummyHp > 0 && !playerDodged) {
          dummyDamage = this.calculateDamage(dummyStats.attack, playerStats.defense)
          playerHp -= dummyDamage
          totalDamageTaken += dummyDamage
        }
      } else {
        // 木人先攻（玩家可闪避）
        if (!playerDodged) {
          dummyDamage = this.calculateDamage(dummyStats.attack, playerStats.defense)
          playerHp -= dummyDamage
          totalDamageTaken += dummyDamage
        }

        // 玩家反击（如果还活着）
        if (playerHp > 0) {
          playerDamage = this.calculateDamage(effectiveAttack, dummyStats.defense)

          // 暴击判定
          if (Math.random() * 100 < character.luck) {
            playerDamage = Math.floor(playerDamage * 1.5)
            events.push('暴击!')
          }

          dummyHp -= playerDamage
          totalDamageDealt += playerDamage
        }
      }

      log.push({
        round,
        attackerAction: playerFirst ? '攻击' : '防御',
        defenderAction: playerFirst ? '防御' : '攻击',
        attackerDamage: playerDamage,
        defenderDamage: dummyDamage,
        attackerHpRemaining: Math.max(0, playerHp),
        defenderHpRemaining: Math.max(0, dummyHp),
        events
      })
    }

    // 判定结果
    let result: number
    if (dummyHp <= 0 && playerHp > 0) {
      result = BATTLE_RESULT.WIN
    } else if (playerHp <= 0 && dummyHp > 0) {
      result = BATTLE_RESULT.LOSE
    } else if (playerHp <= 0 && dummyHp <= 0) {
      // 同归于尽算平局
      result = BATTLE_RESULT.DRAW
    } else {
      // 50回合未分胜负算平局
      result = BATTLE_RESULT.DRAW
    }

    return {
      result,
      rounds: round,
      totalRounds: MAX_ROUNDS,
      damageDealt: totalDamageDealt,
      damageTaken: totalDamageTaken,
      log
    }
  }

  /**
   * 计算伤害
   */
  private calculateDamage(attack: number, defense: number): number {
    // 基础伤害 = 攻击力 - 防御力/2，最小为1
    const baseDamage = Math.max(1, attack - Math.floor(defense / 2))
    // 添加±10%的随机浮动
    const variance = 0.1
    const multiplier = 1 + (Math.random() * 2 - 1) * variance
    return Math.floor(baseDamage * multiplier)
  }
}

export const woodenDummyService = new WoodenDummyService()
