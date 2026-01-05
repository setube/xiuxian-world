/**
 * PvP战斗服务 - 简易异步1v1战斗系统
 */
import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { PvpChallenge } from '../models/PvpChallenge'
import { PVP_CONFIG, HEISHA_SECT_ID, SHA_ENERGY_CONFIG } from '../game/constants/heisha'
import { COMBAT_PASSIVES } from '../game/constants/fengxi'
import { SPIRIT_ROOTS, getCounterBonus, type SpiritRoot } from '../game/constants/spiritRoots'
import { getFlameFanCombatPower, checkFireResonance } from '../game/constants/flameFan'
import { SOUL_TURBULENT_CONFIG, getFullRealmName } from '../game/constants/soulCollapse'
import { ERROR_CODES } from '../utils/errorCodes'
import { diplomacyService } from './diplomacy.service'
import { sectService } from './sect.service'
import { soulCollapseService, type PvpDefeatResult } from './soulCollapse.service'
import { bloodSoulBannerService } from './bloodSoulBanner.service'
import { emitSoulTurbulent, emitSoulCollapse, emitSoulCollapseProtected, emitMasterAlert } from '../socket'

const characterRepository = AppDataSource.getRepository(Character)
const pvpChallengeRepository = AppDataSource.getRepository(PvpChallenge)

// ==================== 接口定义 ====================

export interface PvpStatus {
  dailyChallenges: number
  maxChallenges: number
  canChallenge: boolean
  todayDate: string
}

export interface PvpTarget {
  id: string
  name: string
  realm: number
  realmName: string
  power: number
  sectId: string | null
  sectName: string | null
}

export interface ChallengeResult {
  id: string
  success: boolean // 是否为挑战者胜利
  message: string
  challengerPower: number
  defenderPower: number
  result: 'challenger_win' | 'defender_win' | 'draw'
  rewards: {
    cultivationChange: number
    shaEnergyGain: number
  }
  // 神魂陨落系统
  soulCollapseResult?: PvpDefeatResult
}

export interface PvpHistoryItem {
  id: string
  opponentName: string
  opponentId: string
  isChallenger: boolean
  result: 'win' | 'lose' | 'draw'
  powerDiff: number
  cultivationChange: number
  createdAt: number
}

// ==================== 服务类 ====================

class PvpService {
  /**
   * 获取PvP状态
   */
  async getStatus(characterId: string): Promise<PvpStatus> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    const todayDate = this.getTodayDate()
    await this.resetDailyCountIfNeeded(character, todayDate)

    return {
      dailyChallenges: character.dailyPvpChallenges,
      maxChallenges: PVP_CONFIG.dailyChallengeLimit,
      canChallenge: character.dailyPvpChallenges < PVP_CONFIG.dailyChallengeLimit,
      todayDate
    }
  }

  /**
   * 获取可挑战的目标列表
   */
  async getTargets(characterId: string, limit: number = 20): Promise<PvpTarget[]> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    // 获取其他在线或活跃的玩家（简化：获取最近活跃的玩家）
    const targets = await characterRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.realm', 'realm')
      .where('c.id != :characterId', { characterId })
      .andWhere('c.peaceMode = false') // 排除和平模式
      .andWhere('c.realmId >= :minRealm', { minRealm: PVP_CONFIG.minRealm })
      .orderBy('c.updatedAt', 'DESC')
      .take(limit)
      .getMany()

    return targets.map(t => ({
      id: t.id,
      name: t.name,
      realm: t.realmId,
      realmName: t.realm?.name || '未知',
      power: this.calculatePower(t),
      sectId: t.sectId,
      sectName: this.getSectName(t.sectId)
    }))
  }

  /**
   * 发起挑战
   */
  async challenge(characterId: string, targetId: string): Promise<ChallengeResult> {
    // 验证挑战者
    const challenger = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!challenger) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    // 检查自己
    if (characterId === targetId) {
      throw { code: ERROR_CODES.PVP_TARGET_SELF, message: '不能挑战自己' }
    }

    // 检查道心破碎状态（不能主动发起斗法）
    const shatteredStatus = await soulCollapseService.getSoulShatteredStatus(characterId)
    if (shatteredStatus.isActive) {
      throw { code: ERROR_CODES.PVP_SOUL_SHATTERED, message: '道心破碎状态下无法主动发起斗法' }
    }

    // 检查每日次数
    const todayDate = this.getTodayDate()
    await this.resetDailyCountIfNeeded(challenger, todayDate)

    if (challenger.dailyPvpChallenges >= PVP_CONFIG.dailyChallengeLimit) {
      throw { code: ERROR_CODES.PVP_LIMIT_REACHED, message: '今日PvP挑战次数已用尽' }
    }

    // 检查境界
    if (challenger.realmId < PVP_CONFIG.minRealm) {
      throw { code: ERROR_CODES.PVP_REALM_TOO_LOW, message: '需要达到筑基期才能参与PvP' }
    }

    // 验证目标
    const defender = await characterRepository.findOne({
      where: { id: targetId },
      relations: ['realm']
    })

    if (!defender) {
      throw { code: ERROR_CODES.PVP_TARGET_NOT_FOUND, message: '挑战目标不存在' }
    }

    // 检查目标和平模式
    if (defender.peaceMode) {
      throw { code: ERROR_CODES.PVP_TARGET_PEACE_MODE, message: '目标处于和平模式，无法挑战' }
    }

    // 计算基础战力
    let challengerPower = this.calculatePower(challenger)
    let defenderPower = this.calculatePower(defender)

    // 获取外交加成
    const diplomacyBonus = await diplomacyService.getDiplomacyBonus(challenger.sectId, defender.sectId)

    // 应用结盟战力加成（+5%）
    if (diplomacyBonus.attackerPowerBonus > 0) {
      challengerPower = Math.floor(challengerPower * (1 + diplomacyBonus.attackerPowerBonus))
    }
    if (diplomacyBonus.defenderPowerBonus > 0) {
      defenderPower = Math.floor(defenderPower * (1 + diplomacyBonus.defenderPowerBonus))
    }

    // ========== 神魂陨落系统战力调整 ==========
    // 1. 神魂动荡战力减成（-30%）
    const challengerTurbulent = await soulCollapseService.getSoulTurbulentStatus(characterId)
    if (challengerTurbulent.isActive) {
      challengerPower = Math.floor(challengerPower * (1 - SOUL_TURBULENT_CONFIG.powerReduction))
    }
    const defenderTurbulent = await soulCollapseService.getSoulTurbulentStatus(targetId)
    if (defenderTurbulent.isActive) {
      defenderPower = Math.floor(defenderPower * (1 - SOUL_TURBULENT_CONFIG.powerReduction))
    }

    // 2. 仇敌战力加成（+5%）
    const challengerEnemyBonus = await soulCollapseService.getEnemyCombatBonus(characterId, targetId)
    if (challengerEnemyBonus > 0) {
      challengerPower = Math.floor(challengerPower * (1 + challengerEnemyBonus))
    }
    const defenderEnemyBonus = await soulCollapseService.getEnemyCombatBonus(targetId, characterId)
    if (defenderEnemyBonus > 0) {
      defenderPower = Math.floor(defenderPower * (1 + defenderEnemyBonus))
    }

    // 战斗计算（加入随机浮动和风雷翅被动）
    const { result, winnerId, windThunderEffects } = this.calculateBattleResult(challengerPower, defenderPower, challenger, defender)

    // 计算奖惩
    let baseCultivationGain: number = PVP_CONFIG.winnerCultivationGain
    let baseContributionGain: number = 0 // 基础贡献奖励

    // 敌对关系加成（+15%修为和贡献）
    if (diplomacyBonus.isHostile) {
      baseCultivationGain = Math.floor(baseCultivationGain * (1 + diplomacyBonus.cultivationBonus))
      baseContributionGain = Math.floor(10 * (1 + diplomacyBonus.contributionBonus)) // 基础10贡献
    }

    const rewards: {
      winnerCultivationGain: number
      loserCultivationLoss: number
      shaEnergyGain: number
      heavenlyEscapeTriggered: boolean
      contributionGain: number
      isHostileBonus: boolean
    } = {
      winnerCultivationGain: baseCultivationGain,
      loserCultivationLoss: PVP_CONFIG.loserCultivationLoss,
      shaEnergyGain: 0,
      heavenlyEscapeTriggered: false,
      contributionGain: baseContributionGain,
      isHostileBonus: diplomacyBonus.isHostile
    }

    // 黑煞教弟子获得煞气（50-100随机）
    const pvpWinner = winnerId === challenger.id ? challenger : defender
    if (pvpWinner && pvpWinner.sectId === HEISHA_SECT_ID) {
      rewards.shaEnergyGain = Math.floor(Math.random() * 51) + 50 // 50-100
    }

    // 九天挪移：败者尝试逃脱（减免损失）
    if (result !== 'draw') {
      const loser = result === 'challenger_win' ? defender : challenger
      const winner = result === 'challenger_win' ? challenger : defender
      if (this.checkHeavenlyEscape(loser, winner)) {
        rewards.loserCultivationLoss = Math.floor(rewards.loserCultivationLoss * 0.3) // 只损失30%
        rewards.heavenlyEscapeTriggered = true
        windThunderEffects.push('【九天挪移】触发，遁逃成功，损失减免70%!')
      }
    }

    // 创建挑战记录
    const challenge = pvpChallengeRepository.create({
      challengerId: challenger.id,
      challengerName: challenger.name,
      defenderId: defender.id,
      defenderName: defender.name,
      challengerPower,
      defenderPower,
      winnerId,
      result,
      rewards
    })

    await pvpChallengeRepository.save(challenge)

    // 应用奖惩
    await this.applyBattleRewards(challenger, defender, result, rewards)

    // 增加挑战次数
    challenger.dailyPvpChallenges += 1
    await characterRepository.save(challenger)

    // ========== 血魂幡系统：魂魄掉落 ==========
    let soulDropResult: { souls: { type: string; count: number }[] } | undefined
    if (result !== 'draw') {
      const pvpLoser = result === 'challenger_win' ? defender : challenger
      const finalWinner = result === 'challenger_win' ? challenger : defender
      // 胜者如果有血魂幡，可能获得魂魄
      soulDropResult = await bloodSoulBannerService.handlePvPVictory(finalWinner.id, pvpLoser.id)
    }

    // ========== 神魂陨落系统：处理落败方 ==========
    let soulCollapseResult: PvpDefeatResult | undefined
    if (result !== 'draw') {
      const loser = result === 'challenger_win' ? defender : challenger
      const winner = result === 'challenger_win' ? challenger : defender
      const winnerRealmTier = winner.realm?.tier || 1
      const loserRealmTier = loser.realm?.tier || 1

      // 处理PvP落败，可能触发神魂动荡或神魂陨落
      soulCollapseResult = await soulCollapseService.handlePvpDefeat(loser.id, winner.id, winnerRealmTier, loserRealmTier)

      // ========== Socket事件推送 ==========
      if (soulCollapseResult.turbulentTriggered) {
        // 神魂动荡触发
        const turbulentStatus = await soulCollapseService.getSoulTurbulentStatus(loser.id)
        emitSoulTurbulent({
          loserId: loser.id,
          loserName: loser.name,
          winnerId: winner.id,
          winnerName: winner.name,
          expiresAt: turbulentStatus.expiresAt || Date.now()
        })

        // 掌门急报
        if (loser.sectId) {
          const masterId = await soulCollapseService.getSectMasterId(loser.sectId)
          if (masterId && masterId !== loser.id) {
            emitMasterAlert({
              masterId,
              discipleId: loser.id,
              discipleName: loser.name,
              alertType: 'soul_turbulent',
              sectName: this.getSectName(loser.sectId) || ''
            })
          }
        }
      }

      if (soulCollapseResult.collapseTriggered) {
        const shatteredStatus = await soulCollapseService.getSoulShatteredStatus(loser.id)

        if (soulCollapseResult.protectionUsed) {
          // 护道丹保护
          emitSoulCollapseProtected({
            loserId: loser.id,
            loserName: loser.name,
            shatteredExpiresAt: shatteredStatus.expiresAt || Date.now()
          })
        } else {
          // 完整神魂陨落
          const oldRealmName = soulCollapseResult.oldRealm?.name || getFullRealmName(loserRealmTier, loser.realm?.subTier || 1)
          const newRealmName = soulCollapseResult.newRealm?.name || oldRealmName

          emitSoulCollapse({
            loserId: loser.id,
            loserName: loser.name,
            winnerId: winner.id,
            winnerName: winner.name,
            oldRealm: oldRealmName,
            newRealm: newRealmName,
            droppedMaterials: soulCollapseResult.droppedMaterials.map(m => ({
              itemId: m.itemId,
              itemName: m.name,
              count: m.quantity
            })),
            droppedEquipment: soulCollapseResult.droppedEquipment
              ? { itemId: soulCollapseResult.droppedEquipment.itemId, itemName: soulCollapseResult.droppedEquipment.name }
              : null,
            expGained: soulCollapseResult.winnerExpGain,
            shatteredExpiresAt: shatteredStatus.expiresAt || Date.now()
          })
        }

        // 掌门急报
        if (loser.sectId) {
          const masterId = await soulCollapseService.getSectMasterId(loser.sectId)
          if (masterId && masterId !== loser.id) {
            emitMasterAlert({
              masterId,
              discipleId: loser.id,
              discipleName: loser.name,
              alertType: 'soul_collapse',
              sectName: this.getSectName(loser.sectId) || ''
            })
          }
        }
      }
    }

    const isWin = winnerId === challenger.id
    let message = ''
    if (result === 'draw') {
      message = `与${defender.name}势均力敌，战成平局`
    } else if (isWin) {
      message = `击败了${defender.name}！获得${rewards.winnerCultivationGain}修为`
      if (rewards.contributionGain > 0) {
        message += `，贡献+${rewards.contributionGain}`
      }
      if (rewards.shaEnergyGain > 0) {
        message += `，煞气+${rewards.shaEnergyGain}`
      }
      if (rewards.isHostileBonus) {
        message += '（敌对加成）'
      }
      // 血魂幡魂魄掉落
      if (soulDropResult?.souls && soulDropResult.souls.length > 0) {
        const soulNames: Record<string, string> = {
          grievance_soul: '怨魂',
          cultivator_remnant: '修士残魂'
        }
        const soulStr = soulDropResult.souls.map(s => `${soulNames[s.type] || s.type}×${s.count}`).join('、')
        message += `\n【血魂幡】获得${soulStr}`
      }
      // 神魂陨落胜者奖励
      if (soulCollapseResult?.winnerExpGain) {
        message += `\n【神魂陨落】额外获得${soulCollapseResult.winnerExpGain}修为！`
      }
    } else {
      message = `败给了${defender.name}，损失${rewards.loserCultivationLoss}修为`
      if (rewards.heavenlyEscapeTriggered) {
        message += '（九天挪移减免）'
      }
      // 神魂动荡/陨落提示
      if (soulCollapseResult?.turbulentTriggered) {
        message += '\n【神魂动荡】你的神魂陷入动荡，10分钟内战力-30%，若再次落败将触发神魂陨落！'
      }
      if (soulCollapseResult?.collapseTriggered) {
        if (soulCollapseResult.protectionUsed) {
          message += '\n【护道丹】护道丹自动消耗，保住了境界与修为！但道心破碎，24小时内闭关收益-50%且无法主动斗法。'
        } else {
          message += `\n【神魂陨落】境界跌落至${soulCollapseResult.newRealm?.name || '未知'}，修为清零，道心破碎！`
          if (soulCollapseResult.droppedMaterials.length > 0) {
            message += `\n掉落材料：${soulCollapseResult.droppedMaterials.map(m => `${m.name}x${m.quantity}`).join('、')}`
          }
          if (soulCollapseResult.droppedEquipment) {
            message += `\n掉落装备：${soulCollapseResult.droppedEquipment.name}`
          }
        }
      }
    }

    // 添加风雷翅效果提示
    if (windThunderEffects.length > 0) {
      message += '\n' + windThunderEffects.join('\n')
    }

    return {
      id: challenge.id,
      success: isWin,
      message,
      challengerPower,
      defenderPower,
      result,
      rewards: {
        cultivationChange: isWin ? rewards.winnerCultivationGain : -rewards.loserCultivationLoss,
        shaEnergyGain: rewards.shaEnergyGain
      },
      soulCollapseResult
    }
  }

  /**
   * 获取战斗历史
   */
  async getHistory(characterId: string, limit: number = 20): Promise<PvpHistoryItem[]> {
    const challenges = await pvpChallengeRepository
      .createQueryBuilder('c')
      .where('c.challengerId = :characterId OR c.defenderId = :characterId', { characterId })
      .orderBy('c.createdAt', 'DESC')
      .take(limit)
      .getMany()

    return challenges.map(c => {
      const isChallenger = c.challengerId === characterId
      const opponentName = isChallenger ? c.defenderName : c.challengerName
      const opponentId = isChallenger ? c.defenderId : c.challengerId

      let result: 'win' | 'lose' | 'draw' = 'draw'
      if (c.result !== 'draw') {
        const isWinner = c.winnerId === characterId
        result = isWinner ? 'win' : 'lose'
      }

      const cultivationChange = result === 'win' ? c.rewards.winnerCultivationGain : result === 'lose' ? -c.rewards.loserCultivationLoss : 0

      return {
        id: c.id,
        opponentName,
        opponentId,
        isChallenger,
        result,
        powerDiff: isChallenger ? c.challengerPower - c.defenderPower : c.defenderPower - c.challengerPower,
        cultivationChange,
        createdAt: c.createdAt.getTime()
      }
    })
  }

  // ==================== 私有方法 ====================

  /**
   * 计算战力（含灵根加成和风雷翅加成）
   */
  public calculatePower(character: Character): number {
    // 基础战力 = 攻击 * 2 + 防御 + 速度 + 境界加成
    let power = character.attack * 2 + character.defense + character.speed + character.realmId * 100

    // 灵根战力加成
    const spiritRoot = SPIRIT_ROOTS[character.spiritRootId]
    if (spiritRoot && spiritRoot.combatPowerBonus > 0) {
      power = Math.floor(power * (1 + spiritRoot.combatPowerBonus / 100))
    }

    // 煞气加成（黑煞教专属）
    if (character.sectId === HEISHA_SECT_ID && character.shaEnergy > 0) {
      const shaBonus = Math.min((character.shaEnergy * SHA_ENERGY_CONFIG.bonusPerPoint) / 100, SHA_ENERGY_CONFIG.maxBonusPercent / 100)
      power = Math.floor(power * (1 + shaBonus))
    }

    // 杀戮值战力加成（黑煞教专属，每点+0.1%，上限50%）
    if (character.sectId === HEISHA_SECT_ID && character.killCount > 0) {
      const killBonus = bloodSoulBannerService.getKillCountBonus(character.killCount)
      power = Math.floor(power * (1 + killBonus / 100))
    }

    // 强索元阴buff加成
    if (character.extractBuffExpiresAt && character.extractBuffExpiresAt > Date.now() && character.extractBuff) {
      power += character.extractBuff.attack * 2 + character.extractBuff.defense
    }

    // 七焰扇战力加成
    const flameFanPower = getFlameFanCombatPower(character.equippedFlameFan)
    if (flameFanPower > 0) {
      power += flameFanPower
      // 检查火焰扇debuff减益
      if (character.flameFanDebuff && character.flameFanDebuffExpiresAt) {
        if (Number(character.flameFanDebuffExpiresAt) > Date.now()) {
          const reduction = character.flameFanDebuff.combatPowerReduction / 100
          power = Math.floor(power * (1 - reduction))
        }
      }
    }

    // 风雷之先：同境界+15%战力（30%触发率，在战斗结果计算时判定）
    // 这里不直接加成，而是在 calculateBattleResult 中处理

    return power
  }

  /**
   * 获取角色的灵根信息
   */
  private getSpiritRoot(character: Character): SpiritRoot | null {
    return SPIRIT_ROOTS[character.spiritRootId] || null
  }

  /**
   * 计算战斗结果（含灵根相克和风雷翅被动效果）
   */
  private calculateBattleResult(
    challengerPower: number,
    defenderPower: number,
    challenger: Character,
    defender: Character
  ): {
    result: 'challenger_win' | 'defender_win' | 'draw'
    winnerId: string | null
    windThunderEffects: string[]
  } {
    const windThunderEffects: string[] = []
    let actualChallengerPower = challengerPower
    let actualDefenderPower = defenderPower

    // 五行相克：天灵根/异灵根可触发15%伤害加成
    const challengerRoot = this.getSpiritRoot(challenger)
    const defenderRoot = this.getSpiritRoot(defender)

    if (challengerRoot && defenderRoot) {
      const challengerCounterBonus = getCounterBonus(challengerRoot, defenderRoot)
      const defenderCounterBonus = getCounterBonus(defenderRoot, challengerRoot)

      if (challengerCounterBonus > 0) {
        actualChallengerPower = Math.floor(actualChallengerPower * (1 + challengerCounterBonus))
        const counterElement = challengerRoot.elements[0] || challengerRoot.element
        windThunderEffects.push(`【五行相克】${counterElement}系克制生效，伤害+15%`)
      }
      if (defenderCounterBonus > 0) {
        actualDefenderPower = Math.floor(actualDefenderPower * (1 + defenderCounterBonus))
        const counterElement = defenderRoot.elements[0] || defenderRoot.element
        windThunderEffects.push(`【五行相克】对方${counterElement}系克制生效，伤害+15%`)
      }
    }

    // 七焰扇火灵根共鸣伤害加成
    if (challenger.equippedFlameFan) {
      const resonance = checkFireResonance(challenger.spiritRootId || '')
      if (resonance.hasResonance) {
        actualChallengerPower = Math.floor(actualChallengerPower * (1 + resonance.bonusPercent / 100))
        const resonanceType = resonance.type === 'full' ? '完全共鸣' : '部分共鸣'
        windThunderEffects.push(`【七焰扇·${resonanceType}】火灵根共鸣，伤害+${resonance.bonusPercent}%`)
      }
    }
    if (defender.equippedFlameFan) {
      const resonance = checkFireResonance(defender.spiritRootId || '')
      if (resonance.hasResonance) {
        actualDefenderPower = Math.floor(actualDefenderPower * (1 + resonance.bonusPercent / 100))
        const resonanceType = resonance.type === 'full' ? '完全共鸣' : '部分共鸣'
        windThunderEffects.push(`【对方七焰扇·${resonanceType}】火灵根共鸣，伤害+${resonance.bonusPercent}%`)
      }
    }

    // 风雷之先：同境界30%先手+15%战力
    const challengerHasWings = challenger.windThunderWingsEquipped === true
    const defenderHasWings = defender.windThunderWingsEquipped === true
    const sameRealm = challenger.realmId === defender.realmId

    if (sameRealm) {
      // 挑战者的风雷之先
      if (challengerHasWings && Math.random() < COMBAT_PASSIVES.windThunderFirst.triggerChance) {
        actualChallengerPower = Math.floor(actualChallengerPower * (1 + COMBAT_PASSIVES.windThunderFirst.combatBonus))
        windThunderEffects.push('挑战者【风雷之先】触发，战力+15%')
      }
      // 防守者的风雷之先
      if (defenderHasWings && Math.random() < COMBAT_PASSIVES.windThunderFirst.triggerChance) {
        actualDefenderPower = Math.floor(actualDefenderPower * (1 + COMBAT_PASSIVES.windThunderFirst.combatBonus))
        windThunderEffects.push('防守者【风雷之先】触发，战力+15%')
      }
    }

    // 加入随机浮动
    const variance = PVP_CONFIG.basePowerVariance
    const challengerActual = actualChallengerPower * (1 + (Math.random() - 0.5) * 2 * variance)
    const defenderActual = actualDefenderPower * (1 + (Math.random() - 0.5) * 2 * variance)

    // 差距小于5%视为平局
    const diff = Math.abs(challengerActual - defenderActual) / Math.max(challengerActual, defenderActual)
    if (diff < 0.05) {
      return { result: 'draw', winnerId: null, windThunderEffects }
    }

    if (challengerActual > defenderActual) {
      return { result: 'challenger_win', winnerId: challenger.id, windThunderEffects }
    } else {
      return { result: 'defender_win', winnerId: defender.id, windThunderEffects }
    }
  }

  /**
   * 九天挪移：对大境界逃脱判定
   * 当败给大境界对手时，有40%概率减免损失
   */
  private checkHeavenlyEscape(loser: Character, winner: Character): boolean {
    if (!loser.windThunderWingsEquipped) return false
    if (winner.realmId <= loser.realmId) return false // 必须是对方境界更高

    return Math.random() < COMBAT_PASSIVES.heavenlyEscape.escapeBonus
  }

  /**
   * 应用战斗奖惩
   */
  private async applyBattleRewards(
    challenger: Character,
    defender: Character,
    result: 'challenger_win' | 'defender_win' | 'draw',
    rewards: {
      winnerCultivationGain: number
      loserCultivationLoss: number
      shaEnergyGain: number
      contributionGain: number
      isHostileBonus: boolean
    }
  ): Promise<void> {
    if (result === 'draw') {
      // 平局无奖惩
      return
    }

    const winner = result === 'challenger_win' ? challenger : defender
    const loser = result === 'challenger_win' ? defender : challenger

    // 胜者获得修为
    winner.experience = Number(winner.experience) + rewards.winnerCultivationGain

    // 败者损失修为（不会变负）
    loser.experience = Math.max(0, Number(loser.experience) - rewards.loserCultivationLoss)

    // 黑煞教胜者获得煞气
    if (winner.sectId === HEISHA_SECT_ID && rewards.shaEnergyGain > 0) {
      winner.shaEnergy = Math.min(winner.shaEnergy + rewards.shaEnergyGain, SHA_ENERGY_CONFIG.maxShaEnergy)
    }

    // 敌对关系胜者获得宗门贡献
    if (rewards.contributionGain > 0 && winner.sectId) {
      await sectService.addContribution(winner.id, rewards.contributionGain)
    }

    await characterRepository.save([winner, loser])
  }

  /**
   * 重置每日次数（如果需要）
   */
  private async resetDailyCountIfNeeded(character: Character, todayDate: string): Promise<void> {
    const lastResetTime = character.lastPvpResetTime ? Number(character.lastPvpResetTime) : 0
    const lastResetDate = new Date(lastResetTime).toISOString().split('T')[0]

    if (lastResetDate !== todayDate) {
      character.dailyPvpChallenges = 0
      character.lastPvpResetTime = Date.now()
      await characterRepository.save(character)
    }
  }

  /**
   * 获取今天日期字符串
   */
  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0]
  }

  /**
   * 获取宗门名称
   */
  private getSectName(sectId: string | null): string | null {
    if (!sectId) return null
    const sectNames: Record<string, string> = {
      taiyi: '太一门',
      huangfeng: '黄枫谷',
      heisha: '黑煞教',
      starpalace: '星宫'
    }
    return sectNames[sectId] || null
  }
}

export const pvpService = new PvpService()
